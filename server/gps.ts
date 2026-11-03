// Live GPS van de huifkar. De telefoon (OwnTracks in HTTP-modus) stuurt posities naar /api/gps/positie, met Basic-
// authenticatie: het wachtwoord is het Cloudflare-geheim GPS_DEVICE_TOKEN (min. 32 tekens). Bezoekers lezen /api/gps;
// het beheer zet de publieke sessie aan en uit (/api/beheer/gps). Eén rij in gps_live (migratie 0006), geen historiek:
// coördinaten staan er alleen tijdens een actieve sessie en verdwijnen bij Stop of bij de automatische stop.
import type { AdminGps, PublicGps } from "../src/gps/api.ts";
import { errorMessage, fail, json, nowIso, readJson, sameText, sha256Hex, type Env } from "./basis.ts";

// Huifkar op wandeltempo: de telefoon meldt zich elke 30 s, bezoekers verversen elke minuut (alleen als de pagina
// zichtbaar is): de kar rijdt intussen hooguit ±80 m, en het halveert de aanvragen van bezoekers op het gratis plan.
// Buiten een sessie kijkt een open routepagina elke 2 minuten of de GPS al gestart is.
export const REFRESH_LIVE_SECONDS = 60;
export const REFRESH_OFF_SECONDS = 120;
export const STALE_AFTER_SECONDS = 120;
export const LOST_AFTER_SECONDS = 600;
export const CONNECTED_WITHIN_SECONDS = 120;
// Een positie met een grotere foutmarge (bv. alleen gsm-mast) wordt niet gepubliceerd.
export const MAX_ACCURACY_METERS = 150;
export const DEFAULT_HOURS = 4;
export const MAX_HOURS = 8;
const HOUR_MS = 3600_000;
// Een telefoonklok die tot 5 minuten voorloopt telt als "nu"; verder vooruit is onbetrouwbaar.
const MAX_FUTURE_MS = 5 * 60_000;
const MIN_TOKEN_LENGTH = 32;

export type GpsRow = {
  public_since: string | null;
  public_until: string | null;
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  fix_at: string | null;
  seen_at: string | null;
  seen_fix_at: string | null;
  seen_accuracy: number | null;
  battery: number | null;
  charging: number | null;
};

export type ParsedLocation =
  | { kind: "fix"; lat: number; lon: number; accuracy: number | null; fixAt: string; battery: number | null; charging: boolean | null }
  | { kind: "ignore" }
  | { kind: "invalid" };

