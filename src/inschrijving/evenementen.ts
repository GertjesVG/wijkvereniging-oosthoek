// Evenementen met online inschrijving, gedeeld door website, beheer en server (functions/).
// Nieuw evenement = nieuw blok hieronder, plus een bevestigingsmail met dezelfde sleutel in bevestigingsmail.ts.
// Capaciteit en open/dicht staan in de database en wijzig je in het beheerdashboard;
// het evenement staat na de eerste beheeraanroep automatisch "dicht" in de database.
export type RegistrationEvent = {
  id: string;
  title: string;
  date: string;
  // Voor het volgnummer: SINT26-0001, SINT26-0002, ...
  referencePrefix: string;
  defaultCapacity: number;
  participant: {
    singular: string;
    plural: string;
    nameLabel: string;
    // null = geen leeftijd vragen.
    age: { min: number; max: number } | null;
    maxPerRegistration: number;
  };
  // null = geen adres nodig. Lege straatlijst = vrij straatveld, nakijken in het beheer.
  area: { name: string; streets: string[] } | null;
  // Uiterlijk op deze datum worden namen, e-mail en adressen gewist (privacyverklaring, knop in het beheer).
  deleteBy: string;
  // Beslissingen die de vereniging nog formeel moet goedkeuren. Zolang deze lijst niet leeg is,
  // weigert de server het evenement open te zetten: echte inschrijvingen blijven dan onmogelijk.
  pendingDecisions: string[];
};

export const registrationEvents: Record<string, RegistrationEvent> = {
  "sinterklaas-2026": {
    id: "sinterklaas-2026",
    title: "Sinterklaas in Oosthoek 2026",
    date: "2026-11-28",
    referencePrefix: "SINT26-",
    defaultCapacity: 150,
    participant: {
      singular: "kind",
      plural: "kinderen",
      nameLabel: "Voornaam van het kind",
      // Leeftijdsgrens nog te bevestigen door de vereniging vóór activering.
      age: { min: 0, max: 12 },
      maxPerRegistration: 8,
    },
    // Officiële stratenlijst van Wijk Oosthoek ontbreekt nog; tot dan vrij straatveld.
    area: { name: "Wijk Oosthoek", streets: [] },
    // Voorstel; nog te bevestigen door de vereniging.
    deleteBy: "2027-01-31",
    pendingDecisions: [
      "leeftijdsgrens (voorstel: 0 tot 12 jaar)",
      "officiële stratenlijst van Wijk Oosthoek (nu vrij straatveld)",
      "bewaartermijn (voorstel: wissen uiterlijk 31 januari 2027)",
    ],
  },
};

export const sinterklaasRegistration = registrationEvents["sinterklaas-2026"];
