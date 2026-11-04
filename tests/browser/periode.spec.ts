// Inschrijvingsperiode in de browser, met nagebootste API (geen database, geen Turnstile, geen echte gegevens).
// Op de preview van de build: `npm run build:cloudflare` en `npx vite preview --outDir _site --host 127.0.0.1 --port 5174 --strictPort`.
import { expect, test, type Page } from "@playwright/test";

const SITE = process.env.PERIODE_URL ?? "http://127.0.0.1:5174";
const shots = process.env.PERIODE_SCREENSHOTS;
const PERIOD = { opensAt: "2026-11-09T23:00:00.000Z", closesAt: "2026-11-27T23:00:00.000Z" };
const UPCOMING = "Inschrijven mogelijk van 10 tot en met 27 november 2026.";
const OPEN = "Inschrijvingen geopend tot en met 27 november 2026.";
const CLOSED = "De inschrijvingen zijn gesloten.";
const FULL = "De inschrijving is volzet. Alle cadeautjes zijn vergeven.";
const SITE_KEY = "1x00000000000000000000AA";

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function mockStatus(page: Page, status: string, patch: Record<string, unknown> = {}) {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());
  await page.route("**/api/gps", (r) => r.fulfill({ json: { state: "off", refreshSeconds: 120 } }));
  await page.route("**/api/evenementen/sinterklaas-2026", (r) =>
    r.fulfill({ json: { id: "sinterklaas-2026", status, available: null, period: PERIOD, turnstileSiteKey: SITE_KEY, ...patch } }),
  );
}

test("wijkpagina: de tegel toont de juiste zin, en alleen bij open de inschrijflink", async ({ browser }) => {
  for (const [status, notice, links] of [
    ["upcoming", UPCOMING, 0],
    ["open", OPEN, 1],
    ["closed", CLOSED, 0],
    ["full", FULL, 0],
  ] as const) {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await mockStatus(page, status);
      await page.goto(`${SITE}/`);
      const card = page.locator(".event").filter({ hasText: "Sinterklaas" });
      await expect(card.getByText(notice, { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: /Inschrijven voor de cadeauactie/ })).toHaveCount(links);
      expect(await noOverflow(page), `${status} ${width}`).toBe(true);
      if (shots) await card.screenshot({ path: `${shots}/tegel-${status}-${width}.png` });
      await page.close();
    }
  }
});

test("cadeauactie: vóór de start een voorbeeld met de zin, na het einde en bij volzet geen formulier", async ({ page }) => {
  const form = page.locator(".registration-form");
  const example = page.getByText("Dit is een voorbeeld van het toekomstige formulier.");
  await page.setViewportSize({ width: 390, height: 844 });

  await mockStatus(page, "upcoming");
  await page.goto(`${SITE}/sinterklaas/#/cadeauactie`);
  await expect(page.getByText(UPCOMING, { exact: true })).toBeVisible();
  await expect(example).toBeVisible();
  await expect(page.getByRole("button", { name: "Inschrijving nog niet geopend" })).toBeDisabled();
  await expect(form).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
  if (shots) await page.locator(".gift-layout").screenshot({ path: `${shots}/cadeauactie-upcoming-390.png` });

  for (const [status, patch, notice] of [
    ["closed", {}, CLOSED],
    // Na de wisdatum: geen spamcontrole meer, wel een periode.
    ["closed", { turnstileSiteKey: null }, CLOSED],
    ["full", { available: 0 }, FULL],
  ] as const) {
    await page.unroute("**/api/evenementen/sinterklaas-2026");
    await mockStatus(page, status, patch);
    await page.reload();
    await expect(page.getByText(notice, { exact: true })).toBeVisible();
    await expect(example).toHaveCount(0);
    await expect(form).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Inschrijving nog niet geopend" })).toHaveCount(0);
    if (shots) await page.locator(".registration-panel").screenshot({ path: `${shots}/cadeauactie-${status}-390.png` });
  }

  // De server is nog niet ingesteld: geen belofte, de oude melding.
  await page.unroute("**/api/evenementen/sinterklaas-2026");
  await mockStatus(page, "closed", { turnstileSiteKey: null, period: null });
  await page.reload();
  await expect(page.getByText("De online inschrijving is nog niet beschikbaar.")).toBeVisible();
  await expect(form).toHaveCount(0);

  // Open: het formulier met de zin.
  await page.unroute("**/api/evenementen/sinterklaas-2026");
  await mockStatus(page, "open");
  await page.reload();
  await expect(page.getByText(OPEN, { exact: true })).toBeVisible();
  await expect(form).toBeVisible();
  if (shots) await page.locator(".registration-panel").screenshot({ path: `${shots}/cadeauactie-open-390.png` });
});

test("het formulier staat nog open, maar de server is intussen dicht: geen formulier meer, wel de juiste melding", async ({ page }) => {
  await mockStatus(page, "open");
  await page.addInitScript(() => {
    (window as unknown as { turnstile: unknown }).turnstile = {
      render: (_: unknown, options: { callback: (answer: string) => void }) => {
        options.callback("proef");
        return "w";
      },
      reset() {},
      remove() {},
    };
  });
  await page.route("**/api/inschrijvingen", (r) =>
    r.fulfill({ status: 423, json: { error: "GESLOTEN", message: CLOSED } }),
  );
  await page.goto(`${SITE}/sinterklaas/#/cadeauactie`);
  const form = page.locator(".registration-form");
  await form.getByLabel("Naam ouder of voogd").fill("Fictieve Ouder");
  await form.getByLabel("E-mailadres ouder of voogd").fill("fictief@example.org");
  await form.getByLabel("Straat").fill("Zandstraat");
  await form.getByLabel("Huisnummer").fill("7");
  await form.getByLabel("Voornaam van het kind").fill("Noor");
  await form.locator("select").selectOption("5");
  for (const box of await form.getByRole("checkbox").all()) await box.check();
  await form.getByRole("button", { name: "Inschrijving verzenden" }).click();
  await expect(page.getByText(CLOSED, { exact: true })).toBeVisible();
  await expect(form).toHaveCount(0);
});

