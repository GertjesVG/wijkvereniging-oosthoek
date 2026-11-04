# Sinterklaas Oosthoek

Volledig lokale React/TypeScript-website: de algemene wijkwebsite van VZW Wijkvereniging Oosthoek op het hoofdadres, en de Sinterklaaswebsite met acht pagina's onder `/sinterklaas/`. De originele documenten staan twee mappen hoger en blijven onaangeroerd.

## Kijken en werken

Open `Sinterklaas 2026.code-workspace` in de projecthoofdmap met VS Code.

| Wat | Commando | Adres |
| --- | --- | --- |
| Sinterklaaswebsite met automatisch verversen | `npm run dev` | http://127.0.0.1:5173/ |
| Hele site zoals online: wijkpagina, Sinterklaas, beheer, lokale database | `npm run build:cloudflare`, dan `npm run dev:api` | http://127.0.0.1:8788/ |
| Componentvoorbeelden in Storybook | `npm run storybook` | http://127.0.0.1:6008/ |
| Website bouwen | `npm run build` | uitvoer in `dist/` |
| Gebouwde website bekijken | `npm run preview` | http://127.0.0.1:4173/ |
| Storybook bouwen | `npm run build-storybook` | uitvoer in `storybook-static/` |
| Bronnen/downloads controleren | `npm test` | twee controles |
| Browsercontrole (Chrome geïnstalleerd) | `npm run test:browser` | website + Storybook moeten draaien; `tests/browser/wijk.spec.ts` ook de hele site op poort 8788 |

Dezelfde acties staan in **Terminal → Run Task**. `Start website + Storybook` start beide ontwikkelservers. De twee open-taken openen de browser. Reeds draaiende servers hoeven niet opnieuw gestart te worden; sluit ze af met Ctrl+C in hun terminal. Poort 6008 is gekozen omdat 6006 (TypTopper) en 6007 (Nieuwe UI) op deze computer vaste Storybook-poorten zijn.

Node 24 en npm zijn gebruikt. Op een nieuwe computer: installeer Node en voer eenmaal `npm ci` uit. De server luistert alleen op deze computer; mobiel testen gebeurt met de apparaatsimulatie in de browser, niet via het lokale netwerk.

## Wijkwebsite

Eigen ingang `wijk/index.html` en code in `src/wijk/`, apart gebouwd naar `_site/` (`vite build --mode wijk`), net als het beheer. Het raakt de Sinterklaasstijl niet.

- `src/content/wijk.ts`: de activiteiten met hun tekst, beeld, `date`, `location`, `status`, `registrationHref` en `registrationDeadline`, en Oosthoek leeft mee. Zonder bevestigde datum blijft `date` op `null` en toont de site "Datum volgt". Na de datum toont de site vanzelf "Voorbij".
- **De status is alleen een melding op de website.** Ze sluit of opent geen enkele inschrijving op de server. Inschrijven kan pas getoond worden met een echt `registrationHref`. Voor Sinterklaas komt de status live uit `/api/evenementen/sinterklaas-2026`; openen en sluiten gebeurt in het beheer. Na 28 november toont de wijkpagina "Voorbij", maar de inschrijving sluit dan niet vanzelf: dat blijft een handeling in het beheer.
- Sponsors komen uit `src/content/sponsors.json` en `sponsor-logos.ts`, verenigingsgegevens uit `event.organisation`: daar één keer aanpassen, de wijkpagina volgt.
- Beelden in `public/assets/oosthoek-*.webp`, online onder `/sinterklaas/assets/`: bytegelijke kopieën van `Documentatie/Oosthoek-Activiteitenbeelden/Website/`. Logo en wijkillustratie komen ongewijzigd uit het ontwerpvoorbeeld daar. De bron blijft in `Documentatie`.

## Jaarlijks aanpassen

De actuele afwerkingsronde biedt alleen de kleurplaat publiek aan. Diploma's en dubbelzijdige flyer blijven uitsluitend als originele projectbronnen bewaard. Op de sponsorpagina staan 20 bevestigde websiteknoppen; adressen/telefoons/e-mails zijn behouden. Het opgegeven sponsoronderzoek-JSON ontbrak, daarom is de bevestigde status uit het onderzoeksdocument gebruikt.

QR: `event.publicWebsite.url` staat op het vaste adres op Cloudflare (zie Publicatie hieronder), dat sinds de wijkwebsite eerst de wijkpagina opent. Na de online eindcontrole van 1 november 2026 staat `verified` op `true`: Contact toont de QR met SVG-download. Lokale en tijdelijke tunneladressen leveren geen bezoekers-QR op. Storybook bevat voorbereiding en een duidelijk gelabeld voorbeeld op het gereserveerde testadres example.org. Na publicatie moet de echte code nog op telefoons worden gescand vóór verspreiding.

