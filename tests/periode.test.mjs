// Inschrijvingsperiode (migratie 0008): de echte serverfuncties op een echte SQLite-database in het geheugen (D1 is SQLite),
// met nagebootste tijd en een nagebootste spamcontrole. Uitsluitend fictieve gegevens, geen netwerk.
// De volledige keten met wrangler en de echte D1-opslag staat in tests/integratie/inschrijving.mjs.
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createSession, handleAdmin } from "../server/beheer.ts";
import { publicStatus, register } from "../server/inschrijven.ts";
import { registrationEvents } from "../src/inschrijving/evenementen.ts";
import {
  fromBrusselsInput,
  periodPhase,
  registrationNotice,
  registrationStatus,
  toBrusselsInput,
} from "../src/inschrijving/periode.ts";

const dir = new URL("../migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const NEW = "0008_inschrijvingsperiode.sql";
const apply = (db, list) => list.forEach((f) => db.exec(readFileSync(new URL(f, dir), "utf8")));
const EVENT = "sinterklaas-2026";

// Belgische tijd in november = UTC+1.
const OPENS = "2026-11-09T23:00:00.000Z";
const CLOSES = "2026-11-27T23:00:00.000Z";
const PERIOD = { opensAt: OPENS, closesAt: CLOSES };
const BEFORE_TEXT = "Inschrijven mogelijk van 10 tot en met 27 november 2026.";
const DURING_TEXT = "Inschrijvingen geopend tot en met 27 november 2026.";
const CLOSED_TEXT = "De inschrijvingen zijn gesloten.";
const FULL_TEXT = "De inschrijving is volzet. Alle cadeautjes zijn vergeven.";
const dummyAnswer = ["XXXX", "DUMMY", "TOKEN", "XXXX"].join(".");

// Genoeg van de D1-interface: voorbereide statements, en batch = één transactie, net als D1.
function d1(sqlite) {
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (list) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const item of list) results.push(await item.all());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function snapshot(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all().map((r) => ({ ...r }))]));
}

// Fictieve stand zoals in productie: open, geen maximum, een gezin met twee kinderen, verstuurde mail, akkoord met het reglement.
function productionLike() {
  const db = new DatabaseSync(":memory:");
  apply(db, files.filter((f) => f !== NEW));
  db.exec(`
    INSERT INTO events (id, capacity, status, next_seq, capacity_limited) VALUES ('${EVENT}', 150, 'open', 3, 0);
    INSERT INTO events (id, capacity, status) VALUES ('ander-feest-2027', 0, 'closed');
    INSERT INTO registrations (event_id, submission_id, seq, reference, parent_name, email, street, house_number, address_key,
      co_parent, rules_version, rules_accepted_at, created_at, updated_at)
    VALUES ('${EVENT}', 'aaaaaaaa-0000-4000-8000-000000000001', 2, 'SINT26-0002', 'Fictieve Ouder', 'fictief@example.org',
      'Zandstraat', '7', 'zandstraat|7', 1, '2026-11-03', '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z');
    INSERT INTO participants (registration_id, event_id, name, age, child_key, created_at, updated_at)
    VALUES (1, '${EVENT}', 'Noor', 5, 'noor|zandstraat|7', '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z'),
           (1, '${EVENT}', 'Milan', 8, 'milan|zandstraat|7', '2026-11-03T10:40:00.000Z', '2026-11-03T10:40:00.000Z');
    INSERT INTO mail_outbox (registration_id, status, attempts, next_attempt_at, sent_at)
    VALUES (1, 'sent', 1, '2026-11-03T10:40:00.000Z', '2026-11-03T10:41:00.000Z');
  `);
  return db;
}

let db;
let env;
let spamChecks;
let family = 0;

