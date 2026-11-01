// Snelle controles van het inschrijfsysteem zonder database of netwerk: validatie, bevestigingsmail,
// beheersessie, CSV en het Apps Script (met nagebootste Google-diensten). De volledige keten met database
// staat in tests/integratie/inschrijving.mjs (npm run test:inschrijving).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import vm from "node:vm";
import { registrationEvents, sinterklaasRegistration } from "../src/inschrijving/evenementen.ts";
import { confirmationTemplates, joinNames, renderConfirmation } from "../src/inschrijving/bevestigingsmail.ts";
import { cleanChildName, validateRegistration } from "../server/validatie.ts";
import { addressKey, connectionOf } from "../server/basis.ts";
import { createSession, csvCell, validSession } from "../server/beheer.ts";
import { backoffMs } from "../server/mail.ts";

const doc = (name) => readFileSync(new URL(`../../../Documentatie/${name}`, import.meta.url), "utf8");
// Turnstile-testantwoord uit de Cloudflare-documentatie; werkt alleen met de testsleutels.
const dummyAnswer = ["XXXX", "DUMMY", "TOKEN", "XXXX"].join(".");

test("feestelijke mail is exact het aangeleverde sjabloon en de tekstversie", () => {
  const template = confirmationTemplates["sinterklaas-2026"];
  assert.equal(template.html.trim(), doc("Oosthoek_Sinterklaas_Email_Template.html").replace(/\r\n/g, "\n").trim());
  const text = doc("Oosthoek_Sinterklaas_Email_Tekstversie.txt").replace(/\r\n/g, "\n").replace(/^Onderwerp:.*\n\n/, "");
  assert.equal(template.text.trim(), text.trim());
  for (const part of [template.html, template.text, template.subject]) {
    const fields = part.match(/\{\{[^}]*\}\}/g) ?? [];
    assert.ok(fields.every((f) => f === "{{inschrijvingsnummer}}" || f === "{{kind_namen}}"), fields.join());
  }
  // Elke afbeelding komt van de eigen website en staat in public/email/.
  for (const [, file] of template.html.matchAll(/src="https:\/\/wijkvereniging-oosthoek\.pages\.dev\/sinterklaas\/email\/([^"]+)"/g))
    assert.ok(readFileSync(new URL(`../public/email/${file}`, import.meta.url)).length > 1000, file);
  assert.equal([...template.html.matchAll(/<img /g)].length, 4);
  assert.equal([...template.html.matchAll(/alt="[^"]+"/g)].length, 4);
});

test("elk evenement met inschrijving heeft een eigen bevestigingsmail", () => {
  for (const id of Object.keys(registrationEvents)) assert.ok(confirmationTemplates[id], id);
});

test("mail vult inschrijvingsnummer en alle voornamen in, veilig als HTML", () => {
  assert.equal(joinNames(["Noor"]), "Noor");
  assert.equal(joinNames(["Noor", "Milan"]), "Noor en Milan");
  assert.equal(joinNames(["Noor", "Milan", "Lotte"]), "Noor, Milan en Lotte");
  const mail = renderConfirmation("sinterklaas-2026", {
    reference: "SINT26-0007",
    childNames: ["Noor", "Milan", "<b>Jan & Piet</b>"],
  });
  assert.ok(mail);
  assert.equal(mail.subject, "Bevestiging inschrijving — Sinterklaas Oosthoek 2026 — SINT26-0007");
  assert.match(mail.html, />SINT26-0007</);
  assert.match(mail.html, />Noor, Milan en &lt;b&gt;Jan &amp; Piet&lt;\/b&gt;</);
  assert.doesNotMatch(mail.html, /<b>Jan/);
  assert.match(mail.text, /Inschrijvingsnummer: SINT26-0007\nIngeschreven kind\(eren\): Noor, Milan en <b>Jan & Piet<\/b>\n/);
  assert.doesNotMatch(mail.html + mail.text + mail.subject, /\{\{/);
  // Geen dubbele aanhef, felicitatie of afsluiting in de tekstversie.
  for (const phrase of ["Beste mama", "Hoera", "Vrolijke groetjes", "Inschrijvingsnummer:"])
    assert.equal(mail.text.split(phrase).length - 1, 1, phrase);
  assert.equal(renderConfirmation("onbekend", { reference: "X", childNames: ["A"] }), null);
});

function form(overrides = {}) {
  return {
    eventId: "sinterklaas-2026",
    submissionId: randomUUID(),
    parent: { name: "Testouder Fictief", email: "ouder@example.org" },
    address: { street: "Teststraat", houseNumber: "12A" },
    participants: [
      { name: "Noor", age: 6 },
      { name: "Milan", age: 9 },
    ],
    confirmations: { area: true, privacy: true },
    turnstileToken: dummyAnswer,
    ...overrides,
  };
}

test("validatie: geldig gezin met meerdere kinderen", () => {
  const result = validateRegistration(sinterklaasRegistration, form());
  assert.equal(result.ok, true);
  assert.equal(result.value.participants.length, 2);
  assert.equal(result.value.addressKey, "teststraat|12a");
});

test("validatie weigert ongeldige of te veel gegevens", () => {
  const fieldsOf = (body) => {
    const result = validateRegistration(sinterklaasRegistration, body);
    assert.equal(result.ok, false);
    return Object.keys(result.fields);
  };
  assert.deepEqual(fieldsOf(form({ parent: { name: "Testouder", email: "geen-mail" } })), ["parent.email"]);
  assert.deepEqual(fieldsOf(form({ participants: [{ name: "Noor", age: 13 }] })), ["participants.0.age"]);
  assert.deepEqual(fieldsOf(form({ participants: [] })), ["participants"]);
  const nine = Array.from({ length: 9 }, (_, i) => ({ name: `Kind${"ABCDEFGHI"[i]}`, age: 5 }));
  assert.deepEqual(fieldsOf(form({ participants: nine })), ["participants"]);
  assert.deepEqual(fieldsOf(form({ participants: [{ name: "Noor", age: 5 }, { name: " noor ", age: 7 }] })), ["participants.1.name"]);
  assert.deepEqual(fieldsOf(form({ confirmations: { area: true, privacy: false } })), ["confirmations.privacy"]);
  assert.deepEqual(fieldsOf(form({ confirmations: { area: false, privacy: true } })), ["confirmations.area"]);
  assert.deepEqual(fieldsOf(form({ website: "http://spam.example" })), ["website"]);
  assert.deepEqual(fieldsOf(form({ submissionId: "1" })), ["submissionId"]);
  assert.deepEqual(fieldsOf(form({ turnstileToken: "" })), ["turnstileToken"]);
  assert.deepEqual(fieldsOf(form({ address: { street: "Teststraat", houseNumber: "abc" } })), ["address.houseNumber"]);
  assert.deepEqual(fieldsOf(form({ participants: [{ name: "http://evil.be", age: 5 }] })), ["participants.0.name"]);
});

test("voornamen: alleen letters, spatie, - en ', dus geen links of code in de mail", () => {
  for (const ok of ["Noor", "Jean-Luc", "N'Golo", "Zoë", "Anne Marie", "Émile"]) assert.equal(cleanChildName(ok), ok);
  for (const bad of ["http://evil.be", "evil.be", "<b>Lotte</b>", "Kind1", "-Noor", "", "a".repeat(51)])
    assert.equal(cleanChildName(bad), null, bad);
});

test("adressleutel: schrijfwijzen gelijk, verschillende huisnummers verschillend", () => {
  assert.equal(addressKey("Fictieve Dreef", "12 B"), addressKey("fictieve  dreef", "12b"));
  assert.equal(addressKey("Fictieve Dreef", "12-3"), addressKey("Fictieve Dreef", "12/3"));
  assert.notEqual(addressKey("Fictieve Dreef", "12/3"), addressKey("Fictieve Dreef", "123"));
  assert.notEqual(addressKey("Fictieve Dreef", "1/23"), addressKey("Fictieve Dreef", "12/3"));
});

test("internetaansluiting: IPv4-adres apart, IPv6 per /64-blok", () => {
  assert.equal(connectionOf("203.0.113.9"), "203.0.113.9");
  assert.equal(connectionOf("2001:db8:1:2::5"), "2001:db8:1:2::/64");
  assert.equal(connectionOf("2001:0DB8:0001:0002:ffff:0:0:1"), "2001:db8:1:2::/64");
  assert.notEqual(connectionOf("2001:db8:1:2::5"), connectionOf("2001:db8:1:3::5"));
  assert.equal(connectionOf("::ffff:203.0.113.9"), "::ffff:203.0.113.9");
  assert.equal(connectionOf(null), "onbekend");
});

test("Sinterklaas blijft dicht zolang de vereniging nog beslissingen moet goedkeuren", () => {
  assert.ok(sinterklaasRegistration.pendingDecisions.length >= 3);
  assert.equal(sinterklaasRegistration.defaultCapacity, 150);
  assert.match(sinterklaasRegistration.deleteBy, /^\d{4}-\d{2}-\d{2}$/);
});

test("beheersessie: alleen geldig met het juiste wachtwoord en binnen 8 uur", async () => {
  const env = { ADMIN_PASSWORD: randomBytes(24).toString("hex") };
  const other = { ADMIN_PASSWORD: randomBytes(24).toString("hex") };
  const now = Date.now();
  const value = await createSession(env, now);
  const cookie = `andere=1; oosthoek_beheer=${value}`;
  assert.equal(await validSession(env, cookie, now), true);
  assert.equal(await validSession(other, cookie, now), false);
  assert.equal(await validSession(env, cookie, now + 8 * 3600_000 + 1000), false);
  const [expires, signed] = value.split(".");
  assert.equal(await validSession(env, `oosthoek_beheer=${Number(expires) + 3600}.${signed}`, now), false);
  assert.equal(await validSession(env, null, now), false);
  assert.equal(await validSession(env, "oosthoek_beheer=", now), false);
});

test("CSV-cellen maken formules onschadelijk", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
  assert.equal(csvCell("+32"), `"'+32"`);
  assert.equal(csvCell('Jan "Piet"'), `"Jan ""Piet"""`);
  assert.equal(csvCell(null), `""`);
});

test("herpogingen wachten steeds langer, tot een dag", () => {
  assert.deepEqual([1, 2, 3, 8, 9, 20].map((n) => backoffMs(n) / 60_000), [1, 5, 15, 1440, 1440, 1440]);
});

// ---------- Apps Script met nagebootste Google-diensten ----------

const scriptSource = readFileSync(new URL("../mail/apps-script.js", import.meta.url), "utf8");
const goodProps = () => ({ BACKEND_BASE_URL: "https://wijkvereniging-oosthoek.pages.dev", MAIL_API_TOKEN: randomBytes(24).toString("hex") });
const job = (n, to = `ouder${n}@example.org`) => ({
  id: `SINT26-000${n}:1`,
  outboxId: n,
  generation: 1,
  to,
  subject: `Bevestiging ${n}`,
  fromName: "VZW Wijkvereniging Oosthoek",
  html: "<p>html</p>",
  text: "tekst",
});

function runScript({ props = goodProps(), quota = 100, jobs = [], badAddress = null, http = 200, fn = "verwerkWachtrij" }) {
  const seen = { fetch: [], sent: [], created: [], deleted: 0 };
  const store = { ...props };
  const context = {
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => store[k] ?? null,
        setProperty: (k, v) => void (store[k] = v),
        getProperties: () => ({ ...store }),
        deleteProperty: (k) => void delete store[k],
      }),
    },
    MailApp: {
      getRemainingDailyQuota: () => quota,
      sendEmail: (mail) => {
        if (mail.to === badAddress) throw new Error("Invalid email");
        seen.sent.push(mail);
      },
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        seen.fetch.push({ url, options, body: JSON.parse(options.payload) });
        const reply = url.endsWith("/api/mail/wachtrij") ? { jobs } : { updated: 1 };
        return { getResponseCode: () => http, getContentText: () => JSON.stringify(reply) };
      },
    },
    ScriptApp: {
      getProjectTriggers: () => ["oud-1", "oud-2"],
      deleteTrigger: () => void seen.deleted++,
      newTrigger: (name) => ({
        timeBased: () => ({ everyMinutes: (m) => ({ create: () => void seen.created.push(`${name}/${m}`) }) }),
      }),
    },
  };
  vm.createContext(context);
  vm.runInContext(scriptSource, context);
  let error = null;
  try {
    context[fn]();
  } catch (e) {
    error = e;
  }
  return { seen, store, error };
}

