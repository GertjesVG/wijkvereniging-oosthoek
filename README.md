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
| Beheerbare teksten met lokale database controleren | `npm run test:teksten` | werkt op een tijdelijke kopie |
| Browsercontrole (Chrome geïnstalleerd) | `npm run test:browser` | website + Storybook moeten draaien; `tests/browser/wijk.spec.ts` ook de hele site op poort 8788 |

Dezelfde acties staan in **Terminal → Run Task**. `Start website + Storybook` start beide ontwikkelservers. De twee open-taken openen de browser. Reeds draaiende servers hoeven niet opnieuw gestart te worden; sluit ze af met Ctrl+C in hun terminal. Poort 6008 is gekozen omdat 6006 (TypTopper) en 6007 (Nieuwe UI) op deze computer vaste Storybook-poorten zijn.

Node 24 en npm zijn gebruikt. Op een nieuwe computer: installeer Node en voer eenmaal `npm ci` uit. De server luistert alleen op deze computer; mobiel testen gebeurt met de apparaatsimulatie in de browser, niet via het lokale netwerk.

## Wijkwebsite

Eigen ingang `wijk/index.html` en code in `src/wijk/`, apart gebouwd naar `_site/` (`vite build --mode wijk`), net als het beheer. Het raakt de Sinterklaasstijl niet.

- De hoofdpagina heeft zeven tegels: vier activiteiten (Pasen, garageverkoop, wijkfeest, Sinterklaas) en drie met wijkinformatie (`#/sponsors`, `#/lief-en-leed`, `#/wijkhuis`), elk met een eigen pagina.
- `src/content/wijk.ts`: de activiteiten met hun tekst, beeld, `date`, `location`, `status`, `registrationHref` en `registrationDeadline`, de wijkinformatie en lief en leed. Zonder bevestigde datum blijft `date` op `null` en toont de site "Datum volgt". Na de datum toont de site vanzelf ook "Voorbij".
- **De status is alleen een melding op de website.** Ze sluit of opent geen enkele inschrijving op de server. Inschrijven kan pas getoond worden met een echt `registrationHref`.
- **Sinterklaas: "Voorbij" en de inschrijfmelding zijn twee aparte meldingen.** "Voorbij" volgt de datum van het evenement. De inschrijfstatus en de zin ernaast komen altijd live uit `/api/evenementen/sinterklaas-2026` en worden gemaakt door `src/inschrijving/periode.ts`. De inschrijving opent en sluit alleen op de server: de periode "Inschrijven vanaf" en "Inschrijven tot" in `/beheer/` (migratie 0008), de schakelaar "Handmatig gesloten", het ingestelde maximum (volzet), of de wisdatum `deleteBy` (31 januari 2027: de server sluit en wist vanzelf). Zie `INSCHRIJVEN.md`.
- **Wijkhuis:** gecorrigeerd door Gert op 22 november 2026: **Wijkhuis Oosthoek — Oosteneinde, bij de kanaalbrug, 2340 Beerse** (geen huisnummer: het gebouw heeft er geen). Eén bron: `wijkhuisAddress` in `event.ts`; `wijkhuisLocation` in `wijk.ts`, de tegel, de wijkhuiskaart, het Sinterklaasvertrek (`event.departure`) en de vertrekmarkering op de routekaart volgen die. Opstal 5, 2340 Beerse is alleen het zetel- en correspondentieadres (Kruispuntbank, contact, privacy, brievenbus voor lief en leed) en ligt ± 230 m verder aan de overkant van het kanaal; het was van 5 tot 22 november ten onrechte ook het wijkhuisadres. De marker en routeknop gebruiken het aangeleverde fysieke punt `51.32974,4.86997` bij de kanaalbrug. Een afwijkend adreslabel van Google (Opstal 7) is geen bron voor onze eigen naam, adres of kaartmetadata. Sponsoradressen staan hier los van.
- Sponsors komen uit `src/content/sponsors.json` en `sponsor-logos.ts`, verenigingsgegevens uit `event.organisation`: daar één keer aanpassen, de wijkpagina volgt. De goedgekeurde kaarten staan in `src/SponsorCards.tsx` en `src/sponsors.css`, gedeeld met de Sinterklaaswebsite; online is `/#/sponsors` de enige sponsorpagina en sturen de sponsorlinks van Sinterklaas daarheen. Alleen lokaal met `npm run dev` toont Sinterklaas de kaarten op zijn eigen pagina. De introductie (`sponsorIntro` in `src/content/wijk.ts`) noemt `sponsorTotal` (33, bevestigd door de opdrachtgever op 17 november 2026) en het aantal kaarten uit `sponsors.json`; staan ze er allemaal, dan "Hieronder stellen we ze aan je voor".
- **Privacy:** één centrale verklaring op `/#/privacy` (`src/wijk/Privacy.tsx`, stijl in `wijk.css`), met een anker per onderdeel (`#/privacy?sinterklaas`). `/sinterklaas/#/privacy` stuurt naar het onderdeel Sinterklaas (`index.html`, `App.tsx`); lokaal met `npm run dev` toont Sinterklaas alleen een verwijzing. Bij een inhoudelijke wijziging ook `privacyUpdated` in `src/content/wijk.ts` aanpassen. Onderbouwing: `Project dossier/AVG-VERANTWOORDING.md`.
- Beelden in `public/assets/oosthoek-*.webp`, online onder `/sinterklaas/assets/`. Pasen, garageverkoop en wijkfeest zijn bytegelijke kopieën uit `Documentatie/Oosthoek-Activiteitenbeelden/Website/`; sponsors, lief en leed en wijkhuis zijn WebP-versies (kwaliteit 82) van de PNG's daar. De `-768`-versies dienen voor tegels en miniaturen. Logo en wijkillustratie komen ongewijzigd uit het ontwerpvoorbeeld daar. De bron blijft in `Documentatie`.

