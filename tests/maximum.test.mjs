// Optioneel maximum (migratie 0007) op een echte SQLite-database in het geheugen (D1 is SQLite), zonder netwerk.
// Gelijktijdige inschrijvingen via de server staan in tests/integratie/inschrijving.mjs (npm run test:inschrijving).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { CAPACITY_GUARD_SQL, freePlaces } from "../server/basis.ts";

const dir = new URL("../migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const NEW = "0007_maximum_optioneel.sql";
const apply = (db, list) => list.forEach((f) => db.exec(readFileSync(new URL(f, dir), "utf8")));
const EVENT = "sinterklaas-2026";

function snapshot(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all().map((r) => ({ ...r }))]));
}

function addChildren(db, count, from = 0) {
  const add = db.prepare(
    `INSERT INTO participants (registration_id, event_id, name, age, child_key, created_at, updated_at)
     VALUES (1, ?1, ?2, 5, ?3, '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z')`,
  );
  for (let i = from; i < from + count; i++) add.run(EVENT, `Kind${i}`, `kind${i}|zandstraat|${i}`);
}

const guard = (db) => db.prepare(CAPACITY_GUARD_SQL).run(EVENT);
const active = (db) => db.prepare("SELECT COUNT(*) AS n FROM participants WHERE status = 'active'").get().n;

test("migratie 0007 voegt alleen een kolom toe: inschrijvingen, nummers, mails en reglementakkoorden blijven, de grens van 150 vervalt", () => {
  assert.equal(files.at(-1), NEW);
  const db = new DatabaseSync(":memory:");
  apply(db, files.slice(0, -1));
  // Fictieve stand zoals in productie: open, grens 150, een gezin met twee kinderen, verstuurde mail, akkoord met het reglement.
  db.exec(`
    INSERT INTO events (id, capacity, status, next_seq) VALUES ('${EVENT}', 150, 'open', 3);
    INSERT INTO registrations (event_id, submission_id, seq, reference, parent_name, email, street, house_number, address_key,
      co_parent, rules_version, rules_accepted_at, created_at, updated_at)
    VALUES ('${EVENT}', 'aaaaaaaa-0000-4000-8000-000000000001', 2, 'SINT26-0002', 'Fictieve Ouder', 'fictief@example.org',
      'Zandstraat', '7', 'zandstraat|7', 1, '2026-11-03', '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z');
    INSERT INTO mail_outbox (registration_id, status, attempts, next_attempt_at, sent_at)
    VALUES (1, 'sent', 1, '2026-11-03T10:40:00.000Z', '2026-11-03T10:41:00.000Z');
  `);
  addChildren(db, 2);
  const before = snapshot(db);
  apply(db, [NEW]);
  const after = snapshot(db);
  assert.deepEqual(Object.keys(after), Object.keys(before));
  for (const table of Object.keys(before).filter((t) => t !== "events")) assert.deepEqual(after[table], before[table], table);
  const [event] = after.events;
  const { capacity_limited, ...rest } = event;
  assert.deepEqual(rest, before.events[0]);
  assert.equal(capacity_limited, 0);
  assert.equal(after.registrations[0].rules_version, "2026-11-03");
  assert.equal(after.registrations[0].reference, "SINT26-0002");
  // Zonder maximum ook boven de oude 150 in orde.
  addChildren(db, 160, 2);
  guard(db);
  assert.equal(active(db), 162);
  assert.throws(() => db.exec(`UPDATE events SET capacity_limited = 2 WHERE id = '${EVENT}'`), /CHECK/);
});

test("ingesteld maximum: de bewaking laat precies tot het maximum toe en draait de hele wijziging terug als het te veel is", () => {
  const db = new DatabaseSync(":memory:");
  apply(db, files);
  db.exec(`
    INSERT INTO events (id, capacity, status, capacity_limited) VALUES ('${EVENT}', 0, 'open', 0);
    INSERT INTO registrations (event_id, submission_id, seq, reference, parent_name, email, created_at, updated_at)
    VALUES ('${EVENT}', 'aaaaaaaa-0000-4000-8000-000000000002', 1, 'SINT26-0001', 'Fictieve Ouder', 'fictief@example.org',
      '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z');
  `);
  addChildren(db, 3);
  guard(db);
  // Maximum 4: één kind erbij lukt, nog één niet, en dan blijft alles zoals het was (zoals een D1-batch).
  db.exec(`UPDATE events SET capacity = 4, capacity_limited = 1 WHERE id = '${EVENT}'`);
  addChildren(db, 1, 3);
  guard(db);
  db.exec("BEGIN");
  addChildren(db, 1, 4);
  assert.throws(() => guard(db), /volzet/);
  db.exec("ROLLBACK");
  assert.equal(active(db), 4);
  // Een onbekend evenement is nooit "in orde".
  assert.throws(() => db.prepare(CAPACITY_GUARD_SQL).run("onbekend"), /volzet/);
  // Maximum weer wissen: geen grens meer.
  db.exec(`UPDATE events SET capacity_limited = 0 WHERE id = '${EVENT}'`);
  addChildren(db, 1, 4);
  guard(db);
  assert.equal(active(db), 5);
});

test("vrije plaatsen alleen bij een ingesteld maximum", () => {
  assert.equal(freePlaces(0, 150, 10), null);
  assert.equal(freePlaces(1, 150, 140), 10);
  assert.equal(freePlaces(1, 150, 160), 0);
});
