// Rekenwerk voor het scherm "Bezoekersstatistieken" in het beheer. Zuivere functies, getest in tests/bezoek.test.mjs.
import { dagVerschuiven, type AdminStats, type DagCijfers, type PeriodeKeuze } from "./paginas.ts";

// Het aantal dagen van een periode; "alles" loopt van de eerste getelde dag tot en met vandaag.
export function aantalDagen(stats: Pick<AdminStats, "today" | "since">, periode: PeriodeKeuze) {
  if (periode !== "alles") return periode;
  if (!stats.since) return 1;
  const ms = Date.parse(`${stats.today}T12:00:00Z`) - Date.parse(`${stats.since}T12:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

// Elke dag van de periode, oudste eerst, ook de dagen zonder bezoek (0).
export function dagenReeks(days: DagCijfers[], today: string, count: number): DagCijfers[] {
  const known = new Map(days.map((d) => [d.day, d]));
  return Array.from({ length: count }, (_, i) => {
    const day = dagVerschuiven(today, i - count + 1);
    return known.get(day) ?? { day, visits: 0, views: 0 };
  });
}

const sum = (days: DagCijfers[]) =>
  days.reduce((total, d) => ({ visits: total.visits + d.visits, views: total.views + d.views }), { visits: 0, views: 0 });

// De som van een dag, bijvoorbeeld vandaag (offset 0) of gisteren (offset -1).
export const dagSom = (stats: Pick<AdminStats, "days" | "today">, offset: number) =>
  sum(dagenReeks(stats.days, dagVerschuiven(stats.today, offset), 1));

export type PeriodeSom = {
  visits: number;
  views: number;
  // De even lange periode vlak ervoor; null als de teller toen nog niet (de hele tijd) liep: dan valt er niets eerlijk te vergelijken.
  previous: { visits: number; views: number } | null;
};

export function periodeSom(stats: Pick<AdminStats, "days" | "today" | "since">, count: number): PeriodeSom {
  const current = sum(dagenReeks(stats.days, stats.today, count));
  const previousStart = dagVerschuiven(stats.today, -2 * count + 1);
  const comparable = stats.since !== null && stats.since <= previousStart;
  return {
    ...current,
    previous: comparable ? sum(dagenReeks(stats.days, dagVerschuiven(stats.today, -count), count)) : null,
  };
}

// "12 % meer", "8 % minder", "evenveel"; null als vergelijken niet kan (geen vorige periode, of die was 0).
export function verschilTekst(current: number, previous: number | null | undefined) {
  if (previous === null || previous === undefined || previous === 0) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return "evenveel";
  return `${Math.abs(percent)} % ${percent > 0 ? "meer" : "minder"}`;
}