## Jaarlijks aanpassen

De actuele afwerkingsronde biedt alleen de kleurplaat publiek aan. Diploma's en dubbelzijdige flyer blijven uitsluitend als originele projectbronnen bewaard. Op de sponsorpagina staan 20 bevestigde websiteknoppen; adressen/telefoons/e-mails zijn behouden. Het opgegeven sponsoronderzoek-JSON ontbrak, daarom is de bevestigde status uit het onderzoeksdocument gebruikt.

QR: `event.publicWebsite.url` staat op het vaste adres op Cloudflare (zie Publicatie hieronder), dat sinds de wijkwebsite eerst de wijkpagina opent. Na de online eindcontrole van 1 november 2026 staat `verified` op `true`: Contact toont de QR met SVG-download. Lokale en tijdelijke tunneladressen leveren geen bezoekers-QR op. Storybook bevat voorbereiding en een duidelijk gelabeld voorbeeld op het gereserveerde testadres example.org. Na publicatie moet de echte code nog op telefoons worden gescand vóór verspreiding.

De eerder gedeelde externe tunnel serveert nog de vorige `dist/`-versie. Deze uitsluitend lokale ronde is gecontroleerd met `npm run build -- --outDir <sessie-temp>/oosthoek-local-finishing-dist`, zodat lokaal bouwen de externe preview niet stilzwijgend bijwerkt. Deel een volgende versie pas na GO.

- `src/content/event.ts`: datum, jaartal, programma, verenigingsgegevens, status, route (straten in volgorde), downloadpaden, wedstrijdregels en campagnekoppen. Gebruik `YYYY-MM-DD` voor de datum en pas het jaartal tegelijk aan. Controleer steeds de officiële bron voor wijzigingen.
- `src/content/sponsors.json`: alle 33 officiële sponsors met categorie, adres, telefoons en e-mail. Geen verzonnen logo's of websites.
- `src/content/sponsor-logos.ts`: de 25 bevestigde sponsorlogo's (sponsorpakket 3 november 2026, aangevuld op 5 november; op 15 november het logo van Zeepventje weggehaald en Walbers en Jacko Sound vernieuwd; op 17 november Zeepventje volledig van de sponsorlijst gehaald; op 19 november Zeepventje terug met hetzelfde logo, weer 33 sponsors), op exacte naam gekoppeld; bestanden als `public/assets/sponsor-*.webp` of `.svg`. Een sponsor zonder regel krijgt zijn naam als typografische plaat. Een officieel logo toevoegen = bestand in `public/assets/` plus één regel in dit bestand (uitleg bovenaan).
- `src/content/teksten.ts`: de oorspronkelijke paginateksten en FAQ die in het beheer aanpasbaar zijn (zie hieronder). Het datumlabel en het aantal straten worden automatisch uit de evenementgegevens afgeleid. `src/Pages.tsx` bevat de opbouw van de pagina's en de knoppen; de privacyverklaring staat in `src/wijk/Privacy.tsx`.
- `public/downloads/`: alleen de publieke kleurplaat voor het betreffende jaar. Vervang nooit de originele bronnen in de projecthoofdmap.
- `src/styles.css`, `src/pages.css`, `src/layout.css`: gedeelde huisstijl en responsive weergave.

