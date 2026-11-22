import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  activities,
  activityStatuses,
  dateText,
  infoPages,
  legacySinterklaasUrl,
  municipalityJubileeUrl,
  privacyHref,
  privacyPage,
  privacyUpdated,
  readRoute,
  sinterklaasStatuses,
  smallImage,
  sponsorIntro,
  sponsorTotal,
  statusLabels,
  todayInBrussels,
  wijkhuisLocation,
} from "../src/content/wijk.ts";
import { renderConfirmation } from "../src/inschrijving/bevestigingsmail.ts";
import { event } from "../src/content/event.ts";

const read = (file) => readFileSync(new URL(file, import.meta.url));
const text = (file) => read(file).toString("utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const wijkSources = [
  "../wijk/index.html",
  "../src/content/wijk.ts",
  "../src/content/teksten.ts",
  "../src/SponsorCards.tsx",
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
    ["", "#/sponsors", null],
    ["?bron=test", "#/sponsors", null],
    ["", "#/lief-en-leed", null],
    ["", "#/wijkhuis", null],
    ["", "#/privacy", null],
    ["", "#/privacy?sinterklaas", null],
    ["?fbclid=abc", "", null],
    ["", "#/home", "/sinterklaas/#/home"],
    ["", "#/", "/sinterklaas/#/"],
    ["", "#/route", "/sinterklaas/#/route"],
    ["", "#/contact", "/sinterklaas/#/contact"],
    ["?a=1", "#/kleurwedstrijd?reglement", "/sinterklaas/?a=1#/kleurwedstrijd?reglement"],
    ["", "#/bestaat-niet", "/sinterklaas/#/bestaat-niet"],
  ])
    assert.equal(legacySinterklaasUrl(search, hash), expected, `${search}${hash}`);
});

