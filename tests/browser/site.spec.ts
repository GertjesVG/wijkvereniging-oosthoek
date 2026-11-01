import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const routes = [
  "home",
  "cadeauactie",
  "kleurwedstrijd",
  "route",
  "praktisch",
  "sponsors",
  "contact",
  "privacy",
];
test("alle pagina’s op desktop, tablet en mobiel zonder fouten of overloop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto("/#/" + route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${width}px ${route}`,
      ).toBeTruthy();
      for (const img of await page.locator("img").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty("complete", true);
        await expect
          .poll(
            () => img.evaluate((i) => (i as HTMLImageElement).naturalWidth),
            { message: `Afbeelding op ${route} bij ${width}px` },
          )
          .toBeGreaterThan(0);
      }
    }
  }
  expect(errors).toEqual([]);
});
test("mobiel menu, paginanavigatie, terugknop en toetsenbord", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu openen" }).click();
  const nav = page.getByRole("navigation");
  await nav.getByRole("link", { name: "Sponsors", exact: true }).click();
  await expect(page).toHaveURL(/#\/sponsors/);
  await expect(
    page.getByRole("button", { name: "Menu openen" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.goBack();
  await expect(page.locator("#hero-title")).toBeVisible();
  await page.getByRole("button", { name: "Menu openen" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu openen" })).toBeFocused();
});
test("sponsors zoeken, geen resultaat en wissen", async ({ page }) => {
  await page.goto("/#/sponsors");
  await expect(page.locator(".sponsor-card")).toHaveCount(33);
  const search = page.getByRole("searchbox");
  await search.fill("Stef Nuyens");
  await expect(page.locator(".sponsor-card")).toHaveCount(1);
  await expect(page.locator(".sponsor-card")).toContainText(
    "Hofeinde 219, Vosselaar",
  );
  await search.fill("onbestaande sponsor");
  await expect(page.getByText("Geen sponsor gevonden")).toBeVisible();
  await page.getByRole("button", { name: "Toon alle sponsors" }).click();
  await expect(page.locator(".sponsor-card")).toHaveCount(33);
});
test("geen nepinschrijving, geen ongevraagde externe kaart of kinderopslag", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith("http://127.0.0.1:5173"))
      external.push(req.url());
  });
  await page.goto("/#/cadeauactie");
  await expect(
    page.getByRole("textbox", { name: "Voornaam van het kind" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Inschrijving nog niet geopend" }),
  ).toBeDisabled();
  await page.goto("/#/route");
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(external).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  await page.route("https://www.openstreetmap.org/**", (r) =>
    r.fulfill({
      body: "<html><body>Kaarttest zonder externe verbinding</body></html>",
      contentType: "text/html",
    }),
  );
  await page.getByRole("button", { name: "Bekijk de omgevingskaart" }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /openstreetmap.org\/export\/embed/,
  );
  await expect(
    page.getByRole("region", {
      name: "Omgevingskaart van Beerse",
      exact: true,
    }),
  ).toBeVisible();
});
test("lokale links en downloads leveren bestanden, FAQ opent", async ({
  page,
  request,
}) => {
  const downloads = new Set<string>();
  for (const route of routes) {
    await page.goto("/#/" + route);
    for (const href of await page
      .locator("a")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""))) {
      if (href.startsWith("#/")) expect(routes).toContain(href.slice(2));
      if (href.includes("/downloads/") || href.startsWith("./downloads/"))
        downloads.add(href);
    }
  }
  expect(downloads.size).toBe(1);
  for (const href of downloads) {
    const r = await request.get(href);
    expect(r.ok()).toBeTruthy();
    expect((await r.body()).byteLength).toBeGreaterThan(10000);
  }
  await page.goto("/#/praktisch");
  await page
    .getByText("Hoe druk ik de kleurplaat af?", { exact: true })
    .click();
  await expect(page.locator("details[open]")).toHaveCount(1);
});
test("visuele bewijsbeelden", async ({ page }) => {
  const dir = "../../Bewijs";
  await mkdir(dir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: dir + "/home-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: dir + "/home-mobiel.png", fullPage: true });
  await page.goto("/#/sponsors");
  await page.screenshot({ path: dir + "/sponsors-mobiel.png", fullPage: true });
});

test("Storybook toont de componentvarianten en responsive hero", async ({
  page,
  request,
}) => {
  const result = await request.get("http://127.0.0.1:6008/index.json");
  expect(result.ok()).toBeTruthy();
  const entries = Object.values((await result.json()).entries) as {
    id: string;
    type: string;
  }[];
  const stories = entries.filter((e) => e.type === "story");
  expect(stories.length).toBe(11);
  for (const story of stories) {
    await page.goto(
      "http://127.0.0.1:6008/iframe.html?id=" + story.id + "&viewMode=story",
    );
    await expect(page.locator("#storybook-root")).not.toBeEmpty();
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
  }
});
