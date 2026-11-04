import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  activities,
  activityStatus,
  dateText,
  legacySinterklaasUrl,
  readRoute,
  sinterklaasStatus,
  statusLabels,
  todayInBrussels,
} from "../src/content/wijk.ts";

const read = (file) => readFileSync(new URL(file, import.meta.url));
const text = (file) => read(file).toString("utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const wijkSources = [
  "../wijk/index.html",
  "../src/content/wijk.ts",
  ...readdirSync(new URL("../src/wijk/", import.meta.url)).map((f) => `../src/wijk/${f}`),
];
const WEBSITE_BEELDEN = "../../../Documentatie/Oosthoek-Activiteitenbeelden/Website/";

test("hoofdadres: oude Sinterklaasroutes gaan door met zoekdeel en #-route, wijkpagina's en ankers blijven", () => {
  for (const [search, hash, expected] of [
    ["", "", null],
    ["", "#activiteiten", null],
    ["", "#contact", null],
    ["", "#/pasen", null],
    ["", "#/garageverkoop", null],
    ["", "#/wijkfeest", null],
    ["?fbclid=abc", "", null],
    ["", "#/home", "/sinterklaas/#/home"],
    ["", "#/", "/sinterklaas/#/"],
    ["", "#/route", "/sinterklaas/#/route"],
    ["", "#/sponsors", "/sinterklaas/#/sponsors"],
    ["", "#/contact", "/sinterklaas/#/contact"],
    ["?a=1", "#/kleurwedstrijd?reglement", "/sinterklaas/?a=1#/kleurwedstrijd?reglement"],
    ["", "#/bestaat-niet", "/sinterklaas/#/bestaat-niet"],
  ])
    assert.equal(legacySinterklaasUrl(search, hash), expected, `${search}${hash}`);
});

test("de ingang op /sinterklaas/ stuurt alleen het kale QR-adres door, zonder lus", () => {
  const html = text("../index.html");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "inline script in index.html");
  // Volg de doorverwijzingen zoals de browser: elk adres eindigt op een vaste plek, nooit in een kringloop.
  const run = (pathname, search, hash) => {
    let target = null;
    new Function("location", script)({ pathname, search, hash, replace: (url) => (target = url) });
    return target;
  };
  assert.equal(run("/sinterklaas/", "", ""), "/");
  assert.equal(run("/sinterklaas/", "", "#/home"), null);
  assert.equal(run("/sinterklaas/", "", "#/route"), null);
  assert.equal(run("/sinterklaas/", "?x=1", ""), null);
  assert.equal(run("/sinterklaas/", "?x=1", "#/privacy"), null);
  // Lokaal (npm run dev, preview) staat de Sinterklaassite op de hoofdmap: daar nooit doorsturen.
  assert.equal(run("/", "", ""), null);
  // Het doel van de ingang is zelf eindstation.
  assert.equal(legacySinterklaasUrl("", ""), null);
  // Het hoofdadres stuurt nooit meer met de server naar Sinterklaas.
  assert.ok(!text("../cloudflare-pages.mjs").includes("/ /sinterklaas/ 302"));
});

test("de gedrukte QR-adressen en de GitHub-doorverwijzing blijven ongewijzigd", () => {
  const github = text("../github-pages/index.html");
  assert.ok(github.includes('location.pathname.replace(/^\\/wijkvereniging-oosthoek(?=\\/|$)/, "")'));
  assert.ok(github.includes('location.replace("https://wijkvereniging-oosthoek.pages.dev" + path + location.search + location.hash)'));
  assert.ok(text("../src/content/event.ts").includes('url: "https://wijkvereniging-oosthoek.pages.dev/sinterklaas/"'));
});

test("activiteitenbeelden zijn bytegelijke kopieën; Documentatie blijft de bron", () => {
  for (const name of ["oosthoek-pasen.webp", "oosthoek-garageverkoop.webp", "oosthoek-wijkfeest.webp"])
    assert.equal(hash(read(`../public/assets/${name}`)), hash(read(WEBSITE_BEELDEN + name)), name);
  for (const activity of activities) {
    assert.match(activity.image, /^assets\/oosthoek-[a-z]+\.webp$/);
    assert.ok(existsSync(new URL(`../public/${activity.image}`, import.meta.url)), activity.image);
    assert.ok(activity.imageAlt.length > 30, activity.slug);
  }
});

test("logo en wijkillustratie komen ongewijzigd uit het ontwerpvoorbeeld", () => {
  const html = text(`${WEBSITE_BEELDEN}Oosthoek-Wijkwebsite-Voorstel.html`);
  const found = [...html.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)].slice(0, 2);
  for (const [i, name] of ["oosthoek-logo.webp", "oosthoek-wijk.webp"].entries())
    assert.equal(hash(read(`../public/assets/${name}`)), hash(Buffer.from(found[i][1], "base64")), name);
});

