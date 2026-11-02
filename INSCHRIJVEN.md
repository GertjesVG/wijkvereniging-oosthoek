# Inschrijvingen en bevestigingsmails

Eén gratis inschrijfsysteem voor alle evenementen van VZW Wijkvereniging Oosthoek. Sinterklaas 2026 is het eerste evenement.

| Onderdeel | Waar | Gratis plan |
| --- | --- | --- |
| Formulier op de website | `src/inschrijving/` (Cadeauactie-pagina) | Cloudflare Pages |
| Server | `functions/api/` + `server/` (Pages Functions) | 100.000 verzoeken per dag |
| Database | Cloudflare D1 `oosthoek-inschrijvingen`, schema in `migrations/` | 500 MB per database, ruim genoeg |
| Spamcontrole | Cloudflare Turnstile, op de server gecontroleerd | onbeperkt |
| Beheer | `/beheer/` (`beheer/`, `src/beheer/`) | — |
| Bevestigingsmail | Apps Script "Oosthoek — Automatische bevestigingsmails" van vzwoosthoek@gmail.com, code in `mail/apps-script.js` | ongeveer 100 ontvangers per dag |

## Hoe het werkt

- Een ouder schrijft een of meer kinderen in (per kind voornaam en leeftijd, plus naam, e-mail, straat en huisnummer van de ouder). Elke inschrijving krijgt een nummer zoals `SINT26-0001`.
- De database bewaakt de regels zelf, ook als veel mensen tegelijk inschrijven: open of dicht, nooit meer kinderen dan de capaciteit (standaard 150), en elk kind (voornaam + adres) maar één keer. Een tweede klik op "verzenden" geeft dezelfde inschrijving terug, geen tweede.
- "Mogelijk dubbel" (zelfde e-mail of adres, of zelfde voornaam en leeftijd elders) wordt niet geweigerd, maar gemarkeerd in het beheer.
- **Leeftijd**: 0 tot en met 12 jaar, gemeten op de evenementdag (28 november 2026). Het formulier vraagt de leeftijd, geen geboortedatum.
- **Wijkcontrole**: het straatveld stelt de officiële straten voor. Een officiële straat (binnen de huisnummergrens) is in orde en krijgt de officiële schrijfwijze. Elk ander adres wordt aanvaard maar gemarkeerd als "Adres nakijken"; de beheerder keurt goed, verbetert of annuleert. Nooit een automatische weigering. Zo'n inschrijving houdt haar plaats vast, maar krijgt nog geen bevestigingsmail: die vertrekt pas bij de eerstvolgende ophaalronde na "Adres goedgekeurd" of na een verbetering naar een adres in de wijk. Het formulier meldt dat aan de ouder.
- **Stratenbron**: gemeente Beerse, https://www.beerse.be/wijkraad → "Wijken Beerse 2017 per straat.xlsx" + wijkkaart "Wijken Beerse 2017.pdf" (kopieën in `Documentatie\` van het project, 1 november 2026). 30 rijen "wijk Oosthoek" = 27 volledige straten + Steenbakkersdam 10 tot 48 en Steenovensstraat 51 tot 57 (oneven) en 46 tot 68 (even). Het laatste nummer van zo'n reeks (48, 57, 68) gaat naar "nakijken": de lijst zegt "tot", niet "tot en met". De lijst dateert van 2017; straten die wel in het huidige Vlaamse straatnamenregister staan maar niet in die lijst (Gerststraat, Kongostraat, Kruisstraat, Marie De Breynestraat, Tarwestraat, Vissersstraat) komen in "nakijken" terecht.
- **Historiek**: het beheer toont per evenement en editie het aantal inschrijvingen, kinderen, afgehaald, geannuleerd, de bezetting en de leeftijdsverdeling. Die cijfers blijven na het wissen van de persoonsgegevens. Laat oude evenementen daarom in `src/inschrijving/evenementen.ts` staan.
- De bevestigingsmail komt eerst in een wachtrij. Het Apps Script haalt elke 5 minuten de wachtende mails op, verstuurt ze vanaf vzwoosthoek@gmail.com en meldt het resultaat terug. Mislukt een mail, dan volgt automatisch een nieuwe poging (na 1, 5, 15 minuten … tot een dag; na 9 pogingen "mislukt"). Het script onthoudt elke verstuurde mail, dus nooit twee keer dezelfde. Het script heeft geen webadres en kan dus niet als open mailrelais misbruikt worden.
- De mail gebruikt het goedgekeurde feestelijke ontwerp (`src/inschrijving/bevestigingsmail.ts`, beelden in `public/email/`). Alleen inschrijvingsnummer en voornamen worden ingevuld, als echte tekst. In het beheer staat een voorbeeld.
- Beheer: inschrijvingen zoeken en filteren, vrije plaatsen, mailstatus, corrigeren, annuleren, kind toevoegen, cadeau afgehaald, opnieuw mailen, CSV voor Excel, inschrijving open/dicht, capaciteit, een knop naar de antwoorden van ouders in Gmail, en na het evenement alle persoonsgegevens wissen.
- **Antwoorden van ouders**: de mail heeft geen aparte Reply-To, dus een antwoord komt binnen op vzwoosthoek@gmail.com. Een Gmail-filter (`subject:("Sinterklaas Oosthoek 2026")`, label toepassen, ingesteld op 2 november 2026) zet die antwoorden onder het bestaande label **2026 - Sinterklaas**; ze blijven ook in de inbox. De database blijft de officiële inschrijvingslijst; Gmail is alleen voor correspondentie. Geen CC of BCC naar de vereniging.

