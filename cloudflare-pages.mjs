// Vult de Cloudflare Pages-uitvoer aan na `vite build --outDir _site/sinterklaas` (zie `npm run build:cloudflare`).
// /sinterklaas/ is altijd de Sinterklaaswebsite zelf; alleen het hoofdadres mag later naar een ander evenement wijzen, daarom 302.
import { writeFileSync } from "node:fs";

writeFileSync("_site/_redirects", "/ /sinterklaas/ 302\n");
// Met een eigen 404.html valt Cloudflare niet terug op single-page-gedrag voor onbekende paden.
writeFileSync(
  "_site/404.html",
  '<!doctype html><html lang="nl-BE"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pagina niet gevonden - Wijkvereniging Oosthoek</title></head><body><p>Deze pagina bestaat niet.</p><p><a href="/sinterklaas/">Naar de Sinterklaaswebsite van Oosthoek</a></p></body></html>\n',
);
