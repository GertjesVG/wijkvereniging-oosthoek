# Live GPS van de huifkar

De Pixel van Gert stuurt met de gratis app **OwnTracks** elke 30 seconden zijn positie naar de website. Bezoekers zien
die positie op de pagina **Route & live GPS** (`/sinterklaas/#/route`), maar **pas nadat een beheerder in `/beheer/` op
"Start live GPS" drukt**. Bij "Stop live GPS" of op het automatische stopuur verdwijnt de positie meteen.

| Onderdeel | Waar |
| --- | --- |
| Telefoon stuurt posities | `POST /api/gps/positie` (`functions/api/gps/positie.ts`) |
| Bezoekers lezen de positie | `GET /api/gps` (`functions/api/gps/index.ts`) |
| Start, stop en status | `/api/beheer/gps`, achter de beheerlogin (`server/beheer.ts`) |
| Logica | `server/gps.ts` |
| Database | één rij in tabel `gps_live` van de bestaande D1 (`migrations/0006_live_gps.sql`) |
| Kaart | `src/gps/` en `src/Pages.tsx` (Leaflet + OpenStreetMap-tegels met de route; vanzelf geladen zodra er een livepositie is, anders na een klik) |
| Beheerpaneel | `src/beheer/GpsPanel.tsx`, bovenaan het beheer |

## Waarom OwnTracks en niet de browser

Een webpagina krijgt geen posities meer zodra het scherm vergrendeld is of de pagina op de achtergrond staat (zo staat het
in de W3C-norm voor Geolocation; een "scherm-aan-slot" houdt alleen het scherm aan). Een browser is dus niet betrouwbaar
in een jaszak of op het dashboard van de huifkar. OwnTracks draait als vaste achtergronddienst met een melding, werkt met
vergrendeld scherm, bewaart berichten bij een netwerkonderbreking en stuurt ze daarna na. Het is gratis, zonder account,
abonnement of eigen server: de app praat rechtstreeks met de bestaande website.

## Eenmalig instellen op de Pixel

1. Installeer **OwnTracks** uit de Play Store.
2. Geef locatietoegang **altijd** ("all the time"), met nauwkeurige locatie, en sta meldingen toe.
3. Android-instellingen → Apps → OwnTracks → Batterij: **Onbeperkt** (geen batterijoptimalisatie).
4. In OwnTracks → Preferences → **Connection**:
   - Mode: **HTTP**
   - URL: `https://wijkvereniging-oosthoek.pages.dev/api/gps/positie`
   - Username: `huifkar` (vrij te kiezen, telt niet)
   - Password: het apparaatgeheim (zie hieronder). Zelf invullen vanuit de wachtwoordbeheerder; nooit in een chat of mail.
   - Device ID `huifkar`, Tracker ID `SK` (optioneel, alleen voor de herkenning).
5. Zoek in Preferences de instelling **Location interval (Move mode)** en zet die op **30** seconden.
6. Controle: druk in OwnTracks op "Report Location". In het beheer staat dan bij Telefoon **Verbonden** met het tijdstip.
   Dat werkt ook als de live GPS uit staat: dan bewaart de server alleen tijdstip, nauwkeurigheid en batterij, geen positie.

**Apparaatgeheim** `GPS_DEVICE_TOKEN`: een willekeurig wachtwoord van minstens 32 tekens uit de wachtwoordbeheerder. Gert
zet het zelf als Secret in Cloudflare (Workers & Pages → wijkvereniging-oosthoek → Settings → Variables and Secrets →
Add, type Secret, omgeving **Production**) en vult dezelfde waarde in OwnTracks in. Zonder dit geheim weigert de server
elke positie en meldt het beheer dat het ontbreekt. Nieuwe waarde nodig (gsm kwijt)? Nieuw geheim zetten en opnieuw
publiceren; de oude telefoon kan dan niets meer sturen.

## Op 28 november

Twee handelingen: OwnTracks op Move, dan Start in het beheer.

1. **Vóór vertrek (± 10.00 uur):** Pixel volledig opgeladen, powerbank mee. Zet OwnTracks op **Move** (de moduskeuze in
   OwnTracks; waar die knop precies staat, nakijken bij de proefrit). Kijk in het beheer: Telefoon **Verbonden**,
   Laatste GPS-update van daarnet, nauwkeurigheid liefst onder 20 m.
2. **Bij vertrek (10.30 uur):** beheer → **Start live GPS**. De automatische stop staat standaard op 4 uur (1 tot 8 uur
   te kiezen; tijdens de rit aan te passen met "Stopuur opslaan"). De badge wordt **Positie publiek zichtbaar** zodra de
   eerste positie na de start binnen is.
3. **Onderweg:** de gsm mag vergrendeld in de huifkar liggen, liefst met zicht op de lucht. Het beheer ververst elke
   10 seconden.
4. **Na de rit:** beheer → **Stop live GPS**: de positie is meteen weg voor iedereen. Vergeten = automatische stop.
   Zet daarna OwnTracks terug op **Quiet** (of verwijder de app als ze niet meer nodig is).

## Wat bezoekers zien

