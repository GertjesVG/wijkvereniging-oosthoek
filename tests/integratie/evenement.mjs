// Sinterklaasbeheer lokaal: evenementfasen, afsluiten, heropenen en planning via de echte Pages Functions + D1
// (wrangler pages dev, lokale database op een tijdelijke kopie). Uitsluitend fictieve gegevens. Gebruik:
// npm run test:evenement.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { msToBrussels } from "../../src/evenement/fase.ts";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(repo, "node_modules/wrangler/bin/wrangler.js");
const wranglerEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const work = mkdtempSync(path.join(tmpdir(), "oosthoek-evenement-"));
const PORT = 8798;
const BASE = `http://127.0.0.1:${PORT}`;
const beheerWachtwoord = randomBytes(24).toString("hex");
const gpsSleutel = randomBytes(24).toString("hex");
const stateOf = (dir) => path.join(work, "state", path.basename(dir));

function prepare(dir, { withEventMigration = true } = {}) {
  for (const part of ["functions", "server", "migrations", "wrangler.toml"])
    cpSync(path.join(repo, part), path.join(dir, part), { recursive: true });
  for (const file of ["inschrijving/api.ts", "inschrijving/evenementen.ts", "inschrijving/periode.ts", "inschrijving/bevestigingsmail.ts", "gps/api.ts", "bezoek/paginas.ts", "content/event.ts", "evenement/fase.ts"]) {
    mkdirSync(path.dirname(path.join(dir, "src", file)), { recursive: true });
    cpSync(path.join(repo, "src", file), path.join(dir, "src", file));
  }
  if (!withEventMigration) rmSync(path.join(dir, "migrations", "0013_evenementfasen.sql"));
  mkdirSync(path.join(dir, "_site"), { recursive: true });
  writeFileSync(path.join(dir, "_site/index.html"), "<!doctype html><title>test</title>");
  const run = spawnSync(process.execPath, [wranglerBin, "d1", "migrations", "apply", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir)], {
    cwd: dir,
    env: wranglerEnv,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `migraties mislukt:\n${run.stdout}\n${run.stderr}`);
}

function sql(dir, command) {
  const run = spawnSync(process.execPath, [wranglerBin, "d1", "execute", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir), "--json", "--command", command], {
    cwd: dir,
    env: wranglerEnv,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `query mislukt:\n${run.stdout}\n${run.stderr}`);
  return JSON.parse(run.stdout)[0].results;
}

async function start(dir) {
  const vars = { ADMIN_PASSWORD: beheerWachtwoord, GPS_DEVICE_TOKEN: gpsSleutel };
  const bindings = Object.entries(vars).flatMap(([k, v]) => ["--binding", `${k}=${v}`]);
  const child = spawn(
    process.execPath,
    [wranglerBin, "pages", "dev", "_site", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", stateOf(dir), "--show-interactive-dev-session=false", "--log-level", "warn", ...bindings],
    { cwd: dir, env: wranglerEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${BASE}/api/evenement`)).status === 200) return child;
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

let cookie = "";
async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json", Origin: BASE } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, data };
}
async function login() {
  const res = await fetch(`${BASE}/api/beheer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ password: beheerWachtwoord }),
  });
  assert.equal(res.status, 204);
  cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
}
const shown = async () => (await call("GET", "/api/evenement")).data;
const act = (action) => call("POST", "/api/beheer/sinterklaas", { action });
const results = [];
async function step(name, fn) {
  await fn();
  results.push(name);
  console.log(`ok - ${name}`);
}