test("de ingang op /sinterklaas/ stuurt alleen het kale QR-adres, de sponsors en de privacy door, zonder lus", () => {
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
  // De privacyverklaring staat centraal op de wijkwebsite; het oude adres opent ze bij het onderdeel Sinterklaas.
  assert.equal(run("/sinterklaas/", "", "#/privacy"), "/#/privacy?sinterklaas");
  assert.equal(run("/sinterklaas/", "?x=1", "#/privacy"), "/?x=1#/privacy?sinterklaas");
  assert.equal(run("/sinterklaas/", "", "#/privacy-iets"), null);
  assert.equal(run("/", "", "#/privacy"), null);
  assert.equal(legacySinterklaasUrl("", "#/privacy?sinterklaas"), null);
  // De sponsors staan op één algemene pagina; zoekdeel en anker gaan mee.
  assert.equal(run("/sinterklaas/", "", "#/sponsors"), "/#/sponsors");
  assert.equal(run("/sinterklaas/", "?x=1", "#/sponsors?y"), "/?x=1#/sponsors?y");
  assert.equal(run("/sinterklaas/", "", "#/sponsors-iets"), null);
  // Lokaal (npm run dev, preview) staat de Sinterklaassite op de hoofdmap: daar nooit doorsturen.
  assert.equal(run("/", "", ""), null);
  assert.equal(run("/", "", "#/sponsors"), null);
  // De doelen van de ingang zijn zelf eindstation.
  assert.equal(legacySinterklaasUrl("", ""), null);
  assert.equal(legacySinterklaasUrl("", "#/sponsors"), null);
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

test("hoofdpagina: zes eigen tegelbeelden in 3:2, groot genoeg en licht; het Sinterklaasbeeld blijft ongewijzigd", () => {
  const tiles = [...activities, ...infoPages];
  assert.deepEqual(
    tiles.map((item) => item.tile.src),
    [...["pasen", "garageverkoop", "wijkfeest", "sponsors", "lief-en-leed"].map((name) => `assets/tegel-${name}.webp`), infoPages[2].image],
  );
  // De wijkhuistegel toont exact het beeld van de wijkhuispagina.
  assert.equal(infoPages[2].tile.src, "assets/oosthoek-wijkhuis.webp");
  for (const { slug, tile } of tiles) {
    // Breedte en hoogte staan in de kop van een WebP (VP8). 3:2 past precies in het vak: niets afgesneden, geen opvulling.
    for (const [file, width, height, limit] of [
      [tile.src, 1536, 1024, 500_000],
      [smallImage(tile.src), 768, 512, 150_000],
    ]) {
      const bytes = read(`../public/${file}`);
      assert.equal(bytes.subarray(8, 12).toString("latin1"), "WEBP", file);
      assert.ok(bytes.length < limit, `${file}: ${bytes.length} bytes`);
      assert.equal(bytes.readUInt16LE(26) & 0x3fff, width, file);
      assert.equal(bytes.readUInt16LE(28) & 0x3fff, height, file);
    }
    assert.ok(tile.alt.length > 30, slug);
  }
  // Het wijkhuisbeeld is een illustratie, geen bewijs van hoe het echte wijkhuis eruitziet.
  assert.equal(infoPages[2].slug, "wijkhuis");
  assert.equal(infoPages[2].tile.note, "Illustratie");
  assert.match(infoPages[2].tile.alt, /^Illustratie, geen foto/);
  assert.ok(hash(read("../public/assets/hero.webp")).startsWith("9a5778745f857b6e"));
});

test("wijkinformatie: de nieuwste beelden als eigen WebP, met kleine versie; de bronnen blijven in Documentatie", () => {
  assert.deepEqual(infoPages.map((p) => [p.slug, p.name]), [
    ["sponsors", "Onze sponsors"],
    ["lief-en-leed", "Lief en leed in onze wijk"],
    ["wijkhuis", "Waar is ons wijkhuis?"],
  ]);
  assert.equal(infoPages[0].more, "Ontdek wie onze wijk steunt");
  assert.equal(infoPages[1].teaser, "Geboorte, overlijden en huwelijksjubileum: Oosthoek leeft mee.");
  assert.equal(infoPages[1].more, "Ontdek onze attenties");
  for (const item of [...infoPages, ...activities]) {
    const webp = (file) => {
      const bytes = read(`../public/${file}`);
      assert.equal(bytes.subarray(8, 12).toString("latin1"), "WEBP", file);
      return bytes.length;
    };
    assert.ok(webp(smallImage(item.image)) < webp(item.image) / 2, item.slug);
    assert.ok(item.imageAlt.length > 30, item.slug);
  }
  for (const name of [
    "Warme handdruk voor de buurt.png",
    "Geboorte, herinnering en gouden jubileum.png",
    "Schilderachtig Oosthoek-clubhuis in het groen.png",
  ])
    assert.ok(existsSync(new URL(WEBSITE_BEELDEN + name, import.meta.url)), name);
  // Het Sinterklaasbeeld blijft het bestaande bestand.
  assert.equal(smallImage("assets/hero.webp"), null);
});

test("wijkhuis: Oosteneinde bij de kanaalbrug (niet het zeteladres Opstal 5) met de bestaande fysieke locatie, los van de live GPS", () => {
  assert.equal(wijkhuisLocation.name, "Wijkhuis Oosthoek");
  assert.equal(wijkhuisLocation.address, "Oosteneinde, bij de kanaalbrug, 2340 Beerse");
  assert.notEqual(wijkhuisLocation.address, event.organisation.address);
  assert.equal(wijkhuisLocation.lat, 51.32974);
  assert.equal(wijkhuisLocation.lon, 4.86997);
  assert.equal(new URL(wijkhuisLocation.routeUrl).searchParams.get("destination"), `${wijkhuisLocation.lat},${wijkhuisLocation.lon}`);
  // Het vertrek van de rondrit staat op hetzelfde punt als het wijkhuis op de wijkhuiskaart.
  assert.deepEqual(JSON.parse(text("../src/content/route-kaart.json")).vertrek.punt, [wijkhuisLocation.lat, wijkhuisLocation.lon]);
  assert.equal(infoPages[2].more, "Bekijk de locatie en route");
  assert.ok(infoPages[2].teaser.includes(wijkhuisLocation.name));
  assert.ok(infoPages[2].teaser.includes(wijkhuisLocation.address));
  // Strikte scheiding: de wijkhuiskaart gebruikt geen GPS-code, geen locatieverzoek, en laadt alleen via lazy().
  const map = text("../src/wijk/WijkhuisMap.tsx");
  assert.doesNotMatch(map, /from "[^"]*gps|geolocation|\.locate\(/i);
  const app = text("../src/wijk/WijkApp.tsx");
  assert.doesNotMatch(app, /geolocation|from "leaflet"|from "\.\/WijkhuisMap"/);
  assert.ok(app.includes('lazy(() => import("./WijkhuisMap"))'));
});

test("het persoonlijke telefoonnummer staat nergens in de broncode of publieke tekstbestanden; sponsornummers blijven", () => {
  // Een hash in plaats van het nummer zelf: deze repository is openbaar.
  const PERSONAL = "956c4a081b11dee0119cdbb7c5adfcf6c868d32feaf118990ffbc4552068f9c3";
  const walk = (dir) =>
    readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}${entry.name}/`) : [`${dir}${entry.name}`],
    );
  const files = ["../src/", "../public/", "../mail/", "../server/", "../functions/", "../github-pages/", "../tests/"]
    .flatMap(walk)
    .concat(["../index.html", "../wijk/index.html", "../README.md", "../INSCHRIJVEN.md", "../GPS.md"])
    .filter((file) => /\.(tsx?|mjs|js|json|html|css|md|svg|txt)$/.test(file));
  assert.ok(files.length > 30);
  for (const file of files)
    for (const found of text(file).match(/\+?\d[\d .\-/]{7,}\d/g) ?? []) {
      const digits = found.replace(/\D/g, "").replace(/^(00)?32/, "0");
      assert.notEqual(hash(digits), PERSONAL, file);
    }
  const sponsors = JSON.parse(text("../src/content/sponsors.json"));
  assert.deepEqual(sponsors.filter((s) => s.phones.length === 0).map((s) => s.name), ["ZEEPVENTJE"]);
  assert.ok(text("../src/SponsorCards.tsx").includes("phoneHref(phone)"));
});

test("jubileum: één gemeentelijke link, zonder formulier op onze website en zonder aangevinkte keuze", () => {
  assert.equal(new URL(municipalityJubileeUrl).origin, "https://eloket.beerse.be");
  const app = text("../src/wijk/WijkApp.tsx");
  assert.equal(app.match(/municipalityJubileeUrl\}/g)?.length, 1);
  assert.equal(app.match(/Huwelijksjubileum melden bij de gemeente/g)?.length, 1);
  for (const never of ["<iframe", "<form", "checked", "parochie"]) assert.ok(!app.includes(never), never);
});

test("bevestigingsmail: de link gaat rechtstreeks naar de Sinterklaaswebsite; opmaak en beelden blijven", () => {
  const SITE = "https://wijkvereniging-oosthoek.pages.dev/sinterklaas/";
  const mail = renderConfirmation("sinterklaas-2026", { reference: "SINT26-0000", childNames: ["Testkind"] });
  assert.ok(mail.html.includes(`<a href="${SITE}#/home" target="_blank"`));
  assert.ok(mail.text.includes(`${SITE}#/home\n`));
  // Geen enkele link meer naar het kale QR-adres; de beelden staan er wel gewoon onder.
  assert.doesNotMatch(`${mail.html}\n${mail.text}`, new RegExp(`${SITE}(?=["\\s:]|$)`, "m"));
  for (const image of ["email-boven-2026.jpg", "email-perkament.jpg", "email-website.png", "email-contact.png", "email-onder.jpg"])
    assert.ok(mail.html.includes(`src="${SITE}email/${image}"`) || mail.html.includes(`${SITE}email/${image}`), image);
  assert.ok(mail.html.includes("SINT26-0000") && mail.html.includes("Testkind"));
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
    // De kaarttegels van OpenStreetMap zijn geen hotlink: ze laden pas na de klik op "Toon de kaart".
    // Het deelbeeld (og:image) is evenmin een hotlink: een eigen bestand, dat sociale media alleen via een volledig adres vinden.
    const withoutTiles = source
      .replace("https://tile.openstreetmap.org/{z}/{x}/{y}.png", "")
      .replaceAll("https://wijkvereniging-oosthoek.pages.dev/sinterklaas/assets/oosthoek-deelbeeld-2026.jpg", "");
    assert.doesNotMatch(withoutTiles, /https?:\/\/[^"'\s)]+\.(webp|png|jpe?g|gif|svg|avif)/i, file);
    // Geen tweede lijst of tweede kopie van contactgegevens.
    assert.doesNotMatch(source, /zeepventje|delaplace|vzwoosthoek@|Opstal 5|0553\.481\.505/i, file);
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
    upcoming: "Inschrijving nog niet open",
    past: "Voorbij",
  });
  const base = { date: null, status: "info", registrationHref: null, registrationDeadline: null };
  const today = "2027-03-10";
  assert.deepEqual(activityStatuses(base, today), ["info"]);
  assert.deepEqual(activityStatuses({ ...base, status: "closed" }, today), ["closed"]);
  // Inschrijven kan alleen met een echt inschrijfadres; anders blijft het een informatiemelding.
  assert.deepEqual(activityStatuses({ ...base, status: "open" }, today), ["info"]);
  const open = { ...base, status: "open", registrationHref: "https://example.org/" };
  assert.deepEqual(activityStatuses(open, today), ["open"]);
  // De laatste dag telt nog mee; daarna toont de site gesloten.
  assert.deepEqual(activityStatuses({ ...open, registrationDeadline: today }, today), ["open"]);
  assert.deepEqual(activityStatuses({ ...open, registrationDeadline: "2027-03-09" }, today), ["closed"]);
  // De dag zelf is nog niet voorbij.
  assert.deepEqual(activityStatuses({ ...open, date: today }, today), ["open"]);
  // Voorbij gaat over de datum, gesloten over de inschrijving: de datum alleen sluit niets.
  assert.deepEqual(activityStatuses({ ...base, date: "2027-03-09" }, today), ["past"]);
  assert.deepEqual(activityStatuses({ ...open, date: "2027-03-09" }, today), ["past", "open"]);
  assert.deepEqual(activityStatuses({ ...base, status: "closed", date: "2027-03-09" }, today), ["past", "closed"]);
});

test("Sinterklaas volgt altijd de server: de datum zet er alleen 'Voorbij' bij; zonder antwoord geen inschrijfmelding", () => {
  assert.deepEqual(sinterklaasStatuses("2026-11-28", "open", "2026-11-28"), ["open"]);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", "closed", "2026-11-04"), ["closed"]);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", "full", "2026-11-04"), ["closed"]);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", "upcoming", "2026-11-04"), ["upcoming"]);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", null, "2026-11-04"), []);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", "open", "2026-11-29"), ["past", "open"]);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", "closed", "2026-11-29"), ["past", "closed"]);
  assert.deepEqual(sinterklaasStatuses("2026-11-28", null, "2026-11-29"), ["past"]);
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

