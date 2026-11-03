# Sinterklaas Oosthoek

Volledig lokale React/TypeScript-website met acht pagina's. De originele documenten staan twee mappen hoger en blijven onaangeroerd.

## Kijken en werken

Open `Sinterklaas 2026.code-workspace` in de projecthoofdmap met VS Code.

| Wat | Commando | Adres |
| --- | --- | --- |
| Website met automatisch verversen | `npm run dev` | http://127.0.0.1:5173/ |
| Componentvoorbeelden in Storybook | `npm run storybook` | http://127.0.0.1:6008/ |
| Website bouwen | `npm run build` | uitvoer in `dist/` |
| Gebouwde website bekijken | `npm run preview` | http://127.0.0.1:4173/ |
| Storybook bouwen | `npm run build-storybook` | uitvoer in `storybook-static/` |
| Bronnen/downloads controleren | `npm test` | twee controles |
| Browsercontrole (Chrome geïnstalleerd) | `npm run test:browser` | website + Storybook moeten draaien |

Dezelfde acties staan in **Terminal → Run Task**. `Start website + Storybook` start beide ontwikkelservers. De twee open-taken openen de browser. Reeds draaiende servers hoeven niet opnieuw gestart te worden; sluit ze af met Ctrl+C in hun terminal. Poort 6008 is gekozen omdat 6006 (TypTopper) en 6007 (Nieuwe UI) op deze computer vaste Storybook-poorten zijn.

Node 24 en npm zijn gebruikt. Op een nieuwe computer: installeer Node en voer eenmaal `npm ci` uit. De server luistert alleen op deze computer; mobiel testen gebeurt met de apparaatsimulatie in de browser, niet via het lokale netwerk.

## Jaarlijks aanpassen

De actuele afwerkingsronde biedt alleen de kleurplaat publiek aan. Diploma's en dubbelzijdige flyer blijven uitsluitend als originele projectbronnen bewaard. Op de sponsorpagina staan 20 bevestigde websiteknoppen; adressen/telefoons/e-mails zijn behouden. Het opgegeven sponsoronderzoek-JSON ontbrak, daarom is de bevestigde status uit het onderzoeksdocument gebruikt.

QR: `event.publicWebsite.url` staat op het vaste Sinterklaas-adres op Cloudflare (zie Publicatie hieronder). Na de online eindcontrole van 1 november 2026 staat `verified` op `true`: Contact toont de QR met SVG-download. Lokale en tijdelijke tunneladressen leveren geen bezoekers-QR op. Storybook bevat voorbereiding en een duidelijk gelabeld voorbeeld op het gereserveerde testadres example.org. Na publicatie moet de echte code nog op telefoons worden gescand vóór verspreiding.

De eerder gedeelde externe tunnel serveert nog de vorige `dist/`-versie. Deze uitsluitend lokale ronde is gecontroleerd met `npm run build -- --outDir <sessie-temp>/oosthoek-local-finishing-dist`, zodat lokaal bouwen de externe preview niet stilzwijgend bijwerkt. Deel een volgende versie pas na GO.

- `src/content/event.ts`: datum, jaartal, programma, verenigingsgegevens, status, routehaltes, downloadpaden, wedstrijdregels en campagnekoppen. Gebruik `YYYY-MM-DD` voor de datum en pas het jaartal tegelijk aan. Controleer steeds de officiële bron voor wijzigingen.
- `src/content/sponsors.json`: alle 33 officiële sponsors met categorie, adres, telefoons en e-mail. Geen verzonnen logo's of websites.
- `src/content/sponsor-logos.ts`: de 24 bevestigde sponsorlogo's (sponsorpakket 3 november 2026), op exacte naam gekoppeld; bestanden als `public/assets/sponsor-*.webp`. Een sponsor zonder regel krijgt zijn naam als typografische plaat. Een officieel logo toevoegen = bestand in `public/assets/` plus één regel in dit bestand (uitleg bovenaan).
- `src/Pages.tsx`: overige vaste paginateksten en FAQ. Het datumlabel in FAQ wordt automatisch uit de evenementgegevens afgeleid.
- `public/downloads/`: alleen de publieke kleurplaat voor het betreffende jaar. Vervang nooit de originele bronnen in de projecthoofdmap.
- `src/styles.css`, `src/pages.css`, `src/layout.css`: gedeelde huisstijl en responsive weergave.

De lettertypen en illustraties worden lokaal geladen. De gegenereerde hoofdillustratie en dorpsrand zijn losse decoratieve assets; geen screenshot vormt de webpagina. Illustraties zijn sfeerbeelden, geen bewijsmateriaal van de werkelijke rondgang.

## Nog aan te sluiten

