// "Kinderen op kaart" en de Excel-export lokaal: Pages Functions + D1 (wrangler pages dev, lokale database), met uitsluitend
// fictieve kinderen en een nagebootste geolocatiedienst (GEOLOCATIE_URL) die telt wat er gevraagd wordt.
// Gebruik: npm run test:kaart. Werkt op een tijdelijke kopie; de echte code, databases en de echte dienst blijven ongemoeid.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readXlsx } from "../xlsx-lezen.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(repo, "node_modules/wrangler/bin/wrangler.js");
const wranglerEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const work = mkdtempSync(path.join(tmpdir(), "oosthoek-kaart-"));
const PORT = 8795;
const GEO_PORT = 8794;
const BASE = `http://127.0.0.1:${PORT}`;
const EVENT = "sinterklaas-2026";
const beheerWachtwoord = randomBytes(24).toString("hex");

// ---------- Nagebootste geolocatiedienst ----------
// Kent: Opstal 5 (gebouw), Gorenstraat 10 (geïnterpoleerd), Asterstraat 10/11 (buren van het onbekende nummer 1),
// Veldstraat 2 (buiten de wijk). De rest: leeg antwoord. down = true geeft een serverfout.
const geo = { calls: [], down: false };
const result = (street, number, lat, lon, type = "basisregisters_huisnummer_afgeleidVanObject") => ({
  Municipality: "Beerse",
  Zipcode: "2340",
  Thoroughfarename: street,
  Housenumber: number,
  FormattedAddress: `${street} ${number}, 2340 Beerse`,
  Location: { Lat_WGS84: lat, Lon_WGS84: lon },
  LocationType: type,
});
const fakeGeo = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  geo.calls.push({ method: req.method, path: url.pathname, params: Object.fromEntries(url.searchParams) });
  if (geo.down) {
    res.statusCode = 500;
    return res.end("storing");
  }
  const q = url.searchParams.get("q") ?? "";
  const list = q.startsWith("Opstal 5,")
    ? [result("Opstal", "5", 51.3278983, 4.8681662)]
    : q.startsWith("Gorenstraat 10,")
      ? [result("Gorenstraat", "10", 51.3281, 4.8791, "basisregisters_huisnummer_geïnterpoleerd")]
      : q.startsWith("Asterstraat 1,")
        ? [result("Asterstraat", "10", 51.3198, 4.8667), result("Asterstraat", "11", 51.3201, 4.8670)]
        : q.startsWith("Veldstraat 2,")
          ? [result("Veldstraat", "2", 51.2, 4.7)]
          : q.startsWith("Leliestraat 4 bus 2,")
            ? [result("Leliestraat", "4", 51.3205, 4.866)]
            : [];
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ LocationResult: list }));
});
await new Promise((r) => fakeGeo.listen(GEO_PORT, "127.0.0.1", r));

// ---------- Proefgegevens (fictief) ----------
const at = "2026-11-12T10:00:00.000Z";
const reg = (id, ref, street, number, status = "active", review = 0) =>
  `INSERT INTO registrations (id, event_id, submission_id, seq, reference, parent_name, email, street, house_number, address_key, status, address_review, created_at, updated_at)
   VALUES (${id}, '${EVENT}', 'sub-${id}', ${id}, '${ref}', 'Testouder ${id}', 'ouder${id}@example.org', '${street}', '${number}', 'x', '${status}', ${review}, '${at}', '${at}');`;
const kid = (id, regId, name, age, status = "active") =>
  `INSERT INTO participants (id, registration_id, event_id, name, age, child_key, status, created_at, updated_at)
   VALUES (${id}, ${regId}, '${EVENT}', '${name}', ${age}, 'k${id}', '${status}', '${at}', '${at}');`;
