import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { verifiedPublicUrl } from "../src/content/public-website.ts";
import { event } from "../src/content/event.ts";
import { reglement } from "../src/content/reglement.ts";
import { sinterklaasRegistration } from "../src/inschrijving/evenementen.ts";
import { sponsorLogos } from "../src/content/sponsor-logos.ts";
const sponsors = JSON.parse(
  readFileSync(
    new URL("../src/content/sponsors.json", import.meta.url),
    "utf8",
  ),
);
test("33 unieke officiële sponsors met echte brongegevens", () => {
  assert.equal(sponsors.length, 33);
  assert.equal(new Set(sponsors.map((s) => s.name)).size, 33);
  for (const s of sponsors) {
    assert.ok(s.name.length);
    assert.ok(s.address.includes(","));
    assert.ok(Array.isArray(s.phones));
    assert.ok(s.email === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email));
  }
  assert.equal(sponsors[0].name, "ZEEPVENTJE");
  assert.equal(sponsors[32].name, "Stef Nuyens");
  assert.equal(sponsors[5].name, "Herenkapsalon Dooley’s");
});

test("alleen de 20 bevestigde eigen sponsorwebsites worden aangeboden", () => {
  const report = readFileSync(
    new URL(
      "../../../Documentatie/oosthoek-sponsors-websites-onderzoek.md",
      import.meta.url,
    ),
    "utf8",
  );
  const confirmed = new Map();
  for (const line of report.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells[3] !== "✅") continue;
    const name = cells[2] === "Aerts (Grafzerken)" ? "Aerts" : cells[2];
    const url = cells[4].match(/\[Website\]\((https:\/\/[^)]+)\)/)?.[1];
    assert.ok(url);
    confirmed.set(name, url);
  }
  assert.equal(confirmed.size, 20);
  for (const sponsor of sponsors)
    assert.equal(
      sponsor.website,
      confirmed.get(sponsor.name) ?? null,
      sponsor.name,
    );
  assert.equal(
    sponsors.find((s) => s.name === "Tegeldiscount").address,
    "Turnhoutsebaan 132, Oostmalle",
  );
  assert.equal(
    sponsors.find((s) => s.name === "Polyesterwerken Stevens J.").address,
    "Krikskensstraat 24, Beerse",
  );
  assert.equal(
    sponsors.find((s) => s.name === "Gipsmachinecenter G.M.C.").address,
    "Leemstraat 42, Beerse",
  );
});

