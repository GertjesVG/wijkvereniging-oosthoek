// Live GPS lokaal: Pages Functions + D1 (wrangler pages dev, lokale database), met een nagebootste telefoon die
// OwnTracks-berichten stuurt. Uitsluitend fictieve gegevens. Gebruik: npm run test:gps.
// Werkt op een tijdelijke kopie; alleen in die kopie duurt een "uur" 20 seconden en is een positie na 4 seconden
// "verloren", zodat de automatische stop en een weggevallen verbinding binnen de test passen. De echte code blijft ongewijzigd.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(repo, "node_modules/wrangler/bin/wrangler.js");
const wranglerEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const work = mkdtempSync(path.join(tmpdir(), "oosthoek-gps-"));
const PORT = 8797;
const BASE = `http://127.0.0.1:${PORT}`;
const HOUR_S = 20;
const LOST_S = 4;
const beheerWachtwoord = randomBytes(24).toString("hex");
const gpsSleutel = randomBytes(24).toString("hex");

function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, `niet precies één keer gevonden: ${from}`);
  return source.replace(from, to);
}

function prepare(dir, { withGpsMigration = true } = {}) {
  for (const part of ["functions", "server", "migrations", "wrangler.toml"])
    cpSync(path.join(repo, part), path.join(dir, part), { recursive: true });
  for (const file of ["inschrijving/api.ts", "inschrijving/evenementen.ts", "inschrijving/bevestigingsmail.ts", "gps/api.ts"]) {
    mkdirSync(path.dirname(path.join(dir, "src", file)), { recursive: true });
    cpSync(path.join(repo, "src", file), path.join(dir, "src", file));
  }
  const gpsFile = path.join(dir, "server/gps.ts");
  let source = readFileSync(gpsFile, "utf8");
  source = replaceOnce(source, "const HOUR_MS = 3600_000;", `const HOUR_MS = ${HOUR_S * 1000};`);
  source = replaceOnce(source, "export const LOST_AFTER_SECONDS = 600;", `export const LOST_AFTER_SECONDS = ${LOST_S};`);
  writeFileSync(gpsFile, source);
  if (!withGpsMigration) rmSync(path.join(dir, "migrations/0006_live_gps.sql"));
  mkdirSync(path.join(dir, "_site"), { recursive: true });
  writeFileSync(path.join(dir, "_site/index.html"), "<!doctype html><title>test</title>");
  const run = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "migrations", "apply", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir)],
    { cwd: dir, env: wranglerEnv, encoding: "utf8" },
  );
  assert.equal(run.status, 0, `migraties mislukt:\n${run.stdout}\n${run.stderr}`);
}

const stateOf = (dir) => path.join(work, "state", path.basename(dir));

// Leest rechtstreeks uit de lokale database: zo is te zien wat er echt bewaard wordt, niet alleen wat de API toont.
function sql(dir, command) {
  const run = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir), "--json", "--command", command],
    { cwd: dir, env: wranglerEnv, encoding: "utf8" },
  );
  assert.equal(run.status, 0, `query mislukt:\n${run.stdout}\n${run.stderr}`);
  return JSON.parse(run.stdout)[0].results;
}