| Toestand | Routepagina |
| --- | --- |
| Uit (vóór Start, na Stop, na het stopuur) | de stratenlijst, de routekaart na een klik en "De live GPS is nu niet actief." Geen enkele positie. |
| Gestart, nog geen positie | "Live GPS gestart, wachten op de eerste positie" |
| Live | Sint-speld op de kaart, "Live: laatste positie om 11:44 · 20 s geleden"; ververst elke minuut |
| Positie ouder dan 2 minuten | grijze speld, "Niet actueel" en "De verbinding met de huifkar is even weggevallen." |
| Positie ouder dan 10 minuten | geen speld meer, "Verbinding weg sinds 11:44" |
| Pagina zelf kan niet verversen | melding "Deze pagina kan de positie nu niet verversen."; na 10 minuten geen positie meer |

De pagina rekent zelf verder: ook zonder nieuw antwoord van de server wordt een positie grijs, verdwijnt ze na
10 minuten en is alles weg op het stopuur. Een positie met een foutmarge boven 150 m (bv. alleen via de gsm-mast) wordt
niet getoond. De startpagina toont "Livekaart nu actief" of "nog niet actief".

## Beveiliging en privacy

- Alleen een ingelogde beheerder kan starten of stoppen. Het apparaatgeheim staat alleen in Cloudflare en op de Pixel,
  nooit in de websitecode of in git. De telefoon stuurt via HTTPS met Basic-authenticatie (OwnTracks kan geen eigen
  koppen sturen); de server vergelijkt alleen het wachtwoord.
- Geen historiek: één rij met de laatste positie, alleen tijdens een sessie, afgerond op 5 decimalen. Stop en de
  automatische stop wissen de coördinaten. Buiten een sessie bewaart de server van de telefoon alleen tijdstip,
  nauwkeurigheid en batterij.
- Bezoekers krijgen nooit batterij of verbindingsgegevens, alleen positie, nauwkeurigheid en tijdstip.
- De telefoon krijgt altijd `[]` terug, ook voor een bericht dat niet bewaard wordt: zo blijft de wachtrij van OwnTracks
  nooit hangen op één onbruikbaar bericht.

## Cloudflare-belasting (gratis plan)

Workers Free: 100.000 aanvragen per dag voor het **hele account** (ook Pages Functions), nieuwe teller om 1.00 uur
Belgische tijd (00.00 UTC). Daarboven blijven de pagina's werken, maar alle `/api/`-functies niet (ook inschrijven en
beheer) tot de volgende dag. D1 Free: 5 miljoen gelezen en 100.000 geschreven rijen per dag; dit gebruikt er hooguit
enkele tienduizenden gelezen en enkele honderden geschreven rijen.

| Bron | Aanvragen |
| --- | --- |
| Pixel (Move, elke 30 s) | 120 per uur |
| Beheer open en zichtbaar | 360 per uur |
| Routepagina open en zichtbaar, tijdens de rit | 60 per uur per bezoeker |
| Routepagina open, buiten de rit | 30 per uur per bezoeker |
| Startpagina | 1 per bezoek |

Een tabblad op de achtergrond of een vergrendelde gsm vraagt niets. Voorbeeld: 100 bezoekers die de routepagina drie uur
lang open houden ≈ 18.000 aanvragen. Wat andere toepassingen op hetzelfde Cloudflare-account die dag gebruiken, telt mee:
nakijken in het dashboard (Workers & Pages → overzicht). Bezoekers verversen elke minuut (`REFRESH_LIVE_SECONDS` in
`server/gps.ts`, 3 november 2026 van 30 naar 60 s gezet): de huifkar rijdt intussen hooguit ±80 m. Gevolg: op een pagina
die al open staat, verdwijnt de positie na Stop binnen ongeveer een minuut; een pagina die daarna opent, toont meteen niets.

## In gebruik nemen (elke stap pas na GO van Gert)

1. **Geheim:** `GPS_DEVICE_TOKEN` in Cloudflare (Production), door Gert zelf (zie hierboven).
2. **Tabel:** `npx wrangler d1 migrations apply oosthoek-inschrijvingen --remote` (verwacht: alleen 0006). Andere
   tabellen worden niet aangeraakt.
3. **Publiceren:** de tak `feature/live-gps` samenvoegen in `main` en pushen; Cloudflare publiceert automatisch.
   Verkeerde volgorde is onschuldig: zonder tabel toont de site gewoon "niet actief" en meldt het beheer "migratie 0006
   ontbreekt".
4. **Proefrit** (één keer, ruim vóór 28 november): OwnTracks op Move, Start voor 1 uur, op een tweede gsm de routepagina
   openen; de Pixel 10 minuten vergrendeld laten rijden of wandelen; 2 minuten vliegtuigmodus en kijken of de positie
   daarna terugkomt; Stop en controleren dat de kaart weg is. Daarna OwnTracks terug op Quiet.

## Lokaal testen (alleen fictieve posities)

| Wat | Commando |
| --- | --- |
| Rekenregels en beveiliging | `npm test` |
| Volledige keten met lokale database | `npm run test:gps` |
| Kaart en beheer op 390 px (browser) | `npx playwright test tests/browser/live-gps.spec.ts` (eisen staan bovenaan die file) |

Voor `npm run dev:api` komt `GPS_DEVICE_TOKEN` (zelfgekozen testwaarde van minstens 32 tekens) mee in `.dev.vars`.
