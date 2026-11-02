import { test, expect } from "@playwright/test";

test("hero behoudt gezicht, mijter en beide paarden bij verkleinen en maximaliseren", async ({
  page,
}) => {
  await page.goto("/");
  // Herkenningspunten op de ongewijzigde illustratie van 1817 × 866 pixels.
  const points = [
    [0.6, 0.12],
    [0.61, 0.3],
    [0.79, 0.62],
    [0.94, 0.67],
  ];
  for (const width of [
    1366, 1920, 2560, 3440, 1440, 1024, 768, 390, 375, 320,
  ]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate((points) => {
      const img = document.querySelector<HTMLImageElement>(
        ".hero-illustration img",
      )!;
      const box = img.getBoundingClientRect(),
        clip = img.parentElement!.getBoundingClientRect();
      const css = getComputedStyle(img),
        cover = css.objectFit === "cover";
      const scale = (cover ? Math.max : Math.min)(
        box.width / img.naturalWidth,
        box.height / img.naturalHeight,
      );
      const [px, py] = css.objectPosition
        .split(" ")
        .map((v) => parseFloat(v) / 100);
      const left = box.left + (box.width - img.naturalWidth * scale) * px;
      const top = box.top + (box.height - img.naturalHeight * scale) * py;
      const copy = document
        .querySelector(".hero-copy")!
        .getBoundingClientRect();
      const date = document
        .querySelector(".hero-stage > .date-tag")
        ?.getBoundingClientRect();
      const inside = (x: number, y: number, r: DOMRect) =>
        x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      return {
        visible: points.map(([x, y]) => {
          const screenX = left + x * img.naturalWidth * scale,
            screenY = top + y * img.naturalHeight * scale;
          return (
            inside(screenX, screenY, clip) &&
            !inside(screenX, screenY, copy) &&
            (!date || !inside(screenX, screenY, date))
          );
        }),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        initialScroll: scrollY,
      };
    }, points);
    expect(
      result.visible,
      `${width}px: mijter, gezicht, paard 1, paard 2`,
    ).toEqual([true, true, true, true]);
    expect(result.overflow, `${width}px`).toBe(false);
    expect(result.initialScroll).toBe(0);
  }
});

test("zoomherverdeling 100–200% en bruikbare rechtstreekse paginalinks", async ({
  browser,
  baseURL,
}) => {
  // Browserzoom verandert CSS-viewport én pixelschaal. Emuleer beide samen;
  // dit test reflow, niet de zoomknop van de zichtbare Chrome-interface.
  for (const zoom of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
      baseURL,
      viewport: {
        width: Math.round(1920 / zoom),
        height: Math.round(1080 / zoom),
      },
      deviceScaleFactor: zoom,
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("#hero-title")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${zoom * 100}% home`,
    ).toBe(true);
    for (const route of zoom === 2
      ? [
          "cadeauactie",
          "kleurwedstrijd",
          "route",
          "praktisch",
          "sponsors",
          "contact",
          "privacy",
        ]
      : ["contact"]) {
      await page.goto("/#/" + route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${zoom * 100}% ${route}`,
      ).toBe(true);
      const toggle = page.getByRole("button", { name: "Menu openen" });
      if (await toggle.isVisible()) await toggle.click();
      await expect(
        page
          .getByRole("navigation")
          .getByRole("link", { name: "Home", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Oosthoek — naar de homepage" })
        .click();
      await expect(page.locator("#hero-title")).toBeVisible();
    }
    await context.close();
  }
});

test("menu, zichtbare focus, Vorige en Volgende na een directe paginalink", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/contact");
  const toggle = page.getByRole("button", { name: "Menu openen" });
  await toggle.focus();
  expect(
    await toggle.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Menu sluiten" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Sponsors", exact: true })
    .click();
  await page.goBack();
  await expect(page).toHaveURL(/#\/contact/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/sponsors/);
  await expect(
    page.locator('#main-nav a[href="#/sponsors"]'),
  ).toHaveAttribute("aria-current", "page");
  await toggle.click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  // Klik op het zichtbare vlak onder het menu; de paginakop ligt achter de uitgeklapte navigatie.
  await page.mouse.click(8, 800);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(
    await toggle.evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(44);
});