test("praktische pagina: dezelfde zin en altijd de knop naar de cadeauactie; zonder antwoord geen bewering", async ({ page }) => {
  await mockStatus(page, "upcoming");
  await page.goto(`${SITE}/sinterklaas/#/praktisch`);
  await expect(page.getByText(UPCOMING, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Naar de cadeauactie", exact: true })).toHaveAttribute("href", "#/cadeauactie");
  await page.unroute("**/api/evenementen/sinterklaas-2026");
  await page.route("**/api/evenementen/sinterklaas-2026", (r) => r.abort());
  await page.reload();
  await expect(page.getByRole("link", { name: "Naar de cadeauactie", exact: true })).toBeVisible();
  await expect(page.getByText(/Inschrijven mogelijk|Inschrijvingen geopend|inschrijvingen zijn gesloten/)).toHaveCount(0);
});

test.describe("beheer", () => {
  // Bewust een andere tijdzone: de velden blijven Belgische tijd, ook op een toestel in het buitenland.
  test.use({ timezoneId: "America/New_York", viewport: { width: 390, height: 844 } });

  const base = {
    id: "sinterklaas-2026", title: "Sinterklaas in Oosthoek 2026", date: "2026-11-28", status: "open",
    period: PERIOD, publicStatus: "upcoming", capacity: null, available: null,
    active: 37, registrations: 21, pickedUp: 0, mail: { pending: 0, sending: 0, sent: 21, failed: 0 },
    personalDataErased: false, pendingDecisions: [], series: "Sinterklaas in Oosthoek", edition: 2026, cancelled: 0,
    ages: [], addressReview: 0, deleteBy: "2027-01-31", autoErase: true, deleteByPassed: false,
  };

  async function mockAdmin(page: Page, first: Record<string, unknown>, saved: Record<string, unknown>) {
    const patches: unknown[] = [];
    await page.route("**/api/beheer/evenementen", (r) => r.fulfill({ json: [{ ...base, ...first }] }));
    await page.route("**/api/beheer/evenementen/*/inschrijvingen", (r) => r.fulfill({ json: [] }));
    await page.route("**/api/beheer/evenementen/sinterklaas-2026", (r) => {
      patches.push(r.request().postDataJSON());
      return r.fulfill({ json: { ...base, ...saved } });
    });
    await page.route("**/api/beheer/gps", (r) =>
      r.fulfill({ json: { configured: true, session: null, public: { state: "off", refreshSeconds: 120 }, device: null, hours: { default: 4, max: 8 } } }),
    );
    return patches;
  }

  test("periode bekijken en wijzigen, in Belgische tijd", async ({ page }) => {
    const patches = await mockAdmin(page, {}, {
      period: { opensAt: "2026-11-11T23:00:00.000Z", closesAt: "2026-11-27T17:00:00.000Z" },
    });
    await page.goto(`${SITE}/beheer/`);
    await expect(page.getByRole("switch", { name: "Handmatig open" })).toBeVisible();
    const block = page.locator(".period");
    await expect(block.getByText(UPCOMING, { exact: true })).toBeVisible();
    const from = page.getByLabel("Inschrijven vanaf");
    const until = page.getByLabel("Inschrijven tot");
    await expect(from).toHaveValue("2026-11-10T00:00");
    await expect(until).toHaveValue("2026-11-28T00:00");
    const save = page.getByRole("button", { name: "Periode opslaan" });
    await expect(save).toBeDisabled();
    expect(await noOverflow(page)).toBe(true);
    if (shots) {
      await page.screenshot({ path: `${shots}/beheer-periode-390.png`, fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      expect(await noOverflow(page)).toBe(true);
      await page.screenshot({ path: `${shots}/beheer-periode-1280.png`, fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    // Einde vóór begin: niet op te slaan, met uitleg.
    await until.fill("2026-11-09T12:00");
    await expect(save).toBeDisabled();
    await expect(block.getByText('"Inschrijven tot" moet na "Inschrijven vanaf" liggen.')).toBeVisible();
    await from.fill("2026-11-12T00:00");
    await until.fill("2026-11-27T18:00");
    await save.click();
    await expect(block.getByText("Inschrijven mogelijk van 12 tot 27 november 2026 om 18.00 uur.", { exact: true })).toBeVisible();
    await expect(from).toHaveValue("2026-11-12T00:00");
    await expect(until).toHaveValue("2026-11-27T18:00");
    expect(patches).toEqual([{ period: { opensAt: "2026-11-12T00:00", closesAt: "2026-11-27T18:00" } }]);
  });

  test("geen periode: duidelijke melding, en eerst invullen", async ({ page }) => {
    await mockAdmin(page, { status: "closed", period: null, publicStatus: "closed" }, {});
    await page.goto(`${SITE}/beheer/`);
    await expect(page.getByRole("switch", { name: "Handmatig gesloten" })).toBeVisible();
    const block = page.locator(".period");
    await expect(block.getByText(CLOSED, { exact: true })).toBeVisible();
    await expect(block.getByText("Er is nog geen periode ingesteld.")).toBeVisible();
    await expect(page.getByLabel("Inschrijven vanaf")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Periode opslaan" })).toBeDisabled();
  });
});