De eerder gedeelde externe tunnel serveert nog de vorige `dist/`-versie. Deze uitsluitend lokale ronde is gecontroleerd met `npm run build -- --outDir <sessie-temp>/oosthoek-local-finishing-dist`, zodat lokaal bouwen de externe preview niet stilzwijgend bijwerkt. Deel een volgende versie pas na GO.

- `src/content/event.ts`: datum, jaartal, programma, verenigingsgegevens, status, route (straten in volgorde), downloadpaden, wedstrijdregels en campagnekoppen. Gebruik `YYYY-MM-DD` voor de datum en pas het jaartal tegelijk aan. Controleer steeds de officiële bron voor wijzigingen.
- `src/content/sponsors.json`: alle 33 officiële sponsors met categorie, adres, telefoons en e-mail. Geen verzonnen logo's of websites.
- `src/content/sponsor-logos.ts`: de 24 bevestigde sponsorlogo's (sponsorpakket 3 november 2026), op exacte naam gekoppeld; bestanden als `public/assets/sponsor-*.webp`. Een sponsor zonder regel krijgt zijn naam als typografische plaat. Een officieel logo toevoegen = bestand in `public/assets/` plus één regel in dit bestand (uitleg bovenaan).
- `src/Pages.tsx`: overige vaste paginateksten en FAQ. Het datumlabel in FAQ wordt automatisch uit de evenementgegevens afgeleid.
- `public/downloads/`: alleen de publieke kleurplaat voor het betreffende jaar. Vervang nooit de originele bronnen in de projecthoofdmap.
- `src/styles.css`, `src/pages.css`, `src/layout.css`: gedeelde huisstijl en responsive weergave.

De lettertypen en illustraties worden lokaal geladen. De gegenereerde hoofdillustratie en dorpsrand zijn losse decoratieve assets; geen screenshot vormt de webpagina. Illustraties zijn sfeerbeelden, geen bewijsmateriaal van de werkelijke rondgang.

## Nog aan te sluiten

1. Inschrijvingen en bevestigingsmails: actief sinds 3 november 2026. Werking, beveiliging en tests staan in [INSCHRIJVEN.md](INSCHRIJVEN.md).
2. Route 2026: definitief (Gert, 3 november 2026). Vertrek "Vertrek om 10.30 uur aan Wijkhuis Oosthoek.", 24 straten in vaste volgorde in `event.route.stops`; geen haltes of tijden per straat. De routekaart (`src/gps/LiveMap.tsx`, OpenStreetMap, pas na een klik of tijdens de live GPS) kleurt de 24 straten en nummert ze; de straatligging staat in `src/content/route-kaart.json` (zie onder). Zolang `event.route.mapChecked` op `false` staat, heet de kaart "indicatief": de rijweg in en tussen de straten is niet nagekeken.
3. Live GPS van de huifkar: gebouwd en lokaal getest (OwnTracks op de Pixel, start en stop in het beheer), nog niet gepubliceerd. Instellen, gebruik op 28 november, belasting en de stappen om in gebruik te nemen staan in [GPS.md](GPS.md).

## Publicatie: Cloudflare Pages

Repository `GertjesVG/wijkvereniging-oosthoek` (openbaar), branch `main`. Cloudflare Pages (project `wijkvereniging-oosthoek`, gratis) is via de Git-integratie gekoppeld: **elke push naar `main` zet de site meteen online.** Cloudflare bouwt met `npm run build:cloudflare` naar `_site` (wijkwebsite op het hoofdadres, Sinterklaas onder `/sinterklaas/`, beheer onder `/beheer/`, plus `_headers` en `404.html` uit `cloudflare-pages.mjs`). Commits in deze repository gebruiken het GitHub-noreply-adres, zodat geen privé-e-mailadres openbaar wordt.

| Adres | Doel |
| --- | --- |
| https://wijkvereniging-oosthoek.pages.dev/ | de wijkwebsite; `#/pasen`, `#/garageverkoop`, `#/wijkfeest` zijn de informatiepagina's. Oude links `/#/route` en dergelijke gaan door naar `/sinterklaas/#/route`, met zoekdeel |
| https://wijkvereniging-oosthoek.pages.dev/sinterklaas/ | het kale adres op de gedrukte QR-codes: opent de wijkpagina (script in `index.html`) |
| https://wijkvereniging-oosthoek.pages.dev/sinterklaas/#/home | de Sinterklaaswebsite zelf; elk adres onder `/sinterklaas/` met een `#/…` of `?…` blijft op die website |
| https://gertjesvg.github.io/wijkvereniging-oosthoek/… | oud adres (eerste QR-codes en flyer): stuurt door naar hetzelfde pad op Cloudflare, met `?…` en `#/…` |

