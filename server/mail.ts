// Bevestigingsmails via de Google Apps Script-webapp van het verenigingsaccount (zie mail/apps-script.gs).
// Elke mail staat eerst in mail_outbox; een inschrijving is dus nooit afhankelijk van de mail.
// Dubbel versturen wordt op twee plaatsen voorkomen: een poging claimt de rij met een lease, en het script
// onthoudt elk bericht-id (submission_id:generation) dat het al verstuurd heeft.
import { event as site } from "../src/content/event.ts";
import { registrationEvents } from "../src/inschrijving/evenementen.ts";
import { errorMessage, nowIso, type Env } from "./basis.ts";

export const MAX_ATTEMPTS = 9;
// Wachttijd na poging n (minuten): 1, 5, 15, 60, 180, 360, 720, 1440.
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360, 720, 1440];
const LEASE_MS = 90_000;

export function backoffMs(attempts: number, factor = 1) {
  const minutes = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1] ?? 1;
  return Math.round(minutes * 60_000 * factor);
}

type MailRegistration = {
  reference: string;
  event_id: string;
  parent_name: string;
  email: string;
  street: string | null;
  house_number: string | null;
  status: string;
  submission_id: string;
};

export function buildConfirmation(
  registration: MailRegistration,
  participants: { name: string; age: number | null }[],
) {
  const config = registrationEvents[registration.event_id];
  const date = new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${config.date}T12:00:00`));
  const lines = [
    `Beste ${registration.parent_name},`,
    "",
    config.mail.intro,
    "",
    `Inschrijvingsnummer: ${registration.reference}`,
    `Evenement: ${config.title}, ${date}`,
    "",
    `Ingeschreven ${config.participant.plural}:`,
    ...participants.map((p) => `- ${p.name}${p.age === null ? "" : ` (${p.age} jaar)`}`),
  ];
  if (registration.street)
    lines.push("", `Adres: ${registration.street} ${registration.house_number ?? ""}`.trimEnd());
  lines.push(
    "",
    config.mail.closing,
    "",
    "Met vriendelijke groeten,",
    site.organisation.name,
    site.organisation.email,
  );
  return {
    to: registration.email,
    subject: `${config.mail.subject} – ${registration.reference}`,
    body: lines.join("\n"),
  };
}

async function finish(env: Env, id: number, generation: number, ok: boolean, attempts: number, error = "") {
  const db = env.DB!;
  if (ok) {
    await db
      .prepare(
        "UPDATE mail_outbox SET status = 'sent', sent_at = ?3, lease_until = NULL, last_error = NULL WHERE id = ?1 AND generation = ?2",
      )
      .bind(id, generation, nowIso())
      .run();
    return;
  }
  const factor = Number(env.MAIL_BACKOFF_FACTOR ?? "1") || 1;
  await db
    .prepare(
      "UPDATE mail_outbox SET status = ?3, next_attempt_at = ?4, lease_until = NULL, last_error = ?5 WHERE id = ?1 AND generation = ?2",
    )
    .bind(
      id,
      generation,
      attempts >= MAX_ATTEMPTS ? "failed" : "pending",
      nowIso(backoffMs(attempts, factor)),
      error.slice(0, 300),
    )
    .run();
}

// Verstuurt één mail als deze nu aan de beurt is en niemand anders ermee bezig is.
// Zonder ingestelde mailkoppeling blijft alles wachten, zonder pogingen te verbruiken.
export async function sendOne(env: Env, outboxId: number) {
  if (!env.DB || !env.MAIL_WEBHOOK_URL || !env.MAIL_SECRET) return "skipped";
  const db = env.DB;
  const now = nowIso();
  const claim = await db
    .prepare(
      `UPDATE mail_outbox SET status = 'sending', attempts = attempts + 1, lease_until = ?2
       WHERE id = ?1 AND ((status = 'pending' AND next_attempt_at <= ?3) OR (status = 'sending' AND lease_until <= ?3))
       RETURNING attempts, generation, registration_id`,
    )
    .bind(outboxId, nowIso(LEASE_MS), now)
    .first<{ attempts: number; generation: number; registration_id: number }>();
  if (!claim) return "skipped";
  const registration = await db
    .prepare(
      "SELECT reference, event_id, parent_name, email, street, house_number, status, submission_id FROM registrations WHERE id = ?1",
    )
    .bind(claim.registration_id)
    .first<MailRegistration>();
  if (!registration || registration.status !== "active" || !registrationEvents[registration.event_id]) {
    await finish(env, outboxId, claim.generation, false, MAX_ATTEMPTS, "Inschrijving geannuleerd of gewist vóór verzending.");
    return "failed";
  }
  const { results } = await db
    .prepare("SELECT name, age FROM participants WHERE registration_id = ?1 AND status = 'active' ORDER BY id")
    .bind(claim.registration_id)
    .all<{ name: string; age: number | null }>();
  try {
    const response = await fetch(env.MAIL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sleutel: env.MAIL_SECRET,
        id: `${registration.submission_id}:${claim.generation}`,
        name: site.organisation.name,
        ...buildConfirmation(registration, results),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const reply = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || reply?.ok !== true)
      throw new Error(reply?.error ?? `Mailrelais antwoordde HTTP ${response.status}.`);
    await finish(env, outboxId, claim.generation, true, claim.attempts);
    return "sent";
  } catch (error) {
    await finish(env, outboxId, claim.generation, false, claim.attempts, errorMessage(error));
    return "retry";
  }
}

// Verwerkt de mails die nu aan de beurt zijn (na een inschrijving, in het beheer en via de tijdtrigger van het script).
export async function processOutbox(env: Env, limit = 5) {
  if (!env.DB || !env.MAIL_WEBHOOK_URL || !env.MAIL_SECRET) return { sent: 0, retry: 0, failed: 0 };
  const now = nowIso();
  const { results } = await env.DB.prepare(
    `SELECT id FROM mail_outbox
     WHERE (status = 'pending' AND next_attempt_at <= ?1) OR (status = 'sending' AND lease_until <= ?1)
     ORDER BY next_attempt_at LIMIT ?2`,
  )
    .bind(now, limit)
    .all<{ id: number }>();
  const counts = { sent: 0, retry: 0, failed: 0 };
  for (const { id } of results) {
    const outcome = await sendOne(env, id);
    if (outcome !== "skipped") counts[outcome]++;
  }
  return counts;
}
