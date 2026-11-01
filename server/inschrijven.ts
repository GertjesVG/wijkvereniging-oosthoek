// Openbare kant: status van een evenement en een nieuwe inschrijving. Geeft nooit gegevens van anderen terug.
import type { PublicEventStatus, RegistrationResponse } from "../src/inschrijving/api.ts";
import { registrationEvents } from "../src/inschrijving/evenementen.ts";
import { connectionOf, errorMessage, fail, json, nowIso, readJson, sha256Hex, type Env } from "./basis.ts";
import { validateRegistration, type CleanRegistration } from "./validatie.ts";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// Nieuwe inschrijvingen per internetaansluiting per dag. Ruim voor gezinnen, klein genoeg tegen het leegboeken van de actie.
const MAX_PER_CONNECTION_PER_DAY = 5;
const DAY_MS = 24 * 3600_000;

const eventFor = (id: unknown) =>
  typeof id === "string" && Object.hasOwn(registrationEvents, id) ? registrationEvents[id] : undefined;

async function counts(db: D1Database, eventId: string) {
  return db
    .prepare(
      `SELECT e.status, e.capacity,
         (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.status = 'active') AS active
       FROM events e WHERE e.id = ?1`,
    )
    .bind(eventId)
    .first<{ status: "open" | "closed"; capacity: number; active: number }>();
}

export async function publicStatus(env: Env, eventId: string) {
  const config = eventFor(eventId);
  if (!config) return fail(404, "NIET_GEVONDEN", "Onbekend evenement.");
  const configured =
    Boolean(env.DB && env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY) && config.pendingDecisions.length === 0;
  const row = configured ? await counts(env.DB!, eventId) : null;
  const available = row ? Math.max(0, row.capacity - row.active) : 0;
  const status: PublicEventStatus["status"] =
    row?.status !== "open" ? "closed" : available > 0 ? "open" : "full";
  return json({
    id: eventId,
    status,
    available,
    turnstileSiteKey: configured ? env.TURNSTILE_SITE_KEY! : null,
  } satisfies PublicEventStatus);
}

async function verifyTurnstile(env: Env, response: string, ip: string | null) {
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET!);
  form.append("response", response);
  if (ip) form.append("remoteip", ip);
  try {
    const result = await fetch(SITEVERIFY, { method: "POST", body: form, signal: AbortSignal.timeout(10_000) });
    const outcome = (await result.json()) as { success?: boolean };
    return outcome.success === true;
  } catch {
    return false;
  }
}

async function existing(db: D1Database, submissionId: string) {
  const registration = await db
    .prepare("SELECT id, reference, parent_name, email, street, house_number FROM registrations WHERE submission_id = ?1")
    .bind(submissionId)
    .first<{ id: number; reference: string; parent_name: string; email: string; street: string | null; house_number: string | null }>();
  if (!registration) return null;
  const { results } = await db
    .prepare("SELECT name, age, child_key FROM participants WHERE registration_id = ?1 ORDER BY id")
    .bind(registration.id)
    .all<{ name: string; age: number | null; child_key: string }>();
  const response: RegistrationResponse = {
    reference: registration.reference,
    parentName: registration.parent_name,
    email: registration.email,
    address: registration.street ? { street: registration.street, houseNumber: registration.house_number ?? "" } : null,
    participants: results.map(({ name, age }) => ({ name, age })),
  };
  return { response, email: registration.email, keys: results.map((p) => p.child_key) };
}

// Hetzelfde formulier opnieuw verstuurd: dezelfde inschrijving terug. Andere inhoud met hetzelfde ID krijgt niets te zien.
async function replay(db: D1Database, data: CleanRegistration) {
  const stored = await existing(db, data.submissionId);
  if (!stored) return null;
  const sorted = (keys: string[]) => [...keys].sort().join("\n");
  const same =
    stored.email.toLowerCase() === data.email.toLowerCase() &&
    sorted(stored.keys) === sorted(data.participants.map((p) => p.childKey));
  return same
    ? json(stored.response, 200)
    : fail(409, "AL_ONTVANGEN", "Deze inschrijving werd al ontvangen. Kijk in je mailbox naar de bevestiging, of neem contact op als er iets niet klopt.");
}

