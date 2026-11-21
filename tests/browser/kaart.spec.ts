// Beheer → "Kinderen op kaart": markers met het aantal kinderen, totalen, zoeken en filteren, route aan/uit, lijst → ballon,
// en de afdrukvoorbeelden (nummers gelijk aan de lijst, namen alleen in de vertrouwelijke versie).
// Nagebootste API met uitsluitend fictieve gegevens en lege kaarttegels. Beheer op de preview van de build (5174):
// `npm run build:cloudflare` en `npx vite preview --outDir _site --host 127.0.0.1 --port 5174 --strictPort`.
import { expect, test, type Page } from "@playwright/test";

const BEHEER = "http://127.0.0.1:5174/beheer/";
const tile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const summary = {
  id: "sinterklaas-2026", title: "Sinterklaas in Oosthoek 2026", date: "2026-11-28", status: "open", capacity: null,
  period: { opensAt: "2026-11-09T23:00:00.000Z", closesAt: "2026-11-27T23:00:00.000Z" }, publicStatus: "open",
  active: 5, available: null, registrations: 4, pickedUp: 0, mail: { pending: 0, sending: 0, sent: 4, failed: 0 },
  personalDataErased: false, pendingDecisions: [], series: "Sinterklaas in Oosthoek", edition: 2026, cancelled: 0,
  ages: [], addressReview: 0, deleteBy: "2027-01-31", autoErase: true, deleteByPassed: false,
};
const located = (status: string, lat: number | null, lon: number | null) => ({
  status, lat, lon, precision: null, matched: null, detail: status === "onzeker" ? "Positie geschat." : null, checkedAt: "2026-11-21T10:00:00.000Z",
});
const address = (nr: number, street: string, number: string, kids: string[], location: ReturnType<typeof located> | null) => ({
  nr, key: `${street.toLowerCase()}|${number}|`, street, number, box: null, addressReview: false, location,
  children: kids.map((name) => ({ name, age: 5, reference: `SINT26-000${nr}` })),
  registrations: [{ id: nr, reference: `SINT26-000${nr}` }],
});
const map = {
  postcode: "2340",
  municipality: "Beerse",
  withoutAddress: 0,
  addresses: [
    address(1, "Gorenstraat", "12", ["Kind A"], located("gevonden", 51.3285, 4.8794)),
    address(2, "Asterstraat", "10", ["Kind B", "Kind C"], located("onzeker", 51.3198, 4.8667)),
    address(3, "Asterstraat", "999", ["Kind D"], located("niet_gevonden", null, null)),
    address(4, "Opstal", "5", ["Kind E"], located("handmatig", 51.3279, 4.8682)),
  ],
};

// Een scriptfout in de pagina (bv. Leaflet in het afdrukvoorbeeld) laat de test altijd mislukken.
let pageErrors: string[] = [];
test.afterEach(() => expect(pageErrors).toEqual([]));

async function open(page: Page) {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const lookups: unknown[] = [];
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ body: tile, contentType: "image/png" }));
  await page.route("**/api/beheer/evenementen", (r) => r.fulfill({ json: [summary] }));
  await page.route("**/api/beheer/evenementen/*/inschrijvingen", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/beheer/gps", (r) => r.fulfill({ status: 503, json: { error: "ONBEKEND", message: "Niet in deze test." } }));
  await page.route("**/api/beheer/statistieken", (r) => r.fulfill({ status: 503, json: { error: "ONBEKEND", message: "Niet in deze test." } }));
  await page.route("**/api/beheer/evenementen/*/kaart", (r) => r.fulfill({ json: map }));
  await page.route("**/api/beheer/evenementen/*/kaart/opzoeken", (r) => {
    lookups.push(r.request().postDataJSON());
    return r.fulfill({ json: { checked: 0, failed: 0, remaining: 0 } });
  });
  await page.goto(`${BEHEER}#kaart`);
  await expect(page.getByRole("heading", { name: "Kinderen op kaart" })).toBeVisible();
  return lookups;
}

const stat = (page: Page, label: string) => page.locator(".map-panel .stat").filter({ has: page.locator("dt", { hasText: label }) }).locator("dd");