const seed = [
  `INSERT INTO events (id, capacity, capacity_limited, status, registration_opens_at, registration_closes_at, next_seq)
   VALUES ('${EVENT}', 0, 0, 'open', '2026-11-09T23:00:00.000Z', '2026-11-27T23:00:00.000Z', 9);`,
  reg(1, "SINT26-0001", "Opstal", "5"),
  kid(1, 1, "Noor", 5),
  kid(2, 1, "Milan", 3),
  kid(3, 1, "Weg", 7, "cancelled"),
  // Zelfde adres, andere schrijfwijze: telt op hetzelfde adres.
  reg(2, "SINT26-0002", "opstal", "05"),
  kid(4, 2, "Jules", 8),
  reg(3, "SINT26-0003", "Gorenstraat", "10"),
  kid(5, 3, "Lien", 2),
  reg(4, "SINT26-0004", "Asterstraat", "1"),
  kid(6, 4, "Fien", 6),
  reg(5, "SINT26-0005", "Kongostraat", "3", "active", 1),
  kid(7, 5, "Rik", 4),
  // Geannuleerde inschrijving: niet op de kaart.
  reg(6, "SINT26-0006", "Zandstraat", "9", "cancelled"),
  kid(8, 6, "Gust", 9, "cancelled"),
  reg(7, "SINT26-0007", "Veldstraat", "2"),
  kid(9, 7, "Mats", 1),
].join("\n");

function wrangler(dir, args) {
  return spawnSync(process.execPath, [wranglerBin, ...args], { cwd: dir, env: wranglerEnv, encoding: "utf8" });
}
const state = path.join(work, "state");
const sql = (dir, command) => {
  const run = wrangler(dir, ["d1", "execute", "oosthoek-inschrijvingen", "--local", "--persist-to", state, "--json", "--command", command]);
  assert.equal(run.status, 0, `${command}\n${run.stdout}\n${run.stderr}`);
  return JSON.parse(run.stdout)[0].results;
};

function prepare(dir) {
  for (const part of ["functions", "server", "migrations", "wrangler.toml"])
    cpSync(path.join(repo, part), path.join(dir, part), { recursive: true });
  for (const file of ["inschrijving/api.ts", "inschrijving/evenementen.ts", "inschrijving/periode.ts", "inschrijving/bevestigingsmail.ts", "gps/api.ts", "bezoek/paginas.ts", "evenement/fase.ts", "content/event.ts"]) {
    mkdirSync(path.dirname(path.join(dir, "src", file)), { recursive: true });
    cpSync(path.join(repo, "src", file), path.join(dir, "src", file));
  }
  mkdirSync(path.join(dir, "_site"), { recursive: true });
  writeFileSync(path.join(dir, "_site/index.html"), "<!doctype html><title>test</title>");
  const run = wrangler(dir, ["d1", "migrations", "apply", "oosthoek-inschrijvingen", "--local", "--persist-to", state]);
  assert.equal(run.status, 0, `migraties mislukt:\n${run.stdout}\n${run.stderr}`);
  const filled = wrangler(dir, ["d1", "execute", "oosthoek-inschrijvingen", "--local", "--persist-to", state, "--command", seed]);
  assert.equal(filled.status, 0, `vullen mislukt:\n${filled.stdout}\n${filled.stderr}`);
}

