// Beheer-API onder /api/beheer/*. Toegang met één verenigingswachtwoord (Cloudflare-geheim ADMIN_PASSWORD, min. 16 tekens):
// na het inloggen een ondertekende sessiecookie (8 uur, alleen voor /api/beheer, HttpOnly, Secure, SameSite=Strict).
// Een nieuw wachtwoord maakt alle bestaande sessies ongeldig. Mislukte pogingen worden per kwartier begrensd.
import type { AdminEventSummary, AdminRegistration, MailStatus } from "../src/inschrijving/api.ts";
import { registrationEvents, type RegistrationEvent } from "../src/inschrijving/evenementen.ts";
import {
  addressKey,
  childKey,
  connectionOf,
  errorMessage,
  fail,
  json,
  nowIso,
  readJson,
  sameText,
  sha256Hex,
  type Env,
} from "./basis.ts";
import { CHILD_NAME_HINT, cleanChildName, cleanEmail, cleanHouseNumber, cleanText } from "./validatie.ts";

const COOKIE = "oosthoek_beheer";
const SESSION_SECONDS = 8 * 3600;
const WINDOW_MS = 15 * 60_000;
// Per internetaansluiting; geen grens over iedereen samen, anders kan een buitenstaander het beheer blokkeren.
const MAX_ATTEMPTS_PER_CLIENT = 10;
const loginField = "password";
const encoder = new TextEncoder();

const base64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function signature(env: Env, expires: number) {
  const raw = await crypto.subtle.digest("SHA-256", encoder.encode(`oosthoek-beheer-sessie\n${env.ADMIN_PASSWORD}`));
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(`beheer.${expires}`)));
}

export async function createSession(env: Env, nowMs = Date.now()) {
  const expires = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  return `${expires}.${await signature(env, expires)}`;
}

export async function validSession(env: Env, cookieHeader: string | null, nowMs = Date.now()) {
  const value = cookieHeader
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const [expiresText, signed] = (value ?? "").split(".");
  const expires = Number(expiresText);
  if (!signed || !Number.isInteger(expires) || expires * 1000 <= nowMs) return false;
  return sameText(signed, await signature(env, expires));
}

const sessionCookie = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; Path=/api/beheer; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// Wijzigingen alleen als JSON vanaf de eigen site: een ander domein kan zo geen verzoek namaken.
export function trustedMutation(request: Request) {
  const origin = request.headers.get("Origin");
  return (
    (!origin || origin === new URL(request.url).origin) &&
    (request.headers.get("Content-Type") ?? "").startsWith("application/json")
  );
}

async function login(request: Request, env: Env) {
  const db = env.DB!;
  const body = await readJson(request);
  const client = (await sha256Hex(`beheer-login\n${connectionOf(request.headers.get("CF-Connecting-IP"))}`)).slice(0, 32);
  // Eerst de poging noteren en dan pas tellen: zo krijgt ook een salvo gelijktijdige pogingen er samen hooguit 10.
  await db.batch([
    db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?1").bind(nowIso(-WINDOW_MS)),
    db.prepare("INSERT INTO login_attempts (client_key, attempted_at) VALUES (?1, ?2)").bind(client, nowIso()),
  ]);
  const tally = await db
    .prepare("SELECT COUNT(*) AS mine FROM login_attempts WHERE client_key = ?1")
    .bind(client)
    .first<{ mine: number }>();
  if ((tally?.mine ?? 0) > MAX_ATTEMPTS_PER_CLIENT)
    return fail(429, "TE_VEEL_POGINGEN", "Te veel mislukte pogingen. Probeer het over een kwartier opnieuw.");
  const given = typeof body?.[loginField] === "string" ? (body[loginField] as string) : "";
  const match = given.length > 0 && sameText(await sha256Hex(given), await sha256Hex(env.ADMIN_PASSWORD!));
  if (!match) return fail(401, "NIET_INGELOGD", "Onjuist wachtwoord.");
  await db.prepare("DELETE FROM login_attempts WHERE client_key = ?1").bind(client).run();
  return json(null, 204, { "Set-Cookie": sessionCookie(await createSession(env), SESSION_SECONDS) });
}

// ---------- Overzicht per evenement ----------

