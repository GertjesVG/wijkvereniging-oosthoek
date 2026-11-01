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
- De bevestigingsmail komt eerst in een wachtrij. Het Apps Script haalt elke 5 minuten de wachtende mails op, verstuurt ze vanaf vzwoosthoek@gmail.com en meldt het resultaat terug. Mislukt een mail, dan volgt automatisch een nieuwe poging (na 1, 5, 15 minuten … tot een dag; na 9 pogingen "mislukt"). Het script onthoudt elke verstuurde mail, dus nooit twee keer dezelfde. Het script heeft geen webadres en kan dus niet als open mailrelais misbruikt worden.
- De mail gebruikt het goedgekeurde feestelijke ontwerp (`src/inschrijving/bevestigingsmail.ts`, beelden in `public/email/`). Alleen inschrijvingsnummer en voornamen worden ingevuld, als echte tekst. In het beheer staat een voorbeeld.
- Beheer: inschrijvingen zoeken en filteren, vrije plaatsen, mailstatus, corrigeren, annuleren, kind toevoegen, cadeau afgehaald, opnieuw mailen, CSV voor Excel, inschrijving open/dicht, capaciteit, en na het evenement alle persoonsgegevens wissen.

## Beveiliging in het kort

- Alles wat persoonsgegevens toont of wijzigt, zit achter `/api/beheer/` en vraagt het verenigingswachtwoord (Cloudflare-geheim `ADMIN_PASSWORD`, minstens 16 tekens; laat het door een wachtwoordbeheerder maken). Na inloggen een ondertekende cookie van 8 uur (HttpOnly, Secure, SameSite=Strict). Hooguit 10 aanmeldpogingen per internetaansluiting per kwartier, ook als ze tegelijk binnenkomen.
- Hooguit 5 nieuwe inschrijvingen per internetaansluiting per dag (bij IPv6 telt het hele /64-blok als één aansluiting). Voornamen mogen alleen letters, spatie, `-` en `'` bevatten, zodat er geen links of code in de bevestigingsmail kunnen komen.
- Wie hetzelfde formulier opnieuw verstuurt, krijgt dezelfde inschrijving terug; komt er met hetzelfde formulier-ID andere inhoud binnen, dan geeft de server niets terug.
- De mailwachtrij (`/api/mail/…`) vraagt het geheim `MAIL_API_TOKEN` (minstens 32 tekens), dat ook als scripteigenschap in het Apps Script staat.
- De openbare kant geeft alleen open/dicht en het aantal vrije plaatsen. De database is niet rechtstreeks bereikbaar.
- Geen geheimen in deze repository. Ze staan alleen in Cloudflare en in de scripteigenschappen van het Apps Script.
- Zolang `pendingDecisions` in `src/inschrijving/evenementen.ts` niet leeg is, weigert de server het evenement open te zetten.

## Lokaal ontwikkelen en testen

| Wat | Commando |
| --- | --- |
| Snelle controles (ook mail en Apps Script) | `npm test` |
| Volledige keten met lokale database, fictieve gegevens | `npm run test:inschrijving` |
| Alles bouwen zoals Cloudflare | `npm run build:cloudflare` |
| Lokale server met functies (na de build) | `npm run dev:api` (poort 8788) |
| Beheer met automatisch verversen | `npm run dev:beheer` (poort 5174, gebruikt `dev:api`) |

