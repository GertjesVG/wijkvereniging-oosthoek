import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { verifiedPublicUrl } from "../src/content/public-website.ts";
import { event } from "../src/content/event.ts";
import { reglement } from "../src/content/reglement.ts";
import { sinterklaasRegistration } from "../src/inschrijving/evenementen.ts";
import { sponsorLogos } from "../src/content/sponsor-logos.ts";
import { addressOnly, sponsorMapUrl } from "../src/content/sponsor-kaart.ts";
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

test("sponsoradressen: 33 gecodeerde Google Maps-links met het volledige gepubliceerde adres", () => {
  const urls = new Set();
  for (const sponsor of sponsors) {
    const url = new URL(sponsorMapUrl(sponsor));
    assert.equal(`${url.origin}${url.pathname}`, "https://www.google.com/maps/search/");
    assert.equal(url.searchParams.get("api"), "1");
    const query = url.searchParams.get("query");
    assert.ok(query.endsWith(`${sponsor.address}, België`), sponsor.name);
    // Waar Google op de naam een ander adres of bedrijf toont, staat de naam niet in de zoekopdracht.
    assert.equal(query.includes(sponsor.name), !addressOnly.has(sponsor.name), sponsor.name);
    urls.add(url.href);
  }
  assert.equal(urls.size, 33);
  for (const name of addressOnly) assert.ok(sponsors.some((s) => s.name === name), name);
});