async function start(dir, vars) {
  const bindings = Object.entries(vars).flatMap(([k, v]) => ["--binding", `${k}=${v}`]);
  const child = spawn(
    process.execPath,
    [wranglerBin, "pages", "dev", "_site", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", stateOf(dir),
      "--show-interactive-dev-session=false", "--log-level", "warn", ...bindings],
    { cwd: dir, env: wranglerEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${BASE}/api/gps`)).status === 200) return child;
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
  return { status: res.status, data, text };
}
const admin = (method, body) => call(method, "/api/beheer/gps", body);
const publicGps = async () => (await call("GET", "/api/gps")).data;
// De nagebootste telefoon: Basic-authenticatie zoals OwnTracks, met gebruikersnaam en het apparaatgeheim als wachtwoord.
const basic = (password) => ({ Authorization: `Basic ${Buffer.from(`sinterklaas:${password}`).toString("base64")}` });
const device = (body, headers = basic(gpsSleutel)) => call("POST", "/api/gps/positie", body, headers);
// Fictieve posities rond het centrum van Beerse.
const nowS = (offset = 0) => Math.floor(Date.now() / 1000) + offset;
const fix = (extra = {}) => ({ _type: "location", lat: 51.31912, lon: 4.85401, acc: 6, tst: nowS(), batt: 80, bs: 1, tid: "SK", ...extra });
const stored = (dir) => sql(dir, "SELECT public_since, lat, lon, accuracy, fix_at FROM gps_live")[0];
const wait = (seconds) => new Promise((r) => setTimeout(r, seconds * 1000));

async function login() {
  cookie = "";
  const res = await fetch(`${BASE}/api/beheer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: beheerWachtwoord }),
  });
  assert.equal(res.status, 204);
  cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
}

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
  // Fase A: code staat online vóór migratie 0006. De site blijft werken, de GPS blijft uit.
  const dirA = path.join(work, "a");
  prepare(dirA, { withGpsMigration: false });
  server = await start(dirA, { ADMIN_PASSWORD: beheerWachtwoord, GPS_DEVICE_TOKEN: gpsSleutel });
  await step("zonder migratie 0006: publiek gewoon 'uit', beheer meldt de ontbrekende migratie, telefoon geweigerd", async () => {
    assert.deepEqual(await publicGps(), { state: "off", refreshSeconds: 120 });
    assert.equal((await call("GET", "/api/evenementen/sinterklaas-2026")).status, 200);
    await login();
    const status = await admin("GET");
    assert.equal(status.status, 503);
    assert.match(status.data.message, /migratie 0006/);
    assert.equal((await device(fix())).status, 503);
  });
  stop(server);

  // Fase B: tabel er wel, maar het apparaatgeheim staat nog niet in Cloudflare.
  const dirB = path.join(work, "b");
  prepare(dirB);
  server = await start(dirB, { ADMIN_PASSWORD: beheerWachtwoord });
  await step("zonder apparaatgeheim: telefoon geweigerd, beheer toont 'niet ingesteld'", async () => {
    assert.equal((await device(fix())).status, 503);
    await login();
    const status = (await admin("GET")).data;
    assert.deepEqual([status.configured, status.device, status.session], [false, null, null]);
  });
  stop(server);

  // Fase C: volledige configuratie.
  const dirC = path.join(work, "c");
  prepare(dirC);
  server = await start(dirC, { ADMIN_PASSWORD: beheerWachtwoord, GPS_DEVICE_TOKEN: gpsSleutel });

  await step("onbevoegde updates en beheeropdrachten worden geweigerd; niets bewaard", async () => {
    cookie = "";
    assert.equal((await device(fix(), {})).status, 401);
    assert.equal((await device(fix(), basic(randomBytes(24).toString("hex")))).status, 401);
    assert.equal((await device(fix(), { Authorization: `Bearer ${gpsSleutel}` })).status, 401);
    assert.equal((await admin("GET")).status, 401);
    assert.equal((await admin("POST", { action: "start", hours: 2 })).status, 401);
    await login();
    const foreign = await call("POST", "/api/beheer/gps", { action: "start", hours: 2 }, { Origin: "https://kwaadaardig.example" });
    assert.equal(foreign.status, 403);
    const status = (await admin("GET")).data;
    assert.deepEqual([status.configured, status.device, status.session], [true, null, null]);
    assert.deepEqual(stored(dirC), { public_since: null, lat: null, lon: null, accuracy: null, fix_at: null });
  });

  await step("telefoon verbonden buiten een sessie: beheer ziet het contact, er wordt geen positie bewaard of getoond", async () => {
    const res = await device(fix({ batt: 64, bs: 2 }));
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, []);
    assert.deepEqual(await publicGps(), { state: "off", refreshSeconds: 120 });
    const status = (await admin("GET")).data;
    assert.deepEqual(
      [status.device.connected, status.device.battery, status.device.charging, status.device.accuracy, status.public.state],
      [true, 64, true, 6, "off"],
    );
    assert.deepEqual(stored(dirC), { public_since: null, lat: null, lon: null, accuracy: null, fix_at: null });
  });

  await step("Start: eerst wachten op een positie; een positie van vóór de start telt niet", async () => {
    assert.equal((await admin("POST", { action: "start", hours: 0 })).status, 400);
    assert.equal((await admin("POST", { action: "start", hours: 9 })).status, 400);
    assert.equal((await admin("POST", { action: "start", hours: "2" })).status, 400);
    assert.equal((await admin("POST", { action: "aan" })).status, 400);
    const started = await admin("POST", { action: "start", hours: 1 });
    assert.equal(started.status, 200, started.text);
    assert.ok(started.data.session);
    assert.equal(started.data.public.state, "waiting");
    assert.equal((await publicGps()).state, "waiting");
    // Een opgespaard bericht van vóór de start (bv. na een netwerkonderbreking): ontvangen, maar niet getoond.
    assert.equal((await device(fix({ tst: nowS(-120), lat: 51.3 }))).status, 200);
    assert.equal((await publicGps()).state, "waiting");
  });

  await step("geautoriseerde positie verschijnt met tijdstip; verversen, oude of onnauwkeurige berichten veranderen niets", async () => {
    // tst telt in hele seconden: eerst een seconde voorbij de start, anders valt de fix net "vóór de start".
    await wait(1.1);
    const first = nowS();
    assert.equal((await device(fix({ tst: first }))).status, 200);
    let pub = await publicGps();
    assert.equal(pub.state, "live");
    assert.deepEqual([pub.lat, pub.lon, pub.accuracy], [51.31912, 4.85401, 6]);
    assert.equal(pub.fixAt, new Date(first * 1000).toISOString());
    assert.ok(pub.fixAgeSeconds <= 2, String(pub.fixAgeSeconds));
    assert.equal(pub.refreshSeconds, 30);
    assert.ok(pub.endsInSeconds > 0 && pub.endsInSeconds <= HOUR_S);
    for (const key of ["battery", "charging", "seen"]) assert.ok(!JSON.stringify(pub).includes(key), key);
    // De huifkar rijdt verder: nieuwe positie.
    await wait(1.1);
    assert.equal((await device(fix({ tst: first + 1, lat: 51.32001, lon: 4.85512 }))).status, 200);
    pub = await publicGps();
    assert.deepEqual([pub.lat, pub.lon, pub.fixAt], [51.32001, 4.85512, new Date((first + 1) * 1000).toISOString()]);
    // Laat binnenkomend ouder bericht, te onnauwkeurige fix, ander berichttype, onzin: altijd 200, positie blijft.
    for (const body of [
      fix({ tst: first, lat: 51.1 }),
      fix({ tst: first + 2, lat: 51.2, acc: 900 }),
      { _type: "transition", event: "leave", tst: first + 2 },
      fix({ lat: 123 }),
      { geen: "owntracks" },
    ]) {
      const res = await device(body);
      assert.equal(res.status, 200, JSON.stringify(body));
      assert.deepEqual(res.data, []);
    }
    pub = await publicGps();
    assert.deepEqual([pub.lat, pub.lon], [51.32001, 4.85512]);
    // De onnauwkeurige fix telt wel als contact in het beheer.
    assert.equal((await admin("GET")).data.device.accuracy, 900);
  });

  await step("stopuur aanpassen tijdens de sessie houdt de positie; bij weggevallen verbinding verdwijnen de coördinaten", async () => {
    const before = (await admin("GET")).data;
    const longer = (await admin("POST", { action: "start", hours: 2 })).data;
    assert.equal(longer.session.since, before.session.since);
    assert.ok(longer.session.until > before.session.until);
    assert.equal(longer.public.state, "live");
    await wait(LOST_S + 1.5);
    const pub = await publicGps();
    assert.equal(pub.state, "lost");
    assert.equal(pub.lat, undefined);
    assert.ok(pub.fixAt);
    // De verbinding is terug: meteen weer live.
    assert.equal((await device(fix())).status, 200);
    assert.equal((await publicGps()).state, "live");
  });

  await step("Stop: positie meteen weg, ook uit de database; posities na Stop en oude posities komen niet terug", async () => {
    const stopped = await admin("POST", { action: "stop" });
    assert.equal(stopped.status, 200);
    assert.deepEqual([stopped.data.session, stopped.data.public.state], [null, "off"]);
    assert.deepEqual(await publicGps(), { state: "off", refreshSeconds: 120 });
    assert.deepEqual(stored(dirC), { public_since: null, lat: null, lon: null, accuracy: null, fix_at: null });
    assert.equal((await device(fix())).status, 200);
    assert.deepEqual(stored(dirC).lat, null);
    // Opnieuw starten: de laatste positie van daarnet hoort bij de vorige sessie en verschijnt niet.
    assert.equal((await admin("POST", { action: "start", hours: 1 })).data.public.state, "waiting");
    assert.equal((await device(fix({ tst: nowS(-3) }))).status, 200);
    assert.equal((await publicGps()).state, "waiting");
  });

  await step("automatische veiligheidsstop na de ingestelde duur: publiek uit en coördinaten gewist", async () => {
    await wait(1.1);
    assert.equal((await device(fix())).status, 200);
    assert.equal((await publicGps()).state, "live");
    const until = (await admin("GET")).data.session.until;
    await wait(Math.max(0, (Date.parse(until) - Date.now()) / 1000) + 1);
    assert.deepEqual(await publicGps(), { state: "off", refreshSeconds: 120 });
    assert.deepEqual(stored(dirC), { public_since: null, lat: null, lon: null, accuracy: null, fix_at: null });
    // Een telefoon die blijft zenden, brengt niets terug.
    assert.equal((await device(fix())).status, 200);
    assert.deepEqual([(await publicGps()).state, stored(dirC).lat], ["off", null]);
    const status = (await admin("GET")).data;
    assert.deepEqual([status.session, status.device.connected], [null, true]);
  });

  await step("inschrijvingen blijven ongemoeid: de GPS raakt geen enkele inschrijvingstabel", async () => {
    const counts = sql(dirC, "SELECT (SELECT COUNT(*) FROM registrations) AS r, (SELECT COUNT(*) FROM participants) AS p, (SELECT COUNT(*) FROM mail_outbox) AS m")[0];
    assert.deepEqual(counts, { r: 0, p: 0, m: 0 });
    assert.equal((await call("GET", "/api/evenementen/sinterklaas-2026")).status, 200);
  });
} catch (error) {
  failed = true;
  console.error(`niet ok - ${error?.stack ?? error}`);
} finally {
  if (server) stop(server);
}
console.log(`${results.length} stappen geslaagd${failed ? ", met een fout" : ""}. Werkmap: ${work}`);
if (!failed) {
  try {
    rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {}
}
process.exit(failed ? 1 : 0);
