// Optioneel maximum in de browser, met nagebootste API (geen database, geen Turnstile, geen echte gegevens).
// Site op de dev-server (5173); beheer op de preview van de build (5174), zoals in live-gps.spec.ts:
// `npm run build:cloudflare` en `npx vite preview --outDir _site --host 127.0.0.1 --port 5174 --strictPort`.
import { expect, test, type Page } from "@playwright/test";

const BEHEER = "http://127.0.0.1:5174/beheer/";
const shots = process.env.MAXIMUM_SCREENSHOTS;

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.use({ viewport: { width: 390, height: 844 } });

async function publicStatus(page: Page, status: "open" | "full", available: number | null) {
  await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());
  await page.route("**/api/evenementen/sinterklaas-2026", (r) =>
    r.fulfill({ json: { id: "sinterklaas-2026", status, available, turnstileSiteKey: "1x00000000000000000000AA" } }),
  );
}

test("zonder maximum: formulier open, geen aantal vrije plaatsen, reglement verplicht", async ({ page }) => {
  await publicStatus(page, "open", null);
  await page.goto("/#/cadeauactie");
  const form = page.locator(".registration-form");
  await expect(page.getByText("De inschrijving is open")).toBeVisible();
  await expect(page.getByText("is er maximaal één cadeautje")).toBeVisible();
  const panel = page.locator(".gift-layout");
  await expect(panel).not.toContainText(/beschikbaar|plaatsen|volzet|onbeperkt/i);
  await expect(form.getByRole("link", { name: "wedstrijdreglement" })).toHaveAttribute("href", "#/kleurwedstrijd?reglement");
  await form.getByRole("button", { name: "Inschrijving verzenden" }).click();
  await expect(form.getByText("Bevestig deze verklaring om in te schrijven.")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  if (shots) await page.locator(".gift-layout").screenshot({ path: `${shots}/cadeauactie-open-390.png` });
});

test("ingesteld maximum bereikt: volzet", async ({ page }) => {
  await publicStatus(page, "full", 0);
  await page.goto("/#/cadeauactie");
  await expect(page.getByText("De inschrijving is volzet.")).toBeVisible();
  await expect(page.locator(".registration-form")).toHaveCount(0);
});

test("beheer: werkelijk aantal kinderen, maximum instellen en weer wissen", async ({ page }) => {
  const base = {
    id: "sinterklaas-2026", title: "Sinterklaas in Oosthoek 2026", date: "2026-11-28", status: "open",
    active: 37, registrations: 21, pickedUp: 0, mail: { pending: 0, sending: 0, sent: 21, failed: 0 },
    personalDataErased: false, pendingDecisions: [], series: "Sinterklaas in Oosthoek", edition: 2026, cancelled: 0,
    ages: [], addressReview: 0, deleteBy: "2027-01-31", autoErase: true, deleteByPassed: false,
  };
  const withMax = (capacity: number | null) => ({ ...base, capacity, available: capacity === null ? null : capacity - base.active });
  const patches: unknown[] = [];
  await page.route("**/api/beheer/evenementen", (r) => r.fulfill({ json: [withMax(null)] }));
  await page.route("**/api/beheer/evenementen/*/inschrijvingen", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/beheer/evenementen/sinterklaas-2026", (r) => {
    const body = r.request().postDataJSON();
    patches.push(body);
    return r.fulfill({ json: withMax(body.capacity) });
  });
  await page.route("**/api/beheer/gps", (r) =>
    r.fulfill({ json: { configured: true, session: null, public: { state: "off", refreshSeconds: 120 }, device: null, hours: { default: 4, max: 8 } } }),
  );
  await page.goto(BEHEER);
  const stat = (label: string) => page.locator(".stat").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) });
  await expect(stat("Kinderen ingeschreven").locator("dd")).toHaveText("37");
  await expect(stat("Maximum").locator("dd")).toHaveText("geen");
  await expect(stat("Vrije plaatsen")).toHaveCount(0);
  const field = page.getByLabel("Maximum aantal kinderen (leeg = geen maximum)");
  await expect(field).toHaveValue("");
  await field.fill("60");
  await page.getByRole("button", { name: "Maximum opslaan" }).click();
  await expect(stat("Vrije plaatsen").locator("dd")).toHaveText("23");
  await expect(stat("Maximum").locator("dd")).toHaveText("60");
  expect(await noOverflow(page)).toBe(true);
  if (shots) await page.locator('section[aria-labelledby="event-title"]').screenshot({ path: `${shots}/beheer-maximum-390.png` });
  await field.fill("");
  await page.getByRole("button", { name: "Maximum opslaan" }).click();
  await expect(stat("Maximum").locator("dd")).toHaveText("geen");
  await expect(stat("Vrije plaatsen")).toHaveCount(0);
  await expect(stat("Kinderen ingeschreven").locator("dd")).toHaveText("37");
  expect(patches).toEqual([{ capacity: 60 }, { capacity: null }]);
});
