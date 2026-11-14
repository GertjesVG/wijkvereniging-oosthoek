// Bezoekersteller lokaal: Pages Functions + D1 (wrangler pages dev, lokale database), uitsluitend verzonnen tellingen.
// Gebruik: npm run test:statistieken. Werkt op een tijdelijke kopie van functions/, server/, migrations/ en wrangler.toml;
// de echte code en de echte databases blijven ongemoeid.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dagInBrussel, dagVerschuiven } from "../../src/bezoek/paginas.ts";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(repo, "node_modules/wrangler/bin/wrangler.js");
const wranglerEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const work = mkdtempSync(path.join(tmpdir(), "oosthoek-statistieken-"));
const PORT = 8797;
const BASE = `http://127.0.0.1:${PORT}`;
const beheerWachtwoord = randomBytes(24).toString("hex");
const today = dagInBrussel();
const day = (offset) => dagVerschuiven(today, offset);

const stateOf = (dir) => path.join(work, "state", path.basename(dir));
const wrangler = (dir, args) => spawnSync(process.execPath, [wranglerBin, ...args], { cwd: dir, env: wranglerEnv, encoding: "utf8" });

function prepare(dir, { withMigration = true, seed = "" } = {}) {
  for (const part of ["functions", "server", "migrations", "wrangler.toml"])
    cpSync(path.join(repo, part), path.join(dir, part), { recursive: true });
  for (const file of ["inschrijving/api.ts", "inschrijving/evenementen.ts", "inschrijving/periode.ts", "inschrijving/bevestigingsmail.ts", "gps/api.ts", "bezoek/paginas.ts"]) {
    mkdirSync(path.dirname(path.join(dir, "src", file)), { recursive: true });
    cpSync(path.join(repo, "src", file), path.join(dir, "src", file));
  }
  if (!withMigration) rmSync(path.join(dir, "migrations/0010_bezoeken.sql"));
  mkdirSync(path.join(dir, "_site"), { recursive: true });
  writeFileSync(path.join(dir, "_site/index.html"), "<!doctype html><title>test</title>");
  const run = wrangler(dir, ["d1", "migrations", "apply", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir)]);
  assert.equal(run.status, 0, `migraties mislukt:\n${run.stdout}\n${run.stderr}`);
  if (seed) {
    const filled = wrangler(dir, ["d1", "execute", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir), "--command", seed]);
    assert.equal(filled.status, 0, `vullen mislukt:\n${filled.stdout}\n${filled.stderr}`);
  }
}

