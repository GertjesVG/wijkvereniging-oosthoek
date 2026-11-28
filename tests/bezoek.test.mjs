// Bezoekersteller (src/bezoek/, server/bezoek.ts): de paginalijst, de dag in Belgische tijd en het rekenwerk van het beheer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bezoekPaginas, dagInBrussel, dagVerschuiven, isBezoekPagina, paginaVan } from "../src/bezoek/paginas.ts";
import { aantalDagen, dagSom, dagenReeks, periodeSom, verschilTekst } from "../src/bezoek/statistiek.ts";
import { activities, infoPages, privacyPage } from "../src/content/wijk.ts";
import { recordVisit } from "../server/bezoek.ts";

const text = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("de paginalijst is precies de bestaande pagina's van beide websites", () => {
  const wijk = ["wijk", ...[...activities, ...infoPages, privacyPage].map((p) => `wijk/${p.slug}`)];
  // De pagina's van de Sinterklaaswebsite (Pages.tsx); de sponsors en de privacy staan online op de wijkwebsite.
  const record = /const pages: Record<string, ComponentType> = \{([^}]+)\}/.exec(text("../src/Pages.tsx"))[1];
  const sint = ["home", ...[...record.matchAll(/^\s*([a-z-]+):/gm)].map((m) => m[1]).filter((p) => p !== "sponsors" && p !== "privacy"), "bedankt", "fotos"];
  // "bedankt" en "fotos": de bedankpagina en het fotoalbum na het evenement (App.tsx, Afsluiting.tsx).
  assert.deepEqual(Object.keys(bezoekPaginas).sort(), [...wijk, ...sint.map((p) => `sinterklaas/${p}`)].sort());
  for (const label of Object.values(bezoekPaginas)) assert.ok(label.length > 3);
});

test("welk adres bij welke pagina telt", () => {
  for (const [site, pathname, search, hash, expected] of [
    ["wijk", "/", "", "", "wijk"],
    ["wijk", "/", "?fbclid=x", "#activiteiten", "wijk"],
    ["wijk", "/", "", "#/sponsors", "wijk/sponsors"],
    ["wijk", "/", "", "#/sponsors?zeepventje", "wijk/sponsors"],
    ["wijk", "/", "", "#/lief-en-leed", "wijk/lief-en-leed"],
    ["wijk", "/", "", "#/privacy?sinterklaas", "wijk/privacy"],
    // Oude Sinterklaaslink op het hoofdadres: stuurt door, telt hier niet.
    ["wijk", "/", "", "#/route", null],
    ["sinterklaas", "/sinterklaas/", "", "#/home", "sinterklaas/home"],
    ["sinterklaas", "/sinterklaas/", "", "#/route?kaart", "sinterklaas/route"],
    ["sinterklaas", "/sinterklaas/", "?x=1", "", "sinterklaas/home"],
    // Het kale QR-adres en de sponsors sturen door naar de wijkwebsite.
    ["sinterklaas", "/sinterklaas/", "", "", null],
    ["sinterklaas", "/sinterklaas/", "", "#/sponsors", null],
    ["sinterklaas", "/sinterklaas/", "", "#/privacy", null],
    ["sinterklaas", "/sinterklaas/", "", "#/bestaat-niet", null],
    // Lokaal (npm run dev) staat Sinterklaas op de hoofdmap.
    ["sinterklaas", "/", "", "", "sinterklaas/home"],
  ])
    assert.equal(paginaVan(site, pathname, search, hash), expected, `${site} ${pathname}${search}${hash}`);
  assert.equal(isBezoekPagina("wijk/pasen"), true);
  for (const bad of ["", "toString", "wijk/", "WIJK", 5, null, undefined, "sinterklaas/sponsors", "sinterklaas/privacy"]) assert.equal(isBezoekPagina(bad), false, String(bad));
});

