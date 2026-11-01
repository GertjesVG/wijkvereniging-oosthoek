// Gedeelde hulpfuncties voor functions/. Alleen wisbare TypeScript (Node-tests draaien deze bestanden rechtstreeks).
import type { ApiError, ApiErrorCode } from "../src/inschrijving/api.ts";

export type Env = {
  DB?: D1Database;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  ADMIN_PASSWORD?: string;
  MAIL_WEBHOOK_URL?: string;
  MAIL_SECRET?: string;
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

export function addressKey(street: string, houseNumber: string) {
  return `${normalize(street)}|${normalize(houseNumber).replace(/ /g, "")}`;
}

export function childKey(name: string, address: string | null, email: string) {
  return `${normalize(name)}|${address ?? `mail:${email.trim().toLowerCase()}`}`;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
