// Live GPS van de huifkar. De telefoon (OwnTracks in HTTP-modus) stuurt posities naar /api/gps/positie, met Basic-
// authenticatie: het wachtwoord is het Cloudflare-geheim GPS_DEVICE_TOKEN (min. 32 tekens). Bezoekers lezen /api/gps;
// het beheer zet de publieke sessie aan en uit (/api/beheer/gps). Eén rij in gps_live (migratie 0006): de publieke
// coördinaten staan er alleen tijdens een actieve sessie buiten de pauze en verdwijnen bij Stop of de automatische stop.
// De gereden route (migratie 0012) staat apart in gps_track, alleen voor het beheer, en wordt nooit overschreven.
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
// Elke routeregistratie hoort bij één evenement; volgend jaar hier het nieuwe evenement zetten.
export const GPS_EVENT_ID = "sinterklaas-2026";

export type GpsRow = {
  // Migratie 0012; ontbreken ze (oude database), dan gelden ze als NULL.
  paused_since?: string | null;
  segment_since?: string | null;
  track_error?: string | null;
  track_points?: number;
  track_segments?: number;
  track_last_at?: string | null;
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
  | {
      kind: "fix";
      lat: number;
      lon: number;
      accuracy: number | null;
      fixAt: string;
      battery: number | null;
      charging: boolean | null;
      // Onafgeronde meting voor de gereden route; snelheid (km/u), richting (graden) en hoogte (m) als OwnTracks ze geeft.
      track: { lat: number; lon: number; speed: number | null; course: number | null; altitude: number | null };
    }
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
    track: {
      lat,
      lon,
      speed: inRange(body.vel, 1000) && (body.vel as number) >= 0 ? (body.vel as number) : null,
      course: inRange(body.cog, 360) && (body.cog as number) >= 0 ? (body.cog as number) : null,
      altitude: inRange(body.alt, 10000) ? (body.alt as number) : null,
    },
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
  // Pauze: voor bezoekers "uit" (zo tonen ook oudere pagina's geen positie), met de pauzevlag en het live-interval,
  // zodat de livekaart na Hervatten binnen een minuut vanzelf terugkomt.
  if (row.paused_since) return { state: "off", refreshSeconds: REFRESH_LIVE_SECONDS, paused: true };
  const endsInSeconds = Math.max(0, Math.floor((Date.parse(row.public_until!) - nowMs) / 1000));
  const base = { refreshSeconds: REFRESH_LIVE_SECONDS, endsInSeconds };
  const segmentSince = row.segment_since ?? row.public_since!;
  if (row.lat === null || row.lon === null || !row.fix_at || row.fix_at < segmentSince) return { state: "waiting", ...base };
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

export function adminView(
  row: GpsRow | null,
  nowMs: number,
  configured: boolean,
  track: AdminGps["track"] = null,
): AdminGps {
  const ageSeconds = row?.seen_at ? secondsBetween(row.seen_at, nowMs) : 0;
  return {
    configured,
    session:
      row && isLive(row, nowMs)
        ? { since: row.public_since!, until: row.public_until!, pausedSince: row.paused_since ?? null }
        : null,
    track,
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

const CLEARED = {
  public_since: null,
  public_until: null,
  lat: null,
  lon: null,
  accuracy: null,
  fix_at: null,
};
// SELECT *: zonder migratie 0012 ontbreken de nieuwe kolommen gewoon, en Stop werkt dan zoals voorheen.
const hasRouteColumns = (row: GpsRow | null) => Boolean(row && "segment_since" in row);
const stopSql = (row: GpsRow | null) =>
  `UPDATE gps_live SET public_since = NULL, public_until = NULL, lat = NULL, lon = NULL, accuracy = NULL,
     fix_at = NULL${hasRouteColumns(row) ? ", paused_since = NULL, segment_since = NULL" : ""}, updated_at = ?1 WHERE id = 1`;

const missingTable = (error: unknown) => errorMessage(error).includes("no such table: gps_live");
const configured = (env: Env) => Boolean(env.GPS_DEVICE_TOKEN && env.GPS_DEVICE_TOKEN.length >= MIN_TOKEN_LENGTH);

// Logboek van de routesessie (start, pauze, hervat, stop, autostop). Mislukt het, dan gaat de GPS gewoon door.
async function logTrack(db: D1Database, sessionSince: string, kind: string, at: string, until: string | null = null) {
  try {
    await db
      .prepare("INSERT INTO gps_track_log (event_id, session_since, kind, at, until) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(GPS_EVENT_ID, sessionSince, kind, at, until)
      .run();
  } catch (error) {
    console.error("gps_track_log", errorMessage(error));
  }
}

// Leest de rij en voert meteen de automatische stop uit als het stopuur voorbij is: daarna staan er geen coördinaten meer.
async function loadRow(db: D1Database, nowMs: number): Promise<GpsRow | null> {
  const row = await db.prepare("SELECT * FROM gps_live WHERE id = 1").first<GpsRow>();
  if (row?.public_since && row.public_until && Date.parse(row.public_until) <= nowMs) {
    // Alleen deze verlopen sessie; een intussen opnieuw gestarte sessie blijft staan.
    const result = await db.prepare(`${stopSql(row)} AND public_until = ?2`).bind(nowIso(), row.public_until).run();
    if (result.meta?.changes) await logTrack(db, row.public_since, "autostop", row.public_until);
    return { ...row, ...CLEARED, ...(hasRouteColumns(row) ? { paused_since: null, segment_since: null } : {}) };
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
    const row = await loadRow(db, nowMs);
    const now = nowIso();
    const route = hasRouteColumns(row);
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
    // Coördinaten alleen tijdens een actieve sessie buiten de pauze, van na de start (of het hervatten), nauwkeurig
    // genoeg en nieuwer dan de vorige.
    if (parsed.accuracy === null || parsed.accuracy <= MAX_ACCURACY_METERS)
      statements.push(
        db
          .prepare(
            `UPDATE gps_live SET lat = ?1, lon = ?2, accuracy = ?3, fix_at = ?4 WHERE id = 1 AND public_since IS NOT NULL
               AND public_until > ?5 AND ?4 >= ${route ? "COALESCE(segment_since, public_since) AND paused_since IS NULL" : "public_since"}
               AND (fix_at IS NULL OR ?4 > fix_at)`,
          )
          .bind(parsed.lat, parsed.lon, parsed.accuracy, parsed.fixAt, now),
      );
    await db.batch(statements);
    // Gereden route: apart en ná de live positie, zodat een fout hier de livekaart nooit tegenhoudt.
    if (route && row?.public_since) await recordTrack(db, parsed, now, row);
  } catch (error) {
    if (missingTable(error)) return fail(503, "NIET_GECONFIGUREERD", "Live GPS niet ingesteld.");
    throw error;
  }
  return json([]);
}

// Elke bruikbare meting tijdens de sessie, ook een opgespaarde oudere (na een netwerkonderbreking), maar niet tijdens de
// pauze. Dezelfde meting twee keer telt één keer (UNIQUE op sessie en tijdstip). Onbewerkt: filteren gebeurt bij het
// verwerken, zodat latere correcties mogelijk blijven.
async function recordTrack(db: D1Database, parsed: Extract<ParsedLocation, { kind: "fix" }>, now: string, row: GpsRow) {
  try {
    const inserted = await db
      .prepare(
        `INSERT OR IGNORE INTO gps_track
           (event_id, session_since, segment_since, fix_at, lat, lon, accuracy, speed, course, altitude, received_at)
         SELECT ?1, public_since, COALESCE(segment_since, public_since), ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9 FROM gps_live
         WHERE id = 1 AND public_since IS NOT NULL AND public_until > ?9 AND ?2 >= COALESCE(segment_since, public_since)
           AND (paused_since IS NULL OR ?2 < paused_since)`,
      )
      .bind(
        GPS_EVENT_ID,
        parsed.fixAt,
        parsed.track.lat,
        parsed.track.lon,
        parsed.accuracy,
        parsed.track.speed,
        parsed.track.course,
        parsed.track.altitude,
        now,
      )
      .run();
    if (inserted.meta?.changes)
      await db
        .prepare(
          `UPDATE gps_live SET track_points = track_points + 1, track_error = NULL,
             track_last_at = CASE WHEN track_last_at IS NULL OR ?1 > track_last_at THEN ?1 ELSE track_last_at END
           WHERE id = 1 AND public_since = ?2`,
        )
        .bind(parsed.fixAt, row.public_since)
        .run();
    else if (row.track_error) await db.prepare("UPDATE gps_live SET track_error = NULL WHERE id = 1").run();
  } catch (error) {
    console.error("gps_track", errorMessage(error));
    try {
      await db
        .prepare("UPDATE gps_live SET track_error = ?1 WHERE id = 1")
        .bind(`${now} ${errorMessage(error)}`.slice(0, 300))
        .run();
    } catch {
      // Ook dit mislukt: de live positie is al bewaard; het beheer ziet dan geen nieuwe routepunten bijkomen.
    }
  }
}

type TrackRow = {
  session_since: string;
  segment_since: string;
  fix_at: string;
  lat: number;
  lon: number;
  accuracy: number | null;
  speed: number | null;
  course: number | null;
  altitude: number | null;
};

// Stand van de routeregistratie voor het beheer, uit de tellers in gps_live (één rij lezen; het beheer ververst elke
// 10 s). Na Stop blijft de stand van de laatste sessie staan tot een nieuwe Start.
function trackSummary(row: GpsRow | null): AdminGps["track"] {
  const base = { eventId: GPS_EVENT_ID, sessionSince: row?.public_since ?? null };
  if (!hasRouteColumns(row))
    return { ...base, points: 0, segments: 0, lastAt: null, error: "Routeopslag nog niet ingesteld: databasemigratie 0012 ontbreekt." };
  return {
    ...base,
    points: Number(row?.track_points ?? 0),
    segments: Number(row?.track_segments ?? 0),
    lastAt: row?.track_last_at ?? null,
    error: row?.track_error ?? null,
  };
}

// Export van alle gereden routes van het evenement, onbewerkt, per sessie en segment (nooit een lijn over een pauze).
async function exportTrack(db: D1Database, format: "geojson" | "gpx") {
  const { results } = await db
    .prepare(
      `SELECT session_since, segment_since, fix_at, lat, lon, accuracy, speed, course, altitude FROM gps_track
       WHERE event_id = ?1 ORDER BY session_since, segment_since, fix_at`,
    )
    .bind(GPS_EVENT_ID)
    .all<TrackRow>();
  const segments = new Map<string, TrackRow[]>();
  for (const r of results) {
    const key = `${r.session_since}|${r.segment_since}`;
    const list = segments.get(key);
    if (list) list.push(r);
    else segments.set(key, [r]);
  }
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${GPS_EVENT_ID}-gereden-route.${ext}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (format === "gpx") {
    const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
    const sessions = new Map<string, TrackRow[][]>();
    for (const points of segments.values()) {
      const s = points[0].session_since;
      sessions.set(s, [...(sessions.get(s) ?? []), points]);
    }
    const point = (p: TrackRow) =>
      `<trkpt lat="${p.lat}" lon="${p.lon}">${p.altitude !== null ? `<ele>${p.altitude}</ele>` : ""}<time>${esc(p.fix_at)}</time></trkpt>`;
    const trk = [...sessions.entries()]
      .map(
        ([since, segs]) =>
          `<trk><name>${esc(`${GPS_EVENT_ID} sessie ${since}`)}</name>${segs
            .map((pts) => `<trkseg>${pts.map(point).join("")}</trkseg>`)
            .join("")}</trk>`,
      )
      .join("\n");
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="wijkvereniging-oosthoek" xmlns="http://www.topografix.com/GPX/1/1">\n${trk}\n</gpx>\n`;
    return new Response(gpx, { headers: headers("application/gpx+xml; charset=utf-8", "gpx") });
  }
  const features = [...segments.values()].map((pts) => ({
    type: "Feature",
    geometry: { type: "LineString", coordinates: pts.map((p) => [p.lon, p.lat]) },
    properties: {
      event: GPS_EVENT_ID,
      session: pts[0].session_since,
      segment: pts[0].segment_since,
      times: pts.map((p) => p.fix_at),
      accuracy: pts.map((p) => p.accuracy),
      speed: pts.map((p) => p.speed),
      course: pts.map((p) => p.course),
      altitude: pts.map((p) => p.altitude),
    },
  }));
  return new Response(JSON.stringify({ type: "FeatureCollection", features }), {
    headers: headers("application/geo+json; charset=utf-8", "geojson"),
  });
}

// Stop: de positie is meteen weg voor iedereen; de gereden route blijft bewaard. Ook gebruikt door "Sluit
// Sinterklaasstoet af" in het Sinterklaasbeheer (server/evenement.ts).
export async function stopLiveGps(db: D1Database, nowMs = Date.now()) {
  const row = await loadRow(db, nowMs);
  const now = nowIso();
  await db.prepare(stopSql(row)).bind(now).run();
  if (row?.public_since && hasRouteColumns(row)) await logTrack(db, row.public_since, "stop", now);
}

// Loopt de live GPS (ook gepauzeerd)? Dan wacht de automatische afsluiting van de website (src/evenement/fase.ts).
export async function liveGpsBusy(db: D1Database, nowMs = Date.now()) {
  try {
    const row = await db.prepare("SELECT public_since, public_until FROM gps_live WHERE id = 1").first<GpsRow>();
    return Boolean(row && isLive(row, nowMs));
  } catch (error) {
    if (missingTable(error)) return false;
    throw error;
  }
}

// Stand van de opname per evenement voor het Sinterklaasbeheer: aantallen, nooit de punten zelf.
export async function trackCounts(db: D1Database, eventId: string) {
  try {
    const row = await db
      .prepare(
        "SELECT COUNT(*) AS points, COUNT(DISTINCT session_since) AS sessions, COUNT(DISTINCT session_since || segment_since) AS segments, MIN(fix_at) AS first, MAX(fix_at) AS last FROM gps_track WHERE event_id = ?1",
      )
      .bind(eventId)
      .first<{ points: number; sessions: number; segments: number; first: string | null; last: string | null }>();
    return row ?? { points: 0, sessions: 0, segments: 0, first: null, last: null };
  } catch (error) {
    if (errorMessage(error).includes("no such table")) return null;
    throw error;
  }
}

// Beheer: GET = status (met ?export=geojson of gpx: de gereden route), POST {action: "start", hours}, {action: "pause"},
// {action: "resume"} of {action: "stop"}. De beheerrouter controleert eerst de sessie.
export async function handleGpsAdmin(request: Request, env: Env, db: D1Database) {
  try {
    const nowMs = Date.now();
    if (request.method === "GET") {
      const format = new URL(request.url).searchParams.get("export");
      if (format === "geojson" || format === "gpx") return await exportTrack(db, format);
      const row = await loadRow(db, nowMs);
      return json(adminView(row, nowMs, configured(env), trackSummary(row)));
    }
    if (request.method !== "POST") return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
    const body = (await readJson(request)) ?? {};
    if (body.action === "stop") {
      await stopLiveGps(db, nowMs);
    } else if (body.action === "pause" || body.action === "resume") {
      const row = await loadRow(db, nowMs);
      if (!row?.public_since) return fail(409, "VERBODEN", "De live GPS staat uit.");
      if (!hasRouteColumns(row))
        return fail(503, "NIET_GECONFIGUREERD", "Pauze nog niet ingesteld: de databasemigratie 0012 ontbreekt.");
      const now = nowIso();
      if (body.action === "pause" && !row.paused_since) {
        await db
          .prepare(
            "UPDATE gps_live SET paused_since = ?1, updated_at = ?1 WHERE id = 1 AND public_since = ?2 AND paused_since IS NULL",
          )
          .bind(now, row.public_since)
          .run();
        await logTrack(db, row.public_since, "pause", now);
      }
      // Hervatten: nieuw routesegment en geen positie van tijdens de pauze; de eerste nieuwe positie verschijnt vanzelf.
      if (body.action === "resume" && row.paused_since) {
        await db
          .prepare(
            `UPDATE gps_live SET paused_since = NULL, segment_since = ?1, track_segments = track_segments + 1, lat = NULL, lon = NULL, accuracy = NULL,
               fix_at = NULL, updated_at = ?1 WHERE id = 1 AND public_since = ?2 AND paused_since IS NOT NULL`,
          )
          .bind(now, row.public_since)
          .run();
        await logTrack(db, row.public_since, "resume", now);
      }
    } else if (body.action === "start") {
      const hours = body.hours;
      if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS)
        return fail(400, "VALIDATIE", `Kies een duur van 1 tot ${MAX_HOURS} uur.`);
      const row = await loadRow(db, nowMs);
      const until = new Date(nowMs + hours * HOUR_MS).toISOString();
      // Loopt er al een sessie, dan verschuift alleen het stopuur; anders begint een nieuwe sessie zonder oude positie.
      if (row?.public_since) {
        await db
          .prepare("UPDATE gps_live SET public_until = ?1, updated_at = ?2 WHERE id = 1 AND public_since = ?3")
          .bind(until, nowIso(), row.public_since)
          .run();
        if (hasRouteColumns(row)) await logTrack(db, row.public_since, "until", nowIso(), until);
      } else {
        const since = nowIso();
        const route = hasRouteColumns(row);
        const result = await db
          .prepare(
            `UPDATE gps_live SET public_since = ?1, public_until = ?2, lat = NULL, lon = NULL, accuracy = NULL, fix_at = NULL,
               ${route ? "paused_since = NULL, segment_since = ?1, track_error = NULL, track_points = 0, track_segments = 1, track_last_at = NULL," : ""} updated_at = ?1
             WHERE id = 1 AND public_since IS NULL`,
          )
          .bind(since, until)
          .run();
        if (route && result.meta?.changes) await logTrack(db, since, "start", since, until);
      }
    } else return fail(400, "VALIDATIE", "Onbekende actie.");
    const row = await loadRow(db, Date.now());
    return json(adminView(row, Date.now(), configured(env), trackSummary(row)));
  } catch (error) {
    if (missingTable(error))
      return fail(503, "NIET_GECONFIGUREERD", "Live GPS nog niet ingesteld: de databasemigratie 0006 ontbreekt.");
    throw error;
  }
}
