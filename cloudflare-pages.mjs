// Vult de Cloudflare Pages-uitvoer aan na de drie builds: Sinterklaas (_site/sinterklaas), beheer (_site/beheer) en de wijkwebsite (_site/).
// Het hoofdadres is de wijkwebsite zelf: geen serverdoorverwijzing meer. Oude #-links op het hoofdadres stuurt src/wijk/main.tsx door.
import { rmSync, writeFileSync } from "node:fs";

rmSync("_site/_redirects", { force: true });
// Het beheer: niet in zoekmachines, niet in een frame van een andere site, niets in de browsercache.
writeFileSync(
  "_site/_headers",
  [
    "/beheer/*",
    "  X-Robots-Tag: noindex, nofollow",
    "  Referrer-Policy: no-referrer",
    "  X-Frame-Options: DENY",
    "  Cache-Control: no-store",
    "",
  ].join("\n"),
);
// Met een eigen 404.html valt Cloudflare niet terug op single-page-gedrag voor onbekende paden.
writeFileSync(
  "_site/404.html",
  '<!doctype html><html lang="nl-BE"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pagina niet gevonden - Wijkvereniging Oosthoek</title></head><body><p>Deze pagina bestaat niet.</p><p><a href="/">Naar de website van Wijkvereniging Oosthoek</a></p><p><a href="/sinterklaas/#/home">Naar de Sinterklaaswebsite</a></p></body></html>\n',
);
