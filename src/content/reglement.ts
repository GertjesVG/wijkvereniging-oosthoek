// Officieel wedstrijdreglement, letterlijk zoals de vereniging het aanleverde (Gert, 3 november 2026).
// Vet staat tussen ** … **; de component Reglement zet dat om naar <strong>. Een alinea is een tekst, een opsomming
// een lijst van teksten. De versie die het inschrijfformulier toont en de server bewaart, staat in
// inschrijving/evenementen.ts (rules.version); verhoog die bij elke inhoudelijke wijziging van deze tekst.
export type ReglementArticle = { title: string; body: (string | string[])[] };
export const reglement = {
  title: "Wedstrijdreglement – Sinterklaas Oosthoek 2026",
  organiser: "VZW Wijkvereniging Oosthoek",
  eventDate: "Zaterdag 28 november 2026",
  articles: [
    {
      title: "1. Wie mag deelnemen?",
      body: [
        "De deelname is gratis en uitsluitend bedoeld voor kinderen van **0 tot en met 12 jaar op 28 november 2026**, die behoren tot een gezin waarvan minstens één ouder of wettelijke voogd daadwerkelijk in Wijk Oosthoek woont.",
        "**Uitzondering bij gescheiden ouders of co-ouderschap:** het kind mag deelnemen zodra minstens één ouder of wettelijke voogd in Wijk Oosthoek woont. Het kind hoeft dus niet noodzakelijk zelf op dat adres gedomicilieerd te zijn.",
        "Deze regeling geldt ook wanneer het kind slechts een deel van de tijd bij die ouder verblijft.",
      ],
    },
    {
      title: "2. Inschrijving",
      body: [
        [
          "De inschrijving gebeurt via de officiële website van Wijkvereniging Oosthoek.",
          "Een ouder of wettelijke voogd schrijft het kind in.",
          "Elk kind mag slechts één keer worden ingeschreven.",
          "Meerdere kinderen uit hetzelfde gezin mogen afzonderlijk deelnemen.",
          "De inschrijver bevestigt dat de verstrekte informatie correct is.",
        ],
      ],
    },
    {
      title: "3. Kleurwedstrijd",
      body: [
        "Ieder deelnemend kind mag één eigen Sinterklaastekening indienen.",
        "Bij de flyer is al één kleurplaat inbegrepen. Gezinnen met meerdere kinderen kunnen via de website extra kleurplaten downloaden en afdrukken.",
        "De tekeningen worden door de kinderen zelf ingekleurd, eventueel met passende hulp van een ouder of begeleider.",
      ],
    },
    {
      title: "4. Cadeautjes",
      body: [
        "Om alles eerlijk te laten verlopen, geldt een maximum van **één cadeautje per deelnemend kind**.",
        "Meerdere inschrijvingen voor hetzelfde kind geven geen recht op extra cadeautjes.",
      ],
    },
    {
      title: "5. Controle en eerlijkheid",
      body: [
        "De organisatie mag bij twijfel verduidelijking vragen over de woonplaats of een dubbele inschrijving.",
        "Bewust onjuiste gegevens, fictieve adressen of misbruik van het inschrijfsysteem kunnen leiden tot uitsluiting.",
        "Bij uitzonderlijke gezinssituaties kan de organisatie de inschrijving individueel beoordelen, met respect voor het doel van deze wijkactiviteit.",
      ],
    },
    {
      title: "6. Persoonsgegevens",
      body: [
        "De inschrijvingsgegevens worden uitsluitend gebruikt voor de organisatie van Sinterklaas Oosthoek 2026 en de administratieve afhandeling van de deelname.",
        "De gegevens worden niet voor commerciële doeleinden aan sponsors verstrekt en worden niet langer bewaard dan noodzakelijk, overeenkomstig de privacyverklaring op de website.",
      ],
    },
    {
      title: "7. Akkoord met het reglement",
      body: [
        "Door het reglement te aanvaarden, verklaart de ouder of wettelijke voogd de deelnamevoorwaarden te hebben gelezen en ermee akkoord te gaan.",
        "Zonder deze bevestiging kan de inschrijving niet worden voltooid.",
      ],
    },
  ] satisfies ReglementArticle[],
  signature: "VZW Wijkvereniging Oosthoek – Beerse",
};