const round5 = (value: number) => Math.round(value * 1e5) / 1e5;
const inRange = (value: unknown, limit: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

// Leest een OwnTracks-bericht (owntracks.org/booklet/tech/json): alleen _type "location" telt.
export function parseLocation(body: Record<string, unknown> | null, nowMs: number): ParsedLocation {
  if (!body || typeof body._type !== "string") return { kind: "invalid" };
  if (body._type !== "location") return { kind: "ignore" };
  const { lat, lon, tst, acc, batt, bs } = body;
  if (!inRange(lat, 90) || !inRange(lon, 180) || !Number.isInteger(tst) || (tst as number) <= 0) return { kind: "invalid" };
  if (acc !== undefined && !(typeof acc === "number" && Number.isFinite(acc) && acc >= 0)) return { kind: "invalid" };
  const fixMs = (tst as number) * 1000;
  if (fixMs > nowMs + MAX_FUTURE_MS) return { kind: "invalid" };
  return {
    kind: "fix",
    lat: round5(lat),
    lon: round5(lon),
    accuracy: acc === undefined ? null : Math.round(acc),
    fixAt: new Date(Math.min(fixMs, nowMs)).toISOString(),
    battery: Number.isInteger(batt) && (batt as number) >= 0 && (batt as number) <= 100 ? (batt as number) : null,
    // bs: 1 = niet aan de lader, 2 = laadt, 3 = vol (aan de lader).
    charging: bs === 2 || bs === 3 ? true : bs === 1 ? false : null,
  };
}

// "Authorization: Basic base64(gebruiker:wachtwoord)", zoals OwnTracks het stuurt; alleen het wachtwoord telt.
export async function deviceAuthorized(request: Request, token: string) {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  const given = colon < 0 ? "" : decoded.slice(colon + 1);
  return given.length > 0 && sameText(await sha256Hex(given), await sha256Hex(token));
}

const secondsBetween = (fromIso: string, nowMs: number) => Math.max(0, Math.round((nowMs - Date.parse(fromIso)) / 1000));
const isLive = (row: GpsRow | null, nowMs: number) =>
  Boolean(row?.public_since && row.public_until && Date.parse(row.public_until) > nowMs);

export function publicView(row: GpsRow | null, nowMs: number): PublicGps {
  if (!row || !isLive(row, nowMs)) return { state: "off", refreshSeconds: REFRESH_OFF_SECONDS };
  const endsInSeconds = Math.max(0, Math.floor((Date.parse(row.public_until!) - nowMs) / 1000));
  const base = { refreshSeconds: REFRESH_LIVE_SECONDS, endsInSeconds };
  if (row.lat === null || row.lon === null || !row.fix_at || row.fix_at < row.public_since!) return { state: "waiting", ...base };
  const fixAgeSeconds = secondsBetween(row.fix_at, nowMs);
  if (fixAgeSeconds > LOST_AFTER_SECONDS) return { state: "lost", ...base, fixAt: row.fix_at, fixAgeSeconds };
  return {
    state: "live",
    ...base,
    lat: row.lat,
    lon: row.lon,
    accuracy: row.accuracy,
    fixAt: row.fix_at,
    fixAgeSeconds,
    staleAfterSeconds: STALE_AFTER_SECONDS,
    lostAfterSeconds: LOST_AFTER_SECONDS,
  };
}

export function adminView(row: GpsRow | null, nowMs: number, configured: boolean): AdminGps {
  const ageSeconds = row?.seen_at ? secondsBetween(row.seen_at, nowMs) : 0;
  return {
    configured,
    session: row && isLive(row, nowMs) ? { since: row.public_since!, until: row.public_until! } : null,
    public: publicView(row, nowMs),
    device: row?.seen_at
      ? {
          seenAt: row.seen_at,
          ageSeconds,
          connected: ageSeconds <= CONNECTED_WITHIN_SECONDS,
          fixAt: row.seen_fix_at,
          accuracy: row.seen_accuracy,
          battery: row.battery,
          charging: row.charging === null ? null : row.charging === 1,
        }
      : null,
    hours: { default: DEFAULT_HOURS, max: MAX_HOURS },
  };
}

// ---------- Database ----------

const COLUMNS =
  "public_since, public_until, lat, lon, accuracy, fix_at, seen_at, seen_fix_at, seen_accuracy, battery, charging";
const CLEARED = { public_since: null, public_until: null, lat: null, lon: null, accuracy: null, fix_at: null };
const STOP_SQL = `UPDATE gps_live SET public_since = NULL, public_until = NULL, lat = NULL, lon = NULL, accuracy = NULL,
  fix_at = NULL, updated_at = ?1 WHERE id = 1`;

const missingTable = (error: unknown) => errorMessage(error).includes("no such table: gps_live");
const configured = (env: Env) => Boolean(env.GPS_DEVICE_TOKEN && env.GPS_DEVICE_TOKEN.length >= MIN_TOKEN_LENGTH);

// Leest de rij en voert meteen de automatische stop uit als het stopuur voorbij is: daarna staan er geen coördinaten meer.
async function loadRow(db: D1Database, nowMs: number): Promise<GpsRow | null> {
  const row = await db.prepare(`SELECT ${COLUMNS} FROM gps_live WHERE id = 1`).first<GpsRow>();
  if (row?.public_since && row.public_until && Date.parse(row.public_until) <= nowMs) {
    // Alleen deze verlopen sessie; een intussen opnieuw gestarte sessie blijft staan.
    await db.prepare(`${STOP_SQL} AND public_until = ?2`).bind(nowIso(), row.public_until).run();
    return { ...row, ...CLEARED };
  }
  return row;
}

export async function publicGps(env: Env) {
  if (!env.DB) return json(publicView(null, Date.now()));
  try {
    return json(publicView(await loadRow(env.DB, Date.now()), Date.now()));
  } catch (error) {
    if (missingTable(error)) return json(publicView(null, Date.now()));
    throw error;
  }
}

export async function receivePosition(request: Request, env: Env) {
  if (!env.DB || !configured(env)) return fail(503, "NIET_GECONFIGUREERD", "Live GPS niet ingesteld.");
  if (!(await deviceAuthorized(request, env.GPS_DEVICE_TOKEN!))) return fail(401, "NIET_INGELOGD", "Onbekend apparaat.");
  const db = env.DB;
  const nowMs = Date.now();
  const parsed = parseLocation(await readJson(request), nowMs);
  // OwnTracks zet een mislukt bericht vooraan in zijn wachtrij en probeert het opnieuw; een foutcode voor één onbruikbaar
  // bericht zou alles daarachter tegenhouden. Daarom altijd 200 met een lege lijst, ook als er niets bewaard wordt.
  if (parsed.kind !== "fix") return json([]);
  try {
    await loadRow(db, nowMs);
    const now = nowIso();
    // Na een netwerkonderbreking komen opgespaarde berichten van oud naar nieuw binnen: alleen een nieuwere fix telt.
    const newer = "(seen_fix_at IS NULL OR ?2 > seen_fix_at)";
    const statements = [
      db
        .prepare(
          `UPDATE gps_live SET seen_at = ?1, updated_at = ?1,
             seen_accuracy = CASE WHEN ${newer} THEN ?3 ELSE seen_accuracy END,
             battery = CASE WHEN ${newer} THEN ?4 ELSE battery END,
             charging = CASE WHEN ${newer} THEN ?5 ELSE charging END,
             seen_fix_at = CASE WHEN ${newer} THEN ?2 ELSE seen_fix_at END
           WHERE id = 1`,
        )
        .bind(now, parsed.fixAt, parsed.accuracy, parsed.battery, parsed.charging === null ? null : parsed.charging ? 1 : 0),
    ];
    // Coördinaten alleen tijdens een actieve sessie, van na de start, nauwkeurig genoeg en nieuwer dan de vorige.
    if (parsed.accuracy === null || parsed.accuracy <= MAX_ACCURACY_METERS)
      statements.push(
        db
          .prepare(
            `UPDATE gps_live SET lat = ?1, lon = ?2, accuracy = ?3, fix_at = ?4 WHERE id = 1 AND public_since IS NOT NULL
               AND public_until > ?5 AND ?4 >= public_since AND (fix_at IS NULL OR ?4 > fix_at)`,
          )
          .bind(parsed.lat, parsed.lon, parsed.accuracy, parsed.fixAt, now),
      );
    await db.batch(statements);
  } catch (error) {
    if (missingTable(error)) return fail(503, "NIET_GECONFIGUREERD", "Live GPS niet ingesteld.");
    throw error;
  }
  return json([]);
}

// Beheer: GET = status, POST {action: "start", hours} of {action: "stop"}. De beheerrouter controleert eerst de sessie.
export async function handleGpsAdmin(request: Request, env: Env, db: D1Database) {
  try {
    const nowMs = Date.now();
    if (request.method === "GET") return json(adminView(await loadRow(db, nowMs), nowMs, configured(env)));
    if (request.method !== "POST") return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
    const body = (await readJson(request)) ?? {};
    if (body.action === "stop") {
      await db.prepare(STOP_SQL).bind(nowIso()).run();
    } else if (body.action === "start") {
      const hours = body.hours;
      if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS)
        return fail(400, "VALIDATIE", `Kies een duur van 1 tot ${MAX_HOURS} uur.`);
      const row = await loadRow(db, nowMs);
      const until = new Date(nowMs + hours * HOUR_MS).toISOString();
      // Loopt er al een sessie, dan verschuift alleen het stopuur; anders begint een nieuwe sessie zonder oude positie.
      if (row?.public_since)
        await db.prepare("UPDATE gps_live SET public_until = ?1, updated_at = ?2 WHERE id = 1 AND public_since = ?3")
          .bind(until, nowIso(), row.public_since).run();
      else
        await db
          .prepare(
            `UPDATE gps_live SET public_since = ?1, public_until = ?2, lat = NULL, lon = NULL, accuracy = NULL, fix_at = NULL,
               updated_at = ?1 WHERE id = 1 AND public_since IS NULL`,
          )
          .bind(nowIso(), until)
          .run();
    } else return fail(400, "VALIDATIE", "Onbekende actie.");
    return json(adminView(await loadRow(db, Date.now()), Date.now(), configured(env)));
  } catch (error) {
    if (missingTable(error))
      return fail(503, "NIET_GECONFIGUREERD", "Live GPS nog niet ingesteld: de databasemigratie 0006 ontbreekt.");
    throw error;
  }
}