async function start(dir) {
  const child = spawn(
    process.execPath,
    [wranglerBin, "pages", "dev", "_site", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", stateOf(dir),
      "--show-interactive-dev-session=false", "--log-level", "warn", "--binding", `ADMIN_PASSWORD=${beheerWachtwoord}`],
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
  return { status: res.status, data, text, cache: res.headers.get("cache-control") ?? "", setCookie: res.headers.get("set-cookie") };
}
// Zoals een gewone browser: van de eigen site, met een gewone browsernaam.
const browser = { "Sec-Fetch-Site": "same-origin", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/130.0" };
const visit = (p, b, w, headers = {}) => call("POST", "/api/bezoek", { p, b, w }, { ...browser, ...headers });
const stats = () => call("GET", "/api/beheer/statistieken");

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

// Verzonnen geschiedenis: gisteren, 6, 7 en 13 dagen geleden (voor de periodegrenzen) en 100 dagen geleden (alleen in "alles").
const seed = `INSERT INTO visit_days (day, page, views, visits) VALUES
  ('${day(-1)}', 'sinterklaas/home', 9, 5), ('${day(-1)}', 'wijk', 3, 1),
  ('${day(-6)}', 'sinterklaas/route', 4, 2),
  ('${day(-7)}', 'wijk/sponsors', 8, 6),
  ('${day(-13)}', 'wijk', 2, 2),
  ('${day(-100)}', 'sinterklaas/home', 50, 30),
  ('${day(-100)}', 'oude/pagina', 7, 7)`;

const main = path.join(work, "met-teller");
const without = path.join(work, "zonder-migratie");
let server = null;
try {
  prepare(main, { seed });
  server = await start(main);

  await step("onbevoegd: geen cijfers zonder login of met een vervalste sessie", async () => {
    assert.equal((await stats()).status, 401);
    cookie = "oosthoek_beheer=9999999999.vervalst";
    assert.equal((await stats()).status, 401);
    cookie = "";
  });

  await step("de website meldt weergaven en bezoeken: leeg antwoord, geen cookie, niet in de cache", async () => {
    const first = await visit("sinterklaas/home", 1, 1);
    assert.equal(first.status, 204);
    assert.equal(first.text, "");
    assert.equal(first.setCookie, null);
    assert.match(first.cache, /no-store/);
    await visit("sinterklaas/route", 0, 1);
    await visit("sinterklaas/route", 0, 1);
    await visit("wijk", 1, 0); // bezoek geteld vlak voor een doorverwijzing
    await visit("wijk", 0, 1);
  });

  await step("geweigerd zonder fout: onbekende pagina, andere site, zoekrobot, te groot getal, geen JSON", async () => {
    assert.equal((await visit("wijk/verzonnen", 1, 1)).status, 204);
    assert.equal((await visit("wijk", 1, 1, { "Sec-Fetch-Site": "cross-site" })).status, 204);
    assert.equal((await visit("wijk", 1, 1, { Origin: "https://kwaadaardig.example" })).status, 204);
    assert.equal((await visit("wijk", 1, 1, { "User-Agent": "Googlebot/2.1" })).status, 204);
    assert.equal((await visit("wijk", 5, 5)).status, 204);
    const plain = await fetch(`${BASE}/api/bezoek`, { method: "POST", headers: { ...browser, "Content-Type": "text/plain" }, body: '{"p":"wijk","w":1}' });
    assert.equal(plain.status, 204);
  });

  await login();

  await step("beheer: dagtotalen, totalen en begin van de telling kloppen", async () => {
    const res = await stats();
    assert.equal(res.status, 200);
    assert.match(res.cache, /no-store/);
    const s = res.data;
    assert.equal(s.today, today);
    assert.equal(s.since, day(-100));
    assert.ok(Math.abs(Date.parse(s.updatedAt) - Date.now()) < 60_000);
    const byDay = Object.fromEntries(s.days.map((d) => [d.day, [d.visits, d.views]]));
    assert.deepEqual(byDay[today], [2, 4]);
    assert.deepEqual(byDay[day(-1)], [6, 12]);
    assert.deepEqual(byDay[day(-100)], [37, 57]);
    assert.deepEqual(s.days.map((d) => d.day), [day(-100), day(-13), day(-7), day(-6), day(-1), today]);
    assert.deepEqual(s.totals, { visits: 2 + 6 + 2 + 6 + 2 + 37, views: 4 + 12 + 4 + 8 + 2 + 57 });
  });

  await step("beheer: populairste pagina's per periode, met de juiste datumgrens", async () => {
    const { pages } = (await stats()).data;
    // 7 dagen = vandaag en de 6 dagen ervoor: de sponsors van 7 dagen geleden horen er niet bij.
    assert.deepEqual(pages["7"], [
      { page: "sinterklaas/home", visits: 6, views: 10 },
      { page: "sinterklaas/route", visits: 2, views: 6 },
      { page: "wijk", visits: 2, views: 4 },
    ]);
    // Even vaak bekeken: de pagina waar de meeste bezoeken begonnen, staat eerst.
    assert.deepEqual(pages["30"].map((p) => [p.page, p.views]), [["sinterklaas/home", 10], ["wijk/sponsors", 8], ["wijk", 6], ["sinterklaas/route", 6]]);
    assert.deepEqual(pages["90"], pages["30"]);
    // "Alles" telt ook 100 dagen geleden; een pagina die de website niet meer kent, krijgt geen eigen regel.
    assert.deepEqual(pages.alles[0], { page: "sinterklaas/home", visits: 36, views: 60 });
    assert.ok(!pages.alles.some((p) => p.page === "oude/pagina"));
  });

  await step("beheer: alleen lezen, geen andere opdrachten", async () => {
    assert.equal((await call("POST", "/api/beheer/statistieken", {})).status, 404);
    assert.equal((await call("GET", "/api/beheer/statistieken/x")).status, 404);
    assert.equal((await call("GET", "/api/beheer/evenementen")).status, 200);
  });

  stop(server);
  server = null;

  prepare(without, { withMigration: false });
  server = await start(without);
  await step("zonder tabel (migratie 0010 nog niet uitgevoerd): website merkt niets, beheer meldt het netjes, de rest werkt", async () => {
    assert.equal((await visit("wijk", 1, 1)).status, 204);
    await login();
    const res = await stats();
    assert.equal(res.status, 503);
    assert.equal(res.data.error, "NIET_GECONFIGUREERD");
    assert.match(res.data.message, /nog niet/);
    assert.equal((await call("GET", "/api/evenementen/sinterklaas-2026")).status, 200);
    assert.equal((await call("GET", "/api/beheer/evenementen")).status, 200);
    assert.equal((await call("GET", "/api/beheer/teksten")).status, 200);
  });

  console.log(`\n${results.length} stappen geslaagd`);
} finally {
  if (server) stop(server);
  // Op Windows houdt wrangler de map soms nog even vast; dat mag een echte fout hierboven niet verbergen.
  try {
    rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {}
}
