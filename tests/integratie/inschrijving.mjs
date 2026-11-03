// Volledige keten lokaal: Pages Functions + D1 (wrangler pages dev, lokale database) met uitsluitend fictieve gegevens.
// Gebruik: npm run test:inschrijving. Werkt op een tijdelijke kopie van functions/, server/ en de gedeelde bestanden.
// Aanpassingen alleen in die kopie: in fase A een nog goed te keuren beslissing (zodat het evenement niet open kan),
// in fase D en G een wisdatum in het verleden (G ook een tweede, fictief evenement), en overal wijst Turnstile-siteverify naar een
// lokale nabootsing die de Cloudflare-testsleutels volgt (1x… keurt goed, 2x… keurt af) en elke controle telt.
// De echte code blijft ongewijzigd.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERIFY_PORT = 8798;
const verified = { calls: 0, withoutAnswer: 0 };
const fakeSiteverify = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": req.headers["content-type"] ?? "" } })
      .formData()
      .catch(() => null);
    verified.calls++;
    const secret = String(form?.get("secret") ?? "");
    if (!form?.get("response")) verified.withoutAnswer++;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: secret.startsWith("1x") && Boolean(form?.get("response")) }));
  });
});
await new Promise((r) => fakeSiteverify.listen(VERIFY_PORT, "127.0.0.1", r));

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(repo, "node_modules/wrangler/bin/wrangler.js");
const work = mkdtempSync(path.join(tmpdir(), "oosthoek-inschrijving-"));
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const EVENT = "sinterklaas-2026";
// Testsleutels uit de Turnstile-documentatie: 1x… keurt altijd goed, 2x… keurt altijd af.
const turnstile = (n) => `${n}x${"0".repeat(31)}AA`;
const siteKey = `1x${"0".repeat(20)}AA`;
const dummyAnswer = ["XXXX", "DUMMY", "TOKEN", "XXXX"].join(".");
const beheerWachtwoord = randomBytes(24).toString("hex");
const mailSleutel = randomBytes(24).toString("hex");

function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, `niet precies één keer gevonden: ${from}`);
  return source.replace(from, to);
}

// edit past alleen in de kopie src/inschrijving/evenementen.ts aan.
function prepare(dir, edit = (source) => source) {
  for (const part of ["functions", "server", "migrations", "wrangler.toml"])
    cpSync(path.join(repo, part), path.join(dir, part), { recursive: true });
  mkdirSync(path.join(dir, "src/inschrijving"), { recursive: true });
  for (const file of ["api.ts", "evenementen.ts", "bevestigingsmail.ts"])
    cpSync(path.join(repo, "src/inschrijving", file), path.join(dir, "src/inschrijving", file));
  const serverFile = path.join(dir, "server/inschrijven.ts");
  const serverSource = readFileSync(serverFile, "utf8");
  const local = serverSource.replace("https://challenges.cloudflare.com/turnstile/v0/siteverify", `http://127.0.0.1:${VERIFY_PORT}/siteverify`);
  assert.notEqual(local, serverSource, "siteverify-adres niet gevonden");
  writeFileSync(serverFile, local);
  const eventsFile = path.join(dir, "src/inschrijving/evenementen.ts");
  writeFileSync(eventsFile, edit(readFileSync(eventsFile, "utf8")));
  mkdirSync(path.join(dir, "_site"), { recursive: true });
  writeFileSync(path.join(dir, "_site/index.html"), "<!doctype html><title>test</title>");
  const state = path.join(work, "state", path.basename(dir));
  const run = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "migrations", "apply", "oosthoek-inschrijvingen", "--local", "--persist-to", state],
    { cwd: dir, env: wranglerEnv, encoding: "utf8" },
  );
  assert.equal(run.status, 0, `migraties mislukt:\n${run.stdout}\n${run.stderr}`);
}

const wranglerEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };

async function start(dir, vars) {
  const bindings = Object.entries(vars).flatMap(([k, v]) => ["--binding", `${k}=${v}`]);
  const child = spawn(
    process.execPath,
    [wranglerBin, "pages", "dev", "_site", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to",
      path.join(work, "state", path.basename(dir)), "--show-interactive-dev-session=false", "--log-level", "warn", ...bindings],
    { cwd: dir, env: wranglerEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${BASE}/api/evenementen/${EVENT}`);
      if (res.status === 200) return child;
    } catch {}
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  stop(child);
  throw new Error(`wrangler startte niet:\n${output.slice(-2000)}`);
}

function stop(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGTERM");
}

// ---------- kleine helpers ----------

let cookie = "";
async function call(method, url, body, headers = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, data, headers: res.headers, text };
}
const admin = (method, url, body) => call(method, `/api/beheer${url}`, body);
const mailApi = (url, body, sleutel = mailSleutel) =>
  call("POST", `/api/mail/${url}`, body, sleutel === null ? {} : { Authorization: `Bearer ${sleutel}` });

async function login() {
  cookie = "";
  assert.equal((await admin("POST", "/login", { password: randomBytes(12).toString("hex") })).status, 401);
  const ok = await admin("POST", "/login", { password: beheerWachtwoord });
  assert.equal(ok.status, 204);
  const setCookie = ok.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(setCookie, /Path=\/api\/beheer/);
  cookie = setCookie.split(";")[0];
}

let n = 0;
// Voornamen bestaan alleen uit letters: 1 → "b", 27 → "bb".
const letters = (k) => (k >= 26 ? letters(Math.floor(k / 26)) : "") + String.fromCharCode(97 + (k % 26));
const rulesVersion = /rules: \{ version: "([^"]+)"/.exec(readFileSync(path.join(repo, "src/inschrijving/evenementen.ts"), "utf8"))[1];
function family({ kids = 1, email, street, houseNumber, names, parent, coParent = false } = {}) {
  n++;
  return {
    eventId: EVENT,
    submissionId: randomUUID(),
    parent: { name: parent ?? `Testouder ${n}`, email: email ?? `gezin${n}@example.org` },
    address: { street: street ?? "Zandstraat", houseNumber: houseNumber ?? String(n), coParent },
    participants: (names ?? Array.from({ length: kids }, (_, i) => `Kind${letters(n)}-${"abcdefgh"[i]}`)).map((name, i) => ({ name, age: 3 + (i % 9) })),
    confirmations: { rules: true, privacy: true },
    rulesVersion,
    turnstileToken: dummyAnswer,
  };
}
// Elk gezin een eigen internetadres (documentatiereeks), tenzij de test er bewust één opgeeft.
let ipCount = 0;
const nextIp = () => (ipCount++, `198.18.${Math.floor(ipCount / 256)}.${ipCount % 256}`);
const register = (body, ip = nextIp()) => call("POST", "/api/inschrijvingen", body, { "CF-Connecting-IP": ip });
const summary = async () => (await admin("GET", "/evenementen")).data.find((e) => e.id === EVENT);
const registrations = async () => (await admin("GET", `/evenementen/${EVENT}/inschrijvingen`)).data;
const serverVars = (secretNumber, extra = {}) => ({
  TURNSTILE_SITE_KEY: siteKey,
  TURNSTILE_SECRET: turnstile(secretNumber),
  ADMIN_PASSWORD: beheerWachtwoord,
  MAIL_API_TOKEN: mailSleutel,
  ...extra,
});

const results = [];
async function step(name, fn) {
  await fn();
  results.push(name);
  console.log(`ok - ${name}`);
}

// ---------- fasen ----------

let server = null;
let failed = false;
try {
  // Fase A: een beslissing nog niet goedgekeurd.
  const dirA = path.join(work, "a");
  prepare(dirA, (source) => replaceOnce(source, "pendingDecisions: []", 'pendingDecisions: ["testbeslissing"]'));
  server = await start(dirA, serverVars(1));
  await step("niet goedgekeurd evenement: beheer kan niet openen, publiek blijft dicht", async () => {
    await login();
    const open = await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" });
    assert.equal(open.status, 409);
    assert.match(open.data.message, /Nog niet vrijgegeven/);
    const pub = await call("GET", `/api/evenementen/${EVENT}`);
    assert.deepEqual(pub.data, { id: EVENT, status: "closed", available: null, turnstileSiteKey: null });
    assert.equal((await register(family())).status, 423);
  });
  stop(server);

  // Fase B: echte configuratie, Turnstile keurt goed.
  const dirB = path.join(work, "b");
  prepare(dirB);
  server = await start(dirB, serverVars(1, { MAIL_BACKOFF_FACTOR: "0.00001" }));

  await step("privé-API's weigeren zonder geldige sessie of mailsleutel", async () => {
    cookie = "";
    for (const url of ["/evenementen", `/evenementen/${EVENT}/inschrijvingen`, `/evenementen/${EVENT}/export`])
      assert.equal((await admin("GET", url)).status, 401, url);
    assert.equal((await admin("PATCH", "/inschrijvingen/1", { status: "cancelled" })).status, 401);
    cookie = `oosthoek_beheer=${Math.floor(Date.now() / 1000) + 3600}.vervalst`;
    assert.equal((await admin("GET", "/evenementen")).status, 401);
    assert.equal((await mailApi("wachtrij", { max: 5 }, null)).status, 403);
    assert.equal((await mailApi("wachtrij", { max: 5 }, randomBytes(24).toString("hex"))).status, 403);
    assert.equal((await mailApi("resultaat", { results: [] }, null)).status, 403);
    // Geen GET-route: valt terug op de statische site, nooit op gegevens.
    const list = await call("GET", "/api/inschrijvingen");
    assert.doesNotMatch(list.headers.get("content-type") ?? "", /json/);
    assert.equal((await call("GET", "/api/evenementen/onbekend")).status, 404);
  });

  await step("evenement staat standaard dicht en heeft geen maximum; openen", async () => {
    assert.equal((await register(family())).status, 423);
    await login();
    const before = await summary();
    assert.equal(before.status, "closed");
    assert.deepEqual([before.capacity, before.available, before.active], [null, null, 0]);
    // Wijzigingen alleen als JSON en vanaf de eigen site.
    const foreign = await call("PATCH", `/api/beheer/evenementen/${EVENT}`, { status: "open" }, { Origin: "https://kwaadaardig.example" });
    assert.equal(foreign.status, 403);
    const plain = await call("PATCH", `/api/beheer/evenementen/${EVENT}`, undefined, { "Content-Type": "text/plain" });
    assert.equal(plain.status, 403);
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" })).data.status, "open");
    const pub = await call("GET", `/api/evenementen/${EVENT}`);
    // Geen maximum: de publieke kant geeft geen aantal vrije plaatsen.
    assert.deepEqual(pub.data, { id: EVENT, status: "open", available: null, turnstileSiteKey: siteKey });
  });

  let firstFamily;
  await step("gezinsinschrijving met meerdere kinderen en uniek nummer", async () => {
    firstFamily = family({ names: ["Noor", "Milan", "N'Golo"], email: "fictief.gezin@example.org", street: "Zandstraat", houseNumber: "7" });
    const res = await register(firstFamily);
    assert.equal(res.status, 201, res.text);
    assert.equal(res.data.reference, "SINT26-0001");
    assert.deepEqual(res.data.participants.map((p) => p.name), ["Noor", "Milan", "N'Golo"]);
    const second = await register(family({ kids: 2 }));
    assert.equal(second.data.reference, "SINT26-0002");
  });

  await step("dubbel verzonden formulier geeft dezelfde inschrijving, geen tweede", async () => {
    const again = await register(firstFamily);
    assert.equal(again.status, 200);
    assert.equal(again.data.reference, "SINT26-0001");
    const parallel = await Promise.all([1, 2, 3].map(() => register(firstFamily)));
    assert.ok(parallel.every((r) => r.status === 200 && r.data.reference === "SINT26-0001"));
    assert.equal((await registrations()).length, 2);
    assert.equal((await summary()).active, 5);
  });

  await step("hetzelfde kind opnieuw = geweigerd; zelfde e-mail met ander kind = gemarkeerd als mogelijk dubbel", async () => {
    const dup = await register(family({ names: ["noor"], street: "zandstraat", houseNumber: "7" }));
    assert.equal(dup.status, 409);
    assert.equal(dup.data.error, "DUBBEL");
    const suspect = await register(family({ names: ["Lars"], email: "Fictief.Gezin@example.org" }));
    assert.equal(suspect.status, 201);
    const list = await registrations();
    assert.equal(list.find((r) => r.reference === suspect.data.reference).suspectedDuplicate, true);
    assert.equal(list.find((r) => r.reference === "SINT26-0002").suspectedDuplicate, false);
  });

  await step("ongeldige inzendingen worden geweigerd zonder iets op te slaan", async () => {
    const bad = await register({ ...family(), parent: { name: "X", email: "geen-mail" } });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.fields["parent.email"]);
    assert.equal((await register({ ...family(), website: "spam" })).status, 400);
    assert.equal((await register({ ...family(), turnstileToken: "" })).status, 400);
    assert.equal((await call("POST", "/api/inschrijvingen", undefined, { "Content-Type": "text/plain" })).status, 400);
    assert.equal((await registrations()).length, 3);
  });

  await step("misbruik: geen links in namen, ander gezin met hetzelfde formulier-ID ziet niets, hooguit 5 per aansluiting per dag", async () => {
    const link = await register(family({ names: ["http://evil.be"] }));
    assert.equal(link.status, 400);
    assert.ok(link.data.fields["participants.0.name"]);
    assert.equal((await register(family({ names: ["<b>Lotte</b>"] }))).status, 400);
    const other = await register({ ...family({ names: ["Ander"] }), submissionId: firstFamily.submissionId });
    assert.equal(other.status, 409);
    assert.equal(other.data.error, "AL_ONTVANGEN");
    assert.ok(!/fictief\.gezin|Noor|Milan/.test(other.text), other.text);
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await register(family(), "203.0.113.9")).status);
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
    // IPv6: hetzelfde /64-blok is dezelfde aansluiting.
    for (let i = 0; i < 5; i++) assert.equal((await register(family(), `2001:db8:5:6::${i + 1}`)).status, 201);
    assert.equal((await register(family(), "2001:db8:5:6:abcd::9")).status, 429);
    assert.equal((await registrations()).length, 13);
  });

  await step("zonder maximum geen grens van 150; een ingesteld maximum houdt stand bij 40 gelijktijdige inschrijvingen", async () => {
    // Zonder maximum: ook voorbij de vroegere 150 gewoon inschrijven.
    for (let active = (await summary()).active; active <= 150; active += 8)
      assert.equal((await register(family({ kids: 8 }))).status, 201);
    const free = await summary();
    assert.ok(free.active > 150, String(free.active));
    assert.deepEqual([free.capacity, free.available], [null, null]);
    assert.equal((await call("GET", `/api/evenementen/${EVENT}`)).data.available, null);
    // Maximum instellen in het beheer: een geheel getal, nooit lager dan het werkelijke aantal kinderen.
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { capacity: free.active - 1 })).status, 409);
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { capacity: "veel" })).status, 400);
    const max = free.active + 10;
    const set = await admin("PATCH", `/evenementen/${EVENT}`, { capacity: max });
    assert.deepEqual([set.data.capacity, set.data.active, set.data.available], [max, free.active, 10]);
    assert.equal((await call("GET", `/api/evenementen/${EVENT}`)).data.available, 10);
    const burst = await Promise.all(Array.from({ length: 40 }, () => register(family({ kids: 1 }))));
    const created = burst.filter((r) => r.status === 201).length;
    const full = burst.filter((r) => r.status === 409 && r.data.error === "VOLZET").length;
    assert.equal(created, 10, burst.map((r) => r.status).join());
    assert.equal(full, 30);
    const after = await summary();
    assert.equal(after.active, max);
    assert.equal(after.available, 0);
    assert.equal((await call("GET", `/api/evenementen/${EVENT}`)).data.status, "full");
    const list = await registrations();
    assert.equal(new Set(list.map((r) => r.reference)).size, list.length);
    assert.equal((await register(family({ kids: 1 }))).data.error, "VOLZET");
  });

  await step("beheer: annuleren, heractiveren, afhalen, corrigeren, kind toevoegen", async () => {
    const list = await registrations();
    const target = list.find((r) => r.reference === "SINT26-0002");
    const cancel = await admin("PATCH", `/inschrijvingen/${target.id}`, { status: "cancelled" });
    assert.equal(cancel.data.status, "cancelled");
    assert.ok(cancel.data.participants.every((p) => p.status === "cancelled"));
    assert.equal((await summary()).available, 2);
    // Plaats weer innemen en dan heractiveren: volzet, dus geweigerd.
    assert.equal((await register(family({ kids: 2 }))).status, 201);
    const reactivate = await admin("PATCH", `/inschrijvingen/${target.id}`, { status: "active" });
    assert.equal(reactivate.data.error, "VOLZET");
    const max = (await summary()).capacity;
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { capacity: max - 10 })).status, 409);
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { capacity: max + 5 })).data.capacity, max + 5);
    const reactivated = await admin("PATCH", `/inschrijvingen/${target.id}`, { status: "active" });
    assert.equal(reactivated.data.status, "active");
    // Een apart geannuleerd kind blijft geannuleerd als de hele inschrijving later geannuleerd en heractiveerd wordt.
    await admin("PATCH", `/deelnemers/${reactivated.data.participants[0].id}`, { status: "cancelled" });
    await admin("PATCH", `/inschrijvingen/${target.id}`, { status: "cancelled" });
    const back = await admin("PATCH", `/inschrijvingen/${target.id}`, { status: "active" });
    assert.deepEqual(back.data.participants.map((p) => p.status), ["cancelled", "active"]);
    const first = list.find((r) => r.reference === "SINT26-0001");
    const picked = await admin("PATCH", `/deelnemers/${first.participants[0].id}`, { pickedUp: true });
    assert.ok(picked.data.participants[0].pickedUpAt);
    assert.equal((await summary()).pickedUp, 1);
    const fixed = await admin("PATCH", `/inschrijvingen/${first.id}`, { email: "verbeterd@example.org", note: "telefonisch nagekeken" });
    assert.equal(fixed.data.email, "verbeterd@example.org");
    const added = await admin("POST", `/inschrijvingen/${first.id}/deelnemers`, { name: "Vic", age: 4 });
    assert.equal(added.data.participants.length, 4);
    assert.equal((await admin("POST", `/inschrijvingen/${first.id}/deelnemers`, { name: "Vic", age: 4 })).data.error, "DUBBEL");
    assert.equal((await admin("PATCH", "/inschrijvingen/999999", { note: "x" })).status, 404);
    assert.equal((await admin("GET", "/evenementen/onbekend/inschrijvingen")).status, 404);
    // Maximum weer wissen: geen grens meer, ook publiek niet; het werkelijke aantal kinderen blijft kloppen.
    const activeNow = (await summary()).active;
    const cleared = await admin("PATCH", `/evenementen/${EVENT}`, { capacity: null });
    assert.deepEqual([cleared.data.capacity, cleared.data.available, cleared.data.active], [null, null, activeNow]);
    const pub = await call("GET", `/api/evenementen/${EVENT}`);
    assert.deepEqual(pub.data, { id: EVENT, status: "open", available: null, turnstileSiteKey: siteKey });
    assert.equal((await register(family({ kids: 8 }))).status, 201);
    assert.equal((await summary()).active, activeNow + 8);
  });

  await step("CSV-export voor Excel: BOM, puntkomma's, formules onschadelijk", async () => {
    assert.equal((await register(family({ parent: "=HYPERLINK(\"http://x\")", kids: 1 }))).status, 201);
    const csv = await admin("GET", `/evenementen/${EVENT}/export`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get("content-disposition"), /attachment; filename="sinterklaas-2026-inschrijvingen.csv"/);
    // response.text() laat de BOM weg; daarom de ruwe bytes.
    const raw = new Uint8Array(await (await fetch(`${BASE}/api/beheer/evenementen/${EVENT}/export`, { headers: { Cookie: cookie } })).arrayBuffer());
    assert.deepEqual([...raw.slice(0, 3)], [0xef, 0xbb, 0xbf]);
    const lines = csv.text.trim().split("\r\n");
    assert.match(lines[0], /^"Inschrijvingsnummer";"Status inschrijving";/);
    assert.ok(lines.some((l) => l.includes(`"'=HYPERLINK(""http://x"")"`)));
    assert.ok(!lines.some((l) => l.includes(`;"=HYPERLINK`)));
  });

  await step("mailwachtrij: ophalen met juiste velden, nooit dubbel, fouten opnieuw, verstuurd blijft verstuurd", async () => {
    const claim = await mailApi("wachtrij", { max: 50 });
    assert.equal(claim.status, 200);
    const jobs = claim.data.jobs;
    assert.ok(jobs.length >= 10);
    const mine = jobs.find((j) => j.id === "SINT26-0001:1");
    // Het adres werd in het beheer verbeterd; de mail gaat naar het actuele adres.
    assert.equal(mine.to, "verbeterd@example.org");
    assert.match(mine.subject, /SINT26-0001$/);
    assert.match(mine.html, />SINT26-0001</);
    assert.match(mine.html, />Noor, Milan, N&#39;Golo en Vic</);
    assert.match(mine.text, /Ingeschreven kind\(eren\): Noor, Milan, N'Golo en Vic/);
    assert.equal(mine.fromName, "VZW Wijkvereniging Oosthoek");
    // Al opgehaald = in behandeling: niet nog eens meegeven.
    const second = await mailApi("wachtrij", { max: 50 });
    assert.ok(!second.data.jobs.some((j) => jobs.some((k) => k.outboxId === j.outboxId)));
    const all = [...jobs, ...second.data.jobs];
    const report = await mailApi("resultaat", {
      results: all.map((j) => ({ outboxId: j.outboxId, generation: j.generation, ok: j.id !== "SINT26-0001:1", error: "Tijdelijke fout" })),
    });
    assert.equal(report.data.updated, all.length);
    const again = await mailApi("resultaat", { results: [{ outboxId: all[1].outboxId, generation: all[1].generation, ok: false }] });
    assert.equal(again.data.updated, 0);
    let first = (await registrations()).find((r) => r.reference === "SINT26-0001");
    assert.deepEqual([first.mail.status, first.mail.attempts, first.mail.lastError], ["pending", 1, "Tijdelijke fout"]);
    await new Promise((r) => setTimeout(r, 50));
    const retry = (await mailApi("wachtrij", { max: 50 })).data.jobs;
    assert.ok(retry.some((j) => j.id === "SINT26-0001:1"));
    await mailApi("resultaat", { results: retry.map((j) => ({ outboxId: j.outboxId, generation: j.generation, ok: true })) });
    first = (await registrations()).find((r) => r.reference === "SINT26-0001");
    assert.deepEqual([first.mail.status, first.mail.attempts], ["sent", 2]);
    const counts = (await summary()).mail;
    assert.equal(counts.failed, 0);
    assert.equal(counts.pending + counts.sending, 0);
  });

  await step("opnieuw sturen = nieuw bericht-id; geannuleerde inschrijving krijgt geen mail", async () => {
    const list = await registrations();
    const first = list.find((r) => r.reference === "SINT26-0001");
    const resent = await admin("POST", `/inschrijvingen/${first.id}/mail`, {});
    assert.equal(resent.data.mail.status, "pending");
    const other = list.find((r) => r.reference === "SINT26-0003");
    await admin("POST", `/inschrijvingen/${other.id}/mail`, {});
    await admin("PATCH", `/inschrijvingen/${other.id}`, { status: "cancelled" });
    const jobs = (await mailApi("wachtrij", { max: 50 })).data.jobs;
    assert.deepEqual(jobs.map((j) => j.id), ["SINT26-0001:2"]);
    const cancelled = (await registrations()).find((r) => r.reference === "SINT26-0003");
    assert.equal(cancelled.mail.status, "failed");
    await mailApi("resultaat", { results: [{ outboxId: jobs[0].outboxId, generation: 2, ok: true }] });
  });

  await step("na het evenement: dicht, persoonsgegevens wissen, niet meer te openen", async () => {
    assert.equal((await admin("POST", `/evenementen/${EVENT}/wissen`, { confirm: "WISSEN" })).status, 409);
    await admin("PATCH", `/evenementen/${EVENT}`, { status: "closed" });
    assert.equal((await register(family())).status, 423);
    assert.equal((await admin("POST", `/evenementen/${EVENT}/wissen`, { confirm: "ja" })).status, 400);
    const erased = await admin("POST", `/evenementen/${EVENT}/wissen`, { confirm: "WISSEN" });
    assert.equal(erased.data.personalDataErased, true);
    const list = await registrations();
    assert.ok(list.every((r) => r.parentName === "[gewist]" && r.email === "[gewist]" && r.street === null));
    assert.ok(list.every((r) => r.participants.every((p) => p.name === "[gewist]")));
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" })).status, 409);
    assert.equal((await mailApi("wachtrij", { max: 50 })).data.jobs.length, 0);
  });

  await step("uitloggen maakt de sessiecookie leeg", async () => {
    const out = await admin("POST", "/logout", {});
    assert.equal(out.status, 204);
    assert.match(out.headers.get("set-cookie"), /oosthoek_beheer=; .*Max-Age=0/);
  });
  stop(server);

  // Fase C: nieuwe database, evenement open, maar Turnstile keurt af: de server moet weigeren.
  const dirC = path.join(work, "c");
  prepare(dirC);
  server = await start(dirC, serverVars(2));
  await step("Turnstile wordt op de server gecontroleerd: afgekeurd = geen inschrijving", async () => {
    await login();
    await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" });
    const res = await register(family({ kids: 2 }));
    assert.equal(res.status, 403);
    assert.equal(res.data.error, "TURNSTILE");
    assert.equal((await registrations()).length, 0);
    assert.equal((await summary()).active, 0);
    // Elke nieuwe inschrijving ging langs siteverify, telkens met het antwoord uit het formulier.
    assert.ok(verified.calls > 50, String(verified.calls));
    assert.equal(verified.withoutAnswer, 0);
  });

  await step("aanmelden: hooguit 10 pogingen per aansluiting per kwartier, ook bij een gelijktijdig salvo", async () => {
    cookie = "";
    const attempt = (password, ip) => call("POST", "/api/beheer/login", { password }, { "CF-Connecting-IP": ip });
    const burst = await Promise.all(Array.from({ length: 15 }, () => attempt(randomBytes(12).toString("hex"), "2001:db8:7:8::5")));
    const tried = burst.filter((r) => r.status === 401).length;
    assert.ok(tried >= 1 && tried <= 10, burst.map((r) => r.status).join());
    assert.equal(burst.filter((r) => r.status === 429).length, 15 - tried);
    // Zelfde /64-blok: ook met het juiste wachtwoord even geblokkeerd. Een andere aansluiting kan gewoon aanmelden.
    assert.equal((await attempt(beheerWachtwoord, "2001:db8:7:8:ffff::1")).status, 429);
    assert.equal((await attempt(beheerWachtwoord, "198.51.100.7")).status, 204);
  });
  stop(server);

  // Fase D: nieuwe database; adrescontrole, historiek en automatisch wissen (autoErase staat in de echte instelling aan).
  const dirD = path.join(work, "d");
  prepare(dirD);
  server = await start(dirD, serverVars(1));
  await step("adrescontrole: officiële straat binnen de grens = in orde; daarbuiten of onbekend = aanvaard en nakijken", async () => {
    await login();
    await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" });
    const ok = await register(family({ names: ["Anna"], street: "dr paul janssenstraat", houseNumber: "5" }));
    assert.equal(ok.status, 201, ok.text);
    assert.equal(ok.data.addressReview, false);
    assert.equal(ok.data.address.street, "Dr. Paul Janssenstraat");
    const inRange = await register(family({ names: ["Bram"], street: "Steenbakkersdam", houseNumber: "20B" }));
    assert.equal(inRange.data.addressReview, false);
    const outside = await register(family({ names: ["Cas"], street: "Steenbakkersdam", houseNumber: "5" }));
    assert.equal(outside.status, 201, outside.text);
    assert.equal(outside.data.addressReview, true);
    const unknown = await register(family({ names: ["Dirk"], street: "Fictieve Dreef", houseNumber: "1" }));
    assert.equal(unknown.status, 201, unknown.text);
    assert.equal(unknown.data.addressReview, true);
    const list = await registrations();
    const byRef = (ref) => list.find((r) => r.reference === ref);
    assert.equal(byRef(ok.data.reference).addressReview, null);
    assert.match(byRef(outside.data.reference).addressReview.reason, /hoort niet bij Wijk Oosthoek/);
    assert.match(byRef(unknown.data.reference).addressReview.reason, /niet in de officiële stratenlijst/);
    assert.equal((await summary()).addressReview, 2);
    // Adres nakijken = nog geen bevestigingsmail; pas na goedkeuring of verbetering.
    const mailRound = async () => {
      const jobs = (await mailApi("wachtrij", { max: 50 })).data.jobs;
      await mailApi("resultaat", { results: jobs.map((j) => ({ outboxId: j.outboxId, generation: j.generation, ok: true })) });
      return jobs.map((j) => j.id.split(":")[0]).sort();
    };
    assert.deepEqual(await mailRound(), [ok.data.reference, inRange.data.reference].sort());
    assert.deepEqual(await mailRound(), []);
    // Verbeterd naar een nummer binnen de grens: vlag weg. Verbeterd naar een straat buiten de wijk: vlag terug.
    const fixed = await admin("PATCH", `/inschrijvingen/${byRef(outside.data.reference).id}`, { houseNumber: "12" });
    assert.equal(fixed.data.addressReview, null);
    const moved = await admin("PATCH", `/inschrijvingen/${byRef(ok.data.reference).id}`, { street: "Anjerstraat" });
    assert.match(moved.data.addressReview.reason, /niet in de officiële stratenlijst/);
    assert.equal((await admin("PATCH", `/inschrijvingen/${byRef(unknown.data.reference).id}`, { addressApproved: false })).status, 400);
    const approved = await admin("PATCH", `/inschrijvingen/${byRef(unknown.data.reference).id}`, { addressApproved: true });
    assert.equal(approved.data.addressReview, null);
    assert.equal((await summary()).addressReview, 1);
    assert.deepEqual(await mailRound(), [outside.data.reference, unknown.data.reference].sort());
    const csv = await admin("GET", `/evenementen/${EVENT}/export`);
    const [head, ...rows] = csv.text.trim().split("\r\n");
    assert.match(head, /"Huisnummer";"Adres nakijken";"Naam";"Leeftijd op evenementdag"/);
    assert.ok(rows.some((l) => l.includes(`"Anjerstraat";"5";"ja";"Anna";"3"`)), rows.join("\n"));
  });

  await step("historiek: inschrijvingen, kinderen, leeftijdsverdeling, afgehaald en geannuleerd per editie", async () => {
    const reg = await register(family({ names: ["Eva", "Finn", "Gust"], street: "Zandstraat", houseNumber: "2" }));
    assert.equal(reg.status, 201, reg.text);
    const target = (await registrations()).find((r) => r.reference === reg.data.reference);
    await admin("PATCH", `/deelnemers/${target.participants[2].id}`, { status: "cancelled" });
    await admin("PATCH", `/deelnemers/${target.participants[0].id}`, { pickedUp: true });
    const s = await summary();
    assert.deepEqual(
      [s.series, s.edition, s.registrations, s.active, s.cancelled, s.pickedUp],
      ["Sinterklaas in Oosthoek", 2026, 5, 6, 1, 1],
    );
    assert.deepEqual(s.ages, [{ age: 3, count: 5 }, { age: 4, count: 1 }]);
    assert.deepEqual([s.deleteBy, s.autoErase, s.deleteByPassed], ["2027-01-31", true, false]);
  });
  stop(server);

  // Zelfde database, maar nu ligt de wisdatum in het verleden (alleen in de kopie).
  const eventsD = path.join(dirD, "src/inschrijving/evenementen.ts");
  writeFileSync(eventsD, replaceOnce(readFileSync(eventsD, "utf8"), 'deleteBy: "2027-01-31"', 'deleteBy: "2026-01-01"'));
  server = await start(dirD, serverVars(1));
  await step("bewaartermijn: na de wisdatum sluit en wist de ophaalronde van het Apps Script; de historiek blijft", async () => {
    assert.equal((await call("GET", `/api/evenementen/${EVENT}`)).data.status, "closed");
    assert.equal((await register(family())).status, 423);
    // Eerst alleen een ophaalronde, zonder beheer: er wachtte nog een mail, maar na het wissen gaat er geen enkele meer weg.
    assert.equal((await mailApi("wachtrij", { max: 50 })).data.jobs.length, 0);
    await login();
    const s = await summary();
    assert.deepEqual([s.personalDataErased, s.status, s.deleteByPassed], [true, "closed", true]);
    assert.deepEqual([s.registrations, s.active, s.cancelled, s.pickedUp], [5, 6, 1, 1]);
    assert.deepEqual(s.ages, [{ age: 3, count: 5 }, { age: 4, count: 1 }]);
    const list = await registrations();
    assert.ok(list.every((r) => r.parentName === "[gewist]" && r.email === "[gewist]" && r.street === null && r.houseNumber === null && r.note === null));
    assert.ok(list.every((r) => r.participants.every((p) => p.name === "[gewist]")));
    const open = await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" });
    assert.equal(open.status, 409);
    assert.match(open.data.message, /gewist/);
  });
  stop(server);

  // Fase E: nieuwe database; co-ouderschap en verplichte aanvaarding van het reglement.
  const dirE = path.join(work, "e");
  prepare(dirE);
  server = await start(dirE, serverVars(1));
  await step("co-ouderschap en reglement: adres van de andere ouder telt, akkoord verplicht en bewaard", async () => {
    await login();
    await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" });
    // Zonder akkoord of met een verouderde versie van het reglement: niets opgeslagen.
    const before = (await registrations()).length;
    const noRules = await register({ ...family({ names: ["Hugo"] }), confirmations: { rules: false, privacy: true } });
    assert.equal(noRules.status, 400);
    assert.ok(noRules.data.fields["confirmations.rules"]);
    const oldRules = await register({ ...family({ names: ["Hugo"] }), rulesVersion: "2020-01-01" });
    assert.equal(oldRules.status, 400);
    assert.ok(oldRules.data.fields.rulesVersion);
    assert.equal((await registrations()).length, before);
    // Papa woont in de wijk, mama elders: mama schrijft in met het adres van papa. Geen nakijken, mail gewoon weg.
    const mum = await register(family({ names: ["Ines"], email: "mama.elders@example.org", street: "Leemstraat", houseNumber: "8", coParent: true }));
    assert.equal(mum.status, 201, mum.text);
    assert.equal(mum.data.addressReview, false);
    assert.deepEqual(mum.data.address, { street: "Leemstraat", houseNumber: "8", coParent: true });
    const row = (await registrations()).find((r) => r.reference === mum.data.reference);
    assert.equal(row.coParent, true);
    assert.equal(row.rulesAccepted.version, rulesVersion);
    assert.ok(Math.abs(Date.parse(row.rulesAccepted.at) - Date.parse(row.createdAt)) < 1000, row.rulesAccepted.at);
    // Papa schrijft hetzelfde kind daarna ook in: geweigerd, één cadeautje per kind.
    const dad = await register(family({ names: ["ines"], email: "papa.wijk@example.org", street: "leemstraat", houseNumber: "8" }));
    assert.equal(dad.status, 409);
    assert.equal(dad.data.error, "DUBBEL");
    // Andere ouder op een adres buiten de lijst: aanvaard, maar "Adres nakijken" en dus nog geen mail.
    const unsure = await register(family({ names: ["Jade"], street: "Kongostraat", houseNumber: "3", coParent: true }));
    assert.equal(unsure.status, 201, unsure.text);
    assert.equal(unsure.data.addressReview, true);
    const jobs = (await mailApi("wachtrij", { max: 50 })).data.jobs;
    assert.deepEqual(jobs.map((j) => j.id.split(":")[0]), [mum.data.reference]);
    await mailApi("resultaat", { results: jobs.map((j) => ({ outboxId: j.outboxId, generation: j.generation, ok: true })) });
    const csv = (await admin("GET", `/evenementen/${EVENT}/export`)).text.trim().split("\r\n");
    assert.match(csv[0], /"Adres van andere ouder \(co-ouderschap\)";"Reglementversie";"Reglement aanvaard op"$/);
    assert.ok(csv.some((l) => l.startsWith(`"${mum.data.reference}"`) && l.includes(`"ja";"${rulesVersion}";"`)), csv.join("\n"));
  });
  stop(server);

  // Fase F: nieuwe database; een inschrijving definitief verwijderen (proefgegevens), zonder hergebruik van nummers.
  const dirF = path.join(work, "f");
  prepare(dirF);
  server = await start(dirF, serverVars(1));
  await step("verwijderen: alleen ingelogd en met het juiste nummer; kinderen, mail en cijfers mee weg; nummer nooit opnieuw", async () => {
    await login();
    await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" });
    const proef = await register(family({ names: ["Piepje", "Testje"], street: "Gerststraat", houseNumber: "3" }));
    assert.equal(proef.status, 201, proef.text);
    assert.equal(proef.data.reference, "SINT26-0001");
    const echt = await register(family({ names: ["Lou"] }));
    assert.equal(echt.data.reference, "SINT26-0002");
    const list = await registrations();
    const proefId = list.find((r) => r.reference === "SINT26-0001").id;
    const echtId = list.find((r) => r.reference === "SINT26-0002").id;
    assert.deepEqual([(await summary()).registrations, (await summary()).active, (await summary()).mail.pending], [2, 3, 2]);
    // Zonder sessie, zonder bevestiging, met een verkeerd nummer of een onbekend id: niets verwijderd.
    const saved = cookie;
    cookie = "";
    assert.equal((await admin("DELETE", `/inschrijvingen/${proefId}`, { confirm: "SINT26-0001" })).status, 401);
    cookie = saved;
    assert.equal((await admin("DELETE", `/inschrijvingen/${proefId}`, {})).status, 400);
    assert.equal((await admin("DELETE", `/inschrijvingen/${proefId}`, { confirm: "SINT26-0002" })).status, 400);
    assert.equal((await admin("DELETE", `/inschrijvingen/999`, { confirm: "SINT26-0999" })).status, 404);
    const foreign = await call("DELETE", `/api/beheer/inschrijvingen/${proefId}`, { confirm: "SINT26-0001" }, { Origin: "https://kwaadaardig.example" });
    assert.equal(foreign.status, 403);
    assert.equal((await registrations()).length, 2);
    // Echt verwijderen: rij, kinderen en mailopdracht weg; het andere gezin blijft ongemoeid; cijfers meteen juist.
    const gone = await admin("DELETE", `/inschrijvingen/${proefId}`, { confirm: "SINT26-0001" });
    assert.equal(gone.status, 200, gone.text);
    assert.equal(gone.data.reference, "SINT26-0001");
    const after = await registrations();
    assert.deepEqual(after.map((r) => r.reference), ["SINT26-0002"]);
    assert.equal(after[0].id, echtId);
    assert.deepEqual(after[0].participants.map((p) => p.name), ["Lou"]);
    const s = await summary();
    assert.deepEqual([s.registrations, s.active, s.available, s.cancelled, s.mail.pending], [1, 1, null, 0, 1]);
    assert.deepEqual(s.ages, [{ age: 3, count: 1 }]);
    const jobs = (await mailApi("wachtrij", { max: 50 })).data.jobs;
    assert.deepEqual(jobs.map((j) => j.id), ["SINT26-0002:1"]);
    await mailApi("resultaat", { results: jobs.map((j) => ({ outboxId: j.outboxId, generation: j.generation, ok: true })) });
    // Nieuwe inschrijvingen krijgen nooit een eerder uitgegeven nummer, ook niet na het wissen van de hoogste.
    assert.equal((await register(family({ names: ["Mia"] }))).data.reference, "SINT26-0003");
    const laatste = (await registrations()).find((r) => r.reference === "SINT26-0003");
    assert.equal((await admin("DELETE", `/inschrijvingen/${laatste.id}`, { confirm: "SINT26-0003" })).status, 200);
    assert.equal((await register(family({ names: ["Nel"] }))).data.reference, "SINT26-0004");
    assert.deepEqual((await registrations()).map((r) => r.reference).sort(), ["SINT26-0002", "SINT26-0004"]);
    // Geannuleerd mag ook weg; na het wissen van de persoonsgegevens niet meer (historiek).
    await admin("PATCH", `/inschrijvingen/${echtId}`, { status: "cancelled" });
    assert.equal((await admin("DELETE", `/inschrijvingen/${echtId}`, { confirm: "SINT26-0002" })).status, 200);
    await admin("PATCH", `/evenementen/${EVENT}`, { status: "closed" });
    await admin("POST", `/evenementen/${EVENT}/wissen`, { confirm: "WISSEN" });
    const rest = (await registrations())[0];
    assert.equal((await admin("DELETE", `/inschrijvingen/${rest.id}`, { confirm: rest.reference })).status, 409);
  });
  stop(server);

  // Fase G: nieuwe database met de echte bewaarinstelling en een tweede, fictief evenement (alleen in de kopie).
  // Eerst inschrijvingen in beide; daarna ligt alleen de wisdatum van Sinterklaas in het verleden.
  const OTHER = "testfeest-2027";
  const dirG = path.join(work, "g");
  prepare(dirG, (source) =>
    replaceOnce(
      source,
      "export const sinterklaasRegistration",
      `registrationEvents["${OTHER}"] = { ...registrationEvents["${EVENT}"], id: "${OTHER}", series: "Testfeest", ` +
        `title: "Testfeest 2027", date: "2027-04-03", referencePrefix: "TEST27-", deleteBy: "2099-12-31" };\n` +
        "export const sinterklaasRegistration",
    ),
  );
  server = await start(dirG, serverVars(1));
  const byId = async (id) => (await admin("GET", "/evenementen")).data.find((e) => e.id === id);
  const listOf = async (id) => (await admin("GET", `/evenementen/${id}/inschrijvingen`)).data;
  const keep = (s) => ({ status: s.status, capacity: s.capacity, registrations: s.registrations, active: s.active, cancelled: s.cancelled, pickedUp: s.pickedUp, ages: s.ages });
  let before;
  await step("bewaartermijn (voorbereiding): echte instelling = automatisch wissen aan, wisdatum 31 januari 2027", async () => {
    await login();
    const s = await byId(EVENT);
    assert.deepEqual([s.autoErase, s.deleteBy, s.deleteByPassed], [true, "2027-01-31", false]);
    for (const id of [EVENT, OTHER]) await admin("PATCH", `/evenementen/${id}`, { status: "open" });
    const a = await register(family({ names: ["Fien", "Jules"], email: "wis.test@example.org", parent: "Wis Testouder" }));
    const b = await register(family({ names: ["Lotte"] }));
    const c = await register({ ...family({ names: ["Rik"], email: "blijft@example.org", parent: "Blijf Testouder" }), eventId: OTHER });
    assert.deepEqual([a.data.reference, b.data.reference, c.data.reference], ["SINT26-0001", "SINT26-0002", "TEST27-0001"]);
    const sint = await listOf(EVENT);
    await admin("PATCH", `/deelnemers/${sint.find((r) => r.reference === "SINT26-0001").participants[0].id}`, { pickedUp: true });
    await admin("PATCH", `/deelnemers/${sint.find((r) => r.reference === "SINT26-0002").participants[0].id}`, { status: "cancelled" });
    before = { sint: keep(await byId(EVENT)), other: keep(await byId(OTHER)) };
    assert.deepEqual([before.sint.registrations, before.sint.active, before.sint.cancelled, before.sint.pickedUp], [2, 2, 1, 1]);
    assert.equal(before.other.active, 1);
  });
  stop(server);

  const eventsG = path.join(dirG, "src/inschrijving/evenementen.ts");
  writeFileSync(eventsG, replaceOnce(readFileSync(eventsG, "utf8"), 'deleteBy: "2027-01-31"', 'deleteBy: "2026-01-01"'));
  server = await start(dirG, serverVars(1));
  await step("bewaartermijn: wist alleen Sinterklaas; anonieme historiek, nummers en het andere evenement blijven intact", async () => {
    await login();
    const sint = await byId(EVENT);
    assert.deepEqual([sint.personalDataErased, sint.status], [true, "closed"]);
    // Historiek: zelfde aantallen, leeftijdsverdeling, afgehaald en geannuleerd; capaciteit ongewijzigd.
    assert.deepEqual({ ...keep(sint), status: before.sint.status }, before.sint);
    const erased = await listOf(EVENT);
    assert.deepEqual(erased.map((r) => r.reference).sort(), ["SINT26-0001", "SINT26-0002"]);
    assert.ok(erased.every((r) => r.parentName === "[gewist]" && r.email === "[gewist]" && r.street === null && r.houseNumber === null && r.note === null));
    assert.ok(erased.every((r) => r.participants.every((p) => p.name === "[gewist]" && p.age !== null)));
    // Ook de CSV-export bevat daarna geen namen of e-mailadressen meer.
    const csv = (await admin("GET", `/evenementen/${EVENT}/export`)).text;
    for (const word of ["Fien", "Jules", "Lotte", "wis.test@example.org", "Wis Testouder", "Zandstraat"]) assert.ok(!csv.includes(word), word);
    // Wachtende mails van het gewiste evenement vertrekken nooit meer; die van het andere evenement wel.
    assert.deepEqual([sint.mail.pending, sint.mail.failed], [0, 2]);
    const other = await byId(OTHER);
    assert.deepEqual([other.personalDataErased, other.mail.pending], [false, 1]);
    assert.deepEqual(keep(other), before.other);
    const kept = await listOf(OTHER);
    assert.deepEqual([kept[0].parentName, kept[0].email, kept[0].participants[0].name], ["Blijf Testouder", "blijft@example.org", "Rik"]);
    // Het andere evenement blijft gewoon werken en telt verder; Sinterklaas kan niet meer open.
    const next = await register({ ...family({ names: ["Mats"] }), eventId: OTHER });
    assert.equal(next.data.reference, "TEST27-0002");
    assert.equal((await admin("PATCH", `/evenementen/${EVENT}`, { status: "open" })).status, 409);
  });
} catch (error) {
  failed = true;
  console.error(`niet ok - ${error?.stack ?? error}`);
} finally {
  if (server) stop(server);
  fakeSiteverify.close();
}
console.log(`${results.length} stappen geslaagd${failed ? ", met een fout" : ""}. Werkmap: ${work}`);
if (!failed) {
  try {
    rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {}
}
process.exit(failed ? 1 : 0);