async function start(dir) {
  const child = spawn(
    process.execPath,
    [wranglerBin, "pages", "dev", "_site", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", state,
      "--show-interactive-dev-session=false", "--log-level", "warn",
      "--binding", `ADMIN_PASSWORD=${beheerWachtwoord}`, "--binding", `GEOLOCATIE_URL=http://127.0.0.1:${GEO_PORT}/geolocation/v4/Location`],
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
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGTERM");
}

let cookie = "";
async function call(method, url, body, headers = {}) {
  const res = await fetch(`${BASE}/api/beheer${url}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, data };
}
const kaart = async () => {
  const res = await call("GET", `/evenementen/${EVENT}/kaart`);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return res.data;
};
const lookupAll = () => call("POST", `/evenementen/${EVENT}/kaart/opzoeken`, {});
const exportBook = async () => {
  const res = await fetch(`${BASE}/api/beheer/evenementen/${EVENT}/export`, { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
  return readXlsx(new Uint8Array(await res.arrayBuffer()));
};
const byStreet = (map, street, number) => map.addresses.find((a) => a.street === street && a.number === number);

async function step(name, fn) {
  await fn();
  console.log(`ok - ${name}`);
}

const dir = path.join(work, "site");
let server = null;
try {
  prepare(dir);
  server = await start(dir);

  await step("zonder geldige sessie: kaart, opzoeken, aanduiden en export geweigerd, de dienst wordt niet aangesproken", async () => {
    for (const [method, url, body] of [
      ["GET", `/evenementen/${EVENT}/kaart`],
      ["POST", `/evenementen/${EVENT}/kaart/opzoeken`, {}],
      ["POST", `/evenementen/${EVENT}/kaart/locatie`, { key: "opstal|5|", lat: 51.33, lon: 4.87 }],
      ["GET", `/evenementen/${EVENT}/export`],
    ])
      assert.equal((await call(method, url, body)).status, 401, url);
    cookie = `oosthoek_beheer=${Math.floor(Date.now() / 1000) + 3600}.vervalst`;
    assert.equal((await call("GET", `/evenementen/${EVENT}/kaart`)).status, 401);
    assert.equal(geo.calls.length, 0);
  });

  const login = await fetch(`${BASE}/api/beheer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: beheerWachtwoord }),
  });
  assert.equal(login.status, 204);
  cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

  await step("unieke adressen: zelfde adres in andere schrijfwijze samen, geannuleerd niet mee, nummering volgens de rondrit", async () => {
    const map = await kaart();
    assert.deepEqual(
      map.addresses.map((a) => [a.nr, a.street, a.number, a.children.map((c) => c.name).join("+")]),
      [
        [1, "Gorenstraat", "10", "Lien"],
        [2, "Veldstraat", "2", "Mats"],
        [3, "Asterstraat", "1", "Fien"],
        [4, "Opstal", "5", "Noor+Milan+Jules"],
        [5, "Kongostraat", "3", "Rik"],
      ],
    );
    assert.deepEqual(byStreet(map, "Opstal", "5").registrations.map((r) => r.reference), ["SINT26-0001", "SINT26-0002"]);
    assert.equal(byStreet(map, "Kongostraat", "3").addressReview, true);
    assert.equal(map.addresses.reduce((n, a) => n + a.children.length, 0), 7);
    assert.ok(map.addresses.every((a) => a.location === null));
    assert.deepEqual([map.postcode, map.municipality, map.withoutAddress], ["2340", "Beerse", 0]);
  });

  await step("opzoeken: één vraag per uniek adres, alleen het adres; exact = gevonden, buren = niet gevonden, schatting en buiten de wijk = onzeker", async () => {
    const first = await lookupAll();
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.deepEqual(first.data, { checked: 5, failed: 0, remaining: 0 });
    assert.equal(geo.calls.length, 5);
    for (const c of geo.calls) {
      assert.equal(c.method, "GET");
      assert.equal(c.path, "/geolocation/v4/Location");
      assert.deepEqual(Object.keys(c.params).sort(), ["c", "q"]);
      assert.match(c.params.q, /^[A-Za-z. ]+ \d+[A-Z]?(?: bus \w+)?, 2340 Beerse$/);
      for (const secret of ["Noor", "Milan", "Jules", "Lien", "Fien", "Rik", "Mats", "Testouder", "example.org", "SINT26"])
        assert.ok(!c.params.q.includes(secret), secret);
    }
    const map = await kaart();
    const status = (street, number) => byStreet(map, street, number).location;
    assert.deepEqual([status("Opstal", "5").status, status("Opstal", "5").lat, status("Opstal", "5").lon], ["gevonden", 51.3278983, 4.8681662]);
    assert.deepEqual([status("Asterstraat", "1").status, status("Asterstraat", "1").lat], ["niet_gevonden", null]);
    assert.equal(status("Kongostraat", "3").status, "niet_gevonden");
    assert.equal(status("Gorenstraat", "10").status, "onzeker");
    assert.equal(status("Veldstraat", "2").status, "onzeker");
    // Bewaard: opnieuw openen of opzoeken vraagt de dienst niets meer.
    assert.deepEqual((await lookupAll()).data, { checked: 0, failed: 0, remaining: 0 });
    assert.equal(geo.calls.length, 5);
  });

  await step("storing bij de dienst: melding, niets bewaard, later opnieuw", async () => {
    sql(dir, `${reg(8, "SINT26-0008", "Leliestraat", "4 bus 2").replace(/'2026-11-12T10:00:00.000Z'/g, "'2026-11-13T10:00:00.000Z'")}\n${kid(10, 8, "Kas", 6)}`);
    geo.down = true;
    const failed = await lookupAll();
    assert.equal(failed.status, 503);
    assert.match(failed.data.message, /niet bereikbaar/);
    assert.equal(byStreet(await kaart(), "Leliestraat", "4").location, null);
    geo.down = false;
    assert.deepEqual((await lookupAll()).data, { checked: 1, failed: 0, remaining: 0 });
    const lelie = byStreet(await kaart(), "Leliestraat", "4");
    assert.deepEqual([lelie.box, lelie.location.status], ["2", "gevonden"]);
    assert.equal(geo.calls.at(-1).params.q, "Leliestraat 4 bus 2, 2340 Beerse");
  });

  await step("handmatig aanduiden: alleen in en rond de wijk, alleen bestaande adressen, van de eigen site; terugzetten zoekt opnieuw", async () => {
    const aster = byStreet(await kaart(), "Asterstraat", "1");
    const place = (body, headers) => call("POST", `/evenementen/${EVENT}/kaart/locatie`, body, headers);
    assert.equal((await place({ key: aster.key, lat: 50.85, lon: 4.35 })).status, 400);
    assert.equal((await place({ key: aster.key, lat: "51.32", lon: 4.866 })).status, 400);
    assert.equal((await place({ key: "bestaat|niet|", lat: 51.32, lon: 4.866 })).status, 404);
    assert.equal((await place({ key: aster.key, lat: 51.32, lon: 4.866 }, { Origin: "https://kwaadaardig.example" })).status, 403);
    assert.equal((await place({ key: aster.key, lat: 51.3199123456, lon: 4.8665987654 })).status, 204);
    let location = byStreet(await kaart(), "Asterstraat", "1").location;
    assert.deepEqual([location.status, location.lat, location.lon], ["handmatig", 51.319912, 4.866599]);
    // "Opnieuw opzoeken" laat een handmatige locatie staan.
    const before = geo.calls.length;
    assert.deepEqual((await call("POST", `/evenementen/${EVENT}/kaart/opzoeken`, { keys: [aster.key] })).data, { checked: 0, failed: 0, remaining: 0 });
    assert.equal(geo.calls.length, before);
    assert.equal((await place({ key: aster.key, reset: true })).status, 204);
    assert.equal(byStreet(await kaart(), "Asterstraat", "1").location, null);
    await lookupAll();
    location = byStreet(await kaart(), "Asterstraat", "1").location;
    assert.equal(location.status, "niet_gevonden");
    assert.equal(geo.calls.length, before + 1);
  });

  await step("Excel-export: blad Adressen met dezelfde nummers, aantallen en locaties als de kaart", async () => {
    const map = await kaart();
    const book = await exportBook();
    const [head, ...rows] = book.Adressen.rows;
    assert.deepEqual(head, [
      "Nr", "Straat", "Huisnummer", "Bus", "Postcode", "Gemeente", "Aantal kinderen", "Kinderen", "Inschrijvingen",
      "Adres nakijken", "Kaartlocatie", "Adres volgens Adressenregister", "Breedtegraad", "Lengtegraad",
    ]);
    assert.equal(rows.length, map.addresses.length);
    for (const [i, a] of map.addresses.entries()) {
      const r = rows[i];
      assert.deepEqual(r.slice(0, 4), [String(a.nr), a.street, a.number, a.box ?? ""]);
      assert.equal(Number(r[6]), a.children.length);
      assert.equal(r[8], a.registrations.map((x) => x.reference).join(", "));
    }
    const opstal = rows.find((r) => r[1] === "Opstal");
    assert.deepEqual(opstal.slice(4, 14), ["2340", "Beerse", "3", "Noor (5), Milan (3), Jules (8)", "SINT26-0001, SINT26-0002", "nee", "gevonden", "Opstal 5, 2340 Beerse", "51.3278983", "4.8681662"]);
    // Niet gevonden: geen postcode, gemeente of coördinaten verzonnen.
    const kongo = rows.find((r) => r[1] === "Kongostraat");
    assert.deepEqual([kongo[4], kongo[5], kongo[9], kongo[10], kongo[12], kongo[13]], ["", "", "ja", "niet gevonden", "", ""]);
    // Blad Kinderen: alle 10 kinderen (ook geannuleerde), het adresnummer alleen bij actieve kinderen.
    const [, ...kids] = book.Kinderen.rows;
    assert.equal(kids.length, 10);
    const noor = kids.find((r) => r[7] === "Noor");
    assert.equal(noor[18], opstal[0]);
    assert.equal(kids.find((r) => r[7] === "Weg")[18] ?? "", "");
    assert.equal(kids.find((r) => r[7] === "Gust")[18] ?? "", "");
  });

  await step("adres verbeterd in het beheer: oude locatie opgeruimd, nieuw adres opgezocht", async () => {
    const reg4 = (await call("GET", `/evenementen/${EVENT}/inschrijvingen`)).data.find((r) => r.reference === "SINT26-0004");
    assert.equal((await call("PATCH", `/inschrijvingen/${reg4.id}`, { houseNumber: "5", street: "Opstal" })).status, 200);
    const map = await kaart();
    assert.equal(byStreet(map, "Asterstraat", "1"), undefined);
    assert.deepEqual(byStreet(map, "Opstal", "5").children.map((c) => c.name), ["Noor", "Milan", "Jules", "Fien"]);
    const stored = () => sql(dir, `SELECT address_key FROM address_locations WHERE event_id = '${EVENT}' ORDER BY address_key`).map((r) => r.address_key);
    // Alleen de kaart openen ruimt de locatie van het oude adres al op.
    assert.ok(!stored().some((k) => k.startsWith("asterstraat|")));
    // Een verwijderde inschrijving: haar locatie verdwijnt bij het volgende openen van de kaart.
    const reg7 = (await call("GET", `/evenementen/${EVENT}/inschrijvingen`)).data.find((r) => r.reference === "SINT26-0007");
    assert.equal((await call("DELETE", `/inschrijvingen/${reg7.id}`, { confirm: "SINT26-0007" })).status, 200);
    assert.ok(stored().some((k) => k.startsWith("veldstraat|")));
    await kaart();
    assert.ok(!stored().some((k) => k.startsWith("veldstraat|")));
    await lookupAll();
    assert.deepEqual(stored(), (await kaart()).addresses.map((a) => a.key).sort());
  });

  await step("wissen: kaartlocaties mee gewist, kaart en opzoeken daarna dicht", async () => {
    assert.equal((await call("PATCH", `/evenementen/${EVENT}`, { status: "closed" })).status, 200);
    assert.equal((await call("POST", `/evenementen/${EVENT}/wissen`, { confirm: "WISSEN" })).status, 200);
    assert.deepEqual(sql(dir, "SELECT COUNT(*) AS n FROM address_locations"), [{ n: 0 }]);
    assert.equal((await call("GET", `/evenementen/${EVENT}/kaart`)).status, 409);
    assert.equal((await lookupAll()).status, 409);
    const book = await exportBook();
    assert.equal(book.Adressen.rows.length, 1);
    assert.ok(!JSON.stringify(book).includes("Noor"));
  });

  console.log("Alle kaartcontroles geslaagd.");
} finally {
  stop(server);
  fakeGeo.close();
}