test("25 sponsorlogo’s op naam gekoppeld en als eigen bestand aanwezig; 8 sponsors krijgen een naamplaat", () => {
  const names = new Set(sponsors.map((s) => s.name));
  assert.equal(Object.keys(sponsorLogos).length, 25);
  for (const [name, logo] of Object.entries(sponsorLogos)) {
    assert.ok(names.has(name), name);
    assert.match(logo.file, /^sponsor-[a-z0-9-]+\.(webp|svg)$/);
    const file = new URL(`../public/assets/${logo.file}`, import.meta.url);
    assert.ok(existsSync(file), logo.file);
    assert.ok(logo.width > 0 && logo.height > 0, name);
    if (logo.backdrop) assert.match(logo.backdrop, /^#[0-9a-f]{6}$/);
    // Een klein bestand wordt niet groter getoond dan het is.
    if (logo.maxWidth) assert.ok(logo.maxWidth <= logo.width, name);
    // Een externe svg: geen scripts, geen verwijzingen naar buiten.
    if (logo.file.endsWith(".svg"))
      assert.doesNotMatch(
        readFileSync(file, "utf8"),
        /<script|href\s*=|url\(|<image|<foreignObject|\son[a-z]+\s*=/i,
        logo.file,
      );
  }
  assert.deepEqual(
    sponsors.filter((s) => !sponsorLogos[s.name]).map((s) => s.name),
    [
      "Taxi Adrienne EDLIH",
      "GNP",
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

test("officieel wedstrijdreglement: verkorte tekst in vijf onderdelen letterlijk, met het anker van het inschrijfformulier", () => {
  assert.equal(reglement.title, "Wedstrijdreglement – Sinterklaas Oosthoek 2026");
  assert.equal(reglement.organiser, "VZW Wijkvereniging Oosthoek");
  assert.equal(reglement.eventDate, "zaterdag 28 november 2026");
  assert.deepEqual(reglement.articles.map((a) => a.title), [
    "1. Deelname",
    "2. Inschrijving",
    "3. Kleurwedstrijd en cadeautjes",
    "4. Controle en eerlijkheid",
    "5. Privacy en akkoord",
  ]);
  const text = reglement.articles.flatMap((a) => a.body.flat()).join("\n");
  // Leeftijdsgrens, co-ouderschap, één keer per kind, voorraad en adrescontrole: zoals het formulier en de server werken.
  for (const must of [
    "kinderen van 0 tot en met 12 jaar op 28 november 2026, van wie minstens één ouder of wettelijke voogd in Wijk Oosthoek woont.",
    "Dit geldt ook bij gescheiden ouders of co-ouderschap. Het kind hoeft niet op dat adres gedomicilieerd te zijn.",
    "Elk kind mag slechts één keer deelnemen.",
    "Er geldt maximaal één cadeautje per deelnemend kind, afhankelijk van de beschikbare voorraad.",
    "De vereniging mag bij twijfel een adres of dubbele inschrijving controleren.",
    "Zonder akkoord is inschrijven niet mogelijk.",
  ])
    assert.ok(text.includes(must), must);
  assert.equal(reglement.signature, "VZW Wijkvereniging Oosthoek – Beerse");
  // Eén reglement: alleen deze component toont het, op de kleurwedstrijdpagina.
  const pages = readFileSync(new URL("../src/Pages.tsx", import.meta.url), "utf8");
  assert.equal(pages.split("<Reglement />").length, 2);
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

test("privacyverklaring: juiste rechtsgronden en verplichte informatie, geen beloftes die de werking niet waarmaakt", () => {
  const pages = readFileSync(new URL("../src/Pages.tsx", import.meta.url), "utf8").replace(/\s+/g, " ");
  const privacy = pages.slice(pages.indexOf("function PrivacyPage()"), pages.indexOf("export function ContentPage"));
  for (const must of [
    "artikel 6.1.b AVG",
    "artikel 6.1.f AVG",
    // Ook wie alleen de site bezoekt, moet de grond voor de verbindingsgegevens kunnen lezen.
    "de technische werking van de website",
    "korte notitie van een beheerder",
    "Dan blijft dat zo voor jouw inschrijving",
    "opgeslagen in de Europese Unie",
    "Alleen bevoegde personen",
    "papieren kopieën",
    "Google Ireland Limited",
    "https://www.dataprivacyframework.gov/list",
    "adequaatheidsbesluit",
    "binnen 30 dagen",
    "ongeveer twee maanden",
    "tot zes maanden",
    "bezwaar",
    "om door te geven",
    "Gegevensbeschermingsautoriteit",
  ])
    assert.ok(privacy.includes(must), must);
  // Toestemming blijft alleen de grond van inschrijvingen van vóór deze tekst; "anoniem", "onomkeerbaar" en "niets aan
  // anderen" kloppen niet met de werking; de verwerkersrol staat pas vast als het mandaat bevestigd is.
  for (const never of ["Dat doen we met je toestemming", "anoniem", "onomkeerbaar", "sponsors of anderen", "als verwerker"])
    assert.ok(!privacy.includes(never), never);
  assert.equal((privacy.match(/section-number/g) ?? []).length, 5);
  // Ook het beheer noemt de bewaarde cijfers niet anoniem: het inschrijvingsnummer blijft erbij staan.
  const dashboard = readFileSync(new URL("../src/beheer/Dashboard.tsx", import.meta.url), "utf8");
  assert.ok(!/anonieme/i.test(dashboard), "beheer: anonieme");
});

test("cadeauactie en kleurwedstrijd: inschrijving is open; niets over jury of winnaars zolang de vereniging dat niet bevestigde", () => {
  const pages = readFileSync(new URL("../src/Pages.tsx", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.ok(!pages.includes("zodra deze opengaat"));
  assert.ok(pages.includes("via het formulier op deze pagina"));
  assert.ok(!/jury|winnaar/i.test(pages));
  const text = reglement.articles.flatMap((a) => a.body.flat()).join("\n");
  assert.ok(!/jury|winnaar/i.test(text));
  assert.ok(text.includes("afhankelijk van de beschikbare voorraad"));
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

test("publieke site: geen vaste grens van 150 en geen aantal vrije plaatsen, wel maximaal één cadeautje per kind", () => {
  for (const file of ["../src/Pages.tsx", "../src/Home.tsx", "../src/inschrijving/RegistrationForm.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /150 cadeau|plaatsen vrij|Nog \$\{giftCount|laatste plaatsen|onbeperkt/i, file);
  }
  const form = readFileSync(new URL("../src/inschrijving/RegistrationForm.tsx", import.meta.url), "utf8");
  assert.ok(form.includes("is er maximaal één cadeautje"));
  assert.equal(sinterklaasRegistration.defaultCapacity, null);
});