const dir = path.join(work, "site");
const old = path.join(work, "zonder-0013");
let child;
try {
  prepare(dir);
  // Een fictief routepunt van een eerdere sessie: mag door niets in dit beheer verdwijnen.
  sql(dir, "INSERT INTO gps_track (event_id, session_since, segment_since, fix_at, lat, lon, received_at) VALUES ('sinterklaas-2026', '2026-11-28T09:00:00.000Z', '2026-11-28T09:00:00.000Z', '2026-11-28T09:00:05.000Z', 51.3191, 4.854, '2026-11-28T09:00:06.000Z')");
  child = await start(dir);

  await step("beheer zonder aanmelding: 401", async () => {
    assert.equal((await call("GET", "/api/beheer/sinterklaas")).status, 401);
  });
  await login();
  await step("status toont de jaren 2026 (gepland) en 2027 (concept) en het routepunt", async () => {
    const res = await call("GET", "/api/beheer/sinterklaas");
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.years.map((y) => [y.year, y.status]), [[2026, "gepland"], [2027, "concept"]]);
    assert.equal(res.data.gps.track.points, 1);
  });

  const past = msToBrussels(Date.now() - 120_000);
  await step("afsluitingstijd voorbij en GPS uit: bezoekers krijgen de bedankpagina", async () => {
    const res = await call("PATCH", "/api/beheer/sinterklaas/jaren/2026", { closing: past });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.phase.show, "bedankt");
    assert.deepEqual(await shown(), { show: "bedankt", year: 2026, refreshSeconds: 300 });
  });

  await step("loopt de live GPS, dan wacht de afsluiting (stoet niet onderbreken)", async () => {
    assert.equal((await call("POST", "/api/beheer/gps", { action: "start", hours: 1 })).status, 200);
    assert.equal((await shown()).show, "site");
    const res = await call("GET", "/api/beheer/sinterklaas");
    assert.equal(res.data.phase.closingPending, true);
    assert.equal(res.data.phase.next.waitsForGps, true);
    // Ook gepauzeerd blijft de website staan.
    assert.equal((await call("POST", "/api/beheer/gps", { action: "pause" })).status, 200);
    assert.equal((await shown()).show, "site");
  });

  await step("Sluit Sinterklaasstoet af: GPS gestopt, bedankpagina, routepunten bewaard", async () => {
    const res = await act("afsluiten");
    assert.equal(res.status, 200);
    assert.equal(res.data.gps.busy, false);
    assert.equal(res.data.phase.show, "bedankt");
    assert.equal((await shown()).show, "bedankt");
    assert.equal(sql(dir, "SELECT COUNT(*) AS n FROM gps_track")[0].n, 1);
    assert.equal(sql(dir, "SELECT public_since FROM gps_live")[0].public_since, null);
  });

  await step("heropenen gaat voor; terug naar automatisch geeft weer de bedankpagina", async () => {
    let res = await act("site");
    assert.equal(res.data.phase.show, "site");
    assert.equal(res.data.phase.source, "handmatig");
    assert.equal(res.data.phase.overrideUntil, null);
    assert.equal((await shown()).show, "site");
    res = await act("automatisch");
    assert.equal(res.data.phase.source, "automatisch");
    assert.equal((await shown()).show, "bedankt");
  });

  await step("planning uit houdt de weergave vast, ook na een gewijzigde afsluiting", async () => {
    let res = await act("planning-uit");
    assert.equal(res.data.control.auto, false);
    res = await call("PATCH", "/api/beheer/sinterklaas/jaren/2026", { closing: "2026-12-31T20:00" });
    assert.equal(res.data.phase.show, "bedankt");
    res = await act("planning-aan");
    assert.equal(res.data.control.auto, true);
    assert.equal(res.data.phase.show, "site");
    await call("PATCH", "/api/beheer/sinterklaas/jaren/2026", { closing: past });
  });

  await step("publiceren zonder datum kan niet; nieuw jaar = concept zonder inschrijvingen of GPS", async () => {
    let res = await call("PATCH", "/api/beheer/sinterklaas/jaren/2027", { status: "gepland" });
    assert.equal(res.status, 400);
    assert.ok(res.data.fields.eventDate);
    res = await call("PATCH", "/api/beheer/sinterklaas/jaren/2026", { closing: "2026-09-01T00:00" });
    assert.equal(res.status, 400);
    res = await act("nieuw-jaar");
    assert.equal(res.status, 200);
    const y2028 = res.data.years.find((y) => y.year === 2028);
    assert.equal(y2028.status, "concept");
    assert.equal(y2028.seasonOpen, "2028-10-01T00:00");
    assert.equal(sql(dir, "SELECT COUNT(*) AS n FROM gps_track")[0].n, 1);
    assert.ok(res.data.log.length >= 5);
  });
  stop(child);
  child = undefined;

  prepare(old, { withEventMigration: false });
  child = await start(old);
  await step("zonder migratie 0013: website zoals voorheen, beheer meldt de ontbrekende migratie", async () => {
    assert.deepEqual(await shown(), { show: "site", year: null, refreshSeconds: 300 });
    await login();
    const res = await call("GET", "/api/beheer/sinterklaas");
    assert.equal(res.status, 503);
    assert.match(res.data.message, /0013/);
  });
} finally {
  if (child) stop(child);
  try {
    rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {
    // Windows houdt de map soms nog even vast na het stoppen van wrangler; de tijdelijke map wist het systeem later.
  }
}
console.log(`\n${results.length} stappen geslaagd`);
