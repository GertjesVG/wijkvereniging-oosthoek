// Beheer → "Kinderen op kaart": de unieke woonadressen van actief ingeschreven kinderen, met een kaartlocatie uit de
// geolocatiedienst van Digitaal Vlaanderen (Adressenregister). Alleen achter de beheerlogin (server/beheer.ts).
//
// Privacy: naar de dienst gaat uitsluitend "straat huisnummer [bus], postcode gemeente", nooit een naam, e-mail of
// inschrijvingsnummer; niets hiervan komt in een log. De gevonden plaatsen staan in address_locations (migratie 0011) en
// worden samen met de andere persoonsgegevens gewist (server/wissen.ts).
//
// Betrouwbaarheid: alleen een EXACTE treffer telt (zelfde straat, huisnummer, postcode en gemeente; de dienst geeft bij een
// onbekend nummer ook buren terug). Zonder exacte treffer blijft de locatie leeg: er wordt nooit een plaats verzonnen.
// Dienst: https://geo.api.vlaanderen.be/geolocation/ ("De service kan door iedereen gebruikt worden", gebruiksrecht op
// vlaanderen.be); geen sleutel, geen gepubliceerde limiet. We vragen daarom rustig, één adres tegelijk, en bewaren elk antwoord.
import type { AdminMap, AdminMapAddress, LocationStatus } from "../src/inschrijving/api.ts";
import type { RegistrationEvent } from "../src/inschrijving/evenementen.ts";
import { event } from "../src/content/event.ts";
import { fail, json, normalize, nowIso, readJson, type Env } from "./basis.ts";

export const GEOLOCATION_URL = "https://geo.api.vlaanderen.be/geolocation/v4/Location";
// Per beheeraanvraag hooguit zoveel adressen opzoeken (het beheer vraagt vanzelf verder tot alles opgezocht is).
export const LOOKUPS_PER_REQUEST = 8;
const PAUSE_MS = 150;
// Marge rond het wijkvak (ongeveer 400 m): sommige straten van de wijk lopen net buiten het vak van de routekaart.
const MARGIN = 0.004;

// ---------- Adressen normaliseren ----------

// "12" → 12 · "12A" / "12 a" → 12A · "12 bus 3" / "12/3" / "12-3" / "12 b3" / "12 bte 3" → 12, bus 3.
export function parseHouseNumber(raw: string): { number: string; box: string | null } {
  const text = raw.trim().replace(/\s+/g, " ");
  const head = /^(\d+)(.*)$/.exec(text);
  if (!head) return { number: text.toUpperCase(), box: null };
  let number = head[1].replace(/^0+(?=\d)/, "");
  let rest = head[2].trim();
  // Eén letter die bij het huisnummer hoort (niet gevolgd door een cijfer of nog een letter).
  const letter = /^([a-zA-Z])(?![a-zA-Z0-9])\s*/.exec(rest);
  if (letter) {
    number += letter[1].toUpperCase();
    rest = rest.slice(letter[0].length);
  }
  rest = rest
    .replace(/^(?:bus|bte|bt|b)\.?\s*(?=[a-zA-Z0-9])/i, "")
    .replace(/^[/-]\s*/, "")
    .trim();
  return { number, box: rest ? rest.toUpperCase() : null };
}

