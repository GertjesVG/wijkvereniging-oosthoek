// De algemene wijkwebsite en de ingang van de gedrukte QR, op de gebouwde site zoals Cloudflare ze serveert.
// Vereist `npm run build:cloudflare` en `npm run dev:api` (wrangler pages dev _site, poort 8788, lokale database).
// De inschrijfstatus is hier altijd nagebootst; er gaat geen enkele inschrijving of mail de deur uit.
import { readFileSync } from "node:fs";
import { expect, test, type Page, type Request } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import sponsors from "../../src/content/sponsors.json" with { type: "json" };
import { sponsorLogos } from "../../src/content/sponsor-logos";

const SITE = process.env.WIJK_URL ?? "http://127.0.0.1:8788";
const CLOUDFLARE = "https://wijkvereniging-oosthoek.pages.dev";
const GITHUB = "https://gertjesvg.github.io/wijkvereniging-oosthoek";
const WIJK_TITEL = "Hier kennen we elkaar.";
const github = readFileSync(new URL("../../github-pages/index.html", import.meta.url), "utf8");

async function apiStatus(page: Page, status: "open" | "closed" | "full" | "error") {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());
  await page.route("**/api/evenementen/sinterklaas-2026", (r) =>
    status === "error"
      ? r.abort()
      : r.fulfill({ json: { id: "sinterklaas-2026", status, available: null, turnstileSiteKey: "1x00000000000000000000AA" } }),
  );
  await page.route("**/api/gps", (r) => r.fulfill({ json: { state: "off", refreshSeconds: 120 } }));
}

// Geen enkel schrijvend verzoek en geen externe bronnen tijdens de hele test.
function watchRequests(page: Page, origin = SITE) {
  const seen = { writes: [] as string[], external: [] as string[] };
  page.on("request", (req: Request) => {
    if (req.method() !== "GET") seen.writes.push(`${req.method()} ${req.url()}`);
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("https://challenges.cloudflare.com/"))
      seen.external.push(url);
  });
  return seen;
}

const wijkHeading = (page: Page) => page.getByRole("heading", { level: 1, name: new RegExp(WIJK_TITEL) });
const sintHero = (page: Page) => page.locator("#hero-title");
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test.beforeEach(async ({ page }) => {
  await apiStatus(page, "open");
});

test("de bestanden en de drukversie bevatten precies de twee bekende QR-adressen", () => {
  const decode = (file: string) => {
    const png = PNG.sync.read(readFileSync(new URL(`../../../../${file}`, import.meta.url)));
    return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
  };
  expect(decode("Oosthoek_Sinterklaas_QR_Cloudflare.png")).toBe(`${CLOUDFLARE}/sinterklaas/`);
  expect(decode("Oosthoek_Sinterklaas_QR_definitief.png")).toBe(`${GITHUB}/sinterklaas/`);
});

test("QR: het kale adres opent de wijkpagina, zonder lus en zonder extra stap in de geschiedenis", async ({ page }) => {
  const stops: string[] = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) stops.push(f.url());
  });
  for (const start of ["/sinterklaas/", "/sinterklaas"]) {
    stops.length = 0;
    await page.goto(SITE + start);
    await expect(wijkHeading(page)).toBeVisible();
    expect(new URL(page.url()).pathname + new URL(page.url()).hash).toBe("/");
    expect(stops.length, stops.join(" -> ")).toBeLessThanOrEqual(3);
  }
  // Vernieuwen blijft op de wijkpagina.
  await page.reload();
  await expect(wijkHeading(page)).toBeVisible();
  // Doorklikken naar Sinterklaas en terug: de terugknop gaat naar de wijkpagina, niet in een kringloop.
  await page.getByRole("article").filter({ hasText: "Sinterklaas" }).getByRole("link", { name: /Naar Sinterklaas/ }).click();
  await expect(sintHero(page)).toBeVisible();
  expect(page.url()).toBe(`${SITE}/sinterklaas/#/home`);
  await page.reload();
  await expect(sintHero(page)).toBeVisible();
  await page.goBack();
  await expect(wijkHeading(page)).toBeVisible();
});

