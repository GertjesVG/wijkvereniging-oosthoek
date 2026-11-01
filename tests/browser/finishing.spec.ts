import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import sponsors from "../../src/content/sponsors.json" with { type: "json" };

test("geen diploma/flyeractie, 33 sponsors en uitsluitend bevestigde websiteknoppen", async ({
  page,
}) => {
  for (const route of [
    "home",
    "cadeauactie",
    "kleurwedstrijd",
    "route",
    "praktisch",
    "sponsors",
    "contact",
    "privacy",
  ]) {
    await page.goto("/#/" + route);
    await expect(
      page.getByRole("link", { name: /flyer|diploma/i }),
    ).toHaveCount(0);
    await expect(page.getByText("Voor echte hulp-Pieten")).toHaveCount(0);
  }
  await page.goto("/#/sponsors");
  await expect(page.locator(".sponsor-card")).toHaveCount(33);
  await expect(page.locator(".sponsor-website")).toHaveCount(20);
  for (const sponsor of sponsors) {
    const card = page
      .locator(".sponsor-card")
      .filter({
        has: page.getByRole("heading", { name: sponsor.name, exact: true }),
      });
    await expect(card).toContainText(sponsor.address);
    if (sponsor.website) {
      const link = card.locator(".sponsor-website");
      await expect(link).toHaveAttribute("href", sponsor.website);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    } else await expect(card.locator(".sponsor-website")).toHaveCount(0);
  }
  await page.goto("/#/contact");
  await expect(
    page.getByText(
      "Een deelbare QR-code volgt zodra het vaste websiteadres is bevestigd.",
    ),
  ).toBeVisible();
  await expect(page.locator(".share-qr")).toHaveCount(0);
});

test("praktische informatie en sponsorkaarten blijven leesbaar op mobiel en desktop", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const route of ["praktisch", "sponsors", "contact"]) {
      await page.goto("/#/" + route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${width}px ${route}`,
      ).toBe(true);
    }
  }
  await page.goto("/#/praktisch");
  await expect(page.locator(".practical-facts article")).toHaveCount(3);
  for (const name of [
    "Bekijk de cadeauactie",
    "Bekijk de routepagina",
    "Neem contact op",
  ])
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
});

test("voorbereide QR-component maakt een onafhankelijk decodeerbare code", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:6008/iframe.html?id=oosthoek-website-delen--testvoorbeeld&viewMode=story",
  );
  const qr = page.getByRole("img", {
    name: "QR-code naar https://oosthoek.example.org/",
  });
  await expect(qr).toBeVisible();
  const png = PNG.sync.read(await qr.screenshot());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe("https://oosthoek.example.org/");
  await expect(
    page.getByRole("link", { name: "QR-code downloaden" }),
  ).toHaveAttribute("download", "Oosthoek-2026-QR.svg");
});