test("Lief en leed: juiste afspraken, geen bedragen en geen wijkformulier", async () => {
  const { lifeMoments } = await import("../src/content/wijk.ts");
  const all = lifeMoments.map((m) => `${m.title} ${m.text}`).join(" ");
  assert.deepEqual(lifeMoments.map((m) => m.title), ["Geboorte", "Overlijden", "Jubilarissen"]);
  assert.match(lifeMoments[0].text, /attentie/);
  assert.match(lifeMoments[1].text, /via de begrafenisondernemer een bloemstukje of krans/);
  assert.match(lifeMoments[2].text, /50 jaar huwelijk/);
  assert.match(lifeMoments[2].text, /waardebon voor een etentje en een bloemetje/);
  assert.match(lifeMoments[2].text, /officiële melding blijft via de gemeente Beerse verlopen/);
  assert.doesNotMatch(all, /€|euro|bedrag|bijdrage|premie|formulier/i);
});

test("sponsors: 33 sponsors bedankt en alle 33 op de website voorgesteld; korte meldlink naar het contactadres", () => {
  const sponsors = JSON.parse(text("../src/content/sponsors.json"));
  assert.equal(sponsorTotal, 33);
  assert.equal(sponsors.length, 33);
  assert.ok(sponsors.length <= sponsorTotal);
  assert.equal(
    sponsorIntro(sponsors.length),
    "Met dank aan onze 33 sponsors voor hun steun aan de wijk. Hieronder stellen we ze aan je voor.",
  );
  // Staat er ooit één niet bij, dan blijft de oorspronkelijke zin.
  assert.equal(
    sponsorIntro(32),
    "Met dank aan onze 33 sponsors voor hun steun aan de wijk. Hieronder stellen we 32 van hen aan je voor.",
  );
  const app = text("../src/wijk/WijkApp.tsx");
  assert.ok(app.includes("lead={`${sponsorIntro(sponsors.length)} Koop lokaal en steun onze middenstand.`}"));
  assert.ok(text("../src/Pages.tsx").includes("{sponsorIntro(sponsors.length)} Koop lokaal en steun onze middenstand."));
  assert.ok(app.includes("Een onjuistheid opgemerkt? <a href={`mailto:${org.email}`}>Laat het ons gerust weten.</a>"));
  // De sponsorstrook van Sinterklaas spreekt het aantal niet tegen.
  const home = text("../src/Home.tsx");
  assert.ok(home.includes("Met dank aan onze ${sponsorTotal} sponsors"));
  assert.ok(!home.includes("Alle {sponsors.length} sponsors"));
});