const SUMMARY_SQL = `SELECT e.id, e.status, e.capacity, e.personal_data_erased_at AS erased,
  (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.status = 'active') AS active,
  (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.status = 'active' AND p.picked_up_at IS NOT NULL) AS picked_up,
  (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'active') AS registrations,
  (SELECT json_group_object(m.status, m.n) FROM (SELECT o.status, COUNT(*) AS n FROM mail_outbox o
     JOIN registrations r ON r.id = o.registration_id WHERE r.event_id = e.id GROUP BY o.status) m) AS mail
  FROM events e`;

type SummaryRow = {
  id: string;
  status: "open" | "closed";
  capacity: number;
  erased: string | null;
  active: number;
  picked_up: number;
  registrations: number;
  mail: string | null;
};

function toSummary(row: SummaryRow): AdminEventSummary {
  const config = registrationEvents[row.id];
  const mail = { pending: 0, sending: 0, sent: 0, failed: 0, ...(row.mail ? JSON.parse(row.mail) : {}) };
  return {
    id: row.id,
    title: config.title,
    date: config.date,
    status: row.status,
    capacity: row.capacity,
    active: row.active,
    available: Math.max(0, row.capacity - row.active),
    registrations: row.registrations,
    pickedUp: row.picked_up,
    mail: mail as Record<MailStatus, number>,
    personalDataErased: row.erased !== null,
    pendingDecisions: config.pendingDecisions,
  };
}

// Elk evenement uit evenementen.ts krijgt bij het eerste gebruik een databaserij (dicht, standaardcapaciteit).
async function ensureEvents(db: D1Database) {
  await db.batch(
    Object.values(registrationEvents).map((e) =>
      db.prepare("INSERT OR IGNORE INTO events (id, capacity) VALUES (?1, ?2)").bind(e.id, e.defaultCapacity),
    ),
  );
}

async function summaries(db: D1Database) {
  const { results } = await db.prepare(`${SUMMARY_SQL} ORDER BY e.id`).all<SummaryRow>();
  return results.filter((row) => registrationEvents[row.id]).map(toSummary);
}

async function summary(db: D1Database, eventId: string) {
  const row = await db.prepare(`${SUMMARY_SQL} WHERE e.id = ?1`).bind(eventId).first<SummaryRow>();
  return row ? toSummary(row) : null;
}

async function updateEvent(request: Request, db: D1Database, eventId: string) {
  const body = (await readJson(request)) ?? {};
  const current = await summary(db, eventId);
  if (!current) return fail(404, "NIET_GEVONDEN", "Onbekend evenement.");
  if (body.status !== undefined) {
    if (body.status !== "open" && body.status !== "closed")
      return fail(400, "VALIDATIE", "Ongeldige status.");
    if (body.status === "open" && current.personalDataErased)
      return fail(409, "VERBODEN", "De gegevens van dit evenement zijn gewist; het kan niet opnieuw open.");
    if (body.status === "open" && current.pendingDecisions.length)
      return fail(409, "VERBODEN", `Nog niet vrijgegeven. Eerst goedkeuren: ${current.pendingDecisions.join("; ")}.`);
    await db.prepare("UPDATE events SET status = ?2, updated_at = ?3 WHERE id = ?1").bind(eventId, body.status, nowIso()).run();
  }
  if (body.capacity !== undefined) {
    const capacity = body.capacity;
    if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 0 || capacity > 10_000)
      return fail(400, "VALIDATIE", "Vul een geheel aantal tussen 0 en 10000 in.");
    // Nooit lager dan het aantal ingeschreven kinderen; in één statement, dus ook juist bij gelijktijdige inschrijvingen.
    const result = await db
      .prepare(
        `UPDATE events SET capacity = ?2, updated_at = ?3 WHERE id = ?1
         AND ?2 >= (SELECT COUNT(*) FROM participants WHERE event_id = ?1 AND status = 'active')`,
      )
      .bind(eventId, capacity, nowIso())
      .run();
    if (!result.meta.changes)
      return fail(409, "VALIDATIE", "De capaciteit kan niet lager dan het aantal ingeschreven kinderen.");
  }
  return json(await summary(db, eventId));
}

// ---------- Inschrijvingen ----------

const REGISTRATION_SQL = `SELECT r.id, r.event_id, r.reference, r.status, r.parent_name, r.email, r.street, r.house_number,
  r.note, r.suspected_duplicate, r.created_at, o.status AS mail_status, o.attempts, o.last_error, o.sent_at
  FROM registrations r LEFT JOIN mail_outbox o ON o.registration_id = r.id`;