## Beveiliging in het kort

- Alles wat persoonsgegevens toont of wijzigt, zit achter `/api/beheer/` en vraagt het verenigingswachtwoord (Cloudflare-geheim `ADMIN_PASSWORD`, minstens 16 tekens; laat het door een wachtwoordbeheerder maken). Na inloggen een ondertekende cookie van 8 uur (HttpOnly, Secure, SameSite=Strict). Hooguit 10 aanmeldpogingen per internetaansluiting per kwartier, ook als ze tegelijk binnenkomen.
- Hooguit 5 nieuwe inschrijvingen per internetaansluiting per dag (bij IPv6 telt het hele /64-blok als één aansluiting). Voornamen mogen alleen letters, spatie, `-` en `'` bevatten, zodat er geen links of code in de bevestigingsmail kunnen komen.
- Wie hetzelfde formulier opnieuw verstuurt, krijgt dezelfde inschrijving terug; komt er met hetzelfde formulier-ID andere inhoud binnen, dan geeft de server niets terug.
- De mailwachtrij (`/api/mail/…`) vraagt het geheim `MAIL_API_TOKEN` (minstens 32 tekens), dat ook als scripteigenschap in het Apps Script staat.
- De openbare kant geeft alleen open/dicht en het aantal vrije plaatsen. De database is niet rechtstreeks bereikbaar.
- Geen geheimen in deze repository. Ze staan alleen in Cloudflare en in de scripteigenschappen van het Apps Script.
- Zolang `pendingDecisions` in `src/inschrijving/evenementen.ts` niet leeg is, weigert de server het evenement open te zetten. Vanaf de wisdatum (`deleteBy`) kan een evenement niet meer open.

## Bewaartermijn

- Namen, e-mailadressen en adressen: wissen uiterlijk op `deleteBy` (Sinterklaas 2026: **31 januari 2027, voorstel, nog niet goedgekeurd door de vereniging**). Aantallen, leeftijden en afhaalcijfers blijven voor de historiek.
- Tot het akkoord staat `autoErase: false`: wissen gebeurt met de knop "Persoonsgegevens wissen" in het beheer, en het beheer waarschuwt zodra de wisdatum bereikt is.
- Na akkoord: `autoErase: true` zetten (en eventueel `deleteBy` aanpassen). Dan sluit en wist de server het evenement vanzelf vanaf de wisdatum, bij de eerstvolgende ophaalronde van het Apps Script (elke 5 minuten) of bij het openen van het beheer.

