import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { bezoekPaginas, PERIODES, type AdminStats, type PeriodeKeuze } from "../bezoek/paginas";
import { aantalDagen, dagSom, dagenReeks, periodeSom, verschilTekst } from "../bezoek/statistiek";
import { api, describeError } from "./client";
import { ErrorNote, formatDateTime, formatDay } from "./ui";

// Bezoekersstatistieken (teller: src/bezoek/teller.ts, opslag: server/bezoek.ts). Alleen aantallen per dag en per pagina;
// de uitleg van "bezoek" en "paginaweergave" staat in src/bezoek/paginas.ts en onderaan dit scherm.

const number = new Intl.NumberFormat("nl-BE");
const shortDay = new Intl.DateTimeFormat("nl-BE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (day: string) => shortDay.format(new Date(`${day}T12:00:00Z`));
const plural = (count: number, one: string, many: string) => `${number.format(count)} ${count === 1 ? one : many}`;

const periodLabels: Record<PeriodeKeuze, string> = { 7: "7 dagen", 30: "30 dagen", 90: "90 dagen", alles: "Alles" };
const periodChoices: PeriodeKeuze[] = [...PERIODES, "alles"];

function Card({ label, value, hint }: { label: string; value: number; hint?: string | null }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{number.format(value)}</dd>
      {hint && <small>{hint}</small>}
    </div>
  );
}

// "12 % meer dan de 7 dagen ervoor"; zonder eerlijke vergelijking geen tekst.
const comparison = (current: number, previous: number | undefined, count: number) => {
  const text = verschilTekst(current, previous);
  if (!text) return null;
  return text === "evenveel" ? `Evenveel als de ${count} dagen ervoor` : `${text} dan de ${count} dagen ervoor`;
};