type RegistrationRow = {
  id: number;
  event_id: string;
  reference: string;
  status: "active" | "cancelled";
  parent_name: string;
  email: string;
  street: string | null;
  house_number: string | null;
  note: string | null;
  suspected_duplicate: number;
  created_at: string;
  mail_status: MailStatus | null;
  attempts: number | null;
  last_error: string | null;
  sent_at: string | null;
};
type ParticipantRow = {
  id: number;
  registration_id: number;
  name: string;
  age: number | null;
  status: "active" | "cancelled";
  picked_up_at: string | null;
};

function toRegistration(row: RegistrationRow, participants: ParticipantRow[]): AdminRegistration {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    parentName: row.parent_name,
    email: row.email,
    street: row.street,
    houseNumber: row.house_number,
    note: row.note,
    suspectedDuplicate: row.suspected_duplicate === 1,
    createdAt: row.created_at,
    mail: row.mail_status
      ? { status: row.mail_status, attempts: row.attempts ?? 0, lastError: row.last_error, sentAt: row.sent_at }
      : null,
    participants: participants
      .filter((p) => p.registration_id === row.id)
      .map((p) => ({ id: p.id, name: p.name, age: p.age, status: p.status, pickedUpAt: p.picked_up_at })),
  };
}

async function listRegistrations(db: D1Database, eventId: string) {
  const [registrations, participants] = await db.batch([
    db.prepare(`${REGISTRATION_SQL} WHERE r.event_id = ?1 ORDER BY r.id DESC`).bind(eventId),
    db.prepare("SELECT id, registration_id, name, age, status, picked_up_at FROM participants WHERE event_id = ?1 ORDER BY id").bind(eventId),
  ]);
  const people = participants.results as ParticipantRow[];
  return (registrations.results as RegistrationRow[]).map((row) => toRegistration(row, people));
}

async function registrationById(db: D1Database, id: number) {
  const [registration, participants] = await db.batch([
    db.prepare(`${REGISTRATION_SQL} WHERE r.id = ?1`).bind(id),
    db.prepare("SELECT id, registration_id, name, age, status, picked_up_at FROM participants WHERE registration_id = ?1 ORDER BY id").bind(id),
  ]);
  const row = registration.results[0] as RegistrationRow | undefined;
  return row ? toRegistration(row, participants.results as ParticipantRow[]) : null;
}

type Editable = RegistrationRow & { address_key: string | null; erased: string | null };

async function editable(db: D1Database, id: number) {
  return db
    .prepare(
      `SELECT r.*, e.personal_data_erased_at AS erased FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = ?1`,
    )
    .bind(id)
    .first<Editable>();
}

const capacityGuard = (db: D1Database, eventId: string) =>
  db
    .prepare(
      `INSERT OR REPLACE INTO guard_capacity (id, ok) VALUES (1,
         (SELECT COUNT(*) FROM participants WHERE event_id = ?1 AND status = 'active') <= (SELECT capacity FROM events WHERE id = ?1))`,
    )
    .bind(eventId);

// Voert een batch uit en vertaalt databasecontroles naar begrijpelijke meldingen.
async function apply(db: D1Database, statements: D1PreparedStatement[], registrationId: number) {
  try {
    await db.batch(statements);
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("volzet"))
      return fail(409, "VOLZET", "Niet genoeg vrije plaatsen. Verhoog eerst de capaciteit.");
    if (message.includes("participants.event_id, participants.child_key"))
      return fail(409, "DUBBEL", "Dit kind is al actief ingeschreven bij dit evenement.");
    throw error;
  }
  return json(await registrationById(db, registrationId));
}

function ageFor(config: RegistrationEvent, value: unknown) {
  const range = config.participant.age;
  if (!range) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= range.min && value <= range.max ? value : undefined;
}

