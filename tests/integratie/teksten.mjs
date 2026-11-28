// Beheerbare teksten lokaal: Pages Functions + D1 (wrangler pages dev, lokale database), uitsluitend fictieve teksten.
// Gebruik: npm run test:teksten. Werkt op een tijdelijke kopie van functions/, server/, migrations/ en wrangler.toml;
// de echte code en de echte databases blijven ongemoeid.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(repo, "node_modules/wrangler/bin/wrangler.js");
const wranglerEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const work = mkdtempSync(path.join(tmpdir(), "oosthoek-teksten-"));
const PORT = 8796;
const BASE = `http://127.0.0.1:${PORT}`;
const beheerWachtwoord = randomBytes(24).toString("hex");
const KEY = "sint.praktisch.waar-tekst";

const stateOf = (dir) => path.join(work, "state", path.basename(dir));

function prepare(dir, { withTextsMigration = true } = {}) {
  for (const part of ["functions", "server", "migrations", "wrangler.toml"])
    cpSync(path.join(repo, part), path.join(dir, part), { recursive: true });
  for (const file of ["inschrijving/api.ts", "inschrijving/evenementen.ts", "inschrijving/periode.ts", "inschrijving/bevestigingsmail.ts", "gps/api.ts", "bezoek/paginas.ts", "evenement/fase.ts", "content/event.ts"]) {
    mkdirSync(path.dirname(path.join(dir, "src", file)), { recursive: true });
    cpSync(path.join(repo, "src", file), path.join(dir, "src", file));
  }
  if (!withTextsMigration) rmSync(path.join(dir, "migrations/0009_teksten.sql"));
  mkdirSync(path.join(dir, "_site"), { recursive: true });
  writeFileSync(path.join(dir, "_site/index.html"), "<!doctype html><title>test</title>");
  const run = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "migrations", "apply", "oosthoek-inschrijvingen", "--local", "--persist-to", stateOf(dir)],
    { cwd: dir, env: wranglerEnv, encoding: "utf8" },
  );
  assert.equal(run.status, 0, `migraties mislukt:\n${run.stdout}\n${run.stderr}`);
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
  return { status: res.status, data, type: res.headers.get("content-type") ?? "", cache: res.headers.get("cache-control") ?? "" };
}
const save = (key, value, headers) => call("PATCH", `/api/beheer/teksten/${key}`, { value }, headers);
const previous = (key) => call("POST", `/api/beheer/teksten/${key}/vorige`, {});
const publicTexts = async () => {
  const res = await call("GET", "/api/teksten");
  assert.equal(res.status, 200);
  return res.data.teksten;
};

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