De lettertypen en illustraties worden lokaal geladen. De gegenereerde hoofdillustratie en dorpsrand zijn losse decoratieve assets; geen screenshot vormt de webpagina. Illustraties zijn sfeerbeelden, geen bewijsmateriaal van de werkelijke rondgang.

## Teksten aanpassen via het beheer

Voor de beheerder: open `/beheer/`, log in met het bestaande beheerwachtwoord en kies **Teksten van de website**. Zoek een tekst (bijvoorbeeld "paarden") of open een onderdeel, pas de tekst aan en klik op **Opslaan**. Bezoekers zien de nieuwe tekst zodra ze de pagina openen of vernieuwen; opnieuw publiceren is niet nodig. **Vorige versie terugzetten** zet de vorige opgeslagen tekst terug (nog eens klikken wisselt terug), **Oorspronkelijke tekst terugzetten** zet de tekst uit de code terug. Een nieuwe regel (Enter) kan alleen in titels die al over twee regels staan.

- Welke teksten aanpasbaar zijn en hun oorspronkelijke versie: `src/content/teksten.ts` (13 onderdelen van de wijkwebsite en de Sinterklaaswebsite). Een pagina toont zo'n tekst met `t("sleutel")`; `npm test` controleert dat elke gebruikte sleutel bestaat.
- Opslag: alleen de aangepaste teksten, in de tabel `site_texts` van de bestaande D1-database (migratie `0009_teksten.sql`), met per tekst de vorige versie. Publiek leesbaar via `GET /api/teksten`; aanpassen via `/api/beheer/teksten` achter de bestaande beheerlogin (`server/teksten.ts`).
- Altijd gewone tekst, nooit HTML: ingevoerde opmaak of code verschijnt letterlijk. Hoogstens 2000 tekens; een lege tekst kan niet.
- Zonder tabel, zonder antwoord of bij een fout toont de website gewoon de oorspronkelijke teksten. Een aangepaste tekst verschijnt pas na het laden; bij een trage verbinding is de oorspronkelijke tekst heel even zichtbaar.
- Bewust niet aanpasbaar: adressen, datums, route en straten, sponsors, het inschrijfformulier, het reglement, de privacyverklaring, knoppen en menu.
- Wie een tekst in de code wijzigt: een in het beheer aangepaste versie blijft voorgaan tot "Oorspronkelijke tekst terugzetten".
- Publiceren: eerst migratie 0009 op de online database, dan de code naar `main`. Omgekeerd kan ook: tot de migratie toont de site de oorspronkelijke teksten en meldt het beheer dat de opslag nog niet is ingesteld.

## Bezoekersstatistieken in het beheer

Voor de beheerder: open `/beheer/`, log in en kies **Bezoekersstatistieken**. Het scherm haalt de cijfers op bij het openen en met **Vernieuwen**: bezoeken vandaag, gisteren, de afgelopen 7 en 30 dagen, de totalen sinds het begin van de telling, een grafiek per dag (7, 30, 90 dagen of alles, met vergelijking met de periode ervoor zodra die volledig gemeten is) en de meest bekeken pagina's.