test("geen iframe, hotlinks of base64-beelden; sponsors en verenigingsgegevens uit de centrale bron", () => {
  const all = wijkSources.map((file) => [file, text(file)]);
  for (const [file, source] of all) {
    assert.doesNotMatch(source, /<iframe|;base64,/i, file);
    assert.doesNotMatch(source, /https?:\/\/[^"'\s)]+\.(webp|png|jpe?g|gif|svg|avif)/i, file);
    // Geen tweede lijst of tweede kopie van contactgegevens.
    assert.doesNotMatch(source, /zeepventje|delaplace|vzwoosthoek@|0496 56 06 79|Opstal 5|0553\.481\.505/i, file);
  }
  const app = all.map(([, source]) => source).join("\n");
  assert.ok(app.includes('content/sponsors.json"'));
  assert.ok(app.includes('content/sponsor-logos"'));
  assert.ok(app.includes("event.organisation") || app.includes("organisation"));
  assert.doesNotMatch(app, /RPR/, "alleen bevestigde verenigingsgegevens");
});

test("niets verzonnen: zonder bevestigde gegevens 'Datum volgt', geen prijzen, locaties of inschrijfknoppen", () => {
  assert.deepEqual(activities.map((a) => a.slug), ["pasen", "garageverkoop", "wijkfeest"]);
  for (const a of activities) {
    assert.equal(a.date, null, a.slug);
    assert.equal(a.location, null, a.slug);
    assert.equal(a.registrationHref, null, a.slug);
    assert.equal(a.status, "info", a.slug);
    assert.equal(dateText(a.date), "Datum volgt");
    assert.doesNotMatch(`${a.teaser} ${a.text}`, /€|euro|gratis|\b\d{1,2}[.:u]\d{2}\b|\b20\d\d\b/i, a.slug);
  }
  assert.equal(dateText("2026-11-28"), "28 november 2026");
});

test("status: informatie volgt, inschrijven mogelijk, gesloten en voorbij", () => {
  assert.deepEqual(statusLabels, {
    info: "Informatie volgt",
    open: "Inschrijven mogelijk",
    closed: "Inschrijving gesloten",
    past: "Voorbij",
  });
  const base = { date: null, status: "info", registrationHref: null, registrationDeadline: null };
  const today = "2027-03-10";
  assert.equal(activityStatus(base, today), "info");
  assert.equal(activityStatus({ ...base, status: "closed" }, today), "closed");
  // Inschrijven kan alleen met een echt inschrijfadres; anders blijft het een informatiemelding.
  assert.equal(activityStatus({ ...base, status: "open" }, today), "info");
  const open = { ...base, status: "open", registrationHref: "https://example.org/" };
  assert.equal(activityStatus(open, today), "open");
  // De laatste dag telt nog mee; daarna toont de site gesloten.
  assert.equal(activityStatus({ ...open, registrationDeadline: today }, today), "open");
  assert.equal(activityStatus({ ...open, registrationDeadline: "2027-03-09" }, today), "closed");
  // De dag zelf is nog niet voorbij.
  assert.equal(activityStatus({ ...open, date: today }, today), "open");
  assert.equal(activityStatus({ ...open, date: "2027-03-09" }, today), "past");
});

test("Sinterklaas volgt de echte inschrijfstatus van de server; zonder antwoord geen melding", () => {
  assert.equal(sinterklaasStatus("2026-11-28", "open", "2026-11-28"), "open");
  assert.equal(sinterklaasStatus("2026-11-28", "closed", "2026-11-04"), "closed");
  assert.equal(sinterklaasStatus("2026-11-28", "full", "2026-11-04"), "closed");
  assert.equal(sinterklaasStatus("2026-11-28", null, "2026-11-04"), null);
  assert.equal(sinterklaasStatus("2026-11-28", "open", "2026-11-29"), "past");
  assert.equal(sinterklaasStatus("2026-11-28", null, "2026-11-29"), "past");
});

test("de dag wisselt in Belgische tijd, niet in UTC", () => {
  assert.equal(todayInBrussels(new Date("2026-11-28T22:59:00Z")), "2026-11-28");
  assert.equal(todayInBrussels(new Date("2026-11-28T23:01:00Z")), "2026-11-29");
});

test("routes op het hoofdadres", () => {
  assert.deepEqual(readRoute(""), { page: null, anchor: null });
  assert.deepEqual(readRoute("#activiteiten"), { page: null, anchor: "activiteiten" });
  assert.deepEqual(readRoute("#/pasen"), { page: "pasen", anchor: null });
});

test("Oosthoek leeft mee: juiste afspraken, geen bedragen en geen wijkformulier", async () => {
  const { lifeMoments } = await import("../src/content/wijk.ts");
  const all = lifeMoments.map((m) => `${m.title} ${m.text}`).join(" ");
  assert.deepEqual(lifeMoments.map((m) => m.title), ["Een geboorte", "Een overlijden", "50 jaar getrouwd"]);
  assert.match(lifeMoments[0].text, /attentie/);
  assert.match(lifeMoments[1].text, /via de begrafenisondernemer een bloemstukje of krans/);
  assert.match(lifeMoments[2].text, /waardebon voor een etentje en een bloemetje/);
  assert.match(lifeMoments[2].text, /officiële melding verloopt via de gemeente Beerse/);
  assert.doesNotMatch(all, /€|euro|bedrag|bijdrage|premie|formulier/i);
});