const main = path.join(work, "met-teksten");
const without = path.join(work, "zonder-migratie");
let server = null;
try {
  prepare(main);
  server = await start(main);

  await step("zonder aanpassingen: lege lijst, niet in de cache, als JSON", async () => {
    const res = await call("GET", "/api/teksten");
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { teksten: {} });
    assert.match(res.type, /^application\/json/);
    assert.match(res.cache, /no-store/);
  });

  await step("onbevoegd: lezen en opslaan geweigerd, niets bewaard", async () => {
    assert.equal((await call("GET", "/api/beheer/teksten")).status, 401);
    assert.equal((await save(KEY, "Ingebroken")).status, 401);
    assert.equal((await previous(KEY)).status, 401);
    cookie = "oosthoek_beheer=9999999999.vervalst";
    assert.equal((await save(KEY, "Ingebroken")).status, 401);
    assert.deepEqual(await publicTexts(), {});
  });

  await login();

  await step("ingelogd maar van een andere site of zonder JSON: geweigerd", async () => {
    assert.equal((await save(KEY, "Van elders", { Origin: "https://kwaadaardig.example" })).status, 403);
    const plain = await fetch(`${BASE}/api/beheer/teksten/${KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "text/plain", Cookie: cookie },
      body: JSON.stringify({ value: "Zonder JSON" }),
    });
    assert.equal(plain.status, 403);
    assert.deepEqual(await publicTexts(), {});
  });

  await step("opslaan, opnieuw opslaan en dezelfde tekst nog eens: de vorige versie blijft juist", async () => {
    assert.deepEqual((await call("GET", "/api/beheer/teksten")).data, []);
    const first = await save(KEY, "Versie 1");
    assert.equal(first.status, 200);
    assert.equal(first.data.key, KEY);
    assert.equal(first.data.value, "Versie 1");
    assert.equal(first.data.previous, null);
    assert.ok(first.data.updatedAt);
    assert.deepEqual(await publicTexts(), { [KEY]: "Versie 1" });
    assert.equal((await save(KEY, "Versie 2")).data.previous, "Versie 1");
    const same = await save(KEY, "Versie 2");
    assert.equal(same.status, 200);
    assert.equal(same.data.value, "Versie 2");
    assert.equal(same.data.previous, "Versie 1");
    const list = (await call("GET", "/api/beheer/teksten")).data;
    assert.deepEqual(list.map((r) => [r.key, r.value, r.previous]), [[KEY, "Versie 2", "Versie 1"]]);
  });

  await step("vorige versie terugzetten, en nog eens terug", async () => {
    const back = await previous(KEY);
    assert.equal(back.status, 200);
    assert.equal(back.data.value, "Versie 1");
    assert.equal(back.data.previous, "Versie 2");
    assert.deepEqual(await publicTexts(), { [KEY]: "Versie 1" });
    assert.equal((await previous(KEY)).data.value, "Versie 2");
  });

  await step("oorspronkelijke tekst terugzetten: de website valt terug op de tekst uit de code", async () => {
    const reset = await save(KEY, null);
    assert.equal(reset.status, 200);
    assert.equal(reset.data.value, null);
    assert.equal(reset.data.previous, "Versie 2");
    assert.deepEqual(await publicTexts(), {});
    assert.equal((await previous(KEY)).data.value, "Versie 2");
    assert.equal((await save(KEY, null)).status, 200);
    // Geen vorige versie die verschilt: dan valt er niets terug te zetten.
    const fresh = "sint.home.intro";
    assert.equal((await save(fresh, null)).status, 200);
    assert.equal((await previous(fresh)).status, 409);
    assert.equal((await previous("sint.contact.titel")).status, 409);
  });

  await step("ongeldige invoer en onbekende sleutels: geweigerd met een duidelijke melding", async () => {
    for (const bad of ["", "   ", 42, { tekst: "x" }, "x".repeat(2001)]) {
      const res = await save(KEY, bad);
      assert.equal(res.status, 400, JSON.stringify(bad).slice(0, 20));
      assert.equal(res.data.error, "VALIDATIE");
      assert.ok(res.data.message.length > 0);
    }
    assert.equal((await call("PATCH", `/api/beheer/teksten/${KEY}`, {})).status, 400);
    for (const key of ["Hoofdletter", "a..b", "%2e%2e", "a%20b"]) assert.equal((await save(key, "x")).status, 404, key);
    assert.equal((await call("DELETE", `/api/beheer/teksten/${KEY}`, {})).status, 404);
    assert.deepEqual(await publicTexts(), {});
  });

  await step("opmaak en code worden gewone tekst; stuurtekens verdwijnen", async () => {
    const markup = '<img src=x onerror="alert(1)"><script>alert(2)</script> & "citaat"';
    assert.equal((await save(KEY, markup)).data.value, markup);
    const res = await call("GET", "/api/teksten");
    assert.match(res.type, /^application\/json/);
    assert.equal(res.data.teksten[KEY], markup);
    assert.equal((await save(KEY, "  A\u0000B‮\r\nC  ")).data.value, "AB\nC");
  });

  await step("bewaard na een herstart van de server", async () => {
    await save(KEY, "Blijft bewaard.");
    stop(server);
    server = await start(main);
    assert.deepEqual(await publicTexts(), { [KEY]: "Blijft bewaard." });
  });

  stop(server);
  server = null;

  prepare(without, { withTextsMigration: false });
  server = await start(without);
  await step("zonder tabel (migratie 0009 nog niet uitgevoerd): duidelijke melding, de rest werkt", async () => {
    const res = await call("GET", "/api/teksten");
    assert.equal(res.status, 503);
    assert.equal(res.data.error, "NIET_GECONFIGUREERD");
    await login();
    const admin = await call("GET", "/api/beheer/teksten");
    assert.equal(admin.status, 503);
    assert.match(admin.data.message, /nog niet/);
    assert.equal((await save(KEY, "x")).status, 503);
    assert.equal((await call("GET", "/api/evenementen/sinterklaas-2026")).status, 200);
    assert.equal((await call("GET", "/api/beheer/evenementen")).status, 200);
  });

  console.log(`\n${results.length} stappen geslaagd`);
} finally {
  if (server) stop(server);
  rmSync(work, { recursive: true, force: true });
}