## Lokaal ontwikkelen en testen

| Wat | Commando |
| --- | --- |
| Snelle controles (ook mail en Apps Script) | `npm test` |
| Volledige keten met lokale database, fictieve gegevens | `npm run test:inschrijving` |
| Alles bouwen zoals Cloudflare | `npm run build:cloudflare` |
| Lokale server met functies en beheer (na de build) | `npm run dev:api`, beheer op `http://127.0.0.1:8788/beheer/` |

Voor `dev:api` maak je zelf een bestand `.dev.vars` in deze map met `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `ADMIN_PASSWORD` en `MAIL_API_TOKEN` (gebruik de testsleutels uit de Turnstile-documentatie en zelfgekozen testwaarden). Dat bestand staat in `.gitignore` en hoort nooit in git. De lokale database maak je met `npx wrangler d1 migrations apply oosthoek-inschrijvingen --local`.

Lokaal altijd de Turnstile-testsleutels: de echte sitekey geeft op `127.0.0.1` fout 110200 ("Domain not authorized"), want lokaal staat niet bij de toegestane hostnames. Toont het formulier "De beveiligingscontrole kon niet laden", dan haalt die browser `challenges.cloudflare.com` niet op: een blokkade op die pc of dat netwerk, geen fout in de site (zie het projectdossier voor de pc van Gert).

## Inschrijvingen activeren (pas na GO van Gert)

Al gedaan: het Cloudflare Pages-project `wijkvereniging-oosthoek` (Git-koppeling, productie = `main`), leeftijdsgrens en stratenlijst, de D1-database `oosthoek-inschrijvingen` (EU-jurisdictie; id en binding `DB` staan in `wrangler.toml`, dus géén binding in het dashboard toevoegen) en de Turnstile-widget (openbare sitekey in `wrangler.toml`). Nog te doen, in deze volgorde:

1. (gedaan) D1-database.
2. **Tabellen** (productiedatabase, pas na GO; eenmalig, in je eigen PowerShell in `Broncode\website` op `feature/inschrijvingen`): `npx wrangler login` (browser opent, goedkeuren), dan ter controle `npx wrangler d1 migrations list oosthoek-inschrijvingen --remote` (verwacht: 0001, 0002 en 0003 nog niet toegepast), dan `npx wrangler d1 migrations apply oosthoek-inschrijvingen --remote` en bevestigen. Verwacht: 0001, 0002 en 0003 met een vinkje.
3. (gedaan) Turnstile-widget. Controleer alleen nog dat bij de widget de hostname `wijkvereniging-oosthoek.pages.dev` staat. De **Secret Key** nooit in een chat.
4. **Geheimen** (Workers & Pages → wijkvereniging-oosthoek → Settings → Variables and Secrets → Add, type "Secret", omgeving Production), elk door Gert zelf: `TURNSTILE_SECRET` (de Secret Key uit stap 3), `ADMIN_PASSWORD` (minstens 16 tekens, uit een wachtwoordbeheerder), `MAIL_API_TOKEN` (minstens 32 tekens, uit een wachtwoordbeheerder; dezelfde waarde komt in het Apps Script).
5. **Previews uit** (Settings → Builds & deployments → Branch control → Preview branch: "None"), vóór de tak `feature/inschrijvingen` ooit gepusht wordt. Previews krijgen bewust geen database (`[env.preview]` in `wrangler.toml`) en geen geheimen: zet de geheimen uit stap 4 nooit in de omgeving Preview. Bestaat er toch een preview, dan moet `POST /api/beheer/login` daar 503 geven.
6. **Beheertoegang**: `/beheer/` met het wachtwoord uit stap 4. Geen Cloudflare Access op `pages.dev` (dat zou de hele site afschermen); kan later met een eigen domein.
7. **Publiceren** (aparte GO): `feature/inschrijvingen` samenvoegen in `main` en pushen; Cloudflare publiceert automatisch, met de geheimen uit stap 4.
8. **Apps Script** in het bestaande project (zie hieronder), pas na stap 7.
9. **Productieproef** met fictieve gegevens, op een gsm met mobiele data (met NordVPN verbonden laadt Turnstile niet op de pc van Gert):
   1. In `/beheer/` inloggen, inschrijving open.
   2. Inschrijving A: fictief kind, het goedgekeurde testadres als e-mail, een adres in de wijk (bv. Opstal 5). De echte Turnstile-controle moet slagen.
   3. Inschrijving B: fictief kind, zelfde testadres, een adres buiten de lijst (bv. Gerststraat 3) → "Adres nakijken".
   4. Beheer: A en B staan erin, B met de badge "Adres nakijken"; mailteller 2 wachtend (A en B).
   5. Binnen 5 minuten: precies één mail voor A op het testadres, met het juiste nummer en de juiste voornaam; beheer toont A "verstuurd", B nog wachtend en géén mail voor B.
   6. Vanaf het testadres op de mail van A antwoorden: het antwoord staat in Gmail van vzwoosthoek@gmail.com onder het label 2026 - Sinterklaas (knop "Antwoorden van ouders (Gmail)" in het beheer).
   7. A en B annuleren, inschrijving weer dicht. B krijgt dan nooit een mail; bij de volgende ophaalronde staat de mail van B op "mislukt" (geannuleerd), dat is juist.
   Pas dan (aparte GO) de echte inschrijving aankondigen.

**Na het evenement, uiterlijk op de wisdatum:** inschrijving dicht, in het beheer "persoonsgegevens wissen" (of automatisch, zie Bewaartermijn), en in Gmail van vzwoosthoek@gmail.com de verstuurde bevestigingen verwijderen (map Verzonden, zoeken op `subject:"Bevestiging inschrijving — Sinterklaas Oosthoek 2026"`, daarna de prullenbak legen). Die kopieën bevatten voornamen en e-mailadressen; de antwoorden onder het label 2026 - Sinterklaas ook.

### Apps Script bijwerken (bestaand project, geen nieuw)

In het project "Oosthoek — Automatische bevestigingsmails" van vzwoosthoek@gmail.com:

1. Inhoud van `Code.gs` vervangen door `mail/apps-script.js` uit deze repository. Opslaan.
2. Projectinstellingen → Scripteigenschappen: `BACKEND_BASE_URL` = `https://wijkvereniging-oosthoek.pages.dev`. `MAIL_API_TOKEN` vult Gert zelf in, met dezelfde waarde als het Cloudflare-geheim.
3. Bovenaan de functie `installeerTrigger` kiezen en uitvoeren; de gevraagde toestemming (mail versturen, externe verbinding, triggers) goedkeuren. Die functie verwijdert eerst alle oude triggers van dit project.
4. Triggers (klokje links): er staat precies één trigger, `verwerkWachtrij`, elke 5 minuten.
5. Implementeren → Implementaties beheren: staat er nog een webapp van een eerdere versie, archiveer die. Het script heeft geen webapp meer nodig.
6. Niet zelf testmails versturen vanuit de editor; de eindtest loopt via een fictieve inschrijving (stap 9 hierboven).

## Een volgend evenement

Een blok toevoegen in `src/inschrijving/evenementen.ts` (reeks, titel, datum, nummerprefix, capaciteit, wat er per deelnemer gevraagd wordt, wijk, wisdatum, `autoErase`) en een bevestigingsmail met dezelfde sleutel in `src/inschrijving/bevestigingsmail.ts`. Voor de antwoorden in Gmail: in Gmail een label volgens de bestaande gewoonte (bv. `2027 - Garageverkoop`, bestaat al) en een filter op woorden uit het nieuwe onderwerp, en die twee in het veld `gmail` van het sjabloon zetten; `npm test` controleert dat de filterwoorden in het onderwerp staan. Deelnemers, aantallen en mails blijven per evenement gescheiden. Het formulier op een nieuwe evenementpagina gebruikt dezelfde componenten.