test("24 sponsorlogo’s op naam gekoppeld en als eigen bestand aanwezig; 9 sponsors krijgen een naamplaat", () => {
  const names = new Set(sponsors.map((s) => s.name));
  assert.equal(Object.keys(sponsorLogos).length, 24);
  for (const [name, logo] of Object.entries(sponsorLogos)) {
    assert.ok(names.has(name), name);
    assert.match(logo.file, /^sponsor-[a-z0-9-]+\.(webp|svg)$/);
    assert.ok(
      existsSync(new URL(`../public/assets/${logo.file}`, import.meta.url)),
      logo.file,
    );
    assert.ok(logo.width > 0 && logo.height > 0, name);
    if (logo.backdrop) assert.match(logo.backdrop, /^#[0-9a-f]{6}$/);
  }
  assert.deepEqual(
    sponsors.filter((s) => !sponsorLogos[s.name]).map((s) => s.name),
    [
      "Taxi Adrienne EDLIH",
      "GNP",
      "Bouwwerken Rombouts",
      "Tegeldiscount",
      "Garage Peeters Wim",
      "Scheyltjens Wim",
      "Grafico Printing",
      "SIS",
      "Selouco",
    ],
  );
});

test("flyer en diploma’s zijn geen openbare bestanden; originelen blijven behouden", () => {
  for (const file of [
    "downloads/sinterklaas-flyer.pdf",
    "downloads/hulp-pietendiploma.pdf",
    "downloads/hulp-pietendiploma.png",
    "assets/diploma.webp",
  ])
    assert.equal(
      existsSync(new URL("../public/" + file, import.meta.url)),
      false,
      file,
    );
  for (const file of [
    "Oosthoek_Sinterklaas_Dubbelzijdig_Kleurwedstrijd_A4.pdf",
    "Sinterklaas_diploma_A4_voorkant_achterkant_gelijk_groter_min_snijverlies (1).pdf",
    "Feestelijk Hulp-Pietendiploma met Sinterklaas.png",
  ])
    assert.equal(
      existsSync(new URL("../../../" + file, import.meta.url)),
      true,
      file,
    );
});

test("QR-doel is alleen het bevestigde vaste Sinterklaas-adres", () => {
  assert.equal(
    verifiedPublicUrl(event.publicWebsite),
    "https://wijkvereniging-oosthoek.pages.dev/sinterklaas/",
  );
  for (const url of [
    null,
    "http://localhost:5173/",
    "https://127.0.0.1/",
    "https://preview.local/",
    "https://preview.trycloudflare.com/",
    "https://demo.ngrok-free.app/",
    "geen adres",
  ])
    assert.equal(verifiedPublicUrl({ url, verified: true }), null);
  assert.equal(
    verifiedPublicUrl({
      url: "https://oosthoek.example.org/",
      verified: false,
    }),
    null,
  );
  assert.equal(
    verifiedPublicUrl({ url: "https://oosthoek.example.org/", verified: true }),
    "https://oosthoek.example.org/",
  );
});
test("downloads zijn bytegelijk aan de originele documenten", () => {
  const files = [["kleurplaat.pdf", "Oosthoek_Sinterklaas_Kleurplaat_A4.pdf"]];
  const hash = (b) => createHash("sha256").update(b).digest("hex");
  for (const [copy, original] of files)
    assert.equal(
      hash(
        readFileSync(new URL("../public/downloads/" + copy, import.meta.url)),
      ),
      hash(readFileSync(new URL("../../../" + original, import.meta.url))),
      copy,
    );
});

test("officieel wedstrijdreglement: zeven onderdelen letterlijk, met het anker van het inschrijfformulier", () => {
  assert.equal(reglement.title, "Wedstrijdreglement – Sinterklaas Oosthoek 2026");
  assert.equal(reglement.organiser, "VZW Wijkvereniging Oosthoek");
  assert.equal(reglement.eventDate, "Zaterdag 28 november 2026");
  assert.equal(reglement.articles.length, 7);
  reglement.articles.forEach((a, i) =>
    assert.ok(a.title.startsWith(`${i + 1}. `), a.title),
  );
  const text = reglement.articles.flatMap((a) => a.body.flat()).join("\n");
  for (const must of [
    "0 tot en met 12 jaar op 28 november 2026",
    "minstens één ouder of wettelijke voogd daadwerkelijk in Wijk Oosthoek woont",
    "gescheiden ouders of co-ouderschap",
    "Elk kind mag slechts één keer worden ingeschreven.",
    "één cadeautje per deelnemend kind",
    "Zonder deze bevestiging kan de inschrijving niet worden voltooid.",
  ])
    assert.ok(text.includes(must), must);
  // Het formulier linkt naar "#/kleurwedstrijd?reglement"; App.tsx scrolt naar het element met dat id.
  assert.equal(sinterklaasRegistration.rules.href, "#/kleurwedstrijd?reglement");
  const components = readFileSync(
    new URL("../src/components.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(components.includes('id="reglement"'));
  assert.ok(
    !components.includes("event.rules"),
    "het oude korte regelblok is vervangen",
  );
});

test("route 2026: de 24 bevestigde straten in volgorde, vertrek zonder adres, kaart per straat", () => {
  // Letterlijk de definitieve volgorde van de vereniging (Gert, 3 november 2026).
  const confirmed = [
    "Gorenstraat", "Veldstraat", "Huffelenstraat", "Paddesteenstraat", "Zandstraat", "Veerpontstraat",
    "Leemstraat", "Rozenstraat", "Daliastraat", "Tulpenstraat", "Boterbloemstraat", "Asterstraat",
    "Leliestraat", "Korenbloemstraat", "Violierstraat", "Steenovensstraat", "Beukenlaan", "Kattespoelstraat",
    "Frans Lauwersstraat", "Jan Vaertenstraat", "Dr. Paul Janssenstraat", "Opstal", "Scheperstraat", "Oosteneinde",
  ];
  assert.deepEqual(event.route.stops, confirmed);
  assert.equal(event.date, "2026-11-28");
  assert.equal(event.departure, "Vertrek om 10.30 uur aan Wijkhuis Oosthoek.");
  assert.equal(event.route.transport, "Huifkar met witte paarden");
  assert.equal(
    event.route.turnNote,
    "In straten waar de huifkar moeilijk kan draaien, vragen we bewoners om aan het begin van de straat te komen.",
  );
  // Tot Gert de getekende rijweg nakeek, blijft de kaart "indicatief".
  assert.equal(event.route.mapChecked, false);
  // Alle straten van de rondrit liggen in wijk Oosthoek volgens de gemeentelijst (Steenovensstraat deels).
  const area = sinterklaasRegistration.area;
  for (const street of confirmed)
    assert.ok(area.streets.includes(street) || street in area.partialStreets, street);

  const map = JSON.parse(readFileSync(new URL("../src/content/route-kaart.json", import.meta.url), "utf8"));
  assert.match(map.bron, /OpenStreetMap/);
  assert.deepEqual(map.straten.map((s) => s.naam), confirmed);
  // Binnen Beerse-Oosthoek: geen verschoven of verwisselde coördinaten.
  const inArea = ([lat, lon]) => lat > 51.31 && lat < 51.345 && lon > 4.85 && lon < 4.895;
  for (const s of map.straten) {
    assert.ok(s.lijnen.length > 0 && s.lijnen.every((l) => l.length >= 2 && l.every(inArea)), s.naam);
    assert.ok(inArea(s.label), s.naam);
  }
  for (const v of map.verbindingen) {
    assert.ok(Number.isInteger(v.na) && v.na >= 1 && v.na < confirmed.length);
    assert.ok(v.via.length > 0 && v.via.every((name) => !confirmed.includes(name)), "alleen wegen buiten de route");
    assert.ok(v.lijnen.every((l) => l.length >= 2 && l.every(inArea)));
  }
  // Eén plek voor de stratenlijst: geen tweede kopie in de andere pagina's of de startpagina.
  for (const file of ["../src/Pages.tsx", "../src/Home.tsx", "../src/components.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.ok(!source.includes("Paddesteenstraat"), file);
  }
});
