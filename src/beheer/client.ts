import type {
  AdminEventSummary,
  AdminRegistration,
  ApiError,
  ApiErrorCode,
} from "../inschrijving/api";

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
  method: "GET" | "POST" | "PATCH",
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
    patch: { status?: "open" | "closed"; capacity?: number },
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
};

export const exportUrl = (eventId: string) =>
  `/api/beheer/evenementen/${enc(eventId)}/export`;

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