export async function register(request: Request, env: Env) {
  if (!env.DB || !env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY)
    return fail(503, "NIET_GECONFIGUREERD", "De inschrijving is nog niet beschikbaar.");
  const db = env.DB;
  const body = await readJson(request);
  if (!body) return fail(400, "VALIDATIE", "Ongeldige inzending.");
  const config = eventFor(body.eventId);
  if (!config) return fail(404, "NIET_GEVONDEN", "Onbekend evenement.");
  const checked = validateRegistration(config, body);
  if (!checked.ok)
    return fail(400, "VALIDATIE", "Controleer de gemarkeerde velden.", { fields: checked.fields });
  const data = checked.value;

  // Dezelfde inzending opnieuw (bv. na een haperende verbinding): zelfde inschrijving, geen tweede.
  const again = await replay(db, data);
  if (again) return again;

  const state = await counts(db, config.id);
  if (state?.status !== "open" || config.pendingDecisions.length)
    return fail(423, "GESLOTEN", "De inschrijvingen zijn gesloten.");
  const ip = request.headers.get("CF-Connecting-IP");
  if (!(await verifyTurnstile(env, data.challenge, ip)))
    return fail(403, "TURNSTILE", "De controle tegen spam is mislukt. Probeer het opnieuw.");

  // Telt vooraf; een paar gelijktijdige inzendingen kunnen er net over gaan, genoeg om leegboeken te verhinderen.
  const client = (await sha256Hex(`inschrijving\n${connectionOf(ip)}`)).slice(0, 32);
  await db.prepare("DELETE FROM submit_log WHERE created_at < ?1").bind(nowIso(-DAY_MS)).run();
  const recent = await db.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE client_key = ?1").bind(client).first<{ n: number }>();
  if ((recent?.n ?? 0) >= MAX_PER_CONNECTION_PER_DAY)
    return fail(429, "TE_VEEL_POGINGEN", "Er zijn vandaag al veel inschrijvingen via deze internetverbinding. Probeer morgen opnieuw of neem contact op met de vereniging.");

  const keys = data.participants.map((p) => p.childKey);
  const { results: known } = await db
    .prepare(
      `SELECT child_key FROM participants WHERE event_id = ?1 AND status = 'active'
       AND child_key IN (SELECT value FROM json_each(?2))`,
    )
    .bind(config.id, JSON.stringify(keys))
    .all<{ child_key: string }>();
  if (known.length) {
    const fields: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (known.some((k) => k.child_key === key))
        fields[`participants.${i}.name`] = `Dit ${config.participant.singular} lijkt al ingeschreven.`;
    });
    return fail(409, "DUBBEL", "Een of meer kinderen lijken al ingeschreven. Neem contact op als dat niet klopt.", { fields });
  }

  // Vermoedelijk dubbel: zelfde e-mail of adres, of een kind met dezelfde naam en leeftijd elders in de wijk.
  const suspicious = await db
    .prepare(
      `SELECT EXISTS (SELECT 1 FROM registrations WHERE event_id = ?1 AND status = 'active'
         AND (lower(email) = lower(?2) OR (?3 IS NOT NULL AND address_key = ?3)))
       OR EXISTS (SELECT 1 FROM participants p, json_each(?4) j WHERE p.event_id = ?1 AND p.status = 'active'
         AND substr(p.child_key, 1, instr(p.child_key, '|')) = json_extract(j.value, '$.k')
         AND p.age IS json_extract(j.value, '$.a')) AS hit`,
    )
    .bind(
      config.id,
      data.email,
      data.addressKey,
      JSON.stringify(data.participants.map((p) => ({ k: p.childKey.slice(0, p.childKey.indexOf("|") + 1), a: p.age }))),
    )
    .first<{ hit: number }>();

  const now = nowIso();
  const sub = data.submissionId;
  const statements = [
    db
      .prepare("INSERT OR REPLACE INTO guard_open (id, ok) VALUES (1, (SELECT status = 'open' FROM events WHERE id = ?1))")
      .bind(config.id),
    db
      .prepare(
        `INSERT INTO registrations (event_id, submission_id, seq, reference, parent_name, email, street, house_number,
           address_key, suspected_duplicate, created_at, updated_at)
         SELECT ?1, ?2, n, ?3 || printf('%04d', n), ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10
         FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM registrations WHERE event_id = ?1)`,
      )
      .bind(config.id, sub, config.referencePrefix, data.parentName, data.email, data.street, data.houseNumber,
        data.addressKey, suspicious?.hit ? 1 : 0, now),
    ...data.participants.map((p) =>
      db
        .prepare(
          `INSERT INTO participants (registration_id, event_id, name, age, child_key, created_at, updated_at)
           SELECT id, ?2, ?3, ?4, ?5, ?6, ?6 FROM registrations WHERE submission_id = ?1`,
        )
        .bind(sub, config.id, p.name, p.age, p.childKey, now),
    ),
    db
      .prepare(
        `INSERT OR REPLACE INTO guard_capacity (id, ok) VALUES (1,
           (SELECT COUNT(*) FROM participants WHERE event_id = ?1 AND status = 'active') <= (SELECT capacity FROM events WHERE id = ?1))`,
      )
      .bind(config.id),
    db.prepare("INSERT INTO mail_outbox (registration_id, next_attempt_at) SELECT id, ?2 FROM registrations WHERE submission_id = ?1").bind(sub, now),
    db.prepare("INSERT INTO submit_log (client_key, created_at) VALUES (?1, ?2)").bind(client, now),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("gesloten")) return fail(423, "GESLOTEN", "De inschrijvingen zijn gesloten.");
    if (message.includes("volzet")) {
      const after = await counts(db, config.id);
      const available = after ? Math.max(0, after.capacity - after.active) : 0;
      return fail(409, "VOLZET",
        available
          ? `Er zijn nog maar ${available} cadeautjes beschikbaar. Pas het aantal kinderen aan.`
          : "Alle cadeautjes zijn verdeeld. De inschrijving is volzet.",
        { available });
    }
    if (message.includes("registrations.submission_id")) {
      const same = await replay(db, data);
      if (same) return same;
    }
    if (message.includes("participants.event_id, participants.child_key"))
      return fail(409, "DUBBEL", "Een of meer kinderen lijken al ingeschreven. Neem contact op als dat niet klopt.");
    throw error;
  }
  // De bevestigingsmail staat nu in mail_outbox; het Apps Script haalt ze binnen enkele minuten op.
  return json((await existing(db, sub))!.response, 201);
}