beforeEach(() => {
  db = productionLike();
  apply(db, [NEW]);
  // Willekeurige proefwaarden, pas bij het draaien gemaakt.
  const vars = ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET", "ADMIN_PASSWORD"].map((name) => [name, randomBytes(24).toString("hex")]);
  env = { DB: d1(db), ...Object.fromEntries(vars) };
  spamChecks = 0;
  mock.method(globalThis, "fetch", async () => {
    spamChecks++;
    return new Response(JSON.stringify({ success: true }));
  });
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-04T12:00:00.000Z") });
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

const at = (iso) => mock.timers.setTime(Date.parse(iso));
const statusNow = async () => (await publicStatus(env, EVENT)).json();
const rowCount = () => db.prepare("SELECT COUNT(*) AS n FROM registrations").get().n;

function newFamily() {
  family++;
  const letter = (n) => String.fromCharCode(97 + (n % 26));
  return {
    eventId: EVENT,
    submissionId: randomUUID(),
    parent: { name: `Testouder ${family}`, email: `gezin${family}@example.org` },
    address: { street: "Zandstraat", houseNumber: String(100 + family), coParent: false },
    participants: [{ name: `Kind${letter(family)}${letter(Math.floor(family / 26))}`, age: 5 }],
    confirmations: { rules: true, privacy: true },
    rulesVersion: registrationEvents[EVENT].rules.version,
    turnstileToken: dummyAnswer,
  };
}

let ipCount = 0;
function send(body) {
  ipCount++;
  return register(
    new Request("https://site.example/api/inschrijvingen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": `198.18.${Math.floor(ipCount / 256)}.${ipCount % 256}` },
      body: JSON.stringify(body),
    }),
    env,
  );
}