1. Inschrijvingen en bevestigingsmails: actief sinds 3 november 2026. Werking, beveiliging en tests staan in [INSCHRIJVEN.md](INSCHRIJVEN.md).
2. Route en haltes. Het vertrek staat vast ("Vertrek om 10.30 uur aan Wijkhuis Oosthoek."); route en haltes volgen later. De klikbare OpenStreetMap is alleen een omgevingskaart van Beerse, geen route.
3. Live GPS van de huifkar: gebouwd en lokaal getest (OwnTracks op de Pixel, start en stop in het beheer), nog niet gepubliceerd. Instellen, gebruik op 28 november, belasting en de stappen om in gebruik te nemen staan in [GPS.md](GPS.md).

## Publicatie: Cloudflare Pages

Repository `GertjesVG/wijkvereniging-oosthoek` (openbaar), branch `main`. Cloudflare Pages (project `wijkvereniging-oosthoek`, gratis) is via de Git-integratie gekoppeld: **elke push naar `main` zet de site meteen online.** Cloudflare bouwt met `npm run build:cloudflare` naar `_site` (website onder `/sinterklaas/`, plus `_redirects` en `404.html` uit `cloudflare-pages.mjs`). Commits in deze repository gebruiken het GitHub-noreply-adres, zodat geen privé-e-mailadres openbaar wordt.

| Adres | Doel |
| --- | --- |
| https://wijkvereniging-oosthoek.pages.dev/ | hoofdadres; verwijst nu (302) door naar Sinterklaas en mag later het actuele evenement uitlichten |
| https://wijkvereniging-oosthoek.pages.dev/sinterklaas/ | de Sinterklaaswebsite zelf en het vaste QR-adres; blijft elk jaar Sinterklaas |
| https://gertjesvg.github.io/wijkvereniging-oosthoek/… | oud adres (eerste QR-codes en flyer): stuurt door naar hetzelfde pad op Cloudflare, met `?…` en `#/…` |

GitHub Pages blijft aan, maar alleen voor die doorverwijzing: `.github/workflows/pages.yml` zet `github-pages/index.html` op het hoofdadres, op `/sinterklaas/` en als `404.html` (elk ander oud pad). De workflow draait alleen als die bestanden wijzigen, dus nooit een tweede kopie van de site. Zet GitHub Pages niet uit zolang er nog oude QR-codes in omloop zijn.

De Sinterklaaswebsite staat zelf op `/sinterklaas/`, zonder doorverwijzing, zodat dat adres nooit naar een ander evenement kan wijzen. Lokaal (`npm run dev`, `npm run preview`) blijft alles op de hoofdmap. Hashlinks (`#/route`) en relatieve paden (`base: './'`) werken onder dit pad zonder serverregels. Nooit kindergegevens of secrets toevoegen.

## Later een ander evenement

Nog niet gebouwd. Zo blijft het eenvoudig:

1. Elk evenement krijgt een eigen vast adres en een eigen QR-code, zoals `/garageverkoop/`, `/wijkfeest/` of `/paasfeest/`, net als `/sinterklaas/`. Een evenementadres verwijst nooit naar een ander evenement.
2. De openbare gegevens van dat evenement komen in een eigen bestand onder `src/content/`, naar het voorbeeld van `event.ts`.
3. Alleen het hoofdadres mag wisselen: nu een doorverwijzing in de workflow, later eventueel een korte overzichtspagina die het actuele evenement uitlicht.

Technische bronnen: [Vite statische publicatie](https://vite.dev/guide/static-deploy), [Storybook React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/).

## Bronkeuzes

Officiële flyer: `Oosthoek_Sinterklaas_Dubbelzijdig_Kleurwedstrijd_A4.pdf`, pagina 1 datum/regels en pagina 2 sponsors/contact. De regels zijn letterlijk opgenomen; apostrof en bullets zijn gecontroleerd op de gerenderde pagina. Geen grenzen voor leeftijd, inschrijfdatum, prijzen of jury verzonnen.

De kleurplaat spreekt over een extra cadeautje; de expliciete flyerregel **maximaal één cadeautje per kind** bepaalt de websitetekst. De originele bronbestanden blijven ongewijzigd in de projecthoofdmap; alleen de kleurplaat wordt publiek aangeboden.

Sponsorkaarten volgen de Zeepventje-kaart uit het sponsorpakket (`Documentatie/Sponsors`); alleen de logo's daaruit zijn overgenomen, als webversie (lege rand weg, verkleind, kleuren ongewijzigd). Namen en contactgegevens blijven die van de officiële flyer in `sponsors.json`. De oude lokale Oosthoek-site onder `D:/Test/Projecten/Oosthoek/Sinterklaas-2026/website` is read-only geïnspecteerd; favicon en huifkarillustratie zijn als bronasset hergebruikt. De oude documenten bevatten aanvullende conceptvoorwaarden, maar die gelden hier niet als officiële regels.

Omgevingskaart: centrum Beerse rond 51.319 / 4.854 gecontroleerd via [Mapcarta](https://mapcarta.com/17950548) en [GPS-coördinaten Beerse](https://www.gps-latitude-longitude.com/gps-coordinates-of-beerse); er is geen adres-, halte- of voertuigmarker afgeleid. OpenStreetMap wordt pas na een klik geladen en toont eigen attributie.