test("QR via GitHub en Cloudflare: de volledige keten eindigt op de wijkpagina; oude routes op hun eigen pagina", async ({ page }) => {
  const seen = watchRequests(page, CLOUDFLARE);
  await page.route(`${GITHUB}/**`, (r) => r.fulfill({ contentType: "text/html", body: github }));
  // Het adres van de productie, beantwoord door de lokale build: niets verlaat deze computer.
  await page.route(`${CLOUDFLARE}/**`, async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname.startsWith("/api/")) return r.fallback();
    return r.fulfill({ response: await r.fetch({ url: SITE + url.pathname + url.search }) });
  });
  for (const [start, end] of [
    [`${GITHUB}/sinterklaas/`, `${CLOUDFLARE}/`],
    [`${GITHUB}/`, `${CLOUDFLARE}/`],
    [`${CLOUDFLARE}/sinterklaas/`, `${CLOUDFLARE}/`],
  ]) {
    await page.goto(start);
    await expect(wijkHeading(page)).toBeVisible();
    expect(page.url(), start).toBe(end);
  }
  for (const [start, end] of [
    [`${GITHUB}/#/route`, `${CLOUDFLARE}/sinterklaas/#/route`],
    [`${GITHUB}/sinterklaas/#/privacy`, `${CLOUDFLARE}/sinterklaas/#/privacy`],
    [`${GITHUB}/sinterklaas/?bron=test#/sponsors`, `${CLOUDFLARE}/?bron=test#/sponsors`],
    [`${GITHUB}/#/sponsors`, `${CLOUDFLARE}/#/sponsors`],
  ]) {
    await page.goto("about:blank");
    await page.goto(start);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveURL(end);
  }
  expect(seen.writes).toEqual([]);
});

test("bestaande directe links, hashes, zoekdelen en bestanden blijven werken", async ({ page, request }) => {
  for (const [path, h1] of [
    ["/sinterklaas/#/home", /Sinterklaas/],
    ["/sinterklaas/#/cadeauactie", /verrassing van de Sint/],
    ["/sinterklaas/#/kleurwedstrijd", /kleuren van de voorpret/],
    ["/sinterklaas/#/route", /Waar is de Sint/],
    ["/sinterklaas/#/praktisch", /Goed om te weten/],
    ["/sinterklaas/#/contact", /horen graag van je/],
    ["/sinterklaas/#/privacy", /Privacy/],
    ["/sinterklaas/?bron=test", /Sinterklaas/],
    ["/sinterklaas/?bron=test#/route", /Waar is de Sint/],
  ] as const) {
    await page.goto("about:blank");
    await page.goto(SITE + path);
    await expect(page.locator("h1"), path).toContainText(h1);
    expect(page.url(), path).toBe(SITE + path);
    await page.reload();
    await expect(page.locator("h1"), `${path} na vernieuwen`).toContainText(h1);
    expect(page.url(), `${path} na vernieuwen`).toBe(SITE + path);
  }
  // Oude link op het hoofdadres, met anker naar het reglement.
  await page.goto("about:blank");
  await page.goto(`${SITE}/?a=1#/kleurwedstrijd?reglement`);
  await expect(page).toHaveURL(`${SITE}/sinterklaas/?a=1#/kleurwedstrijd?reglement`);
  await expect(page.locator("#reglement")).toBeInViewport();
  // Een zoekdeel op het hoofdadres zelf (bv. een gedeelde link) houdt de wijkpagina.
  await page.goto(`${SITE}/?fbclid=test`);
  await expect(wijkHeading(page)).toBeVisible();
  expect(page.url()).toBe(`${SITE}/?fbclid=test`);

  for (const [path, type] of [
    ["/sinterklaas/downloads/kleurplaat.pdf", "application/pdf"],
    ["/sinterklaas/assets/hero.webp", "image/webp"],
    ["/sinterklaas/assets/oosthoek-pasen.webp", "image/webp"],
    ["/sinterklaas/assets/oosthoek-wijkhuis.webp", "image/webp"],
    ["/sinterklaas/assets/oosthoek-sponsors-768.webp", "image/webp"],
    ["/sinterklaas/assets/oosthoek-lief-en-leed.webp", "image/webp"],
    ["/sinterklaas/assets/sponsor-zeepventje.webp", "image/webp"],
    ["/sinterklaas/email/email-boven.jpg", "image/jpeg"],
    ["/sinterklaas/favicon.svg", "image/svg+xml"],
  ]) {
    const response = await request.get(SITE + path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain(type);
  }
  const beheer = await request.get(`${SITE}/beheer/`);
  expect(beheer.status()).toBe(200);
  expect(beheer.headers()["x-robots-tag"]).toContain("noindex");
  const missing = await request.get(`${SITE}/bestaat-niet/`);
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('href="/sinterklaas/#/home"');
});

test("informatiepagina's: eigen beeld, Datum volgt, geen verzonnen inschrijving; vernieuwen en directe link werken", async ({ page }) => {
  for (const [slug, title, file] of [
    ["pasen", "Pasen in Oosthoek", "oosthoek-pasen.webp"],
    ["garageverkoop", "Garageverkoop", "oosthoek-garageverkoop.webp"],
    ["wijkfeest", "Wijkfeest", "oosthoek-wijkfeest.webp"],
  ]) {
    await page.goto(`${SITE}/#/${slug}`);
    await expect(page.locator("h1")).toHaveText(title);
    await expect(page).toHaveTitle(new RegExp(title));
    const main = page.locator("main");
    await expect(main.getByText("Datum volgt", { exact: true }).first()).toBeVisible();
    await expect(main.getByText("Informatie volgt", { exact: true }).first()).toBeVisible();
    await expect(main.getByRole("link", { name: /inschrijven/i })).toHaveCount(0);
    const image = main.locator(`.activity-hero img[src$="${file}"]`);
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1536);
    await page.reload();
    await expect(page.locator("h1")).toHaveText(title);
    // Via het menu terug naar een onderdeel van de hoofdpagina.
    const toggle = page.getByRole("button", { name: "Menu openen" });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole("navigation").getByRole("link", { name: "Activiteiten" }).click();
    await expect(page.locator(".events")).toBeInViewport();
    await expect(wijkHeading(page)).toBeAttached();
  }
});