function DayChart({ stats, period }: { stats: AdminStats; period: PeriodeKeuze }) {
  const count = aantalDagen(stats, period);
  const days = dagenReeks(stats.days, stats.today, count);
  const top = Math.max(1, ...days.map((d) => d.visits));
  const total = periodeSom(stats, count);
  const compare = period === "alles" ? null : comparison(total.visits, total.previous?.visits, count);
  return (
    <div className="stats-chart-block">
      <p className="stats-summary">
        <strong>{plural(total.visits, "bezoek", "bezoeken")}</strong> en {plural(total.views, "paginaweergave", "paginaweergaven")}{" "}
        {period === "alles" ? "sinds het begin van de telling" : `in de afgelopen ${count} dagen`}.
        {compare && <span className="muted"> {compare}.</span>}
      </p>
      <div className="stats-chart" role="img" aria-label={`Bezoeken per dag, ${periodLabels[period].toLowerCase()}. De cijfers staan ook in de tabel hieronder.`}>
        <span className="stats-chart-top" aria-hidden="true">
          {number.format(top)}
        </span>
        <div className="stats-bars" aria-hidden="true">
          {days.map((d) => (
            <span
              key={d.day}
              className={`stats-bar${d.day === stats.today ? " is-today" : ""}`}
              title={`${dayLabel(d.day)}: ${plural(d.visits, "bezoek", "bezoeken")}, ${plural(d.views, "paginaweergave", "paginaweergaven")}`}
            >
              <i style={{ height: `${(d.visits / top) * 100}%` }} />
            </span>
          ))}
        </div>
        <div className="stats-axis" aria-hidden="true">
          <span>{dayLabel(days[0].day)}</span>
          <span>vandaag</span>
        </div>
      </div>
      <details className="stats-table">
        <summary>Cijfers per dag als tabel</summary>
        <div className="table-wrap">
          <table className="history">
            <thead>
              <tr>
                <th scope="col">Dag</th>
                <th scope="col">Bezoeken</th>
                <th scope="col">Paginaweergaven</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day}>
                  <th scope="row">{dayLabel(d.day)}</th>
                  <td>{number.format(d.visits)}</td>
                  <td>{number.format(d.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function PopularPages({ stats, period }: { stats: AdminStats; period: PeriodeKeuze }) {
  const pages = stats.pages[period];
  const top = Math.max(1, ...pages.map((p) => p.views));
  if (!pages.length) return <p className="muted">In deze periode is nog geen pagina bekeken.</p>;
  return (
    <ol className="stats-pages">
      {pages.map((p) => (
        <li key={p.page}>
          <div className="stats-page-head">
            <strong>{bezoekPaginas[p.page]}</strong>
            <span>{plural(p.views, "keer bekeken", "keer bekeken")}</span>
          </div>
          <div className="stats-page-bar" aria-hidden="true">
            <i style={{ width: `${(p.views / top) * 100}%` }} />
          </div>
          <small className="muted">{plural(p.visits, "bezoek begon", "bezoeken begonnen")} op deze pagina</small>
        </li>
      ))}
    </ol>
  );
}

export function StatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<PeriodeKeuze>(7);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setStats(await api.stats());
    } catch (e) {
      // De vorige cijfers blijven staan; de melding zegt dat ze niet ververst zijn.
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const today = stats ? dagSom(stats, 0) : null;
  const yesterday = stats ? dagSom(stats, -1) : null;
  const week = stats ? periodeSom(stats, 7) : null;
  const month = stats ? periodeSom(stats, 30) : null;

  return (
    <section className="panel stats-panel" aria-labelledby="stats-title">
      <div className="panel-top">
        <div>
          <h2 id="stats-title">Bezoekersstatistieken</h2>
          <p className="muted small">
            Hoe vaak de website bezocht wordt en welke pagina's het meest bekeken worden. Alleen aantallen: geen namen,
            IP-adressen of cookies. Een bezoek is geen persoon: wie drie keer komt, telt als drie bezoeken.
          </p>
        </div>
        <div className="stats-refresh">
          <button type="button" className="btn btn-small" onClick={load} disabled={busy}>
            <RefreshCw size={15} aria-hidden="true" />
            {busy ? "Bezig…" : "Vernieuwen"}
          </button>
          <small className="muted" aria-live="polite">
            {stats ? `Laatst bijgewerkt: ${formatDateTime(stats.updatedAt)}` : " "}
          </small>
        </div>
      </div>

      {error && (
        <ErrorNote>
          {stats ? "De cijfers konden niet vernieuwd worden; je ziet de vorige. " : "De cijfers zijn tijdelijk niet beschikbaar. "}
          {error}
        </ErrorNote>
      )}
      {!stats && !error && <p className="muted">Cijfers laden…</p>}

      {stats && today && yesterday && week && month && (
        <>
          {!stats.since && (
            <p className="note">
              Er zijn nog geen bezoeken geteld. De teller begint vanzelf zodra iemand de website opent.
            </p>
          )}
          <dl className="stats stats-cards">
            <Card label="Bezoeken vandaag" value={today.visits} hint={plural(today.views, "paginaweergave", "paginaweergaven")} />
            <Card label="Bezoeken gisteren" value={yesterday.visits} hint={plural(yesterday.views, "paginaweergave", "paginaweergaven")} />
            <Card label="Bezoeken afgelopen 7 dagen" value={week.visits} hint={comparison(week.visits, week.previous?.visits, 7)} />
            <Card label="Bezoeken afgelopen 30 dagen" value={month.visits} hint={comparison(month.visits, month.previous?.visits, 30)} />
            <Card
              label="Totaal aantal bezoeken"
              value={stats.totals.visits}
              hint={stats.since ? `sinds ${formatDay(stats.since)}` : "nog geen telling"}
            />
            <Card label="Totaal aantal paginaweergaven" value={stats.totals.views} hint={stats.since ? `sinds ${formatDay(stats.since)}` : null} />
          </dl>

          <div className="stats-period" role="group" aria-label="Periode van de grafiek en de lijst">
            {periodChoices.map((choice) => (
              <button
                key={choice}
                type="button"
                className="btn btn-small"
                aria-pressed={period === choice}
                onClick={() => setPeriod(choice)}
              >
                {periodLabels[choice]}
              </button>
            ))}
          </div>

          <h3 className="stats-heading">Bezoeken per dag</h3>
          <DayChart stats={stats} period={period} />

          <h3 className="stats-heading">Populairste pagina's</h3>
          <PopularPages stats={stats} period={period} />

          <div className="stats-help">
            <h3 className="stats-heading">Wat betekenen deze cijfers?</h3>
            <ul>
              <li>
                <strong>Bezoek:</strong> iemand komt van buitenaf op de website aan: via een link (Facebook, WhatsApp, mail),
                een QR-code, een zoekmachine of door het adres te typen. Verder klikken binnen de website, de pagina
                vernieuwen of teruggaan is geen nieuw bezoek. Wie vandaag twee keer komt, telt als twee bezoeken.
              </li>
              <li>
                <strong>Paginaweergave:</strong> elke pagina die iemand echt te zien krijgt, ook na doorklikken, vernieuwen
                of teruggaan. Eén bezoek geeft dus meestal meerdere paginaweergaven. Een tabblad dat op de achtergrond
                blijft, telt pas als het geopend wordt.
              </li>
              <li>
                <strong>Unieke personen</strong> kunnen we niet tellen: daarvoor zou de website mensen moeten herkennen met
                een cookie of een ander kenmerk, en dat doen we bewust niet. Tien bezoeken kunnen dus van tien mensen komen,
                of van drie mensen die vaker terugkwamen.
              </li>
              <li>
                <strong>Wat niet meetelt:</strong> het beheer, zoekrobots en de voorbeeldjes die WhatsApp of Facebook van een
                link ophalen. Houdt de browser of een advertentieblokker van een bezoeker de telling tegen, dan missen we
                dat bezoek. De cijfers zijn daarom eerder iets te laag dan te hoog.
              </li>
              <li>Een dag loopt van middernacht tot middernacht, Belgische tijd.</li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