test("de dag wisselt in Belgische tijd, ook in de zomer; dagen optellen over maand- en uurwissel", () => {
  assert.equal(dagInBrussel(new Date("2026-11-14T22:59:59Z")), "2026-11-14");
  assert.equal(dagInBrussel(new Date("2026-11-14T23:00:00Z")), "2026-11-15");
  assert.equal(dagInBrussel(new Date("2026-07-01T21:59:59Z")), "2026-07-01");
  assert.equal(dagInBrussel(new Date("2026-07-01T22:00:00Z")), "2026-07-02");
  assert.equal(dagVerschuiven("2026-11-14", -6), "2026-11-08");
  assert.equal(dagVerschuiven("2026-12-31", 1), "2027-01-01");
  assert.equal(dagVerschuiven("2026-03-01", -1), "2026-02-28");
  // Over de overgang naar wintertijd (25 oktober 2026) en zomertijd (29 maart 2026).
  assert.equal(dagVerschuiven("2026-10-26", -2), "2026-10-24");
  assert.equal(dagVerschuiven("2026-03-28", 2), "2026-03-30");
});

const stats = {
  today: "2026-11-14",
  since: "2026-10-20",
  days: [
    { day: "2026-10-20", visits: 1, views: 2 },
    { day: "2026-11-01", visits: 4, views: 9 },
    { day: "2026-11-07", visits: 10, views: 20 },
    { day: "2026-11-08", visits: 3, views: 5 },
    { day: "2026-11-13", visits: 6, views: 11 },
    { day: "2026-11-14", visits: 2, views: 7 },
  ],
};

test("dagtotalen en periodes: vandaag, gisteren, 7 en 30 dagen, met de juiste grenzen", () => {
  assert.deepEqual(dagSom(stats, 0), { visits: 2, views: 7 });
  assert.deepEqual(dagSom(stats, -1), { visits: 6, views: 11 });
  assert.deepEqual(dagSom(stats, -2), { visits: 0, views: 0 });
  // 7 dagen = 8 tot en met 14 november; 7 november hoort bij de 7 dagen ervoor (1 tot en met 7 november).
  const week = periodeSom(stats, 7);
  assert.deepEqual([week.visits, week.views], [11, 23]);
  assert.deepEqual(week.previous, { visits: 14, views: 29 });
  // 30 dagen = 16 oktober tot en met 14 november. De 30 dagen ervoor begonnen vóór de teller: niet vergelijken.
  const month = periodeSom(stats, 30);
  assert.deepEqual([month.visits, month.views, month.previous], [26, 54, null]);
  // Nog niets geteld: nullen, geen vergelijking.
  assert.deepEqual(periodeSom({ today: "2026-11-14", since: null, days: [] }, 7), { visits: 0, views: 0, previous: null });
});

