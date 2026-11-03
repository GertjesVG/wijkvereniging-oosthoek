// Gedeelde hulpfuncties voor functions/. Alleen wisbare TypeScript (Node-tests draaien deze bestanden rechtstreeks).
import type { ApiError, ApiErrorCode } from "../src/inschrijving/api.ts";

export type Env = {
  DB?: D1Database;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  ADMIN_PASSWORD?: string;
  // Gedeeld geheim met het Apps Script (scripteigenschap met dezelfde naam), minstens 32 tekens.
  MAIL_API_TOKEN?: string;
  // Wachtwoord van de GPS-telefoon (OwnTracks, Basic-authenticatie), minstens 32 tekens. Zie GPS.md.
  GPS_DEVICE_TOKEN?: string;
  // Alleen voor tests: schaalt de wachttijd tussen mailpogingen (standaard 1).
  MAIL_BACKOFF_FACTOR?: string;
};

export type Ctx = { waitUntil(promise: Promise<unknown>): void };

const baseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      ...baseHeaders,
      ...(body === null ? {} : { "Content-Type": "application/json; charset=utf-8" }),
      ...headers,
    },
  });
}

export function fail(
  status: number,
  error: ApiErrorCode,
  message: string,
  extra: Partial<ApiError> = {},
) {
  return json({ error, message, ...extra } satisfies ApiError, status);
}

// Leest een JSON-object van hooguit 20 kB; anders null.
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get("Content-Type") ?? "").startsWith("application/json")) return null;
  const text = await request.text();
  if (text.length > 20_000) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const nowIso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();

// Kleine letters, zonder accenten en leestekens: "Émile-Jan " → "emile jan".
export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "12 B" = "12b", "12-3" = "12/3", maar "12/3" blijft verschillen van "123".
export function addressKey(street: string, houseNumber: string) {
  return `${normalize(street)}|${normalize(houseNumber).replace(/(\d) (?=\d)/g, "$1/").replace(/ /g, "")}`;
}

// Eén internetaansluiting: een IPv4-adres, of bij IPv6 het /64-blok (een aansluiting krijgt een heel blok).
export function connectionOf(ip: string | null) {
  if (!ip) return "onbekend";
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

export function childKey(name: string, address: string | null, email: string) {
  return `${normalize(name)}|${address ?? `mail:${email.trim().toLowerCase()}`}`;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Controleert "Authorization: Bearer <geheim>"; vergelijkt de hashes, zodat lengte en duur niets verraden.
export async function bearerMatches(request: Request, secret: string) {
  const header = request.headers.get("Authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  return given.length > 0 && sameText(await sha256Hex(given), await sha256Hex(secret));
}

// Vergelijkt zonder vroegtijdig te stoppen, zodat de duur niets verraadt.
export function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