- Eigen, anonieme teller in de bestaande D1-database: tabel `visit_days` (migratie `0010_bezoeken.sql`), één rij per dag (Belgische tijd) en per pagina met twee aantallen. Geen cookie, geen browseropslag, geen IP-adres of browsergegevens; geen externe dienst, geen sleutel of extra Cloudflare-instelling.
- **Bezoek** = aankomst van buiten de website (link, QR-code, zoekmachine, getypt adres); verder klikken, vernieuwen of teruggaan is geen nieuw bezoek. **Paginaweergave** = elke pagina die de bezoeker echt te zien krijgt, ook na doorklikken, vernieuwen of teruggaan (ook naar een pagina die de browser in het geheugen hield); een tabblad op de achtergrond of een pagina die de browser alvast laadt, telt pas als ze zichtbaar wordt (sinds 14 november 2026). Unieke bezoekers bestaan bewust niet: daarvoor zou de site mensen moeten herkennen.
- De website meldt een weergave aan `POST /api/bezoek` (`src/bezoek/teller.ts`, gestart in `src/main.tsx` en `src/wijk/main.tsx`; de doorverwijzingen in `index.html` en `src/wijk/main.tsx` tellen het bezoek bij de doelpagina). De server (`server/bezoek.ts`) aanvaardt alleen de pagina's uit `src/bezoek/paginas.ts`, alleen van de eigen site, en negeert zoekrobots en geautomatiseerde browsers. Het beheer zelf telt niet mee. Een nieuwe pagina op de site: voeg ze toe aan `bezoekPaginas` (`npm test` bewaakt dat de lijst klopt met de bestaande pagina's).
- Het antwoord op een melding is altijd leeg (204), ook zonder database of tabel: een storing van de teller raakt de website niet. De cijfers lezen kan alleen via `GET /api/beheer/statistieken`, achter de bestaande beheerlogin.
- Waarom niet Cloudflare Web Analytics: beide sites gebruiken #-routes (`/sinterklaas/#/route`). Cloudflare meet per pad en zou dus alleen `/` en `/sinterklaas/` onderscheiden, bewaart zes maanden en vraagt een API-sleutel plus een instelling in het dashboard. Niet tegelijk inschakelen: dan wordt dubbel gemeten.
- Publiceren: eerst migratie 0010 op de online database (`npx wrangler d1 migrations apply oosthoek-inschrijvingen --remote`), dan de code naar `main`. Omgekeerd kan ook: tot de migratie telt de site niets en meldt het beheer dat de teller nog niet is ingesteld.
- Testen: `npm test` (rekenwerk, dagen in Belgische tijd, paginalijst) en `npm run test:statistieken` (server met lokale database).

## Nog aan te sluiten

1. Inschrijvingen en bevestigingsmails: actief sinds 3 november 2026. Werking, beveiliging en tests staan in [INSCHRIJVEN.md](INSCHRIJVEN.md).
2. Route 2026: definitief (Gert, 3 november 2026), vertrekplaats gecorrigeerd op 22 november: "Vertrek om 10.30 uur aan Wijkhuis Oosthoek, Oosteneinde, bij de kanaalbrug, 2340 Beerse." (niet het zeteladres Opstal 5, dat ± 230 m verder aan de overkant van het kanaal ligt), 24 straten in vaste volgorde in `event.route.stops`; geen haltes of tijden per straat. De routekaart (`src/gps/LiveMap.tsx`, OpenStreetMap, pas na een klik of tijdens de live GPS) kleurt de 24 straten en nummert ze; de straatligging staat in `src/content/route-kaart.json` (zie onder). Zolang `event.route.mapChecked` op `false` staat, heet de kaart "indicatief": de rijweg in en tussen de straten is niet nagekeken.
3. Live GPS van de huifkar: gebouwd en lokaal getest (OwnTracks op de Pixel, start en stop in het beheer), nog niet gepubliceerd. Instellen, gebruik op 28 november, belasting en de stappen om in gebruik te nemen staan in [GPS.md](GPS.md).
4. Teksten aanpassen via het beheer: gepubliceerd op 14 november 2026 (migratie 0009 online, daarna `main` = `c272f61`); zie hierboven.

## Publicatie: Cloudflare Pages

Repository `GertjesVG/wijkvereniging-oosthoek` (openbaar), branch `main`. Cloudflare Pages (project `wijkvereniging-oosthoek`, gratis) is via de Git-integratie gekoppeld: **elke push naar `main` zet de site meteen online.** Cloudflare bouwt met `npm run build:cloudflare` naar `_site` (wijkwebsite op het hoofdadres, Sinterklaas onder `/sinterklaas/`, beheer onder `/beheer/`, plus `_headers` en `404.html` uit `cloudflare-pages.mjs`). Commits in deze repository gebruiken het GitHub-noreply-adres, zodat geen privé-e-mailadres openbaar wordt.

