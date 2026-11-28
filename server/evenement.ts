// Sinterklaasbeheer: evenementjaren, automatische fasen en de handmatige bediening (logica: src/evenement/fase.ts).
// Openbaar: GET /api/evenement (alleen welke weergave en welk jaar). Beheer: /api/beheer/sinterklaas, achter de
// bestaande beheerlogin (server/beheer.ts controleert sessie en herkomst).
// Zonder migratie 0013 (tabellen ontbreken) toont de website gewoon de volledige Sinterklaaswebsite, zoals voorheen.
import { errorMessage, fail, json, nowIso, readJson, type Env } from "./basis.ts";
import { liveGpsBusy, stopLiveGps, trackCounts } from "./gps.ts";
import {
  computePhase,
  nextYearDraft,
  overrideUntilFor,
  publicPhase,
  validDay,
  validLocal,
  brusselsToMs,
  type Control,
  type EventYear,
  type Show,
} from "../src/evenement/fase.ts";

type YearRow = {
  year: number;
  title: string;
  event_date: string | null;
  season_open: string;
  closing: string | null;
  prep_from: string | null;
  status: "concept" | "gepland";
  updated_at: string;
};
type ControlRow = { auto: number; override: Show | null; override_at: string | null; override_until: string | null; updated_at: string };
type LogRow = { at: string; action: string; detail: string | null };

const toYear = (r: YearRow): EventYear => ({
  year: r.year,
  title: r.title,
  eventDate: r.event_date,
  seasonOpen: r.season_open,
  closing: r.closing,
  prepFrom: r.prep_from,
  status: r.status,
});
const toControl = (r: ControlRow | null): Control => ({
  auto: r ? r.auto === 1 : true,
  override: r?.override ?? null,
  overrideAt: r?.override_at ?? null,
  overrideUntil: r?.override_until ?? null,
});

const missingTable = (error: unknown) => errorMessage(error).includes("no such table: event_");

async function load(db: D1Database) {
  const [years, control] = await db.batch([
    db.prepare("SELECT * FROM event_years ORDER BY year"),
    db.prepare("SELECT * FROM event_control WHERE id = 1"),
  ]);
  return {
    years: (years.results as YearRow[]).map(toYear),
    control: toControl(((control.results as ControlRow[])[0] ?? null)),
  };
}

// Openbaar: de weergave voor bezoekers. Bij een fout of zonder tabellen: de volledige website (veilige terugval).
export async function publicEvent(env: Env) {
  const nowMs = Date.now();
  if (!env.DB) return json({ show: "site", year: null, refreshSeconds: 300 });
  try {
    const { years, control } = await load(env.DB);
    const phase = computePhase(years, control, nowMs, await liveGpsBusy(env.DB, nowMs));
    return json(publicPhase(phase, nowMs));
  } catch (error) {
    if (missingTable(error)) return json({ show: "site", year: null, refreshSeconds: 300 });
    throw error;
  }
}

async function log(db: D1Database, action: string, detail: string | null = null) {
  try {
    await db.prepare("INSERT INTO event_log (at, action, detail) VALUES (?1, ?2, ?3)").bind(nowIso(), action, detail).run();
  } catch (error) {
    console.error("event_log", errorMessage(error));
  }
}

async function adminStatus(db: D1Database) {
  const nowMs = Date.now();
  const { years, control } = await load(db);
  const gpsBusy = await liveGpsBusy(db, nowMs);
  const phase = computePhase(years, control, nowMs, gpsBusy);
  const counts = phase.year === null ? null : await trackCounts(db, `sinterklaas-${phase.year}`);
  const { results: logRows } = await db.prepare("SELECT at, action, detail FROM event_log ORDER BY id DESC LIMIT 15").all<LogRow>();
  return json({
    now: new Date(nowMs).toISOString(),
    phase,
    control,
    years,
    gps: { busy: gpsBusy, track: counts },
    log: logRows,
  });
}

async function setOverride(db: D1Database, show: Show | null, action: string) {
  const nowMs = Date.now();
  const { years, control } = await load(db);
  const until = show ? overrideUntilFor(years, control, nowMs) : null;
  await db
    .prepare("UPDATE event_control SET override = ?1, override_at = ?2, override_until = ?3, updated_at = ?4 WHERE id = 1")
    .bind(show, show ? nowIso() : null, until, nowIso())
    .run();
  await log(db, action, show ? `weergave ${show}${until ? ` tot ${until}` : " tot opheffen"}` : null);
}