async function updateRegistration(request: Request, db: D1Database, id: number) {
  const current = await editable(db, id);
  if (!current) return fail(404, "NIET_GEVONDEN", "Onbekende inschrijving.");
  if (current.erased) return fail(409, "VERBODEN", "De gegevens van dit evenement zijn gewist.");
  const body = (await readJson(request)) ?? {};
  const fields: Record<string, string> = {};
  const next = { ...current };
  if (body.parentName !== undefined) {
    const value = cleanText(body.parentName, 2, 100);
    if (value) next.parent_name = value;
    else fields.parentName = "Vul een naam in (2 tot 100 tekens).";
  }
  if (body.email !== undefined) {
    const value = cleanEmail(body.email);
    if (value) next.email = value;
    else fields.email = "Vul een geldig e-mailadres in.";
  }
  if (body.street !== undefined) {
    const value = cleanText(body.street, 2, 100);
    if (value) next.street = value;
    else fields.street = "Vul een straat in.";
  }
  if (body.houseNumber !== undefined) {
    const value = cleanHouseNumber(body.houseNumber);
    if (value) next.house_number = value;
    else fields.houseNumber = "Vul een geldig huisnummer in.";
  }
  if (body.note !== undefined) {
    const value = body.note === null || body.note === "" ? "" : cleanText(body.note, 1, 500);
    if (value === null) fields.note = "Notitie is te lang (max. 500 tekens).";
    else next.note = value || null;
  }
  if (body.status !== undefined && body.status !== "active" && body.status !== "cancelled")
    fields.status = "Ongeldige status.";
  if (Object.keys(fields).length) return fail(400, "VALIDATIE", "Controleer de gemarkeerde velden.", { fields });

  const now = nowIso();
  const address = next.street && next.house_number ? addressKey(next.street, next.house_number) : null;
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE registrations SET parent_name = ?2, email = ?3, street = ?4, house_number = ?5, address_key = ?6, note = ?7,
           updated_at = ?8 WHERE id = ?1`,
      )
      .bind(id, next.parent_name, next.email, next.street, next.house_number, address, next.note, now),
  ];
  if (address !== current.address_key || next.email !== current.email) {
    const { results } = await db.prepare("SELECT id, name FROM participants WHERE registration_id = ?1").bind(id).all<{ id: number; name: string }>();
    for (const p of results)
      statements.push(
        db.prepare("UPDATE participants SET child_key = ?2, updated_at = ?3 WHERE id = ?1").bind(p.id, childKey(p.name, address, next.email), now),
      );
  }
  if (body.status && body.status !== current.status) {
    // Heractiveren zet alleen de kinderen terug die samen met de inschrijving geannuleerd werden, niet wie al apart geannuleerd was.
    statements.push(
      db.prepare("UPDATE registrations SET status = ?2 WHERE id = ?1").bind(id, body.status),
      body.status === "cancelled"
        ? db
            .prepare(
              `UPDATE participants SET status = 'cancelled', cancelled_with_registration = 1, picked_up_at = NULL, updated_at = ?2
               WHERE registration_id = ?1 AND status = 'active'`,
            )
            .bind(id, now)
        : db
            .prepare(
              `UPDATE participants SET status = 'active', cancelled_with_registration = 0, updated_at = ?2
               WHERE registration_id = ?1 AND cancelled_with_registration = 1`,
            )
            .bind(id, now),
    );
    if (body.status === "active") statements.push(capacityGuard(db, current.event_id));
  }
  return apply(db, statements, id);
}

async function addParticipant(request: Request, db: D1Database, id: number) {
  const current = await editable(db, id);
  if (!current) return fail(404, "NIET_GEVONDEN", "Onbekende inschrijving.");
  if (current.erased) return fail(409, "VERBODEN", "De gegevens van dit evenement zijn gewist.");
  if (current.status !== "active") return fail(409, "VERBODEN", "Heractiveer eerst de inschrijving.");
  const config = registrationEvents[current.event_id];
  const body = (await readJson(request)) ?? {};
  const name = cleanChildName(body.name);
  const age = ageFor(config, body.age);
  if (!name || age === undefined)
    return fail(400, "VALIDATIE", "Controleer naam en leeftijd.", {
      fields: { ...(!name && { name: CHILD_NAME_HINT }), ...(age === undefined && { age: "Ongeldige leeftijd." }) },
    });
  const now = nowIso();
  return apply(
    db,
    [
      db
        .prepare(
          `INSERT INTO participants (registration_id, event_id, name, age, child_key, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
        )
        .bind(id, current.event_id, name, age, childKey(name, current.address_key, current.email), now),
      capacityGuard(db, current.event_id),
    ],
    id,
  );
}