export function mapKey(street: string, houseNumber: string) {
  const { number, box } = parseHouseNumber(houseNumber);
  return `${normalize(street).replace(/ /g, "")}|${number.toLowerCase()}|${(box ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export const formatHouseNumber = (number: string, box: string | null) => (box ? `${number} bus ${box}` : number);

// ---------- Unieke adressen met hun kinderen ----------

export type ChildRow = {
  registration_id: number;
  reference: string;
  street: string | null;
  house_number: string | null;
  address_review: number;
  name: string;
  age: number | null;
};

// Volgorde: straten van de rondrit in hun volgorde, dan de overige straten alfabetisch; binnen een straat op huisnummer.
export function groupAddresses(rows: ChildRow[], stops: string[] = event.route.stops): Omit<AdminMapAddress, "location">[] {
  const groups = new Map<string, Omit<AdminMapAddress, "location" | "nr">>();
  for (const row of rows) {
    if (!row.street || !row.house_number) continue;
    const key = mapKey(row.street, row.house_number);
    let group = groups.get(key);
    if (!group) {
      const { number, box } = parseHouseNumber(row.house_number);
      group = { key, street: row.street, number, box, children: [], registrations: [], addressReview: false };
      groups.set(key, group);
    }
    group.children.push({ name: row.name, age: row.age, reference: row.reference });
    if (!group.registrations.some((r) => r.id === row.registration_id))
      group.registrations.push({ id: row.registration_id, reference: row.reference });
    if (row.address_review === 1) group.addressReview = true;
  }
  const routeIndex = new Map(stops.map((s, i) => [normalize(s).replace(/ /g, ""), i]));
  const rank = (street: string) => routeIndex.get(normalize(street).replace(/ /g, "")) ?? stops.length;
  const natural = (a: string, b: string) => a.localeCompare(b, "nl", { numeric: true, sensitivity: "base" });
  return [...groups.values()]
    .sort(
      (a, b) =>
        rank(a.street) - rank(b.street) ||
        natural(a.street, b.street) ||
        natural(a.number, b.number) ||
        natural(a.box ?? "", b.box ?? ""),
    )
    .map((group, i) => ({ nr: i + 1, ...group }));
}

const CHILDREN_SQL = `SELECT r.id AS registration_id, r.reference, r.street, r.house_number, r.address_review, p.name, p.age
  FROM participants p JOIN registrations r ON r.id = p.registration_id
  WHERE r.event_id = ?1 AND r.status = 'active' AND p.status = 'active'
  ORDER BY r.seq, p.id`;

type LocationRow = {
  address_key: string;
  status: LocationStatus;
  lat: number | null;
  lon: number | null;
  precision: string | null;
  matched: string | null;
  detail: string | null;
  checked_at: string;
};

export async function loadMap(db: D1Database, config: RegistrationEvent): Promise<AdminMap> {
  const [children, locations] = await db.batch([
    db.prepare(CHILDREN_SQL).bind(config.id),
    db.prepare("SELECT * FROM address_locations WHERE event_id = ?1").bind(config.id),
  ]);
  const rows = children.results as ChildRow[];
  const found = new Map((locations.results as LocationRow[]).map((l) => [l.address_key, l]));
  return {
    postcode: config.area?.postcode ?? "",
    municipality: config.area?.municipality ?? "",
    withoutAddress: rows.filter((r) => !r.street || !r.house_number).length,
    addresses: groupAddresses(rows).map((group) => {
      const l = found.get(group.key);
      return {
        ...group,
        location: l
          ? { status: l.status, lat: l.lat, lon: l.lon, precision: l.precision, matched: l.matched, detail: l.detail, checkedAt: l.checked_at }
          : null,
      };
    }),
  };
}

// ---------- Opzoeken bij de geolocatiedienst ----------

type Found = { status: LocationStatus; lat: number | null; lon: number | null; precision: string | null; matched: string | null; detail: string | null };
type Place = { street: string; number: string; box: string | null };
type Area = NonNullable<RegistrationEvent["area"]>;

const compact = (value: unknown) => (typeof value === "string" ? normalize(value).replace(/ /g, "") : "");

export function insideArea(area: Area, lat: number, lon: number, margin = MARGIN) {
  const b = area.bounds;
  return lat >= b.south - margin && lat <= b.north + margin && lon >= b.west - margin && lon <= b.east + margin;
}

// Beoordeelt het antwoord van de dienst. Puur, zodat de regels zonder netwerk getest kunnen worden.
export function judge(place: Place, area: Area, results: unknown): Found {
  const list = Array.isArray(results) ? (results as Record<string, unknown>[]) : [];
  const exact = list.find(
    (r) =>
      compact(r.Thoroughfarename) === compact(place.street) &&
      compact(r.Housenumber) === compact(place.number) &&
      String(r.Zipcode ?? "") === area.postcode &&
      compact(r.Municipality) === compact(area.municipality) &&
      String(r.LocationType ?? "").includes("huisnummer"),
  );
  if (!exact)
    return {
      status: "niet_gevonden",
      lat: null,
      lon: null,
      precision: null,
      matched: null,
      detail: `Geen exact adres "${place.street} ${place.number}, ${area.postcode} ${area.municipality}" in het Adressenregister.`,
    };
  const location = (exact.Location ?? {}) as Record<string, unknown>;
  const lat = Number(location.Lat_WGS84);
  const lon = Number(location.Lon_WGS84);
  const precision = String(exact.LocationType);
  const matched = String(exact.FormattedAddress ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon))
    return { status: "niet_gevonden", lat: null, lon: null, precision, matched, detail: "De dienst gaf geen bruikbare coördinaten." };
  if (!insideArea(area, lat, lon))
    return { status: "onzeker", lat, lon, precision, matched, detail: `Ligt buiten ${area.name}: kijk het adres na.` };
  if (/ge(?:ï|i)nterpoleerd/i.test(precision))
    return { status: "onzeker", lat, lon, precision, matched, detail: "Geschatte positie (geïnterpoleerd tussen buren)." };
  return {
    status: "gevonden",
    lat,
    lon,
    precision,
    matched,
    detail: /aangeduidDoorBeheerder/i.test(precision)
      ? "Positie aangeduid door de beheerder van het Adressenregister."
      : "Positie afgeleid van het gebouw of perceel (Adressenregister).",
  };
}

// null = de dienst was niet bereikbaar of gaf een fout; dan wordt niets bewaard en later opnieuw geprobeerd.
export async function lookup(place: Place, area: Area, baseUrl = GEOLOCATION_URL, fetcher: typeof fetch = fetch): Promise<Found | null> {
  const query = `${place.street} ${formatHouseNumber(place.number, place.box)}, ${area.postcode} ${area.municipality}`;
  const url = `${baseUrl}?q=${encodeURIComponent(query)}&c=5`;
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "Wijkvereniging-Oosthoek-beheer" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { LocationResult?: unknown };
    return judge(place, area, body?.LocationResult);
  } catch {
    return null;
  }
}

const saveLocation = (db: D1Database, eventId: string, key: string, f: Found) =>
  db
    .prepare(
      `INSERT OR REPLACE INTO address_locations (event_id, address_key, status, lat, lon, precision, matched, detail, checked_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(eventId, key, f.status, f.lat, f.lon, f.precision, f.matched, f.detail, nowIso());

// Zoekt de adressen zonder locatie op (of de gevraagde sleutels opnieuw) en ruimt locaties op van adressen die niet meer
// voorkomen (verbeterd adres, geannuleerde inschrijving).
// Locaties van adressen die niet meer bij een actief kind horen (verbeterd adres, geannuleerde of verwijderde inschrijving)
// blijven niet bewaard: opgeruimd telkens de kaart opent of opzoekt.
async function pruneLocations(db: D1Database, config: RegistrationEvent, map: AdminMap) {
  await db
    .prepare("DELETE FROM address_locations WHERE event_id = ?1 AND address_key NOT IN (SELECT value FROM json_each(?2))")
    .bind(config.id, JSON.stringify(map.addresses.map((a) => a.key)))
    .run();
}

async function lookupMissing(db: D1Database, env: Env, config: RegistrationEvent, area: Area, again: string[]) {
  const map = await loadMap(db, config);
  await pruneLocations(db, config, map);
  const todo = map.addresses.filter((a) => (again.length ? again.includes(a.key) && a.location?.status !== "handmatig" : !a.location));
  const batch = todo.slice(0, LOOKUPS_PER_REQUEST);
  let failed = 0;
  for (const [i, address] of batch.entries()) {
    if (i) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const found = await lookup(address, area, env.GEOLOCATIE_URL || GEOLOCATION_URL);
    if (found) await saveLocation(db, config.id, address.key, found).run();
    else failed++;
  }
  return { checked: batch.length - failed, failed, remaining: again.length ? 0 : todo.length - batch.length + failed };
}

// ---------- Router: /api/beheer/evenementen/<id>/kaart[/opzoeken|/locatie] ----------

export async function handleMapAdmin(request: Request, env: Env, db: D1Database, config: RegistrationEvent, sub: string | undefined) {
  const area = config.area;
  if (!area) return fail(404, "NIET_GEVONDEN", "Dit evenement heeft geen adressen.");
  const erased = await db.prepare("SELECT personal_data_erased_at AS erased FROM events WHERE id = ?1").bind(config.id).first<{ erased: string | null }>();
  if (erased?.erased) return fail(409, "VERBODEN", "De gegevens van dit evenement zijn gewist.");
  const method = request.method;
  if (!sub && method === "GET") {
    const map = await loadMap(db, config);
    await pruneLocations(db, config, map);
    return json(map);
  }
  if (sub === "opzoeken" && method === "POST") {
    const body = (await readJson(request)) ?? {};
    const again = Array.isArray(body.keys) ? body.keys.filter((k): k is string => typeof k === "string").slice(0, LOOKUPS_PER_REQUEST) : [];
    const result = await lookupMissing(db, env, config, area, again);
    if (result.failed && !result.checked)
      return fail(503, "ONBEKEND", "De geolocatiedienst van Digitaal Vlaanderen is nu niet bereikbaar. Probeer het later opnieuw.");
    return json(result);
  }
  if (sub === "locatie" && method === "POST") {
    const body = (await readJson(request)) ?? {};
    const key = typeof body.key === "string" ? body.key : "";
    const map = await loadMap(db, config);
    if (!map.addresses.some((a) => a.key === key)) return fail(404, "NIET_GEVONDEN", "Dit adres staat niet (meer) bij de ingeschreven kinderen.");
    // Terug naar automatisch: de locatie vergeten, zodat het beheer ze opnieuw opzoekt.
    if (body.reset === true) {
      await db.prepare("DELETE FROM address_locations WHERE event_id = ?1 AND address_key = ?2").bind(config.id, key).run();
      return json(null, 204);
    }
    const lat = body.lat;
    const lon = body.lon;
    // Handmatig aanduiden kan alleen in en rond de wijk (ongeveer 2 km), zodat een verkeerde klik niet ver weg belandt.
    if (typeof lat !== "number" || typeof lon !== "number" || !insideArea(area, lat, lon, 0.02))
      return fail(400, "VALIDATIE", "Duid een plaats in of vlak bij de wijk aan.");
    await saveLocation(db, config.id, key, {
      status: "handmatig",
      lat: Math.round(lat * 1e6) / 1e6,
      lon: Math.round(lon * 1e6) / 1e6,
      precision: null,
      matched: null,
      detail: "Handmatig aangeduid in het beheer.",
    }).run();
    return json(null, 204);
  }
  return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
}
