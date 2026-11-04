// Live GPS in de browser, met een nagebootste server (geen echte posities) en lege kaarttegels (geen verbinding met
// OpenStreetMap). Vereist `npm run dev` (5173) en voor het beheer de gebouwde versie:
// `npm run build:cloudflare` en `npx vite preview --outDir _site --host 127.0.0.1 --port 5174 --strictPort`.
import { expect, test, type Page } from "@playwright/test";

const BEHEER = "http://127.0.0.1:5174/beheer/";
const tile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const off = { state: "off", refreshSeconds: 120 };
const live = (extra = {}) => ({
  state: "live",
  refreshSeconds: 30,
  endsInSeconds: 3 * 3600,
  lat: 51.31912,
  lon: 4.85401,
  accuracy: 6,
  fixAt: "2026-11-28T10:44:40.000Z",
  fixAgeSeconds: 20,
  staleAfterSeconds: 120,
  lostAfterSeconds: 600,
  ...extra,
});

async function fakeGps(page: Page, first: unknown) {
  const server = { body: first, calls: 0 };
  await page.route("**/api/gps", (route) => {
    server.calls++;
    return server.body === null ? route.fulfill({ status: 503, body: "" }) : route.fulfill({ json: server.body });
  });
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ body: tile, contentType: "image/png" }));
  return server;
}

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.use({ viewport: { width: 390, height: 844 } });