async function updateParticipant(request: Request, db: D1Database, participantId: number) {
  const participant = await db
    .prepare("SELECT id, registration_id, name, age, status, picked_up_at FROM participants WHERE id = ?1")
    .bind(participantId)
    .first<ParticipantRow>();
  if (!participant) return fail(404, "NIET_GEVONDEN", "Onbekende deelnemer.");
  const registration = await editable(db, participant.registration_id);
  if (!registration) return fail(404, "NIET_GEVONDEN", "Onbekende inschrijving.");
  if (registration.erased) return fail(409, "VERBODEN", "De gegevens van dit evenement zijn gewist.");
  const config = registrationEvents[registration.event_id];
  const body = (await readJson(request)) ?? {};
  const fields: Record<string, string> = {};
  let name = participant.name;
  let age = participant.age;
  let status = participant.status;
  let pickedUp = participant.picked_up_at;
  if (body.name !== undefined) {
    const value = cleanChildName(body.name);
    if (value) name = value;
    else fields.name = CHILD_NAME_HINT;
  }
  if (body.age !== undefined) {
    const value = ageFor(config, body.age);
    if (value === undefined) fields.age = "Ongeldige leeftijd.";
    else age = value;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "cancelled") fields.status = "Ongeldige status.";
    else if (body.status === "active" && registration.status !== "active")
      fields.status = "Heractiveer eerst de inschrijving.";
    else status = body.status;
  }
  if (body.pickedUp !== undefined) {
    if (typeof body.pickedUp !== "boolean") fields.pickedUp = "Ongeldige waarde.";
    else pickedUp = body.pickedUp ? (pickedUp ?? nowIso()) : null;
  }
  if (status !== "active") pickedUp = null;
  if (Object.keys(fields).length) return fail(400, "VALIDATIE", "Controleer de gemarkeerde velden.", { fields });
  const statements = [
    db
      .prepare(
        `UPDATE participants SET name = ?2, age = ?3, status = ?4, picked_up_at = ?5, child_key = ?6, updated_at = ?7,
           cancelled_with_registration = 0 WHERE id = ?1`,
      )
      .bind(participantId, name, age, status, pickedUp, childKey(name, registration.address_key, registration.email), nowIso()),
  ];
  if (status === "active" && participant.status !== "active") statements.push(capacityGuard(db, registration.event_id));
  return apply(db, statements, participant.registration_id);
}

// Zet de bevestiging opnieuw in de wachtrij met een nieuwe generatie: het script ziet een nieuw bericht-id.
async function resendConfirmation(db: D1Database, id: number) {
  const current = await editable(db, id);
  if (!current) return fail(404, "NIET_GEVONDEN", "Onbekende inschrijving.");
  if (current.erased || current.status !== "active")
    return fail(409, "VERBODEN", "Alleen voor actieve inschrijvingen met bewaarde gegevens.");
  const row = await db
    .prepare(
      `INSERT INTO mail_outbox (registration_id, next_attempt_at) VALUES (?1, ?2)
       ON CONFLICT (registration_id) DO UPDATE SET generation = generation + 1, status = 'pending', attempts = 0,
         next_attempt_at = excluded.next_attempt_at, lease_until = NULL, last_error = NULL
       RETURNING id`,
    )
    .bind(id, nowIso())
    .first<{ id: number }>();
  if (!row) return fail(404, "NIET_GEVONDEN", "Onbekende inschrijving.");
  return json(await registrationById(db, id));
}

// ---------- Export en wissen ----------

