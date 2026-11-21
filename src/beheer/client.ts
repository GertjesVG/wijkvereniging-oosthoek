import type {
  AdminEventSummary,
  AdminMap,
  AdminRegistration,
  ApiError,
  ApiErrorCode,
} from "../inschrijving/api";
import type { AdminGps } from "../gps/api";
import type { AdminText } from "../content/teksten";
import type { AdminStats } from "../bezoek/paginas";

export class AdminError extends Error {
  status: number;
  code: ApiErrorCode;
  fields?: Record<string, string>;
  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Het dashboard zet hier zijn "terug naar login"-actie neer; bij elke 401 buiten het loginscherm wordt ze aangeroepen.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: { login?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers:
        method === "GET"
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new AdminError(
      0,
      "ONBEKEND",
      "Geen verbinding met de server. Probeer het opnieuw.",
    );
  }
  if (response.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (response.ok) {
    if (data === null)
      throw new AdminError(response.status, "ONBEKEND", "Onverwacht antwoord van de server.");
    return data as T;
  }
  if (response.status === 401 && !options.login) onUnauthorized?.();
  const apiError =
    data && typeof data === "object" && "error" in data ? (data as ApiError) : null;
  throw new AdminError(
    response.status,
    apiError?.error ?? (response.status === 401 ? "NIET_INGELOGD" : "ONBEKEND"),
    apiError?.message ?? `De server gaf een fout (${response.status}).`,
    apiError?.fields,
  );
}

const enc = encodeURIComponent;

export const api = {
  login: (password: string) =>
    request<void>("POST", "/api/beheer/login", { password }, { login: true }),
  logout: () => request<void>("POST", "/api/beheer/logout"),
  events: () => request<AdminEventSummary[]>("GET", "/api/beheer/evenementen"),
  patchEvent: (
    id: string,
    // capacity: null = geen maximum. period: Belgische tijd, zoals een datetime-local-veld ("2026-11-10T00:00").
    patch: {
      status?: "open" | "closed";
      capacity?: number | null;
      period?: { opensAt: string; closesAt: string };
    },
  ) => request<AdminEventSummary>("PATCH", `/api/beheer/evenementen/${enc(id)}`, patch),
  registrations: (id: string) =>
    request<AdminRegistration[]>(
      "GET",
      `/api/beheer/evenementen/${enc(id)}/inschrijvingen`,
    ),
  erase: (id: string) =>
    request<AdminEventSummary>("POST", `/api/beheer/evenementen/${enc(id)}/wissen`, {
      confirm: "WISSEN",
    }),
  patchRegistration: (
    id: number,
    patch: {
      parentName?: string;
      email?: string;
      street?: string;
      houseNumber?: string;
      note?: string;
      status?: "active" | "cancelled";
      addressApproved?: true;
    },
  ) => request<AdminRegistration>("PATCH", `/api/beheer/inschrijvingen/${id}`, patch),
  addParticipant: (id: number, participant: { name: string; age: number }) =>
    request<AdminRegistration>(
      "POST",
      `/api/beheer/inschrijvingen/${id}/deelnemers`,
      participant,
    ),
  patchParticipant: (
    id: number,
    patch: {
      name?: string;
      age?: number;
      status?: "active" | "cancelled";
      pickedUp?: boolean;
    },
  ) => request<AdminRegistration>("PATCH", `/api/beheer/deelnemers/${id}`, patch),
  resendMail: (id: number) =>
    request<AdminRegistration>("POST", `/api/beheer/inschrijvingen/${id}/mail`),
  // Definitief verwijderen; de server eist het inschrijvingsnummer als bevestiging.
  deleteRegistration: (id: number, reference: string) =>
    request<{ id: number; reference: string }>("DELETE", `/api/beheer/inschrijvingen/${id}`, { confirm: reference }),
  // Live GPS: status, Start (of het stopuur aanpassen tijdens een sessie) en Stop.
  gps: () => request<AdminGps>("GET", "/api/beheer/gps"),
  gpsStart: (hours: number) => request<AdminGps>("POST", "/api/beheer/gps", { action: "start", hours }),
  gpsStop: () => request<AdminGps>("POST", "/api/beheer/gps", { action: "stop" }),
  // Teksten van de website: alleen de aangepaste; value null = terug naar de oorspronkelijke tekst.
  stats: () => request<AdminStats>("GET", "/api/beheer/statistieken"),
  texts: () => request<AdminText[]>("GET", "/api/beheer/teksten"),
  saveText: (key: string, value: string | null) =>
    request<AdminText>("PATCH", `/api/beheer/teksten/${enc(key)}`, { value }),
  previousText: (key: string) => request<AdminText>("POST", `/api/beheer/teksten/${enc(key)}/vorige`),
  // Kinderen op kaart: unieke adressen met kinderen en locatie; opzoeken bij de geolocatiedienst (server/locaties.ts).
  map: (id: string) => request<AdminMap>("GET", `/api/beheer/evenementen/${enc(id)}/kaart`),
  lookup: (id: string, keys: string[] = []) =>
    request<{ checked: number; failed: number; remaining: number }>("POST", `/api/beheer/evenementen/${enc(id)}/kaart/opzoeken`, { keys }),
  setLocation: (id: string, key: string, lat: number, lon: number) =>
    request<void>("POST", `/api/beheer/evenementen/${enc(id)}/kaart/locatie`, { key, lat, lon }),
  resetLocation: (id: string, key: string) =>
    request<void>("POST", `/api/beheer/evenementen/${enc(id)}/kaart/locatie`, { key, reset: true }),
};

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Downloadt de Excel-export. Via fetch in plaats van een gewone link: zo wordt een verlopen sessie of een fout als
// melding getoond, en nooit een foutbericht opgeslagen onder een .xlsx-naam.
export async function downloadExport(eventId: string) {
  let response: Response;
  try {
    response = await fetch(`/api/beheer/evenementen/${enc(eventId)}/export`, { credentials: "same-origin" });
  } catch {
    throw new AdminError(0, "ONBEKEND", "Geen verbinding met de server. Probeer het opnieuw.");
  }
  if (response.status === 401) onUnauthorized?.();
  if (!response.ok || !(response.headers.get("Content-Type") ?? "").startsWith(XLSX_TYPE))
    throw new AdminError(response.status, response.status === 401 ? "NIET_INGELOGD" : "ONBEKEND", "De export kon niet gemaakt worden. Probeer het opnieuw.");
  const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `${eventId}-inschrijvingen.xlsx`;
  const url = URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: XLSX_TYPE }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function describeError(error: unknown): string {
  if (error instanceof AdminError) {
    if (error.code === "TE_VEEL_POGINGEN")
      return "Te veel pogingen. Wacht even en probeer het later opnieuw.";
    const details = error.fields
      ? Object.values(error.fields).filter(Boolean).join(" ")
      : "";
    return details ? `${error.message} ${details}` : error.message;
  }
  return "Er ging iets mis. Probeer het opnieuw.";
}
