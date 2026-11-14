// Bezoekersteller (tabel visit_days, migratie 0010; uitleg in src/bezoek/paginas.ts).
// - POST /api/bezoek (openbaar): de website meldt een paginaweergave en eventueel een bezoek. De server bewaart alleen
//   twee aantallen per dag en per pagina. Het IP-adres en de browsergegevens van de aanvraag worden niet gelezen of bewaard.
// - GET /api/beheer/statistieken (alleen na het inloggen; server/beheer.ts controleert de sessie): de cijfers.
// Het antwoord op een melding is altijd 204, ook zonder database of tabel: de website mag nooit last hebben van de teller.
import {
  bezoekPaginas,
  dagInBrussel,
  dagVerschuiven,
  isBezoekPagina,
  PERIODES,
  type AdminStats,
  type DagCijfers,
  type PaginaCijfers,
} from "../src/bezoek/paginas.ts";
import { errorMessage, fail, json, nowIso, readJson, type Env } from "./basis.ts";

// Zoekrobots en voorbeeldophalers (WhatsApp, Facebook) zijn geen bezoekers. De meeste voeren het script niet eens uit.
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|monitor|curl|wget/i;

// Alleen meldingen van de website zelf: de browser zegt er zelf bij dat de aanvraag van dezelfde site komt.
function fromOwnSite(request: Request) {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

const flag = (value: unknown) => (value === 1 || value === true ? 1 : value === 0 || value === false || value === undefined ? 0 : null);

export async function recordVisit(request: Request, env: Env) {
  const done = () => json(null, 204);
  const db = env.DB;
  if (!db || !fromOwnSite(request) || ROBOT.test(request.headers.get("User-Agent") ?? "")) return done();
  const body = await readJson(request);
  const visit = flag(body?.b);
  const view = flag(body?.w);
  if (!body || !isBezoekPagina(body.p) || visit === null || view === null || visit + view === 0) return done();
  try {
    await db
      .prepare(
        `INSERT INTO visit_days (day, page, views, visits) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (day, page) DO UPDATE SET views = views + excluded.views, visits = visits + excluded.visits`,
      )
      .bind(dagInBrussel(), body.p, view, visit)
      .run();
  } catch (error) {
    // Ontbrekende tabel (migratie 0010 nog niet uitgevoerd) of een storing: niets tellen, de bezoeker merkt niets.
    console.error("bezoek", errorMessage(error));
  }
  return done();
}

const PAGES_SQL = `SELECT page, SUM(visits) AS visits, SUM(views) AS views FROM visit_days
  WHERE day >= ?1 GROUP BY page ORDER BY views DESC, visits DESC, page`;

export async function handleStatsAdmin(request: Request, db: D1Database, path: string[]) {
  if (path.length !== 1 || request.method !== "GET") return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
  const today = dagInBrussel();
  try {
    const [days, ...pages] = await db.batch<DagCijfers | PaginaCijfers>([
      db.prepare("SELECT day, SUM(visits) AS visits, SUM(views) AS views FROM visit_days GROUP BY day ORDER BY day"),
      ...PERIODES.map((count) => db.prepare(PAGES_SQL).bind(dagVerschuiven(today, 1 - count))),
      db.prepare(PAGES_SQL).bind("0000-00-00"),
    ]);
    const dayRows = days.results as DagCijfers[];
    // Alleen pagina's die de website nu kent (een oude naam uit een vorige versie krijgt geen eigen regel).
    const known = (rows: unknown[]) => (rows as PaginaCijfers[]).filter((row) => Object.hasOwn(bezoekPaginas, row.page));
    const stats: AdminStats = {
      today,
      updatedAt: nowIso(),
      since: dayRows[0]?.day ?? null,
      totals: dayRows.reduce((t, d) => ({ visits: t.visits + d.visits, views: t.views + d.views }), { visits: 0, views: 0 }),
      days: dayRows,
      pages: {
        7: known(pages[0].results),
        30: known(pages[1].results),
        90: known(pages[2].results),
        alles: known(pages[3].results),
      },
    };
    return json(stats);
  } catch (error) {
    if (errorMessage(error).includes("no such table"))
      return fail(503, "NIET_GECONFIGUREERD", "De bezoekersteller is nog niet ingesteld. De website werkt intussen gewoon verder.");
    throw error;
  }
}