// Jaar aanpassen: alleen gekende velden, elk nagekeken. Een gepland jaar heeft een datum en een afsluitingstijd nodig.
async function saveYear(request: Request, db: D1Database, year: number) {
  const body = (await readJson(request)) ?? {};
  const current = await db.prepare("SELECT * FROM event_years WHERE year = ?1").bind(year).first<YearRow>();
  if (!current) return fail(404, "NIET_GEVONDEN", "Onbekend evenementjaar.");
  const next = toYear(current);
  const fields: Record<string, string> = {};
  if (Object.hasOwn(body, "title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) fields.title = "Geef een titel van hoogstens 120 tekens.";
    else next.title = title;
  }
  if (Object.hasOwn(body, "eventDate")) {
    if (body.eventDate === null || body.eventDate === "") next.eventDate = null;
    else if (!validDay(body.eventDate)) fields.eventDate = "Ongeldige datum.";
    else next.eventDate = body.eventDate;
  }
  for (const [key, label] of [["seasonOpen", "seizoensopening"], ["closing", "afsluiting"], ["prepFrom", "voorbereiding"]] as const) {
    if (!Object.hasOwn(body, key)) continue;
    const value = body[key];
    if ((value === null || value === "") && key !== "seasonOpen") next[key] = null;
    else if (!validLocal(value)) fields[key] = `Ongeldig tijdstip voor de ${label}.`;
    else next[key] = value;
  }
  if (Object.hasOwn(body, "status")) {
    if (body.status !== "concept" && body.status !== "gepland") fields.status = "Ongeldige status.";
    else next.status = body.status;
  }
  if (next.status === "gepland") {
    if (!next.eventDate) fields.eventDate ??= "Vul eerst de datum van het evenement in.";
    if (!next.closing) fields.closing ??= "Vul eerst het tijdstip van de afsluiting in.";
  }
  const open = brusselsToMs(next.seasonOpen);
  const close = brusselsToMs(next.closing);
  if (open !== null && close !== null && close <= open) fields.closing ??= "De afsluiting moet na de seizoensopening liggen.";
  if (Object.keys(fields).length) return fail(400, "VALIDATIE", "Kijk de gemarkeerde velden na.", { fields });
  await db
    .prepare(
      "UPDATE event_years SET title = ?2, event_date = ?3, season_open = ?4, closing = ?5, prep_from = ?6, status = ?7, updated_at = ?8 WHERE year = ?1",
    )
    .bind(year, next.title, next.eventDate, next.seasonOpen, next.closing, next.prepFrom, next.status, nowIso())
    .run();
  await log(db, "jaar aangepast", `${year}: ${JSON.stringify(next)}`);
  // Een handmatige keuze rekent zijn einde opnieuw uit met de nieuwe planning.
  const { years, control } = await load(db);
  if (control.override && control.auto)
    await db.prepare("UPDATE event_control SET override_until = ?1 WHERE id = 1").bind(overrideUntilFor(years, control, Date.now())).run();
  return adminStatus(db);
}

// Nieuw evenementjaar voorbereiden: de instellingen van het laatste jaar een jaar later, als concept. Inschrijvingen,
// GPS-registraties en foto's horen bij hun eigen jaar en worden nooit meegekopieerd.
async function prepareYear(db: D1Database) {
  const last = await db.prepare("SELECT * FROM event_years ORDER BY year DESC LIMIT 1").first<YearRow>();
  if (!last) return fail(409, "VERBODEN", "Er is nog geen evenementjaar om van te vertrekken.");
  const draft = nextYearDraft(toYear(last));
  await db
    .prepare("INSERT INTO event_years (year, title, event_date, season_open, closing, prep_from, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'concept')")
    .bind(draft.year, draft.title, draft.eventDate, draft.seasonOpen, draft.closing, draft.prepFrom)
    .run();
  await log(db, "nieuw evenementjaar", String(draft.year));
  return adminStatus(db);
}

// /api/beheer/sinterklaas[/jaren/<jaar>]: GET = status; POST {action}: "site" (publiceer website / heropen),
// "bedankt" (publiceer bedankpagina), "afsluiten" (stop de live GPS en toon de bedankpagina), "automatisch" (hef de
// handmatige keuze op), "planning-uit" / "planning-aan", "nieuw-jaar". PATCH /jaren/<jaar> = jaar aanpassen.
export async function handleEventAdmin(request: Request, db: D1Database, path: string[]) {
  const [, sub, key, ...rest] = path;
  const method = request.method;
  try {
    if (!sub && method === "GET") return await adminStatus(db);
    if (sub === "jaren" && key && !rest.length && method === "PATCH") {
      const year = Number(key);
      if (!Number.isInteger(year)) return fail(404, "NIET_GEVONDEN", "Onbekend evenementjaar.");
      return await saveYear(request, db, year);
    }
    if (sub || method !== "POST") return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
    const body = (await readJson(request)) ?? {};
    switch (body.action) {
      case "site":
        await setOverride(db, "site", "Sinterklaaswebsite gepubliceerd");
        break;
      case "bedankt":
        await setOverride(db, "bedankt", "bedankpagina gepubliceerd");
        break;
      case "afsluiten":
        await stopLiveGps(db);
        await setOverride(db, "bedankt", "Sinterklaasstoet afgesloten (live GPS gestopt)");
        break;
      case "automatisch":
        await setOverride(db, null, "terug naar automatische planning");
        break;
      case "planning-uit": {
        // De huidige weergave blijft staan tot de beheerder iets anders kiest.
        const { years, control } = await load(db);
        const phase = computePhase(years, control, Date.now(), await liveGpsBusy(db));
        await db.prepare("UPDATE event_control SET auto = 0 WHERE id = 1").run();
        await db
          .prepare("UPDATE event_control SET override = ?1, override_at = ?2, override_until = NULL, updated_at = ?2 WHERE id = 1")
          .bind(phase.show, nowIso())
          .run();
        await log(db, "automatische planning uitgeschakeld", `weergave ${phase.show} blijft`);
        break;
      }
      case "planning-aan":
        await db.prepare("UPDATE event_control SET auto = 1, override = NULL, override_at = NULL, override_until = NULL, updated_at = ?1 WHERE id = 1").bind(nowIso()).run();
        await log(db, "automatische planning ingeschakeld");
        break;
      case "nieuw-jaar":
        return await prepareYear(db);
      default:
        return fail(400, "VALIDATIE", "Onbekende handeling.");
    }
    return await adminStatus(db);
  } catch (error) {
    if (missingTable(error))
      return fail(503, "NIET_GECONFIGUREERD", "Het Sinterklaasbeheer is nog niet ingesteld: de databasemigratie 0013 ontbreekt.");
    throw error;
  }
}