test("privacy: één centrale verklaring op de wijkwebsite, met link in de voet en bij lief en leed en de wijkhuiskaart", () => {
  assert.equal(privacyPage.slug, "privacy");
  assert.equal(privacyPage.title, "Privacyverklaring – VZW Wijkvereniging Oosthoek");
  assert.equal(privacyHref(), "#/privacy");
  assert.equal(privacyHref("sinterklaas"), "#/privacy?sinterklaas");
  assert.match(privacyUpdated, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(readRoute("#/privacy?sponsors"), { page: "privacy", anchor: "sponsors" });
  const app = text("../src/wijk/WijkApp.tsx");
  assert.match(app, /<a className="footer-privacy" href=\{privacyHref\(\)\}>\s*Privacy\s*<\/a>/);
  assert.ok(app.includes('privacyHref("lief-en-leed")') && app.includes('privacyHref("website")'));
  assert.doesNotMatch(app, /sinterklaas\/#\/privacy|privacyHref\}/);
  // Elk anker uit de site bestaat in de verklaring.
  const privacy = text("../src/wijk/Privacy.tsx");
  for (const id of ["sinterklaas", "lief-en-leed", "website", "sponsors", "contact", "bewaring"])
    assert.ok(privacy.includes(`["${id}", `), id);
  // Privacy staat in het hoofdmenu van de wijkwebsite, vlak voor Contact.
  assert.match(app, /\{pageLink\("wijkhuis", "Wijkhuis"\)\}\s*\{pageLink\(privacyPage\.slug, "Privacy"\)\}\s*<a className="nav-contact"/);
  // De Sinterklaaswebsite heeft geen eigen privacytekst en geen privacy in het hoofdmenu: alleen de voet en het formulier verwijzen.
  assert.ok(text("../src/App.tsx").includes('const menuLinks = pageLinks.filter(([key]) => key !== "privacy");'));
  assert.ok(text("../src/App.tsx").includes("{menuLinks.map("));
  const pages = text("../src/Pages.tsx");
  assert.doesNotMatch(pages, /artikel 6\.1|Gegevensbeschermingsautoriteit|geboortekaartje/);
  assert.ok(text("../src/App.tsx").includes('<a href="#/privacy">Privacy</a>'));
  assert.ok(text("../src/App.tsx").includes("#/privacy?sinterklaas"));
  assert.equal(text("../src/inschrijving/RegistrationForm.tsx").match(/<a href="#\/privacy" target="_blank" rel="noopener">/g)?.length, 2);
});
