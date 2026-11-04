// Bewaartermijn: namen, e-mailadressen en adressen worden na het evenement gewist; aantallen, leeftijden en
// afhaalcijfers blijven voor de historiek per editie. Wissen gebeurt met de knop in het beheer, of automatisch
// vanaf de wisdatum zodra de vereniging dat goedkeurt (autoErase in src/inschrijving/evenementen.ts).
import { registrationEvents, type RegistrationEvent } from "../src/inschrijving/evenementen.ts";
import { nowIso } from "./basis.ts";

// De datum van vandaag in België, als JJJJ-MM-DD (zelfde vorm als deleteBy).
export function todayInBelgium(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export const deleteByPassed = (config: RegistrationEvent, today = todayInBelgium()) => today >= config.deleteBy;

// Evenementen die de server nu zelf moet wissen: alleen met akkoord (autoErase) en vanaf de wisdatum.
export const dueForAutoErase = (events: RegistrationEvent[], today = todayInBelgium()) =>
  events.filter((e) => e.autoErase && deleteByPassed(e, today)).map((e) => e.id);

export function eraseStatements(db: D1Database, eventId: string, now: string) {
  return [
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
    // In dezelfde batch dicht: een gewist evenement kan nooit open blijven, ook niet bij een gelijktijdige wijziging.
    db.prepare("UPDATE events SET status = 'closed', personal_data_erased_at = ?2, updated_at = ?2 WHERE id = ?1").bind(eventId, now),
    // Ook de kortlopende misbruiklogboeken (gehashte internetadressen).
    db.prepare("DELETE FROM login_attempts"),
    db.prepare("DELETE FROM submit_log"),
  ];
}

// Sluit en wist elk evenement waarvan de wisdatum bereikt is en dat automatisch gewist mag worden. Draait bij elke
// wachtrijronde van het Apps Script (elke 5 minuten) en bij het beheeroverzicht; al gewiste evenementen blijven ongemoeid.
export async function eraseExpired(db: D1Database) {
  // De misbruiklogboeken blijven hoogstens een dag staan (belofte in de privacyverklaring), ook als er daarna geen
  // nieuwe inschrijving of aanmelding meer komt die ze zou opruimen.
  const dayAgo = nowIso(-24 * 3600_000);
  await db.batch([
    db.prepare("DELETE FROM submit_log WHERE created_at < ?1").bind(dayAgo),
    db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?1").bind(dayAgo),
  ]);
  const due = dueForAutoErase(Object.values(registrationEvents));
  if (!due.length) return;
  const { results } = await db
    .prepare("SELECT id FROM events WHERE personal_data_erased_at IS NULL AND id IN (SELECT value FROM json_each(?1))")
    .bind(JSON.stringify(due))
    .all<{ id: string }>();
  for (const { id } of results) await db.batch(eraseStatements(db, id, nowIso()));
}
