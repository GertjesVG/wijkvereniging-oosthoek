import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { verifiedPublicUrl } from "../src/content/public-website.ts";
import { event } from "../src/content/event.ts";
const sponsors = JSON.parse(
  readFileSync(
    new URL("../src/content/sponsors.json", import.meta.url),
    "utf8",
  ),
);
test("33 unieke officiële sponsors met echte brongegevens", () => {
  assert.equal(sponsors.length, 33);
  assert.equal(new Set(sponsors.map((s) => s.name)).size, 33);
  for (const s of sponsors) {
    assert.ok(s.name.length);
    assert.ok(s.address.includes(","));
    assert.ok(Array.isArray(s.phones));
    assert.ok(s.email === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email));
  }
  assert.equal(sponsors[0].name, "ZEEPVENTJE");
  assert.equal(sponsors[32].name, "Stef Nuyens");
  assert.equal(sponsors[5].name, "Herenkapsalon Dooley’s");
});

test("alleen de 20 bevestigde eigen sponsorwebsites worden aangeboden", () => {
  const report = readFileSync(
    new URL(
      "../../../Documentatie/oosthoek-sponsors-websites-onderzoek.md",
      import.meta.url,
    ),
    "utf8",
  );
  const confirmed = new Map();
  for (const line of report.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells[3] !== "✅") continue;
    const name = cells[2] === "Aerts (Grafzerken)" ? "Aerts" : cells[2];
    const url = cells[4].match(/\[Website\]\((https:\/\/[^)]+)\)/)?.[1];
    assert.ok(url);
    confirmed.set(name, url);
  }
  assert.equal(confirmed.size, 20);
  for (const sponsor of sponsors)
    assert.equal(
      sponsor.website,
      confirmed.get(sponsor.name) ?? null,
      sponsor.name,
    );
  assert.equal(
    sponsors.find((s) => s.name === "Tegeldiscount").address,
    "Turnhoutsebaan 132, Oostmalle",
  );
  assert.equal(
    sponsors.find((s) => s.name === "Polyesterwerken Stevens J.").address,
    "Krikskensstraat 24, Beerse",
  );
  assert.equal(
    sponsors.find((s) => s.name === "Gipsmachinecenter G.M.C.").address,
    "Leemstraat 42, Beerse",
  );
});

test("flyer en diploma’s zijn geen openbare bestanden; originelen blijven behouden", () => {
  for (const file of [
    "downloads/sinterklaas-flyer.pdf",
    "downloads/hulp-pietendiploma.pdf",
    "downloads/hulp-pietendiploma.png",
    "assets/diploma.webp",
  ])
    assert.equal(
      existsSync(new URL("../public/" + file, import.meta.url)),
      false,
      file,
    );
  for (const file of [
    "Oosthoek_Sinterklaas_Dubbelzijdig_Kleurwedstrijd_A4.pdf",
    "Sinterklaas_diploma_A4_voorkant_achterkant_gelijk_groter_min_snijverlies (1).pdf",
    "Feestelijk Hulp-Pietendiploma met Sinterklaas.png",
  ])
    assert.equal(
      existsSync(new URL("../../../" + file, import.meta.url)),
      true,
      file,
    );
});

test("QR-doel is alleen het bevestigde vaste Sinterklaas-adres", () => {
  assert.equal(
    verifiedPublicUrl(event.publicWebsite),
    "https://gertjesvg.github.io/wijkvereniging-oosthoek/sinterklaas/",
  );
  for (const url of [
    null,
    "http://localhost:5173/",
    "https://127.0.0.1/",
    "https://preview.local/",
    "https://preview.trycloudflare.com/",
    "https://demo.ngrok-free.app/",
    "geen adres",
  ])
    assert.equal(verifiedPublicUrl({ url, verified: true }), null);
  assert.equal(
    verifiedPublicUrl({
      url: "https://oosthoek.example.org/",
      verified: false,
    }),
    null,
  );
  assert.equal(
    verifiedPublicUrl({ url: "https://oosthoek.example.org/", verified: true }),
    "https://oosthoek.example.org/",
  );
});
test("downloads zijn bytegelijk aan de originele documenten", () => {
  const files = [["kleurplaat.pdf", "Oosthoek_Sinterklaas_Kleurplaat_A4.pdf"]];
  const hash = (b) => createHash("sha256").update(b).digest("hex");
  for (const [copy, original] of files)
    assert.equal(
      hash(
        readFileSync(new URL("../public/downloads/" + copy, import.meta.url)),
      ),
      hash(readFileSync(new URL("../../../" + original, import.meta.url))),
      copy,
    );
});
