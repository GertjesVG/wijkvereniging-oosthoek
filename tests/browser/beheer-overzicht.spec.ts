// Beheer: de kaarten bovenaan en de lijst "Inschrijvingen" tonen dezelfde stand, ook na "Vernieuwen" en na het wisselen van
// onderdeel; een mislukte opvraging van de cijfers staat als melding in beeld en wordt nooit stil als oude stand of nul getoond.
// Nagebootste API, uitsluitend fictieve gegevens. Beheer op de preview van de build (5174), zoals in maximum.spec.ts:
// `npm run build:cloudflare` en `npx vite preview --outDir _site --host 127.0.0.1 --port 5174 --strictPort`.
import { expect, test, type Page } from "@playwright/test";

const BEHEER = "http://127.0.0.1:5174/beheer/";
const PERIOD = { opensAt: "2026-11-04T23:00:00.000Z", closesAt: "2026-11-27T23:00:00.000Z" };

const summary = (over: Record<string, unknown> = {}) => ({
  id: "sinterklaas-2026", title: "Sinterklaas in Oosthoek 2026", date: "2026-11-28", status: "open", period: PERIOD,
  publicStatus: "open", capacity: null, available: null, active: 0, registrations: 0, pickedUp: 0,
  mail: { pending: 0, sending: 0, sent: 0, failed: 0 }, personalDataErased: false, pendingDecisions: [],
  series: "Sinterklaas in Oosthoek", edition: 2026, cancelled: 0, ages: [], addressReview: 0, deleteBy: "2027-01-31",
  autoErase: true, deleteByPassed: false, ...over,
});

// Eén fictieve inschrijving met twee kinderen; de bevestigingsmail is verstuurd.
const registration = (pickedUpAt: string | null = null) => ({
  id: 1, reference: "SINT26-0901", status: "active", parentName: "Testouder Fictief", email: "testouder@example.org",
  street: "Zandstraat", houseNumber: "7", coParent: false, rulesAccepted: null, note: null, suspectedDuplicate: false,
  addressReview: null, createdAt: "2026-11-15T06:00:00.000Z",
  mail: { status: "sent", attempts: 1, lastError: null, sentAt: "2026-11-15T06:03:00.000Z" },
  participants: [
    { id: 1, name: "Kind A", age: 5, status: "active", pickedUpAt },
    { id: 2, name: "Kind B", age: 7, status: "active", pickedUpAt: null },
  ],
});
const oneFamily = (pickedUp = 0) =>
  summary({
    active: 2, registrations: 1, pickedUp, mail: { pending: 0, sending: 0, sent: 1, failed: 0 },
    ages: [{ age: 5, count: 1 }, { age: 7, count: 1 }],
  });

type Server = { events: unknown[]; list: unknown[]; failEvents: boolean; eventCalls: number };

async function fakeApi(page: Page, server: Server) {
  await page.route("**/api/beheer/evenementen", (r) => {
    server.eventCalls++;
    return server.failEvents
      ? r.fulfill({ status: 500, json: { error: "ONBEKEND", message: "De server gaf een fout (500)." } })
      : r.fulfill({ json: server.events });
  });
  await page.route("**/api/beheer/evenementen/*/inschrijvingen", (r) => r.fulfill({ json: server.list }));
  await page.route("**/api/beheer/gps", (r) =>
    r.fulfill({ json: { configured: true, session: null, public: { state: "off", refreshSeconds: 120 }, device: null, hours: { default: 4, max: 8 } } }),
  );
  await page.route("**/api/beheer/statistieken", (r) => r.fulfill({ status: 503, json: { error: "ONBEKEND", message: "Niet in deze test." } }));
}

const stat = (page: Page, label: string) =>
  page.locator(".stat").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) });

async function expectCards(page: Page, kids: string, registrations: string, pickedUp: string, mails: string) {
  await expect(stat(page, "Kinderen ingeschreven").locator("dd")).toHaveText(kids);
  await expect(stat(page, "Inschrijvingen").locator("dd")).toHaveText(registrations);
  await expect(stat(page, "Afgehaald").locator("dd")).toHaveText(pickedUp);
  await expect(stat(page, "Afgehaald").locator("small")).toHaveText(`van ${kids}`);
  await expect(stat(page, "Mails").locator("dd")).toHaveText(mails);
}

const refresh = (page: Page) => page.getByRole("button", { name: "Vernieuwen" }).click();

test("Vernieuwen haalt de kaarten en de lijst samen op: inschrijving, kinderen, mail en afhalen kloppen", async ({ page }) => {
  const server: Server = { events: [summary()], list: [], failEvents: false, eventCalls: 0 };
  await fakeApi(page, server);
  await page.goto(BEHEER);
  await expect(page.getByText("Nog geen inschrijvingen.")).toBeVisible();
  await expectCards(page, "0", "0", "0", "0 / 0 / 0");

  // Intussen schrijft een gezin in en wordt de bevestigingsmail verstuurd.
  server.events = [oneFamily()];
  server.list = [registration()];
  await refresh(page);
  const item = page.locator(".registration-head");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("SINT26-0901");
  await expect(item).toContainText("Afgehaald 0/2");
  await expect(item).toContainText("Mail verstuurd");
  await expectCards(page, "2", "1", "0", "0 / 1 / 0");

  // Eén kind haalt zijn cadeau af (bv. op een tweede toestel aangevinkt).
  server.events = [oneFamily(1)];
  server.list = [registration("2026-11-28T14:00:00.000Z")];
  await refresh(page);
  await expect(item).toContainText("Afgehaald 1/2");
  await expectCards(page, "2", "1", "1", "0 / 1 / 0");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("terug naar Inschrijvingen na een ander onderdeel: kaarten en lijst tonen dezelfde, actuele stand", async ({ page }) => {
  const server: Server = { events: [summary()], list: [], failEvents: false, eventCalls: 0 };
  await fakeApi(page, server);
  await page.goto(BEHEER);
  await expectCards(page, "0", "0", "0", "0 / 0 / 0");
  server.events = [oneFamily()];
  server.list = [registration()];
  await page.getByRole("link", { name: "Bezoekersstatistieken" }).click();
  await page.getByRole("link", { name: "Inschrijvingen en GPS" }).click();
  await expect(page.locator(".registration-head")).toHaveCount(1);
  await expectCards(page, "2", "1", "0", "0 / 1 / 0");
});

test("mislukte opvraging van de cijfers: duidelijke melding, geen stille oude stand; daarna weer in orde", async ({ page }) => {
  const server: Server = { events: [oneFamily()], list: [registration()], failEvents: false, eventCalls: 0 };
  await fakeApi(page, server);
  await page.goto(BEHEER);
  await expectCards(page, "2", "1", "0", "0 / 1 / 0");

  server.failEvents = true;
  const before = server.eventCalls;
  await refresh(page);
  const alert = page.locator('section[aria-labelledby="event-title"]').getByRole("alert");
  await expect(alert).toContainText("konden niet vernieuwd worden");
  expect(server.eventCalls).toBeGreaterThan(before);
  // De laatst gekende stand blijft staan (geen nul), met de melding erbij.
  await expect(stat(page, "Kinderen ingeschreven").locator("dd")).toHaveText("2");

  server.failEvents = false;
  await refresh(page);
  await expect(alert).toHaveCount(0);
  await expectCards(page, "2", "1", "0", "0 / 1 / 0");
});