Voor `dev:api` maak je zelf een bestand `.dev.vars` in deze map met `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `ADMIN_PASSWORD` en `MAIL_API_TOKEN` (gebruik de testsleutels uit de Turnstile-documentatie en zelfgekozen testwaarden). Dat bestand staat in `.gitignore` en hoort nooit in git. De lokale database maak je met `npx wrangler d1 migrations apply oosthoek-inschrijvingen --local`.

## Inschrijvingen activeren (pas na GO van Gert)

1. **Beslissingen van de vereniging** invullen in `src/inschrijving/evenementen.ts`: leeftijdsgrens, officiële stratenlijst (`area.streets`), wisdatum (`deleteBy`). Daarna `pendingDecisions: []`. De privacyverklaring neemt wisdatum en wijk automatisch over.
2. **Database**: `npx wrangler d1 create oosthoek-inschrijvingen` (indien beschikbaar met `--jurisdiction eu`), het `database_id` in `wrangler.toml` zetten en `npx wrangler d1 migrations apply oosthoek-inschrijvingen --remote`.
3. **Turnstile**: in Cloudflare een widget aanmaken voor `wijkvereniging-oosthoek.pages.dev` (Managed). De sitesleutel in `wrangler.toml` bij `TURNSTILE_SITE_KEY`; de geheime sleutel als geheim `TURNSTILE_SECRET`.
4. **Geheimen** (Gert zelf, in Cloudflare → Workers & Pages → wijkvereniging-oosthoek → Settings → Variables and Secrets, omgeving Production, type Secret): `TURNSTILE_SECRET`, `ADMIN_PASSWORD`, `MAIL_API_TOKEN`. Nooit in een chat of in deze repository.
5. **Previews**: Settings → Builds → Preview deployments op "None" (anders maakt elke andere tak een tweede publicatie; die heeft wel geen database).
6. **Publiceren**: `feature/inschrijvingen` samenvoegen in `main` en pushen; Cloudflare publiceert automatisch.
7. **Apps Script** in het bestaande project (zie hieronder).
8. **Eindtest** met fictieve gegevens: in `/beheer/` inloggen, inschrijving open, één inschrijving met het testadres, binnen 5 minuten de mail controleren in Gmail, daarna de testinschrijving annuleren. Pas dan de echte inschrijving aankondigen.

**Na het evenement, uiterlijk op de wisdatum:** inschrijving dicht, in het beheer "persoonsgegevens wissen", en in Gmail van vzwoosthoek@gmail.com de verstuurde bevestigingen verwijderen (map Verzonden, zoeken op `subject:"Bevestiging inschrijving — Sinterklaas Oosthoek 2026"`, daarna de prullenbak legen). Die kopieën bevatten voornamen en e-mailadressen.

### Apps Script bijwerken (bestaand project, geen nieuw)

In het project "Oosthoek — Automatische bevestigingsmails" van vzwoosthoek@gmail.com:

1. Inhoud van `Code.gs` vervangen door `mail/apps-script.js` uit deze repository. Opslaan.
2. Projectinstellingen → Scripteigenschappen: `BACKEND_BASE_URL` = `https://wijkvereniging-oosthoek.pages.dev`. `MAIL_API_TOKEN` vult Gert zelf in, met dezelfde waarde als het Cloudflare-geheim.
3. Bovenaan de functie `installeerTrigger` kiezen en uitvoeren; de gevraagde toestemming (mail versturen, externe verbinding, triggers) goedkeuren. Die functie verwijdert eerst alle oude triggers van dit project.
4. Triggers (klokje links): er staat precies één trigger, `verwerkWachtrij`, elke 5 minuten.
5. Implementeren → Implementaties beheren: staat er nog een webapp van een eerdere versie, archiveer die. Het script heeft geen webapp meer nodig.
6. Niet zelf testmails versturen vanuit de editor; de eindtest loopt via een fictieve inschrijving (stap 8 hierboven).

## Een volgend evenement

Een blok toevoegen in `src/inschrijving/evenementen.ts` (titel, datum, nummerprefix, capaciteit, wat er per deelnemer gevraagd wordt, wijk, wisdatum) en een bevestigingsmail met dezelfde sleutel in `src/inschrijving/bevestigingsmail.ts`. Deelnemers, aantallen en mails blijven per evenement gescheiden. Het formulier op een nieuwe evenementpagina gebruikt dezelfde componenten.