test("kaart: markers met aantallen, totalen, filters, route aan/uit en lijst opent de ballon", async ({ page }) => {
  const lookups = await open(page);
  await expect(stat(page, "Kinderen")).toHaveText("5");
  await expect(stat(page, "Unieke adressen")).toHaveText("4");
  await expect(stat(page, "Zonder betrouwbare locatie")).toHaveText("2");
  // Elk adres heeft al een (bewaarde) beoordeling: niets opnieuw opzoeken.
  expect(lookups).toEqual([]);
  // Drie markers (het niet gevonden adres staat niet op de kaart), met het aantal kinderen.
  await expect(page.locator(".kid-map .kid-marker")).toHaveText(["1", "2", "1"]);
  await expect(page.locator(".kid-map .kid-marker.is-onzeker")).toHaveCount(1);
  await expect(page.locator(".kid-map .route-number")).toHaveCount(24);
  await page.getByLabel("Officiële Sinterklaasroute tonen").uncheck();
  await expect(page.locator(".kid-map .route-number")).toHaveCount(0);
  await page.getByLabel("Officiële Sinterklaasroute tonen").check();
  await expect(page.locator(".kid-map .route-number")).toHaveCount(24);

  await page.getByLabel("Zoeken op straat of adres").fill("aster");
  await expect(page.locator(".address-list > li")).toHaveCount(2);
  await expect(page.locator(".kid-map .kid-marker")).toHaveCount(1);
  await page.getByRole("button", { name: "Filters wissen" }).click();
  await page.getByRole("combobox", { name: /^Straat/ }).selectOption("Opstal");
  await expect(page.locator(".address-list > li")).toHaveText([/Opstal 5/]);
  await page.getByRole("combobox", { name: /^Straat/ }).selectOption("");
  await page.getByLabel("Alleen zonder betrouwbare locatie").check();
  await expect(page.locator(".address-list > li")).toHaveText([/Asterstraat 10.*Locatie onzeker/s, /Asterstraat 999.*Niet gevonden/s]);
  await page.getByLabel("Alleen zonder betrouwbare locatie").uncheck();

  await page.locator(".address-item", { hasText: "Asterstraat 10" }).click();
  const popup = page.locator(".leaflet-popup .kid-popup");
  await expect(popup).toContainText("Nr. 2");
  await expect(popup).toContainText("2 kinderen");
  await expect(popup.locator("li")).toHaveText(["Kind B (5 j)", "Kind C (5 j)"]);
  await expect(popup).toContainText("Locatie onzeker – Positie geschat.");
  // Zonder locatie: details en correctieknoppen in de lijst in plaats van een ballon.
  await page.locator(".address-item", { hasText: "Asterstraat 999" }).click();
  await expect(page.getByRole("button", { name: "Locatie aanduiden op de kaart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adres verbeteren (SINT26-0003)" })).toBeVisible();
});

test("afdrukken: kaartnummers = lijstnummers, namen alleen in de vertrouwelijke lijst, OSM-bronvermelding", async ({ page }) => {
  await open(page);
  const sheet = page.getByRole("dialog");
  const ready = () => expect(sheet.getByRole("button", { name: "Afdrukken of opslaan als PDF" })).toBeEnabled({ timeout: 25000 });

  await page.getByRole("button", { name: "PDF A3 liggend (wijkkaart)" }).click();
  await ready();
  await expect(sheet.locator(".print-page")).toHaveCount(1);
  await expect(sheet.locator(".print-map .print-marker span")).toHaveText(["1", "2", "4"]);
  await expect(sheet).toContainText("© OpenStreetMap-bijdragers");
  await sheet.getByRole("button", { name: "Sluiten" }).click();

  await page.getByRole("button", { name: "PDF A4 (overzicht en detailkaarten)" }).click();
  await ready();
  expect(await sheet.locator(".print-page").count()).toBeGreaterThan(1);
  await sheet.getByRole("button", { name: "Sluiten" }).click();

  await page.getByRole("button", { name: "Adressenlijst", exact: true }).click();
  await ready();
  await expect(sheet.locator("tbody tr")).toHaveCount(4);
  await expect(sheet.locator("tbody tr td:first-child")).toHaveText(["1", "2", "3", "4"]);
  await expect(sheet).not.toContainText("Kind A");
  await sheet.getByRole("button", { name: "Sluiten" }).click();

  await page.getByRole("button", { name: "Adressenlijst met namen (vertrouwelijk)" }).click();
  await ready();
  await expect(sheet).toContainText("Kind A");
  await expect(sheet).toContainText("VERTROUWELIJK");
});