async function admin(method, url, body, headers = {}) {
  const cookie = `oosthoek_beheer=${await createSession(env)}`;
  const request = new Request(`https://site.example/api/beheer/${url}`, {
    method,
    headers: { Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleAdmin(request, env, url.split("/"));
}
const savePeriod = (period) => admin("PATCH", `evenementen/${EVENT}`, { period });
const storedPeriod = () => {
  const row = db.prepare("SELECT registration_opens_at AS o, registration_closes_at AS c FROM events WHERE id = ?1").get(EVENT);
  return { opensAt: row.o, closesAt: row.c };
};

test("de vier grensmomenten van de opdracht: 9 nov 23:59 dicht, 10 nov 00:00 open, 27 nov 23:59 open, 28 nov 00:00 dicht", async () => {
  const cases = [
    ["2026-11-09T22:59:00.000Z", "upcoming", 423, BEFORE_TEXT],
    ["2026-11-09T22:59:59.999Z", "upcoming", 423, BEFORE_TEXT],
    [OPENS, "open", 201, DURING_TEXT],
    ["2026-11-27T22:59:00.000Z", "open", 201, DURING_TEXT],
    ["2026-11-27T22:59:59.999Z", "open", 201, DURING_TEXT],
    [CLOSES, "closed", 423, CLOSED_TEXT],
    ["2026-12-25T10:00:00.000Z", "closed", 423, CLOSED_TEXT],
  ];
  for (const [now, status, http, notice] of cases) {
    at(now);
    const before = rowCount();
    const calls = spamChecks;
    const pub = await statusNow();
    assert.equal(pub.status, status, now);
    assert.deepEqual(pub.period, PERIOD);
    assert.equal(registrationNotice(pub.status, pub.period), notice, now);
    const res = await send(newFamily());
    assert.equal(res.status, http, now);
    assert.equal(rowCount(), before + (http === 201 ? 1 : 0), now);
    if (http === 423) {
      const error = await res.json();
      assert.equal(error.error, "GESLOTEN");
      assert.equal(error.message, notice);
      // Geweigerd vóór de spamcontrole: buiten de periode geen oproep naar Cloudflare.
      assert.equal(spamChecks, calls, now);
    }
  }
});

test("handmatig gesloten blijft gesloten binnen de periode; handmatig open heropent niets na het einde", async () => {
  at("2026-11-15T10:00:00.000Z");
  assert.equal((await statusNow()).status, "open");
  assert.equal((await admin("PATCH", `evenementen/${EVENT}`, { status: "closed" })).status, 200);
  assert.equal((await statusNow()).status, "closed");
  const refused = await send(newFamily());
  assert.equal(refused.status, 423);
  assert.equal((await refused.json()).message, CLOSED_TEXT);
  // Weer handmatig open: de periode beslist opnieuw.
  assert.equal((await admin("PATCH", `evenementen/${EVENT}`, { status: "open" })).status, 200);
  assert.equal((await send(newFamily())).status, 201);
  // Na de einddatum: de schakelaar blijft op open staan, maar er kan niets meer bij.
  at(CLOSES);
  const summary = await (await admin("PATCH", `evenementen/${EVENT}`, { status: "open" })).json();
  assert.deepEqual([summary.status, summary.publicStatus], ["open", "closed"]);
  assert.equal((await statusNow()).status, "closed");
  assert.equal((await send(newFamily())).status, 423);
});

test("beheer: de periode opslaan in Belgische tijd, ook de UTC-waarde; de site volgt meteen", async () => {
  at("2026-11-04T12:00:00.000Z");
  const list = await (await admin("GET", "evenementen")).json();
  assert.deepEqual(list[0].period, PERIOD);
  assert.equal(list[0].publicStatus, "upcoming");
  // Vervroegen naar vandaag: meteen open.
  const res = await savePeriod({ opensAt: "2026-11-04T13:00", closesAt: "2026-11-27T18:30" });
  assert.equal(res.status, 200);
  const saved = await res.json();
  assert.deepEqual(saved.period, { opensAt: "2026-11-04T12:00:00.000Z", closesAt: "2026-11-27T17:30:00.000Z" });
  assert.deepEqual(storedPeriod(), saved.period);
  assert.equal(saved.publicStatus, "open");
  assert.equal(saved.status, "open");
  const pub = await statusNow();
  assert.equal(pub.status, "open");
  assert.equal(registrationNotice(pub.status, pub.period), "Inschrijvingen geopend tot 27 november 2026 om 18.30 uur.");
  assert.equal((await send(newFamily())).status, 201);
  // Terugzetten op de definitieve periode geeft precies de waarden van de migratie.
  const back = await (await savePeriod({ opensAt: "2026-11-10T00:00", closesAt: "2026-11-28T00:00" })).json();
  assert.deepEqual(back.period, PERIOD);
  assert.equal((await statusNow()).status, "upcoming");
});

test("beheer: ongeldige periodes worden geweigerd en wijzigen niets", async () => {
  for (const bad of [
    null,
    "2026-11-10T00:00",
    {},
    { opensAt: "2026-11-10T00:00" },
    { closesAt: "2026-11-28T00:00" },
    { opensAt: "2026-11-28T00:00", closesAt: "2026-11-10T00:00" },
    { opensAt: "2026-11-10T00:00", closesAt: "2026-11-10T00:00" },
    { opensAt: "10/11/2026", closesAt: "2026-11-28T00:00" },
    { opensAt: "2026-02-31T00:00", closesAt: "2026-11-28T00:00" },
    // Dit uur bestaat niet: op 28 maart 2027 springt de klok van 2 naar 3 uur.
    { opensAt: "2027-03-28T02:30", closesAt: "2027-04-01T00:00" },
    { opensAt: 1, closesAt: 2 },
  ]) {
    const res = await savePeriod(bad);
    assert.equal(res.status, 400, JSON.stringify(bad));
    assert.equal((await res.json()).error, "VALIDATIE");
    assert.deepEqual(storedPeriod(), PERIOD);
  }
});

test("beheer: zonder geldige aanmelding of van een ander domein wijzigt de periode niet; na het wissen ook niet meer", async () => {
  const change = JSON.stringify({ period: { opensAt: "2026-01-01T00:00", closesAt: "2099-01-01T00:00" } });
  const patch = (headers) =>
    handleAdmin(
      new Request(`https://site.example/api/beheer/evenementen/${EVENT}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...headers }, body: change }),
      env,
      ["evenementen", EVENT],
    );
  assert.equal((await patch({})).status, 401);
  assert.equal((await patch({ Cookie: `oosthoek_beheer=${Math.floor(Date.now() / 1000) + 3600}.vervalst` })).status, 401);
  for (const url of ["evenementen", `evenementen/${EVENT}/inschrijvingen`, `evenementen/${EVENT}/export`]) {
    const res = await handleAdmin(new Request(`https://site.example/api/beheer/${url}`), env, url.split("/"));
    assert.equal(res.status, 401, url);
  }
  const foreign = await admin("PATCH", `evenementen/${EVENT}`, JSON.parse(change), { Origin: "https://kwaadaardig.example" });
  assert.equal(foreign.status, 403);
  assert.deepEqual(storedPeriod(), PERIOD);

  await admin("PATCH", `evenementen/${EVENT}`, { status: "closed" });
  assert.equal((await admin("POST", `evenementen/${EVENT}/wissen`, { confirm: "WISSEN" })).status, 200);
  const erased = await savePeriod({ opensAt: "2026-11-10T00:00", closesAt: "2026-12-28T00:00" });
  assert.equal(erased.status, 409);
  assert.deepEqual(storedPeriod(), PERIOD);
});

test("migratie 0008 raakt geen bestaande inschrijving, nummer, reglementakkoord of mail; alleen de periode van Sinterklaas komt erbij", () => {
  const old = productionLike();
  const before = snapshot(old);
  apply(old, [NEW]);
  const after = snapshot(old);
  assert.deepEqual(Object.keys(after), Object.keys(before));
  for (const table of Object.keys(before).filter((t) => t !== "events")) assert.deepEqual(after[table], before[table], table);
  assert.equal(after.registrations[0].reference, "SINT26-0002");
  assert.equal(after.registrations[0].rules_version, "2026-11-03");
  const period = (row) => [row.registration_opens_at, row.registration_closes_at];
  const strip = ({ registration_opens_at, registration_closes_at, ...rest }) => rest;
  assert.deepEqual(after.events.map(strip), before.events);
  assert.deepEqual(period(after.events.find((e) => e.id === EVENT)), [OPENS, CLOSES]);
  // Een ander evenement krijgt geen periode: dat blijft dicht tot het beheer er een instelt.
  assert.deepEqual(period(after.events.find((e) => e.id === "ander-feest-2027")), [null, null]);
});

test("de database weigert zelf een inschrijving buiten de periode, ook van oude code zonder periodecontrole", () => {
  const insert = (eventId, createdAt, n) =>
    db.exec(`INSERT INTO registrations (event_id, submission_id, seq, reference, parent_name, email, created_at, updated_at)
      VALUES ('${eventId}', 'bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}', ${n + 10}, 'T-${n}', 'Fictieve Ouder', 'f@example.org', '${createdAt}', '${createdAt}')`);
  const before = rowCount();
  for (const [i, createdAt] of ["2026-11-09T22:59:59.999Z", CLOSES, "2027-01-01T00:00:00.000Z"].entries())
    assert.throws(() => insert(EVENT, createdAt, i), /gesloten/, createdAt);
  assert.equal(rowCount(), before);
  insert(EVENT, OPENS, 10);
  insert(EVENT, "2026-11-27T22:59:59.999Z", 11);
  assert.equal(rowCount(), before + 2);
  // Geen periode = dicht, onbekend evenement = dicht.
  assert.throws(() => insert("ander-feest-2027", "2026-11-15T10:00:00.000Z", 12), /gesloten/);
  assert.throws(() => insert("bestaat-niet", "2026-11-15T10:00:00.000Z", 13), /gesloten/);
});

test("buiten de periode blijven het beheer en de bestaande inschrijvingen werken: kind toevoegen, corrigeren, zelfde formulier opnieuw", async () => {
  at("2026-11-15T10:00:00.000Z");
  const body = newFamily();
  const first = await send(body);
  assert.equal(first.status, 201);
  const { reference } = await first.json();
  at(CLOSES);
  // Een haperende verbinding na de sluiting: dezelfde inzending geeft dezelfde inschrijving terug, geen fout en geen tweede.
  const again = await send(body);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).reference, reference);
  const added = await admin("POST", "inschrijvingen/1/deelnemers", { name: "Vic", age: 4 });
  assert.equal(added.status, 200);
  assert.equal((await admin("PATCH", "inschrijvingen/1", { note: "telefonisch nagekeken" })).status, 200);
  const list = await (await admin("GET", `evenementen/${EVENT}/inschrijvingen`)).json();
  assert.deepEqual(list.find((r) => r.reference === "SINT26-0002").participants.map((p) => p.name), ["Noor", "Milan", "Vic"]);
});

test("het optionele maximum en één cadeautje per kind blijven gelden binnen de periode", async () => {
  at("2026-11-15T10:00:00.000Z");
  // Twee kinderen staan al ingeschreven: maximum 3 laat er nog precies één toe.
  assert.equal((await admin("PATCH", `evenementen/${EVENT}`, { capacity: 3 })).status, 200);
  const body = newFamily();
  assert.equal((await send(body)).status, 201);
  const pub = await statusNow();
  assert.deepEqual([pub.status, pub.available], ["full", 0]);
  assert.equal(registrationNotice(pub.status, pub.period), FULL_TEXT);
  const full = await send(newFamily());
  assert.equal(full.status, 409);
  assert.equal((await full.json()).error, "VOLZET");
  // Vóór de start en na het einde wint de periode van "volzet".
  at("2026-11-09T22:59:00.000Z");
  assert.equal((await statusNow()).status, "upcoming");
  at(CLOSES);
  assert.equal((await statusNow()).status, "closed");
  // Geen maximum meer: hetzelfde kind blijft geweigerd.
  at("2026-11-15T10:00:00.000Z");
  assert.equal((await admin("PATCH", `evenementen/${EVENT}`, { capacity: null })).status, 200);
  const dup = await send({ ...newFamily(), address: body.address, participants: body.participants });
  assert.equal(dup.status, 409);
  assert.equal((await dup.json()).error, "DUBBEL");
});

test("de wisdatum sluit los van de periode: de site toont gesloten, niet 'nog niet beschikbaar'", async () => {
  at("2027-02-01T10:00:00.000Z");
  const pub = await statusNow();
  assert.deepEqual([pub.status, pub.available, pub.turnstileSiteKey], ["closed", null, null]);
  assert.deepEqual(pub.period, PERIOD);
  const list = await (await admin("GET", "evenementen")).json();
  assert.deepEqual([list[0].status, list[0].publicStatus, list[0].deleteByPassed, list[0].personalDataErased], ["closed", "closed", true, true]);
  assert.equal((await send(newFamily())).status, 423);
});

test("zonder ingestelde periode blijft een evenement dicht, ook handmatig open", () => {
  assert.equal(registrationStatus("open", null, null, "2026-11-15T10:00:00.000Z"), "closed");
  assert.equal(registrationStatus("closed", PERIOD, null, "2026-11-15T10:00:00.000Z"), "closed");
  assert.equal(registrationStatus("closed", PERIOD, null, "2026-11-04T10:00:00.000Z"), "closed");
  assert.equal(registrationStatus("open", PERIOD, 0, "2026-11-15T10:00:00.000Z"), "full");
  assert.equal(registrationStatus("open", PERIOD, 4, "2026-11-15T10:00:00.000Z"), "open");
  assert.equal(registrationNotice("closed", null), CLOSED_TEXT);
});

test("de fase: begin inbegrepen, einde niet", () => {
  assert.equal(periodPhase(PERIOD, "2026-11-09T22:59:59.999Z"), "before");
  assert.equal(periodPhase(PERIOD, OPENS), "during");
  assert.equal(periodPhase(PERIOD, "2026-11-27T22:59:59.999Z"), "during");
  assert.equal(periodPhase(PERIOD, CLOSES), "after");
});

test("de teksten letterlijk, en leesbaar bij andere datums en uren", () => {
  assert.equal(registrationNotice("upcoming", PERIOD), BEFORE_TEXT);
  assert.equal(registrationNotice("open", PERIOD), DURING_TEXT);
  assert.equal(registrationNotice("closed", PERIOD), CLOSED_TEXT);
  assert.equal(registrationNotice("full", PERIOD), FULL_TEXT);
  const brussels = (opens, closes) => ({ opensAt: fromBrusselsInput(opens), closesAt: fromBrusselsInput(closes) });
  const upcoming = (opens, closes) => registrationNotice("upcoming", brussels(opens, closes));
  const open = (opens, closes) => registrationNotice("open", brussels(opens, closes));
  assert.equal(upcoming("2026-10-28T00:00", "2026-11-28T00:00"), "Inschrijven mogelijk van 28 oktober tot en met 27 november 2026.");
  assert.equal(upcoming("2026-12-28T00:00", "2027-01-03T00:00"), "Inschrijven mogelijk van 28 december 2026 tot en met 2 januari 2027.");
  assert.equal(upcoming("2026-11-10T09:00", "2026-11-28T00:00"), "Inschrijven mogelijk van 10 november om 9.00 uur tot en met 27 november 2026.");
  assert.equal(upcoming("2026-11-10T00:00", "2026-11-27T18:00"), "Inschrijven mogelijk van 10 tot 27 november 2026 om 18.00 uur.");
  assert.equal(upcoming("2026-11-10T00:00", "2026-11-11T00:00"), "Inschrijven mogelijk op 10 november 2026.");
  assert.equal(open("2026-11-10T00:00", "2026-11-27T18:00"), "Inschrijvingen geopend tot 27 november 2026 om 18.00 uur.");
  // Middernacht in de zomer: het einde valt in UTC op de dag ervoor, de laatste dag blijft juist.
  assert.equal(open("2027-06-01T00:00", "2027-07-01T00:00"), "Inschrijvingen geopend tot en met 30 juni 2027.");
  // De einddatum net na de overgang naar wintertijd.
  assert.equal(open("2027-10-01T00:00", "2027-11-01T00:00"), "Inschrijvingen geopend tot en met 31 oktober 2027.");
});

test("Belgische tijd: heen en terug, ook rond de zomertijd", () => {
  assert.equal(fromBrusselsInput("2026-11-10T00:00"), OPENS);
  assert.equal(fromBrusselsInput("2026-11-28T00:00"), CLOSES);
  assert.equal(toBrusselsInput(OPENS), "2026-11-10T00:00");
  assert.equal(toBrusselsInput(CLOSES), "2026-11-28T00:00");
  // Zomer = UTC+2, winter = UTC+1.
  assert.equal(fromBrusselsInput("2027-07-01T12:00"), "2027-07-01T10:00:00.000Z");
  assert.equal(fromBrusselsInput("2027-01-15T12:00"), "2027-01-15T11:00:00.000Z");
  // 28 maart 2027: van 2 uur naar 3 uur. 2:30 bestaat niet; 1:59 en 3:00 liggen één minuut uit elkaar.
  assert.equal(fromBrusselsInput("2027-03-28T02:30"), null);
  assert.equal(fromBrusselsInput("2027-03-28T01:59"), "2027-03-28T00:59:00.000Z");
  assert.equal(fromBrusselsInput("2027-03-28T03:00"), "2027-03-28T01:00:00.000Z");
  // 31 oktober 2027: 2:30 komt twee keer voor; het eerste moment telt.
  assert.equal(fromBrusselsInput("2027-10-31T02:30"), "2027-10-31T00:30:00.000Z");
  assert.equal(toBrusselsInput("2027-10-31T00:30:00.000Z"), "2027-10-31T02:30");
  assert.equal(toBrusselsInput("2027-10-31T01:30:00.000Z"), "2027-10-31T02:30");
  for (const bad of ["", "2026-11-10", "2026-11-10 00:00", "2026-11-10T24:00", "2026-13-01T00:00", "2026-02-30T12:00", "2026-11-10T00:00:00", null, undefined, 5, {}])
    assert.equal(fromBrusselsInput(bad), null, String(bad));
});
