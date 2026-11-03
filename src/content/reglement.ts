// Officieel wedstrijdreglement, letterlijk zoals de vereniging het aanleverde (verkorte versie, Gert, 3 november 2026).
// Vet staat tussen ** … **; de component Reglement zet dat om naar <strong>. Een alinea is een tekst, een opsomming
// een lijst van teksten. De versie die het inschrijfformulier toont en de server bewaart, staat in
// inschrijving/evenementen.ts (rules.version); verhoog die bij elke inhoudelijke wijziging van deze tekst.
export type ReglementArticle = { title: string; body: (string | string[])[] };
export const reglement = {
  title: "Wedstrijdreglement – Sinterklaas Oosthoek 2026",
  organiser: "VZW Wijkvereniging Oosthoek",
  eventDate: "zaterdag 28 november 2026",
  articles: [
    {
      title: "1. Deelname",
      body: [
        "Deelname is gratis voor kinderen van 0 tot en met 12 jaar op 28 november 2026, van wie minstens één ouder of wettelijke voogd in Wijk Oosthoek woont.",
        "Dit geldt ook bij gescheiden ouders of co-ouderschap. Het kind hoeft niet op dat adres gedomicilieerd te zijn.",
      ],
    },
    {
      title: "2. Inschrijving",
      body: [
        "Een ouder of wettelijke voogd schrijft het kind via onze website in en bevestigt dat de gegevens correct zijn.",
        "Elk kind mag slechts één keer deelnemen. Meerdere kinderen uit hetzelfde gezin zijn welkom.",
      ],
    },
    {
      title: "3. Kleurwedstrijd en cadeautjes",
      body: [
        "Ieder kind mag één eigen Sinterklaastekening indienen, eventueel ingekleurd met hulp van een ouder of begeleider.",
        "Bij de flyer zit één kleurplaat. Extra kleurplaten kunnen via de website worden gedownload.",
        "Er geldt maximaal één cadeautje per deelnemend kind, afhankelijk van de beschikbare voorraad.",
      ],
    },
    {
      title: "4. Controle en eerlijkheid",
      body: [
        "De vereniging mag bij twijfel een adres of dubbele inschrijving controleren. Bewust onjuiste gegevens of misbruik kunnen leiden tot uitsluiting.",
        "Bij bijzondere gezinssituaties beoordelen we de deelname individueel.",
      ],
    },
    {
      title: "5. Privacy en akkoord",
      body: [
        "Persoonsgegevens worden uitsluitend gebruikt voor de organisatie en afhandeling van de cadeauactie en niet voor commerciële doeleinden gedeeld.",
        "Meer informatie staat in onze privacyverklaring.",
        "Door het wedstrijdreglement aan te vinken, verklaart de ouder of voogd akkoord te gaan. Zonder akkoord is inschrijven niet mogelijk.",
      ],
    },
  ] satisfies ReglementArticle[],
  signature: "VZW Wijkvereniging Oosthoek – Beerse",
};
