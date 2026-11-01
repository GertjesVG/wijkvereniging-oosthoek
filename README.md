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

QR: `event.publicWebsite.url` staat op het vaste Sinterklaas-adres (zie GitHub Pages hieronder). `verified` blijft `false` tot de online eindcontrole; daarna verschijnt op Contact automatisch de QR met SVG-download. Lokale en tijdelijke tunneladressen leveren geen bezoekers-QR op. Storybook bevat voorbereiding en een duidelijk gelabeld voorbeeld op het gereserveerde testadres example.org. Na publicatie moet de echte code nog op telefoons worden gescand vóór verspreiding.

De eerder gedeelde externe tunnel serveert nog de vorige `dist/`-versie. Deze uitsluitend lokale ronde is gecontroleerd met `npm run build -- --outDir <sessie-temp>/oosthoek-local-finishing-dist`, zodat lokaal bouwen de externe preview niet stilzwijgend bijwerkt. Deel een volgende versie pas na GO.

- `src/content/event.ts`: datum, jaartal, programma, verenigingsgegevens, status, routehaltes, downloadpaden, wedstrijdregels en campagnekoppen. Gebruik `YYYY-MM-DD` voor de datum en pas het jaartal tegelijk aan. Controleer steeds de officiële bron voor wijzigingen.
- `src/content/sponsors.json`: alle 33 officiële sponsors met categorie, adres, telefoons en e-mail. Geen verzonnen logo's of websites.
- `src/Pages.tsx`: overige vaste paginateksten en FAQ. Het datumlabel in FAQ wordt automatisch uit de evenementgegevens afgeleid.
- `public/downloads/`: alleen de publieke kleurplaat voor het betreffende jaar. Vervang nooit de originele bronnen in de projecthoofdmap.
- `src/styles.css`, `src/pages.css`, `src/layout.css`: gedeelde huisstijl en responsive weergave.

De lettertypen en illustraties worden lokaal geladen. De gegenereerde hoofdillustratie en dorpsrand zijn losse decoratieve assets; geen screenshot vormt de webpagina. Illustraties zijn sfeerbeelden, geen bewijsmateriaal van de werkelijke rondgang.

## Nog aan te sluiten

1. Echte inschrijfdienst inclusief bevestiging en eventueel voorraadbeheer. Het formulier is bewust uitgeschakeld: niets wordt opgeslagen of verstuurd. Een status aanpassen alleen maakt géén werkende inschrijfdienst. Voorwaarden en privacydetails moeten worden aangeleverd vóór aansluiting.
2. Officiële vertrektijden, route en haltes. Die ontbreken in de bronnen. De klikbare OpenStreetMap is alleen een omgevingskaart van Beerse, geen route.
3. GPS-dienst met actuele tijdstempel en correcte toestand bij ontbrekende/verouderde gegevens. Er is nu geen live GPS of nagebootste beweging.

## GitHub Pages

Repository `GertjesVG/wijkvereniging-oosthoek` (privé), branch `main`. De workflow `.github/workflows/pages.yml` bouwt met `npm ci` en `npm run build` en zet de website online onder `/sinterklaas/`. Hij publiceert pas als Settings → Pages → Source op **GitHub Actions** staat; zolang dat niet zo is, stopt hij bij `configure-pages` zonder iets online te zetten. Pushen, de repository openbaar maken en Pages aanzetten gebeuren alleen na expliciete GO.

| Adres | Doel |
| --- | --- |
| https://gertjesvg.github.io/wijkvereniging-oosthoek/ | hoofdadres; verwijst nu door naar Sinterklaas en mag later het actuele evenement uitlichten |
| https://gertjesvg.github.io/wijkvereniging-oosthoek/sinterklaas/ | de Sinterklaaswebsite zelf en het vaste QR-adres; blijft elk jaar Sinterklaas |

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

De sponsorlogo's in het goedgekeurde ontwerp waren voorbeelden; de website gebruikt alleen de namen uit de officiële flyer. De oude lokale Oosthoek-site onder `D:/Test/Projecten/Oosthoek/Sinterklaas-2026/website` is read-only geïnspecteerd; favicon en huifkarillustratie zijn als bronasset hergebruikt. De oude documenten bevatten aanvullende conceptvoorwaarden, maar die gelden hier niet als officiële regels.

Omgevingskaart: centrum Beerse rond 51.319 / 4.854 gecontroleerd via [Mapcarta](https://mapcarta.com/17950548) en [GPS-coördinaten Beerse](https://www.gps-latitude-longitude.com/gps-coordinates-of-beerse); er is geen adres-, halte- of voertuigmarker afgeleid. OpenStreetMap wordt pas na een klik geladen en toont eigen attributie.