test("zonder actieve sessie: geen kaart en geen positie, wel het vertrek", async ({ page }) => {
  await fakeGps(page, off);
  await page.goto("/#/route");
  await expect(page.getByText("De live GPS is nu niet actief.")).toBeVisible();
  await expect(page.getByText("Vertrek om 10.30 uur aan Wijkhuis Oosthoek.")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await expect(page.locator(".route-list button")).toHaveCount(24);
  await page.goto("/#/praktisch");
  await expect(page.getByText("Vertrek om 10.30 uur aan Wijkhuis Oosthoek.")).toBeVisible();
  await page.goto("/#/");
  await expect(page.locator(".live-tag")).toContainText("nog niet actief");
});

test("live op de gsm: Sint op de kaart met tijdstip, verversen, niet actueel, Stop", async ({ page }) => {
  await page.clock.install();
  const server = await fakeGps(page, live());
  await page.goto("/#/route");
  await expect(page.getByRole("region", { name: "Kaart met de livepositie van de huifkar" })).toBeVisible();
  await expect(page.locator(".sint-marker")).toBeVisible();
  await expect(page.locator(".sint-marker.is-stale")).toHaveCount(0);
  await expect(page.locator(".route-number")).toHaveCount(24);
  const caption = page.locator(".map-caption");
  await expect(caption).toContainText(/Live: laatste positie om \d\d:\d\d/);
  await expect(caption).toContainText("20 s geleden");
  await expect(page.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");
  await expect(page.getByText("De huifkar is onderweg!")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  if (process.env.GPS_SCREENSHOTS)
    await page.locator(".route-overview").screenshot({ path: `${process.env.GPS_SCREENSHOTS}/livekaart-390.png` });

  // Volgende verversing (30 s plus spreiding): nieuwe positie.
  server.body = live({ lat: 51.32001, lon: 4.85512, fixAgeSeconds: 5, fixAt: "2026-11-28T10:45:35.000Z" });
  await page.clock.fastForward(34_000);
  await expect(caption).toContainText("5 s geleden");
  expect(server.calls).toBeGreaterThanOrEqual(2);

  // Telefoon meldt zich niet meer: zelfde positie wordt ouder en "niet actueel".
  server.body = live({ fixAgeSeconds: 200 });
  await page.clock.fastForward(34_000);
  await expect(caption).toContainText("Niet actueel");
  await expect(page.locator(".sint-marker.is-stale")).toBeVisible();
  await expect(page.getByText("De verbinding met de huifkar is even weggevallen.")).toBeVisible();

  // Stop in het beheer: bij de volgende verversing is de kaart weg.
  server.body = off;
  await page.clock.fastForward(34_000);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await expect(page.getByText("De live GPS is nu niet actief.")).toBeVisible();
});

test("routekaart zelf geopend: bij Stop blijft de route, de huifkar verdwijnt", async ({ page }) => {
  await page.clock.install();
  const server = await fakeGps(page, off);
  await page.goto("/#/route");
  await page.getByRole("button", { name: "Bekijk de route op de kaart" }).click();
  await expect(page.getByRole("region", { name: "Kaart met de route van de huifkar" })).toBeVisible();
  await expect(page.locator(".sint-marker")).toHaveCount(0);
  // Het beheer start de GPS: bij de volgende verversing (120 s plus spreiding) staat de huifkar op dezelfde kaart.
  server.body = live();
  await page.clock.fastForward(124_000);
  await expect(page.locator(".sint-marker")).toBeVisible();
  await expect(page.getByRole("region", { name: "Kaart met de livepositie van de huifkar" })).toBeVisible();
  // Stop: geen positie meer, de route blijft.
  server.body = off;
  await page.clock.fastForward(34_000);
  await expect(page.locator(".sint-marker")).toHaveCount(0);
  await expect(page.locator(".route-number")).toHaveCount(24);
  await expect(page.getByText("De live GPS is nu niet actief.")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

test("zonder antwoord van de server verdwijnt de positie vanzelf, en op het stopuur alles", async ({ page }) => {
  await page.clock.install();
  const server = await fakeGps(page, live({ endsInSeconds: 900 }));
  await page.goto("/#/route");
  await expect(page.locator(".sint-marker")).toBeVisible();
  // Bezoeker of server onbereikbaar: na de verliesgrens (600 s) geen positie meer, met uitleg.
  server.body = null;
  await page.clock.fastForward(600_000);
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await expect(page.locator(".map-caption")).toContainText("Verbinding weg sinds");
  await expect(page.getByText("Deze pagina kan de positie nu niet verversen.")).toBeVisible();
  // Automatische stop (900 s): ook zonder nieuw antwoord niets meer van de sessie.
  await page.clock.fastForward(300_000);
  await expect(page.getByText("De live GPS is nu niet actief.")).toBeVisible();
});

test("beheer op de gsm: verbinding, Start en Stop", async ({ page }) => {
  const summary = {
    id: "sinterklaas-2026", title: "Sinterklaas in Oosthoek 2026", date: "2026-11-28", status: "open", capacity: 150,
    period: { opensAt: "2026-11-09T23:00:00.000Z", closesAt: "2026-11-27T23:00:00.000Z" }, publicStatus: "open",
    active: 0, available: 150, registrations: 0, pickedUp: 0, mail: { pending: 0, sending: 0, sent: 0, failed: 0 },
    personalDataErased: false, pendingDecisions: [], series: "Sinterklaas in Oosthoek", edition: 2026, cancelled: 0,
    ages: [], addressReview: 0, deleteBy: "2027-01-31", autoErase: true, deleteByPassed: false,
  };
  const device = { seenAt: "2026-11-28T10:29:50.000Z", ageSeconds: 10, connected: true, fixAt: "2026-11-28T10:29:50.000Z", accuracy: 5, battery: 88, charging: false };
  const stopped = { configured: true, session: null, public: off, device, hours: { default: 4, max: 8 } };
  const started = { ...stopped, session: { since: "2026-11-28T10:30:00.000Z", until: "2026-11-28T14:30:00.000Z" }, public: live() };
  const posted: unknown[] = [];
  await page.route("**/api/beheer/evenementen", (r) => r.fulfill({ json: [summary] }));
  await page.route("**/api/beheer/evenementen/*/inschrijvingen", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/beheer/gps", (r) => {
    if (r.request().method() === "GET") return r.fulfill({ json: posted.length % 2 ? started : stopped });
    const body = r.request().postDataJSON();
    posted.push(body);
    return r.fulfill({ json: body.action === "start" ? started : stopped });
  });
  await page.goto(BEHEER);
  const panel = page.getByRole("region", { name: "Live GPS Sinterklaas" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Verbonden")).toBeVisible();
  await expect(panel.getByText("Uit: niets zichtbaar")).toBeVisible();
  await panel.getByRole("button", { name: "Start live GPS" }).click();
  await expect(panel.getByText("Positie publiek zichtbaar")).toBeVisible();
  expect(posted).toEqual([{ action: "start", hours: 4 }]);
  if (process.env.GPS_SCREENSHOTS) await panel.screenshot({ path: `${process.env.GPS_SCREENSHOTS}/beheer-gps-390.png` });
  expect(await noOverflow(page)).toBe(true);
  await panel.getByRole("button", { name: "Stop live GPS" }).click();
  await expect(panel.getByRole("button", { name: "Start live GPS" })).toBeVisible();
  expect(posted).toEqual([{ action: "start", hours: 4 }, { action: "stop" }]);
});
