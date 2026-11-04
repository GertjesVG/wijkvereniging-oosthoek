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
    [`${GITHUB}/sinterklaas/?bron=test#/sponsors`, `${CLOUDFLARE}/sinterklaas/?bron=test#/sponsors`],
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
    ["/sinterklaas/#/sponsors", /buurt sterker/],
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
    await page.getByRole("navigation").getByRole("link", { name: "Onze sponsors" }).click();
    await expect(page.locator("#sponsors")).toBeInViewport();
    await expect(wijkHeading(page)).toBeAttached();
  }
});

test("hoofdpagina: activiteiten, Oosthoek leeft mee en contact uit de bevestigde gegevens", async ({ page }) => {
  await page.goto(`${SITE}/`);
  const cards = page.locator(".event");
  await expect(cards).toHaveCount(4);
  for (const name of ["Pasen", "Garageverkoop", "Wijkfeest", "Sinterklaas"])
    await expect(cards.getByRole("heading", { name, exact: true })).toBeVisible();
  // Alleen Sinterklaas heeft een bevestigde datum.
  await expect(cards.getByText("Datum volgt", { exact: true })).toHaveCount(3);
  await expect(cards.filter({ hasText: "Sinterklaas" }).getByText("28 november 2026")).toBeVisible();
  // De beelden: de drie nieuwe plus het bestaande Sinterklaasbeeld, allemaal lokaal.
  const sources = await cards.locator("img").evaluateAll((all) => all.map((i) => (i as HTMLImageElement).getAttribute("src")));
  expect(sources).toEqual([
    "/sinterklaas/assets/oosthoek-pasen.webp",
    "/sinterklaas/assets/oosthoek-garageverkoop.webp",
    "/sinterklaas/assets/oosthoek-wijkfeest.webp",
    "/sinterklaas/assets/hero.webp",
  ]);
  await cards.filter({ hasText: "Pasen" }).getByRole("link").click();
  await expect(page).toHaveURL(`${SITE}/#/pasen`);
  await expect(page.locator("h1")).toHaveText("Pasen in Oosthoek");
  await page.goBack();

  const life = page.locator("#leeft-mee");
  await expect(life.getByRole("heading", { level: 3 })).toHaveText(["Een geboorte", "Een overlijden", "50 jaar getrouwd"]);
  await expect(life.getByText(/originele geboortekaartje of de originele doodsbrief/)).toContainText("Opstal 5, 2340 Beerse");
  await expect(life.getByText(/originele geboortekaartje/)).toHaveCount(1);
  await expect(life.getByRole("link", { name: /gemeente/ })).toHaveAttribute("href", "https://www.beerse.be/jubileum");
  await expect(life).not.toContainText("€");
  await expect(life.locator("form, input")).toHaveCount(0);

  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: /vzwoosthoek@gmail\.com/ })).toHaveAttribute("href", "mailto:vzwoosthoek@gmail.com");
  await expect(contact.getByRole("link", { name: "0496 56 06 79" })).toHaveAttribute("href", "tel:0496560679");
  await expect(contact).toContainText("Opstal 5, 2340 Beerse");
  await expect(page.locator("footer")).toContainText("BE0553.481.505");
  await expect(page.locator("footer").getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/sinterklaas/#/privacy");
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("sponsors: de centrale lijst, originele logo's, zoeken en contactgegevens", async ({ page }) => {
  await page.goto(`${SITE}/#sponsors`);
  const section = page.locator("#sponsors");
  const cards = section.locator(".sponsor");
  await expect(cards).toHaveCount(8);
  await section.getByRole("button", { name: `Bekijk alle ${sponsors.length} sponsors` }).click();
  await expect(cards).toHaveCount(33);
  // Originele logo's; wie geen logo heeft, krijgt de naam als plaat.
  await expect(section.locator(".sponsor-logo img")).toHaveCount(Object.keys(sponsorLogos).length);
  for (const img of await section.locator(".sponsor-logo img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(section.locator(".sponsor-logo .wordmark")).toHaveCount(33 - Object.keys(sponsorLogos).length);

  const search = section.getByRole("searchbox");
  await search.fill("Stef Nuyens");
  await expect(cards).toHaveCount(1);
  await search.fill("onbestaande sponsor");
  await expect(section.getByText("Geen sponsor gevonden")).toBeVisible();
  await search.fill("");
  await expect(cards).toHaveCount(33);

  for (const sponsor of sponsors) {
    const open = section.getByRole("button", { name: `Contactgegevens ${sponsor.name}`, exact: true });
    await open.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: sponsor.name, exact: true })).toBeVisible();
    await expect(dialog).toContainText(sponsor.address);
    for (const phone of sponsor.phones)
      await expect(dialog.getByRole("link", { name: phone, exact: true })).toHaveAttribute("href", `tel:${phone.replace(/[^\d+]/g, "")}`);
    await expect(dialog.getByRole("link", { name: /E-mail/ })).toHaveCount(sponsor.email ? 1 : 0);
    if (sponsor.website)
      await expect(dialog.getByRole("link", { name: /Website/ })).toHaveAttribute("href", sponsor.website);
    else await expect(dialog.getByRole("link", { name: /Website/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  }
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

test("na de datum: Sinterklaas staat op voorbij en verdwijnt van de kalender, de site zelf blijft bereikbaar", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-29T10:00:00+01:00"));
  await page.goto(`${SITE}/`);
  const card = page.locator(".event").filter({ hasText: "Sinterklaas" });
  await expect(card.getByText("Voorbij", { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: /Inschrijven/ })).toHaveCount(0);
  await expect(card.getByRole("link", { name: /Naar Sinterklaas/ })).toBeVisible();
  await expect(page.locator(".ticker")).toHaveCount(0);
});

test("desktop en gsm: geen overloop, beelden 3:2, menu en toetsenbord werken, geen externe bronnen", async ({ page }) => {
  const seen = watchRequests(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/#/pasen", "/#/garageverkoop", "/#/wijkfeest"]) {
      await page.goto("about:blank");
      await page.goto(SITE + path);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await noOverflow(page), `${width}px ${path}`).toBe(true);
      for (const img of await page.locator("main img, header img").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth), `${width}px ${path}`).toBeGreaterThan(0);
      }
    }
    await page.goto(`${SITE}/`);
    for (const frame of await page.locator(".event-art").all()) {
      const box = (await frame.boundingBox())!;
      expect(box.width / box.height, `${width}px kaartbeeld`).toBeCloseTo(1.5, 1);
    }
    // Alles binnen het scherm, ook de sponsors en het dialoogvenster.
    await page.locator("#sponsors .sponsor").first().click();
    const dialog = page.getByRole("dialog");
    const box = (await dialog.boundingBox())!;
    expect(box.x, `${width}px dialoog`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${width}px dialoog`).toBeLessThanOrEqual(width);
    await dialog.getByRole("button", { name: "Venster sluiten" }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${SITE}/`);
  const toggle = page.getByRole("button", { name: "Menu openen" });
  const size = (await toggle.boundingBox())!;
  expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(44);
  await toggle.click();
  const nav = page.getByRole("navigation", { name: "Hoofdnavigatie" });
  await expect(nav.getByRole("link", { name: "Activiteiten" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await nav.getByRole("link", { name: "Oosthoek leeft mee" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#leeft-mee")).toBeInViewport();
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