test("hoofdpagina: zeven aanklikbare tegels, contact uit de bevestigde gegevens; sponsors en lief en leed staan op eigen pagina's", async ({ page }) => {
  const logos: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/assets/sponsor-")) logos.push(req.url());
  });
  await page.goto(`${SITE}/`);
  await expect(page.getByRole("heading", { level: 2, name: "Ontdek wat er leeft in Oosthoek." })).toBeVisible();
  await expect(page.getByText("Activiteiten en wijkinformatie", { exact: true })).toBeVisible();
  const cards = page.locator(".event");
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText([
    "Pasen",
    "Garageverkoop",
    "Wijkfeest",
    "Sinterklaas",
    "Onze sponsors",
    "Lief en leed in onze wijk",
    "Waar is ons wijkhuis?",
  ]);
  // Alleen Sinterklaas heeft een bevestigde datum; de wijkinformatie heeft geen datum en geen status.
  await expect(cards.getByText("Datum volgt", { exact: true })).toHaveCount(3);
  await expect(cards.filter({ hasText: "Sinterklaas" }).getByText("28 november 2026")).toBeVisible();
  await expect(page.locator(".event-info .pill, .event-info .status")).toHaveCount(0);
  const tile = (name: string) => cards.filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(tile("Onze sponsors")).toContainText("Ontdek wie onze wijk steunt");
  await expect(tile("Lief en leed in onze wijk")).toContainText("Geboorte, overlijden en huwelijksjubileum: Oosthoek leeft mee.");
  await expect(tile("Lief en leed in onze wijk")).toContainText("Ontdek onze attenties");
  // De beelden: bestaande sfeerbeelden, het bestaande Sinterklaasbeeld en de drie nieuwste, allemaal lokaal.
  const sources = await cards.locator("img").evaluateAll((all) => all.map((i) => (i as HTMLImageElement).getAttribute("src")));
  expect(sources).toEqual([
    "/sinterklaas/assets/oosthoek-pasen.webp",
    "/sinterklaas/assets/oosthoek-garageverkoop.webp",
    "/sinterklaas/assets/oosthoek-wijkfeest.webp",
    "/sinterklaas/assets/hero.webp",
    "/sinterklaas/assets/oosthoek-sponsors.webp",
    "/sinterklaas/assets/oosthoek-lief-en-leed.webp",
    "/sinterklaas/assets/oosthoek-wijkhuis.webp",
  ]);
  // Sponsors en de uitgebreide informatie staan niet meer op de hoofdpagina.
  await expect(page.locator(".sponsor-card, #sponsors, #leeft-mee")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("originele doodsbrief");
  expect(logos).toEqual([]);

  // De hele tegel is aanklikbaar: ook een klik op het beeld opent de pagina, en terug kan altijd. De link van de tegel
  // ligt over het beeld; daarom "force": een echte muisklik op het midden, zonder de controle dat het beeld zelf bovenaan ligt.
  for (const [name, path, h1] of [
    ["Pasen", "/#/pasen", "Pasen in Oosthoek"],
    ["Garageverkoop", "/#/garageverkoop", "Garageverkoop"],
    ["Wijkfeest", "/#/wijkfeest", "Wijkfeest"],
    ["Onze sponsors", "/#/sponsors", "Onze sponsors"],
    ["Lief en leed in onze wijk", "/#/lief-en-leed", "Lief en leed in onze wijk"],
    ["Waar is ons wijkhuis?", "/#/wijkhuis", "Waar is ons wijkhuis?"],
  ]) {
    await tile(name).locator("img").click({ force: true });
    await expect(page, name).toHaveURL(SITE + path);
    await expect(page.locator("h1")).toHaveText(h1);
    await expect(page).toHaveTitle(new RegExp(h1.replace("?", "\\?")));
    await page.getByRole("link", { name: "Terug naar de hoofdpagina" }).click();
    await expect(page.locator(".events")).toBeInViewport();
    await expect(wijkHeading(page)).toBeAttached();
  }
  await tile("Sinterklaas").locator("img").click({ force: true });
  await expect(page).toHaveURL(`${SITE}/sinterklaas/#/home`);
  await expect(sintHero(page)).toBeVisible();
  await page.goBack();

  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: /vzwoosthoek@gmail\.com/ })).toHaveAttribute("href", "mailto:vzwoosthoek@gmail.com");
  await expect(contact.getByRole("link", { name: "0496 56 06 79" })).toHaveAttribute("href", "tel:0496560679");
  await expect(contact).toContainText("Opstal 5, 2340 Beerse");
  await expect(page.locator("footer")).toContainText("BE0553.481.505");
  await expect(page.locator("footer").getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/sinterklaas/#/privacy");
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("lief en leed: drie onderdelen, één gezamenlijke instructie, geen bedrag en geen formulier", async ({ page }) => {
  await page.goto(`${SITE}/#/lief-en-leed`);
  const main = page.locator("main");
  await expect(page.locator("h1")).toHaveText("Lief en leed in onze wijk");
  await expect(main.locator(".activity-hero img")).toHaveAttribute("src", "/sinterklaas/assets/oosthoek-lief-en-leed.webp");
  await expect(main.locator(".moment h2")).toHaveText(["Geboorte", "Overlijden", "Jubilarissen"]);
  await expect(main.locator(".mailbox")).toHaveText("Deponeer het originele geboortekaartje of de originele doodsbrief in de brievenbus op Opstal 5, 2340 Beerse.");
  await expect(main.getByText(/originele doodsbrief/)).toHaveCount(1);
  await expect(main.getByRole("link", { name: /gemeente Beerse/ })).toHaveAttribute("href", "https://www.beerse.be/jubileum");
  await expect(main.locator(".moments-band")).not.toContainText("€");
  await expect(main.locator("form, input")).toHaveCount(0);
  await expect(main.locator(".pill, .status")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Lief en leed in onze wijk");
});

test("wijkhuis: het nieuwe beeld en wat vaststaat; zonder bevestiging geen adres, kaartpin of route", async ({ page }) => {
  const seen = watchRequests(page);
  await page.goto(`${SITE}/#/wijkhuis`);
  const main = page.locator("main");
  await expect(page.locator("h1")).toHaveText("Waar is ons wijkhuis?");
  const image = main.locator('.activity-hero img[src$="oosthoek-wijkhuis.webp"]');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1536);
  await expect(main).toContainText("Vertrek om 10.30 uur aan Wijkhuis Oosthoek.");
  await expect(main).toContainText("zodra ze bevestigd zijn");
  await expect(main).not.toContainText("Opstal");
  await expect(main.locator('a[href*="maps"], a[href*="openstreetmap"], .leaflet-container, iframe')).toHaveCount(0);
  await expect(main.getByRole("link", { name: /Route|kaart/ })).toHaveCount(0);
  await expect(main.locator(".pill, .status")).toHaveCount(0);
  expect(seen.external).toEqual([]);
});

test("sponsors: één algemene pagina met de goedgekeurde kaarten, de centrale lijst en originele logo's", async ({ page }) => {
  await page.goto(`${SITE}/#/sponsors`);
  await expect(page.locator("h1")).toHaveText("Onze sponsors");
  await expect(page.locator(".activity-hero img")).toHaveAttribute("src", "/sinterklaas/assets/oosthoek-sponsors.webp");
  const cards = page.locator(".sponsor-card");
  await expect(cards).toHaveCount(sponsors.length);
  expect(sponsors.length).toBe(33);
  await expect(page.locator(".pill, .status")).toHaveCount(0);
  // Originele logo's; wie geen logo heeft, krijgt de naam als plaat.
  const logos = cards.locator(".sponsor-logo img");
  await expect(logos).toHaveCount(Object.keys(sponsorLogos).length);
  for (const img of await logos.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(cards.locator(".sponsor-nameplate")).toHaveCount(33 - Object.keys(sponsorLogos).length);
  // De goedgekeurde vormgeving, ook in de stijl van de wijkwebsite: kaarten op een rij delen hun rijen, dus titel,
  // gegevens, knop en dankwoord staan op dezelfde hoogte, hoe lang de naam ook is.
  const firstRow = await cards.evaluateAll((all) => {
    const top = (el: Element | null) => Math.round(el!.getBoundingClientRect().top);
    const row = all.filter((card) => top(card) === top(all[0]));
    return {
      subgrid: getComputedStyle(all[0]).gridTemplateRows.startsWith("subgrid"),
      columns: row.length,
      misaligned: [".sponsor-title", ".sponsor-details", ".sponsor-action", ".sponsor-thanks"].filter(
        (part) => new Set(row.map((card) => top(card.querySelector(part)))).size > 1,
      ),
    };
  });
  expect(firstRow).toEqual({ subgrid: true, columns: 3, misaligned: [] });
  // Alle contact- en websitegegevens per sponsor.
  for (const sponsor of sponsors) {
    const card = cards.filter({ has: page.getByRole("heading", { name: sponsor.name, exact: true }) });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(sponsor.address);
    for (const phone of sponsor.phones)
      await expect(card.locator(`.sponsor-phones a[href="tel:${phone.replace(/[^\d+]/g, "")}"]`)).toHaveText(phone);
    if (sponsor.email) await expect(card.locator(`a[href="mailto:${sponsor.email}"]`).first()).toBeAttached();
    if (sponsor.website) await expect(card.locator(".sponsor-website")).toHaveAttribute("href", sponsor.website);
    else await expect(card.locator(".sponsor-website")).toHaveCount(0);
  }
  const search = page.getByRole("searchbox");
  await search.fill("Stef Nuyens");
  await expect(cards).toHaveCount(1);
  await search.fill("onbestaande sponsor");
  await expect(page.getByText("Geen sponsor gevonden")).toBeVisible();
  await page.getByRole("button", { name: "Toon alle sponsors" }).click();
  await expect(cards).toHaveCount(33);
});

test("sponsorlinks vanuit Sinterklaas komen op de algemene pagina, zonder kapotte oude links", async ({ page }) => {
  const atSponsors = async (url: string) => {
    await expect(page).toHaveURL(url);
    await expect(page.locator("h1")).toHaveText("Onze sponsors");
    await expect(page.locator(".sponsor-card")).toHaveCount(33);
  };
  // Oude directe links, ook met zoekdeel en na vernieuwen.
  for (const [start, end] of [
    ["/sinterklaas/#/sponsors", "/#/sponsors"],
    ["/sinterklaas/?bron=test#/sponsors", "/?bron=test#/sponsors"],
    ["/#/sponsors", "/#/sponsors"],
  ]) {
    await page.goto("about:blank");
    await page.goto(SITE + start);
    await atSponsors(SITE + end);
    await page.reload();
    await atSponsors(SITE + end);
  }
  // Het menu en de sponsorstrook van de Sinterklaaswebsite; de terugknop gaat terug naar Sinterklaas, zonder kringloop.
  await page.goto(`${SITE}/sinterklaas/#/home`);
  await expect(sintHero(page)).toBeVisible();
  await page.locator(".sponsors-link").click();
  await atSponsors(`${SITE}/#/sponsors`);
  await page.goBack();
  await expect(sintHero(page)).toBeVisible();
  expect(page.url()).toBe(`${SITE}/sinterklaas/#/home`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#main-nav a[href="#/sponsors"]').click();
  await atSponsors(`${SITE}/#/sponsors`);
});

test("inschrijfkoppeling: de wijkpagina volgt de serverstatus en stuurt naar het bestaande formulier", async ({ browser }) => {
  const shown = {
    open: { label: "Inschrijven mogelijk", link: true },
    closed: { label: "Inschrijving gesloten", link: false },
    full: { label: "Inschrijving gesloten", link: false },
  } as const;
  for (const [status, expected] of Object.entries(shown)) {
    const page = await browser.newPage();
    const seen = watchRequests(page);
    await apiStatus(page, status as "open");
    await page.goto(`${SITE}/`);
    const card = page.locator(".event").filter({ hasText: "Sinterklaas" });
    await expect(card.getByText(expected.label, { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: /Inschrijven/ })).toHaveCount(expected.link ? 1 : 0);
    await expect(card.getByRole("link", { name: /Naar Sinterklaas/ })).toHaveAttribute("href", "/sinterklaas/#/home");
    if (expected.link) {
      await card.getByRole("link", { name: /Inschrijven/ }).click();
      await expect(page).toHaveURL(`${SITE}/sinterklaas/#/cadeauactie`);
      await expect(page.getByText("De inschrijving is open")).toBeVisible();
      await expect(page.locator(".registration-form")).toBeVisible();
    }
    expect(seen.writes).toEqual([]);
    await page.close();
  }
  // Geen antwoord van de server: geen enkele bewering over de inschrijving; de link naar Sinterklaas blijft.
  const page = await browser.newPage();
  await apiStatus(page, "error");
  await page.goto(`${SITE}/`);
  const card = page.locator(".event").filter({ hasText: "Sinterklaas" });
  await expect(card.getByRole("link", { name: /Naar Sinterklaas/ })).toBeVisible();
  await expect(card.getByText(/Inschrijv/)).toHaveCount(0);
  await page.close();
});

test("na de datum: Voorbij staat los van de inschrijving; alleen de server sluit, en de site zelf blijft bereikbaar", async ({ browser }) => {
  for (const [status, label, link] of [
    ["open", "Inschrijven mogelijk", 1],
    ["closed", "Inschrijving gesloten", 0],
  ] as const) {
    const page = await browser.newPage();
    await apiStatus(page, status);
    await page.clock.setFixedTime(new Date("2026-11-29T10:00:00+01:00"));
    await page.goto(`${SITE}/`);
    const card = page.locator(".event").filter({ hasText: "Sinterklaas" });
    await expect(card.getByText("Voorbij", { exact: true })).toBeVisible();
    await expect(card.getByText(label, { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: /Inschrijven/ })).toHaveCount(link);
    await expect(card.getByRole("link", { name: /Naar Sinterklaas/ })).toBeVisible();
    await expect(page.locator(".ticker")).toHaveCount(0);
    await page.close();
  }
  // Na de datum staat de rondrit niet meer op de wijkhuispagina.
  const page = await browser.newPage();
  await apiStatus(page, "closed");
  await page.clock.setFixedTime(new Date("2026-11-29T10:00:00+01:00"));
  await page.goto(`${SITE}/#/wijkhuis`);
  await expect(page.locator("h1")).toHaveText("Waar is ons wijkhuis?");
  await expect(page.locator("main")).not.toContainText("10.30");
  await page.close();
});

test("desktop en gsm: evenwichtige tegels, geen overloop, beelden 3:2, menu en toetsenbord werken, geen externe bronnen", async ({ page }) => {
  test.setTimeout(150_000);
  const seen = watchRequests(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Aantal tegels per rij op elke breedte: nooit een losse tegel naast een gat.
  const rows: Record<number, number[]> = {
    1920: [4, 3],
    1440: [4, 3],
    1200: [4, 3],
    1024: [2, 2, 3],
    768: [2, 2, 3],
    640: [2, 2, 2, 1],
    390: [1, 1, 1, 1, 1, 1, 1],
    320: [1, 1, 1, 1, 1, 1, 1],
  };
  for (const width of [1920, 1440, 1200, 1024, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/#/pasen", "/#/garageverkoop", "/#/wijkfeest", "/#/sponsors", "/#/lief-en-leed", "/#/wijkhuis"]) {
      await page.goto("about:blank");
      await page.goto(SITE + path);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await noOverflow(page), `${width}px ${path}`).toBe(true);
      for (const img of await page.locator(".activity-hero img, .event-art img, header img").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth), `${width}px ${path}`).toBeGreaterThan(0);
      }
      for (const hero of await page.locator(".activity-hero img").all()) {
        const box = (await hero.boundingBox())!;
        expect(box.width / box.height, `${width}px ${path} paginabeeld`).toBeCloseTo(1.5, 1);
      }
    }
    await page.goto(`${SITE}/`);
    const tiles = await page.locator(".event").evaluateAll((all) => all.map((el) => el.getBoundingClientRect().top + scrollY));
    const perRow = [...new Set(tiles.map(Math.round))].map((top) => tiles.filter((t) => Math.round(t) === top).length);
    expect(perRow, `${width}px rijen`).toEqual(rows[width]);
    const frames = await page.locator(".event-art").all();
    // De zevende tegel staat op 640 px over de hele breedte, met het beeld ernaast.
    for (const frame of width === 640 ? frames.slice(0, 6) : frames) {
      const box = (await frame.boundingBox())!;
      expect(box.width / box.height, `${width}px kaartbeeld`).toBeCloseTo(1.5, 1);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${SITE}/`);
  const toggle = page.getByRole("button", { name: "Menu openen" });
  const size = (await toggle.boundingBox())!;
  expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(44);
  await toggle.click();
  const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  for (const name of ["Activiteiten", "Sinterklaas", "Onze sponsors", "Lief en leed", "Wijkhuis", "Contact"])
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await nav.getByRole("link", { name: "Lief en leed" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(`${SITE}/#/lief-en-leed`);
  // Het menu is weer dicht, dus de link is nu verborgen; de huidige pagina staat er wel gemarkeerd.
  await expect(page.locator('#navigation a[aria-current="page"]')).toHaveText("Lief en leed");
  expect(errors).toEqual([]);
  expect(seen.writes).toEqual([]);
  expect(seen.external).toEqual([]);
});

test("de Sinterklaassite heeft een weg terug naar de wijkpagina", async ({ page }) => {
  await page.goto(`${SITE}/sinterklaas/#/contact`);
  await page.locator("footer").getByRole("link", { name: "Wijkwebsite Oosthoek" }).click();
  await expect(wijkHeading(page)).toBeVisible();
  expect(page.url()).toBe(`${SITE}/`);
});