GitHub Pages blijft aan, maar alleen voor die doorverwijzing: `.github/workflows/pages.yml` zet `github-pages/index.html` op het hoofdadres, op `/sinterklaas/` en als `404.html` (elk ander oud pad). De workflow draait alleen als die bestanden wijzigen, dus nooit een tweede kopie van de site. Zet GitHub Pages niet uit zolang er nog oude QR-codes in omloop zijn.

De server ziet het `#`-deel van een adres niet, dus het onderscheid tussen `/sinterklaas/` en `/sinterklaas/#/route` kan alleen in de browser: een serverregel zou ook elke `#/…`-link wegsturen. Daarom staat er geen `_redirects` meer. Het kale `/sinterklaas/` gaat naar `/`, en `/` stuurt nooit terug: geen lus mogelijk. De bevestigingsmail en de QR op de contactpagina linken ook naar het kale adres en komen dus eerst op de wijkpagina uit. Lokaal (`npm run dev`, `npm run preview`) blijft Sinterklaas op de hoofdmap. Hashlinks (`#/route`) en relatieve paden (`base: './'`) werken onder dit pad zonder serverregels. Nooit kindergegevens of secrets toevoegen.

## Later een ander evenement

Nog niet gebouwd. Zo blijft het eenvoudig:

1. Elk evenement krijgt een eigen vast adres en een eigen QR-code, zoals `/garageverkoop/`, `/wijkfeest/` of `/paasfeest/`, net als `/sinterklaas/`. Een evenementadres verwijst nooit naar een ander evenement.
2. De openbare gegevens van dat evenement komen in een eigen bestand onder `src/content/`, naar het voorbeeld van `event.ts`.
3. Het hoofdadres is de overzichtspagina: de kaart van de activiteit in `src/content/wijk.ts` wijst dan naar dat eigen adres.

Technische bronnen: [Vite statische publicatie](https://vite.dev/guide/static-deploy), [Storybook React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/).

## Bronkeuzes

Officiële flyer: `Oosthoek_Sinterklaas_Dubbelzijdig_Kleurwedstrijd_A4.pdf`, pagina 1 datum/regels en pagina 2 sponsors/contact. De regels zijn letterlijk opgenomen; apostrof en bullets zijn gecontroleerd op de gerenderde pagina. Geen grenzen voor leeftijd, inschrijfdatum, prijzen of jury verzonnen.

De kleurplaat spreekt over een extra cadeautje; de expliciete flyerregel **maximaal één cadeautje per kind** bepaalt de websitetekst. De originele bronbestanden blijven ongewijzigd in de projecthoofdmap; alleen de kleurplaat wordt publiek aangeboden.

Sponsorkaarten volgen de Zeepventje-kaart uit het sponsorpakket (`Documentatie/Sponsors`); alleen de logo's daaruit zijn overgenomen, als webversie (lege rand weg, verkleind, kleuren ongewijzigd). Namen en contactgegevens blijven die van de officiële flyer in `sponsors.json`. De oude lokale Oosthoek-site onder `D:/Test/Projecten/Oosthoek/Sinterklaas-2026/website` is read-only geïnspecteerd; favicon en huifkarillustratie zijn als bronasset hergebruikt. De oude documenten bevatten aanvullende conceptvoorwaarden, maar die gelden hier niet als officiële regels.

Routekaart: `src/content/route-kaart.json` is op 3 november 2026 gemaakt uit OpenStreetMap (Overpass, alle wegen met `highway` in het vak 51.314–51.342 N, 4.852–4.890 O). Per straat de wegen met exact die naam, een nummer halverwege de langste weg, en waar twee opeenvolgende straten elkaar niet raken alleen het stuk van de kortste berijdbare verbinding buiten de route (nu enkel Hofeinde, tussen 1 en 2). De netwerkcontrole (doodlopende eindes, eenrichtingsstukken, brug) staat in `Bewijs\route-2026-osm-analyse-2026-11-03.txt` van het project. Geen vertrekmarker: Wijkhuis Oosthoek staat niet in OpenStreetMap. OpenStreetMap wordt pas na een klik geladen (of tijdens de live GPS) en toont eigen attributie.