| Adres | Doel |
| --- | --- |
| https://wijkvereniging-oosthoek.pages.dev/ | de wijkwebsite; `#/pasen`, `#/garageverkoop`, `#/wijkfeest`, `#/sponsors`, `#/lief-en-leed` en `#/wijkhuis` zijn de eigen pagina's. Oude links `/#/route` en dergelijke gaan door naar `/sinterklaas/#/route`, met zoekdeel |
| https://wijkvereniging-oosthoek.pages.dev/sinterklaas/ | het kale adres op de gedrukte QR-codes: opent de wijkpagina (script in `index.html`) |
| https://wijkvereniging-oosthoek.pages.dev/sinterklaas/#/home | de Sinterklaaswebsite zelf; elk adres onder `/sinterklaas/` met een `#/…` of `?…` blijft op die website, behalve `#/sponsors`: dat gaat naar `/#/sponsors` |
| https://gertjesvg.github.io/wijkvereniging-oosthoek/… | oud adres (eerste QR-codes en flyer): stuurt door naar hetzelfde pad op Cloudflare, met `?…` en `#/…` |

GitHub Pages blijft aan, maar alleen voor die doorverwijzing: `.github/workflows/pages.yml` zet `github-pages/index.html` op het hoofdadres, op `/sinterklaas/` en als `404.html` (elk ander oud pad). De workflow draait alleen als die bestanden wijzigen, dus nooit een tweede kopie van de site. Zet GitHub Pages niet uit zolang er nog oude QR-codes in omloop zijn.

De server ziet het `#`-deel van een adres niet, dus het onderscheid tussen `/sinterklaas/` en `/sinterklaas/#/route` kan alleen in de browser: een serverregel zou ook elke `#/…`-link wegsturen. Daarom staat er geen `_redirects` meer. Het kale `/sinterklaas/` gaat naar `/`, en `/` stuurt nooit terug: geen lus mogelijk. De QR op de contactpagina linkt ook naar het kale adres en komt dus eerst op de wijkpagina uit. Nieuwe bevestigingsmails linken rechtstreeks naar `/sinterklaas/#/home`; het beeld `email-website.png` in de mail toont nog het kale adres, wat alleen voor overtypen uitmaakt (dan is de wijkpagina één klik extra). Lokaal (`npm run dev`, `npm run preview`) blijft Sinterklaas op de hoofdmap. Hashlinks (`#/route`) en relatieve paden (`base: './'`) werken onder dit pad zonder serverregels. Nooit kindergegevens of secrets toevoegen.

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

Routekaart: `src/content/route-kaart.json` is op 3 november 2026 gemaakt uit OpenStreetMap (Overpass, alle wegen met `highway` in het vak 51.314–51.342 N, 4.852–4.890 O). Per straat de wegen met exact die naam, een nummer halverwege de langste weg, en waar twee opeenvolgende straten elkaar niet raken alleen het stuk van de kortste berijdbare verbinding buiten de route (nu enkel Hofeinde, tussen 1 en 2). De netwerkcontrole (doodlopende eindes, eenrichtingsstukken, brug) staat in `Bewijs\route-2026-osm-analyse-2026-11-03.txt` van het project. Vertrek (22 november 2026, `vertrek` in hetzelfde bestand): markering "Vertrek" op het wijkhuispunt `51.32974,4.86997` (zelfde punt als de wijkhuiskaart) en een gestreepte aanloop naar straat 1 zoals Gert ze opgaf: Oosteneinde, de brug over het kanaal (OSM-weg Opstal), dan het pad langs het kanaal Dessel-Schoten aan de kant van de Dijkstraat tot de Gorenstraat. De Dijkstraat zelf loopt maar 170 m en raakt de Gorenstraat niet (OSM én het stratenregister van Digitaal Vlaanderen); het stuk langs het kanaal is in OSM een fiets- en voetpad (fietsknooppunt 49) met een paaltje vlak na de brug. Of de huifkar daar mag en kan passeren, staat niet in de kaartgegevens: ter plaatse na te kijken. Publieke kaart, beheer en afdruk tekenen dit via `addRoute` in `src/gps/routeLagen.ts`. OpenStreetMap wordt pas na een klik geladen (of tijdens de live GPS) en toont eigen attributie.