test("Apps Script verstuurt elke opgehaalde mail één keer en meldt het resultaat", () => {
  const first = runScript({ jobs: [job(1), job(2, "fout@example.org")], badAddress: "fout@example.org" });
  assert.equal(first.error, null);
  assert.equal(first.seen.sent.length, 1);
  assert.deepEqual(
    { ...first.seen.sent[0] },
    { to: "ouder1@example.org", subject: "Bevestiging 1", body: "tekst", htmlBody: "<p>html</p>", name: "VZW Wijkvereniging Oosthoek" },
  );
  const [claim, report] = first.seen.fetch;
  assert.equal(claim.url, "https://wijkvereniging-oosthoek.pages.dev/api/mail/wachtrij");
  assert.match(claim.options.headers.Authorization, /^Bearer [0-9a-f]{48}$/);
  assert.equal(claim.options.followRedirects, false);
  assert.deepEqual(claim.body, { max: 20 });
  assert.deepEqual(report.body.results, [
    { outboxId: 1, generation: 1, ok: true },
    { outboxId: 2, generation: 1, ok: false, error: "Invalid email" },
  ]);
  // Dezelfde mail nog eens (bv. terugmelding mislukt): niet opnieuw versturen, wel als verstuurd melden.
  const again = runScript({ props: first.store, jobs: [job(1)] });
  assert.equal(again.seen.sent.length, 0);
  assert.deepEqual(again.seen.fetch[1].body.results, [{ outboxId: 1, generation: 1, ok: true }]);
});

test("Apps Script respecteert het dagquotum en stopt bij ontbrekende instellingen of fouten", () => {
  assert.equal(runScript({ quota: 0, jobs: [job(1)] }).seen.fetch.length, 0);
  assert.deepEqual(runScript({ quota: 3 }).seen.fetch[0].body, { max: 3 });
  const missing = runScript({ props: { BACKEND_BASE_URL: "https://wijkvereniging-oosthoek.pages.dev" } });
  assert.match(String(missing.error), /MAIL_API_TOKEN/);
  assert.equal(missing.seen.fetch.length, 0);
  const http = runScript({ http: 403, jobs: [job(1)] });
  assert.match(String(http.error), /HTTP 403/);
  assert.equal(http.seen.sent.length, 0);
});

test("installeerTrigger laat precies één tijdtrigger van 5 minuten over", () => {
  const { seen } = runScript({ fn: "installeerTrigger" });
  assert.equal(seen.deleted, 2);
  assert.deepEqual(seen.created, ["verwerkWachtrij/5"]);
});