test("de reeks voor de grafiek heeft elke dag, ook zonder bezoek; 'alles' loopt van de eerste dag tot vandaag", () => {
  const series = dagenReeks(stats.days, stats.today, 7);
  assert.deepEqual(series.map((d) => d.day), ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
  assert.deepEqual(series.map((d) => d.visits), [3, 0, 0, 0, 0, 6, 2]);
  assert.equal(aantalDagen(stats, 30), 30);
  assert.equal(aantalDagen(stats, "alles"), 26);
  assert.equal(aantalDagen({ today: "2026-11-14", since: null }, "alles"), 1);
  assert.equal(aantalDagen({ today: "2026-11-14", since: "2026-11-14" }, "alles"), 1);
  assert.equal(dagenReeks(stats.days, stats.today, 26)[0].day, "2026-10-20");
});

test("vergelijking in woorden; zonder vorige periode geen tekst", () => {
  assert.equal(verschilTekst(15, 10), "50 % meer");
  assert.equal(verschilTekst(9, 12), "25 % minder");
  assert.equal(verschilTekst(10, 10), "evenveel");
  for (const previous of [0, null, undefined]) assert.equal(verschilTekst(5, previous), null);
});

// Nepdatabase: houdt bij wat de server zou wegschrijven.
function fakeDb(fail = false) {
  const writes = [];
  return {
    writes,
    prepare: () => ({
      bind: (...values) => ({
        run: async () => {
          if (fail) throw new Error("D1_ERROR: no such table: visit_days");
          writes.push(values);
        },
      }),
    }),
  };
}
const post = (body, headers = {}) =>
  new Request("https://wijkvereniging-oosthoek.pages.dev/api/bezoek", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin", "User-Agent": "Mozilla/5.0 Firefox/130", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("melding: alleen bekende pagina's van de eigen site; altijd 204; niets van de bezoeker bewaard", async () => {
  const db = fakeDb();
  const ok = await recordVisit(post({ p: "sinterklaas/route", b: 1, w: 1 }, { "CF-Connecting-IP": "203.0.113.9" }), { DB: db });
  assert.equal(ok.status, 204);
  assert.equal(await ok.text(), "");
  assert.deepEqual(db.writes, [[dagInBrussel(), "sinterklaas/route", 1, 1]]);
  await recordVisit(post({ p: "wijk", w: 1 }), { DB: db });
  assert.deepEqual(db.writes[1], [dagInBrussel(), "wijk", 1, 0]);

  for (const [name, request] of [
    ["onbekende pagina", post({ p: "wijk/verzonnen", b: 1, w: 1 })],
    ["geen pagina", post({ b: 1, w: 1 })],
    ["niets te tellen", post({ p: "wijk", b: 0, w: 0 })],
    ["groot getal", post({ p: "wijk", b: 1, w: 500 })],
    ["geen JSON", post("p=wijk")],
    ["geen JSON-type", post({ p: "wijk", w: 1 }, { "Content-Type": "text/plain" })],
    ["andere site", post({ p: "wijk", w: 1 }, { "Sec-Fetch-Site": "cross-site" })],
    ["andere herkomst", post({ p: "wijk", w: 1 }, { Origin: "https://kwaadaardig.example" })],
    ["zoekrobot", post({ p: "wijk", w: 1 }, { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" })],
    ["voorbeeldophaler", post({ p: "wijk", w: 1 }, { "User-Agent": "WhatsApp/2.23" })],
  ]) {
    const res = await recordVisit(request, { DB: db });
    assert.equal(res.status, 204, name);
    assert.equal(db.writes.length, 2, name);
  }
});

test("melding zonder database of zonder tabel: 204 en geen fout, de website merkt niets", async () => {
  assert.equal((await recordVisit(post({ p: "wijk", w: 1 }), {})).status, 204);
  const log = console.error;
  console.error = () => {};
  try {
    assert.equal((await recordVisit(post({ p: "wijk", w: 1 }), { DB: fakeDb(true) })).status, 204);
  } finally {
    console.error = log;
  }
});

test("de teller gebruikt geen cookie of browseropslag en staat niet in het beheer", () => {
  for (const file of ["../src/bezoek/teller.ts", "../src/bezoek/paginas.ts", "../index.html"])
    assert.doesNotMatch(text(file), /document\.cookie|localStorage|sessionStorage|indexedDB/, file);
  assert.match(text("../src/bezoek/teller.ts"), /credentials: "omit"/);
  assert.match(text("../src/main.tsx"), /startBezoekteller\("sinterklaas"\)/);
  assert.match(text("../src/wijk/main.tsx"), /startBezoekteller\("wijk"\)/);
  assert.doesNotMatch(text("../src/beheer/main.tsx") + text("../src/beheer/Dashboard.tsx"), /teller/);
  // De server leest geen IP-adres voor de teller.
  assert.doesNotMatch(text("../server/bezoek.ts"), /CF-Connecting-IP|connectionOf|sha256/);
});

test("alleen zichtbare pagina's tellen: geen achtergrondtabblad of pagina die de browser alvast laadt", () => {
  const teller = text("../src/bezoek/teller.ts");
  // Een verborgen of alvast geladen pagina is "hidden"; ze telt zodra ze zichtbaar wordt.
  assert.match(teller, /document\.visibilityState !== "visible"\) return/);
  assert.match(teller, /addEventListener\("visibilitychange", count\)/);
  // Terug naar een pagina uit het browsergeheugen: weergave opnieuw tellen, geen bezoek.
  assert.match(teller, /addEventListener\("pageshow"/);
  assert.match(teller, /event\.persisted/);
  assert.match(text("../index.html"), /prerendering/);
});

test("het inschrijfformulier onthoudt ingevulde gegevens alleen in het geheugen van de pagina", () => {
  const form = text("../src/inschrijving/RegistrationForm.tsx");
  assert.match(form, /const drafts = new Map/);
  assert.match(form, /drafts\.delete\(config\.id\)/);
  assert.doesNotMatch(form, /document\.cookie|localStorage|sessionStorage|indexedDB/);
});
