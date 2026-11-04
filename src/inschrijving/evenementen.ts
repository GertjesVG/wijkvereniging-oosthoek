// Evenementen met online inschrijving, gedeeld door website, beheer en server (functions/).
// Nieuw evenement = nieuw blok hieronder, plus een bevestigingsmail met dezelfde sleutel in bevestigingsmail.ts.
// Oude evenementen laten staan: de historiek in het beheer toont alleen evenementen uit deze lijst.
// Het maximum aantal deelnemers, open/dicht en de inschrijvingsperiode staan in de database en wijzig je in het
// beheerdashboard; een nieuw evenement staat na de eerste beheeraanroep "dicht" en zonder periode in de database.
// Inschrijven kan pas als de schakelaar open staat én de periode loopt (src/inschrijving/periode.ts).

// Huisnummers van..tot zoals de gemeentelijke lijst ze schrijft; parity = alleen even of oneven nummers.
export type NumberRange = { from: number; to: number; parity?: "even" | "odd" };

export type RegistrationEvent = {
  id: string;
  // Reeks waartoe deze editie hoort, voor de historiek in het beheer (editie = jaar van date).
  series: string;
  title: string;
  date: string;
  // Voor het volgnummer: SINT26-0001, SINT26-0002, ...
  referencePrefix: string;
  // Maximum bij het aanmaken van de databaserij; null = geen maximum. Daarna geldt alleen wat in het beheer staat.
  defaultCapacity: number | null;
  participant: {
    singular: string;
    plural: string;
    nameLabel: string;
    // Leeftijd op de evenementdatum, grenzen inbegrepen; null = geen leeftijd vragen.
    age: { min: number; max: number } | null;
    maxPerRegistration: number;
  };
  // Reglement dat de ouder bij het inschrijven aanvaardt; de server bewaart version en het tijdstip bij elke
  // inschrijving. Nieuwe tekst = nieuwe version: wie het formulier nog met de oude versie open had, moet herladen.
  rules: { version: string; href: string } | null;
  // null = geen adres nodig. Adressen buiten de lijst worden nooit geweigerd, maar gemarkeerd om na te kijken.
  // Het adres is dat van een ouder of voogd die in de wijk woont: bij co-ouderschap mag dat de andere ouder zijn.
  area: {
    name: string;
    // Straten die volledig in de wijk liggen.
    streets: string[];
    // Straten die maar voor een deel in de wijk liggen, met de huisnummers die erbij horen.
    partialStreets: Record<string, NumberRange[]>;
  } | null;
  // Voorgestelde datum waarop namen, e-mail en adressen gewist worden; aantallen en leeftijden blijven.
  // Na deze datum kan het evenement niet meer open.
  deleteBy: string;
  // true = vanaf deleteBy sluit en wist de server automatisch. Pas op true na akkoord van de vereniging;
  // tot dan wist de beheerder met de knop in het beheer.
  autoErase: boolean;
  // Beslissingen die de vereniging nog formeel moet goedkeuren. Zolang deze lijst niet leeg is,
  // weigert de server het evenement open te zetten: echte inschrijvingen blijven dan onmogelijk.
  pendingDecisions: string[];
};

export const registrationEvents: Record<string, RegistrationEvent> = {
  "sinterklaas-2026": {
    id: "sinterklaas-2026",
    series: "Sinterklaas in Oosthoek",
    title: "Sinterklaas in Oosthoek 2026",
    date: "2026-11-28",
    referencePrefix: "SINT26-",
    // Geen vaste grens (Gert, 3 november 2026: de 150 was een schatting). Een maximum kan later in het beheer.
    defaultCapacity: null,
    participant: {
      singular: "kind",
      plural: "kinderen",
      nameLabel: "Voornaam van het kind",
      // Beslissing van de vereniging: 0 tot en met 12 jaar op 28 november 2026.
      age: { min: 0, max: 12 },
      maxPerRegistration: 8,
    },
    // Wedstrijdreglement op de kleurwedstrijdpagina (src/content/reglement.ts). "2026-11-03" = de eerste, lange tekst;
    // "2026-11-03-2" = de verkorte tekst van dezelfde dag. Eerdere inschrijvingen houden hun eigen versie en tijdstip.
    rules: { version: "2026-11-03-2", href: "#/kleurwedstrijd?reglement" },
    // Bron: gemeente Beerse, https://www.beerse.be/wijkraad → "Wijken Beerse 2017 per straat.xlsx" (blad 1,
    // 30 rijen "wijk Oosthoek" = 27 volledige straten + 2 straten met huisnummergrenzen), aangevuld met de wijkkaart
    // "Wijken Beerse 2017.pdf". Kopieën in Documentatie\ van het project, gedownload op 1 november 2026.
    // De andere nummers van die twee straten horen volgens dezelfde lijst bij wijk Heilaar (Steenbakkersdam 1 tot 9)
    // of wijk Krommenhof (Steenovensstraat 1 tot 45 oneven, 2 tot 44 even); Steenovensstraat 47, 49 en hoger dan
    // 57/68 staan bij geen enkele wijk. De Nief Bloemenwijk ligt midden in Oosthoek maar is een aparte wijk.
    area: {
      name: "Wijk Oosthoek",
      streets: [
        "Asterstraat",
        "Beukenlaan",
        "Boterbloemstraat",
        "Daliastraat",
        "Dijkstraat",
        "Dr. Paul Janssenstraat",
        "Edward Woutersstraat",
        "Frans Lauwersstraat",
        "Gammerstraat",
        "Gorenstraat",
        "Huffelenstraat",
        "Jan Vaertenstraat",
        "Kattespoelstraat",
        "Korenbloemstraat",
        "Krikskensstraat",
        "Leemstraat",
        "Leliestraat",
        "Oosteneinde",
        "Opstal",
        "Paddesteenstraat",
        "Rozenstraat",
        "Scheperstraat",
        "Tulpenstraat",
        "Veerpontstraat",
        "Veldstraat",
        "Violierstraat",
        "Zandstraat",
      ],
      partialStreets: {
        "Steenbakkersdam": [{ from: 10, to: 48 }],
        "Steenovensstraat": [
          { from: 51, to: 57, parity: "odd" },
          { from: 46, to: 68, parity: "even" },
        ],
      },
    },
    // Goedgekeurd door de vereniging (Gert, 3 november 2026): uiterste wisdatum voor namen, adressen en e-mail.
    // Vanaf die dag sluit en wist de server automatisch; aantallen, leeftijden en afhaalcijfers blijven (server/wissen.ts).
    deleteBy: "2027-01-31",
    autoErase: true,
    pendingDecisions: [],
  },
};

export const sinterklaasRegistration = registrationEvents["sinterklaas-2026"];
