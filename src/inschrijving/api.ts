// Afspraken tussen website/beheer en de server onder functions/. Alleen types, geen code.
import type { RegistrationPeriod, RegistrationStatus } from "./periode";

export type PublicEventStatus = {
  id: string;
  // "upcoming" = de periode is nog niet begonnen. "full" alleen als er in het beheer een maximum is ingesteld en dat bereikt is.
  status: RegistrationStatus;
  // Vrije plaatsen onder het ingestelde maximum; null = geen maximum (het formulier toont dan geen aantal).
  available: number | null;
  // Ingestelde periode; null = geen periode (dan blijft de inschrijving dicht) of nog niet ingesteld op de server.
  period: RegistrationPeriod | null;
  // null = Turnstile nog niet ingesteld; dan blijft het formulier dicht.
  turnstileSiteKey: string | null;
};

export type RegistrationRequest = {
  eventId: string;
  // Willekeurige UUID per formulier: dezelfde inzending twee keer verzenden geeft dezelfde inschrijving.
  submissionId: string;
  parent: { name: string; email: string };
  // coParent = dit is het adres van de andere ouder of voogd (co-ouderschap, gescheiden ouders); de inschrijver woont elders.
  address: { street: string; houseNumber: string; coParent: boolean } | null;
  participants: { name: string; age: number | null }[];
  // rules = verklaring ouder/voogd, juiste gegevens en wedstrijdreglement aanvaard.
  confirmations: { rules: boolean; privacy: boolean };
  // Versie van het reglement dat het formulier toonde (evenementen.ts).
  rulesVersion: string | null;
  turnstileToken: string;
  // Verborgen lokveld voor bots; moet leeg blijven.
  website?: string;
};

export type RegistrationResponse = {
  reference: string;
  parentName: string;
  email: string;
  address: { street: string; houseNumber: string; coParent: boolean } | null;
  // Adres staat niet zeker in de wijk: de inschrijving is ontvangen, de vereniging kijkt het adres na.
  addressReview: boolean;
  participants: { name: string; age: number | null }[];
};

export type ApiErrorCode =
  | "VALIDATIE"
  | "DUBBEL"
  | "AL_ONTVANGEN"
  | "VOLZET"
  | "GESLOTEN"
  | "TURNSTILE"
  | "NIET_GECONFIGUREERD"
  | "NIET_INGELOGD"
  | "TE_VEEL_POGINGEN"
  | "VERBODEN"
  | "NIET_GEVONDEN"
  | "ONBEKEND";

export type ApiError = {
  error: ApiErrorCode;
  message: string;
  // Veldnaam → foutmelding, bv. "parent.email" of "participants.1.name".
  fields?: Record<string, string>;
  available?: number;
};

export type MailStatus = "pending" | "sending" | "sent" | "failed";

export type AdminEventSummary = {
  id: string;
  title: string;
  date: string;
  // De schakelaar in het beheer; wat bezoekers nu zien staat in publicStatus (schakelaar, periode, maximum en wisdatum samen).
  status: "open" | "closed";
  period: RegistrationPeriod | null;
  publicStatus: RegistrationStatus;
  // Ingesteld maximum aantal kinderen; null = geen maximum. available is dan ook null.
  capacity: number | null;
  // Werkelijk aantal actief ingeschreven kinderen.
  active: number;
  available: number | null;
  registrations: number;
  pickedUp: number;
  mail: Record<MailStatus, number>;
  personalDataErased: boolean;
  // Nog goed te keuren beslissingen; zolang er één is, kan de inschrijving niet open.
  pendingDecisions: string[];
  // Historiek: reeks en editie (jaar), geannuleerde kinderen, actieve kinderen per leeftijd, en adressen om na te kijken.
  series: string;
  edition: number;
  cancelled: number;
  ages: { age: number; count: number }[];
  addressReview: number;
  // Bewaartermijn van de persoonsgegevens (zie evenementen.ts).
  deleteBy: string;
  autoErase: boolean;
  deleteByPassed: boolean;
};

export type AdminParticipant = {
  id: number;
  name: string;
  age: number | null;
  status: "active" | "cancelled";
  pickedUpAt: string | null;
};

export type AdminRegistration = {
  id: number;
  reference: string;
  status: "active" | "cancelled";
  parentName: string;
  email: string;
  street: string | null;
  houseNumber: string | null;
  // Het adres in de wijk is dat van de andere ouder of voogd (co-ouderschap).
  coParent: boolean;
  // Aanvaarde versie van het reglement en tijdstip (servertijd); null bij inschrijvingen van vóór het reglement.
  rulesAccepted: { version: string; at: string } | null;
  note: string | null;
  suspectedDuplicate: boolean;
  // Adres nakijken: gemarkeerd bij de inschrijving of na een correctie; reason = waarom (null als de reden niet meer geldt).
  addressReview: { reason: string | null } | null;
  createdAt: string;
  mail: {
    status: MailStatus;
    attempts: number;
    lastError: string | null;
    sentAt: string | null;
  } | null;
  participants: AdminParticipant[];
};
