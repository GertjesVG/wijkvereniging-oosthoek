// Afspraken tussen website/beheer en de server onder functions/. Alleen types, geen code.

export type PublicEventStatus = {
  id: string;
  status: "open" | "closed" | "full";
  available: number;
  // null = Turnstile nog niet ingesteld; dan blijft het formulier dicht.
  turnstileSiteKey: string | null;
};

export type RegistrationRequest = {
  eventId: string;
  // Willekeurige UUID per formulier: dezelfde inzending twee keer verzenden geeft dezelfde inschrijving.
  submissionId: string;
  parent: { name: string; email: string };
  address: { street: string; houseNumber: string } | null;
  participants: { name: string; age: number | null }[];
  confirmations: { area: boolean; privacy: boolean };
  turnstileToken: string;
  // Verborgen lokveld voor bots; moet leeg blijven.
  website?: string;
};

export type RegistrationResponse = {
  reference: string;
  parentName: string;
  email: string;
  address: { street: string; houseNumber: string } | null;
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
  status: "open" | "closed";
  capacity: number;
  active: number;
  available: number;
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