// Excel (Belgische instellingen): UTF-8 met BOM en puntkomma's. Formules worden onschadelijk gemaakt.
export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportCsv(db: D1Database, config: RegistrationEvent) {
  const { results } = await db
    .prepare(
      `SELECT r.reference, r.status AS registration_status, r.parent_name, r.email, r.street, r.house_number,
         p.name, p.age, p.status, p.picked_up_at, o.status AS mail_status, r.suspected_duplicate, r.note, r.created_at
       FROM participants p JOIN registrations r ON r.id = p.registration_id LEFT JOIN mail_outbox o ON o.registration_id = r.id
       WHERE r.event_id = ?1 ORDER BY r.seq, p.id`,
    )
    .bind(config.id)
    .all<Record<string, unknown>>();
  const header = [
    "Inschrijvingsnummer",
    "Status inschrijving",
    "Ouder/verantwoordelijke",
    "E-mail",
    "Straat",
    "Huisnummer",
    "Naam",
    "Leeftijd",
    "Status deelnemer",
    "Cadeau afgehaald",
    "Mailstatus",
    "Mogelijk dubbel",
    "Notitie",
    "Ingeschreven op",
  ];
  const rows = results.map((r) =>
    [
      r.reference,
      r.registration_status === "active" ? "actief" : "geannuleerd",
      r.parent_name,
      r.email,
      r.street,
      r.house_number,
      r.name,
      r.age,
      r.status === "active" ? "actief" : "geannuleerd",
      r.picked_up_at ? "ja" : "nee",
      r.mail_status,
      r.suspected_duplicate ? "ja" : "nee",
      r.note,
      r.created_at,
    ]
      .map(csvCell)
      .join(";"),
  );
  return new Response(`﻿${[header.map(csvCell).join(";"), ...rows].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${config.id}-inschrijvingen.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Na het evenement: namen, e-mail en adressen wissen; aantallen en leeftijden blijven voor de statistiek.
async function erase(request: Request, db: D1Database, eventId: string) {
  const body = (await readJson(request)) ?? {};
  if (body.confirm !== "WISSEN") return fail(400, "VALIDATIE", "Typ WISSEN om te bevestigen.");
  const current = await summary(db, eventId);
  if (!current) return fail(404, "NIET_GEVONDEN", "Onbekend evenement.");
  if (current.status !== "closed") return fail(409, "VERBODEN", "Sluit eerst de inschrijvingen.");
  const now = nowIso();
  await db.batch([
    db.prepare("UPDATE participants SET name = '[gewist]', child_key = 'gewist:' || id, updated_at = ?2 WHERE event_id = ?1").bind(eventId, now),
    db
      .prepare(
        `UPDATE mail_outbox SET
           last_error = CASE WHEN status IN ('pending', 'sending') THEN 'Gegevens gewist vóór verzending.' ELSE NULL END,
           status = CASE WHEN status IN ('pending', 'sending') THEN 'failed' ELSE status END, lease_until = NULL
         WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = ?1)`,
      )
      .bind(eventId),
    db
      .prepare(
        `UPDATE registrations SET parent_name = '[gewist]', email = '[gewist]', street = NULL, house_number = NULL,
           address_key = NULL, note = NULL, updated_at = ?2 WHERE event_id = ?1`,
      )
      .bind(eventId, now),
    db.prepare("UPDATE events SET personal_data_erased_at = ?2, updated_at = ?2 WHERE id = ?1").bind(eventId, now),
    // Ook de kortlopende misbruiklogboeken (onomkeerbaar gemaakte internetadressen).
    db.prepare("DELETE FROM login_attempts"),
    db.prepare("DELETE FROM submit_log"),
  ]);
  return json(await summary(db, eventId));
}

// ---------- Router ----------

export async function handleAdmin(request: Request, env: Env, path: string[]) {
  if (!env.DB || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16)
    return fail(503, "NIET_GECONFIGUREERD", "Het beheer is nog niet ingesteld.");
  const db = env.DB;
  const method = request.method;
  if (method !== "GET" && !trustedMutation(request)) return fail(403, "VERBODEN", "Verzoek geweigerd.");
  const [section, key, action] = path;
  if (section === "login" && !key && method === "POST") return login(request, env);
  if (section === "logout" && !key && method === "POST")
    return json(null, 204, { "Set-Cookie": sessionCookie("", 0) });
  if (!(await validSession(env, request.headers.get("Cookie"))))
    return fail(401, "NIET_INGELOGD", "Log opnieuw in.");

  if (section === "evenementen") {
    await ensureEvents(db);
    if (!key && method === "GET") return json(await summaries(db));
    const config = key && Object.hasOwn(registrationEvents, key) ? registrationEvents[key] : undefined;
    if (!config) return fail(404, "NIET_GEVONDEN", "Onbekend evenement.");
    if (!action && method === "PATCH") return updateEvent(request, db, config.id);
    if (action === "inschrijvingen" && method === "GET") return json(await listRegistrations(db, config.id));
    if (action === "export" && method === "GET") return exportCsv(db, config);
    if (action === "wissen" && method === "POST") return erase(request, db, config.id);
  }
  const id = Number(key);
  if (Number.isInteger(id) && id > 0 && path.length <= 3) {
    if (section === "inschrijvingen" && !action && method === "PATCH") return updateRegistration(request, db, id);
    if (section === "inschrijvingen" && action === "deelnemers" && method === "POST") return addParticipant(request, db, id);
    if (section === "inschrijvingen" && action === "mail" && method === "POST") return resendConfirmation(db, id);
    if (section === "deelnemers" && !action && method === "PATCH") return updateParticipant(request, db, id);
  }
  return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
}
