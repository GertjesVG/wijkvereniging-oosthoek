// Bevestigingsmails via het bestaande Google Apps Script-project "Oosthoek — Automatische bevestigingsmails"
// (account vzwoosthoek@gmail.com, code in mail/apps-script.js). Het script haalt elke 5 minuten de wachtende mails op
// (POST /api/mail/wachtrij), verstuurt ze met MailApp en meldt het resultaat (POST /api/mail/resultaat).
// Er is dus geen openbaar mailadres om aan te roepen: het script verstuurt alleen wat in mail_outbox staat.
// Elke mail staat eerst in mail_outbox; een inschrijving is nooit afhankelijk van de mail.
// Dubbel versturen wordt op twee plaatsen voorkomen: ophalen claimt de rij met een lease, en het script
// onthoudt elk bericht-id (inschrijvingsnummer:generation) dat het al verstuurd heeft.
import { renderConfirmation } from "../src/inschrijving/bevestigingsmail.ts";
import { nowIso, type Env } from "./basis.ts";

export const MAX_ATTEMPTS = 9;
// Wachttijd na poging n (minuten): 1, 5, 15, 60, 180, 360, 720, 1440.
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360, 720, 1440];
// Ruim boven de maximale looptijd van een Apps Script-uitvoering (6 minuten).
export const LEASE_MS = 10 * 60_000;
export const MAX_PER_CLAIM = 50;

export function backoffMs(attempts: number, factor = 1) {
  const minutes = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1] ?? 1;
  return Math.round(minutes * 60_000 * factor);
}

export type MailJob = {
  // Vast per bericht en per "opnieuw sturen": het script verstuurt hetzelfde id nooit twee keer.
  id: string;
  outboxId: number;
  generation: number;
  to: string;
  subject: string;
  fromName: string;
  html: string;
  text: string;
};

async function finish(env: Env, id: number, generation: number, ok: boolean, attempts: number, error = "") {
  const db = env.DB!;
  if (ok) {
    await db
      .prepare(
        `UPDATE mail_outbox SET status = 'sent', sent_at = ?3, lease_until = NULL, last_error = NULL
         WHERE id = ?1 AND generation = ?2 AND status = 'sending'`,
      )
      .bind(id, generation, nowIso())
      .run();
    return;
  }
  const factor = Number(env.MAIL_BACKOFF_FACTOR ?? "1") || 1;
  await db
    .prepare(
      `UPDATE mail_outbox SET status = ?3, next_attempt_at = ?4, lease_until = NULL, last_error = ?5
       WHERE id = ?1 AND generation = ?2 AND status = 'sending'`,
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

// Claimt de mails die nu aan de beurt zijn (of waarvan de lease verlopen is) in één statement, dus nooit dubbel.
export async function claimMail(env: Env, max: number): Promise<MailJob[]> {
  const db = env.DB!;
  const now = nowIso();
  const { results: claimed } = await db
    .prepare(
      `UPDATE mail_outbox SET status = 'sending', attempts = attempts + 1, lease_until = ?1
       WHERE id IN (SELECT id FROM mail_outbox
         WHERE (status = 'pending' AND next_attempt_at <= ?2) OR (status = 'sending' AND lease_until <= ?2)
         ORDER BY next_attempt_at LIMIT ?3)
       RETURNING id, generation, attempts, registration_id`,
    )
    .bind(nowIso(LEASE_MS), now, Math.max(0, Math.min(max, MAX_PER_CLAIM)))
    .all<{ id: number; generation: number; attempts: number; registration_id: number }>();
  const jobs: MailJob[] = [];
  for (const claim of claimed) {
    const registration = await db
      .prepare("SELECT reference, event_id, email, status FROM registrations WHERE id = ?1")
      .bind(claim.registration_id)
      .first<{ reference: string; event_id: string; email: string; status: string }>();
    const { results: children } = await db
      .prepare("SELECT name FROM participants WHERE registration_id = ?1 AND status = 'active' ORDER BY id")
      .bind(claim.registration_id)
      .all<{ name: string }>();
    const mail =
      registration?.status === "active" && registration.email !== "[gewist]" && children.length
        ? renderConfirmation(registration.event_id, {
            reference: registration.reference,
            childNames: children.map((c) => c.name),
          })
        : null;
    if (!registration || !mail) {
      await finish(env, claim.id, claim.generation, false, MAX_ATTEMPTS, "Inschrijving geannuleerd, gewist of zonder mailsjabloon.");
      continue;
    }
    jobs.push({
      id: `${registration.reference}:${claim.generation}`,
      outboxId: claim.id,
      generation: claim.generation,
      to: registration.email,
      ...mail,
    });
  }
  return jobs;
}

export type MailResult = { outboxId: number; generation: number; ok: boolean; error?: string };

// Verwerkt de terugmelding van het script. Alleen geclaimde mails ('sending') van dezelfde generatie veranderen.
export async function reportMail(env: Env, results: MailResult[]) {
  let updated = 0;
  for (const result of results) {
    const row = await env.DB!.prepare("SELECT attempts FROM mail_outbox WHERE id = ?1 AND generation = ?2 AND status = 'sending'")
      .bind(result.outboxId, result.generation)
      .first<{ attempts: number }>();
    if (!row) continue;
    await finish(env, result.outboxId, result.generation, result.ok, row.attempts, result.error || "Onbekende mailfout.");
    updated++;
  }
  return updated;
}
