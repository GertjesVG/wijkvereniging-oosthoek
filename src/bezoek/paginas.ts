// Bezoekersteller: wat de website, de server en het beheer delen. Alleen wisbare TypeScript, zonder imports
// (server/bezoek.ts en de Node-tests gebruiken dit bestand rechtstreeks).
//
// Wat geteld wordt, per dag (Belgische tijd) en per pagina, zonder cookie, browseropslag, IP-adres of ander kenmerk:
// - paginaweergave: een pagina van de website wordt geopend;
// - bezoek: iemand komt op de website aan van buitenaf (link, QR-code, zoekmachine, zelf getypt adres).
//   Verder klikken binnen de website, vernieuwen of teruggaan is geen nieuw bezoek.
// Unieke bezoekers bestaan hier bewust niet: daarvoor zou de website een bezoeker moeten kunnen herkennen.

export type BezoekSite = "wijk" | "sinterklaas";

// Elke pagina die geteld wordt, met de naam die het beheer toont. Iets anders telt de server niet.
export const bezoekPaginas: Record<string, string> = {
  wijk: "Wijkvereniging: startpagina",
  "wijk/pasen": "Wijkvereniging: Pasen",
  "wijk/garageverkoop": "Wijkvereniging: garageverkoop",
  "wijk/wijkfeest": "Wijkvereniging: wijkfeest",
  "wijk/sponsors": "Onze sponsors",
  "wijk/lief-en-leed": "Lief en leed",
  "wijk/wijkhuis": "Wijkhuis",
  "sinterklaas/home": "Sinterklaas: startpagina",
  "sinterklaas/cadeauactie": "Sinterklaas: cadeauactie en inschrijven",
  "sinterklaas/kleurwedstrijd": "Sinterklaas: kleurwedstrijd",
  "sinterklaas/route": "Sinterklaas: route",
  "sinterklaas/praktisch": "Sinterklaas: praktische informatie",
  "sinterklaas/contact": "Sinterklaas: contact",
  "sinterklaas/privacy": "Sinterklaas: privacy",
};

export const isBezoekPagina = (page: unknown): page is string => typeof page === "string" && Object.hasOwn(bezoekPaginas, page);

// De pagina die bij een adres hoort; null = niet tellen (onbekende pagina, of een adres dat meteen doorstuurt).
export function paginaVan(site: BezoekSite, pathname: string, search: string, hash: string): string | null {
  const route = hash.startsWith("#/") ? hash.slice(2).split("?")[0] : null;
  if (site === "wijk") {
    // "#activiteiten" en andere ankers horen bij de startpagina; "#/pasen" is een eigen pagina.
    const page = route === null ? "wijk" : `wijk/${route}`;
    return isBezoekPagina(page) ? page : null;
  }
  // Het kale /sinterklaas/-adres (gedrukte QR-codes) stuurt door naar de wijkpagina: zie index.html.
  if (pathname === "/sinterklaas/" && !search && !hash) return null;
  const page = `sinterklaas/${route ?? (hash.replace(/^#\/?/, "").split("?")[0] || "home")}`;
  return isBezoekPagina(page) ? page : null;
}

// "2026-11-14" in Belgische tijd: daar wisselt de dag, niet in UTC.
export const dagInBrussel = (now: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(now);

// Kalenderdagen optellen bij "2026-11-14"; rekent op de middag in UTC, zodat zomer- en wintertijd niets verschuiven.
export function dagVerschuiven(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const PERIODES = [7, 30, 90] as const;
export type PeriodeKeuze = (typeof PERIODES)[number] | "alles";

export type DagCijfers = { day: string; visits: number; views: number };
export type PaginaCijfers = { page: string; visits: number; views: number };

// Antwoord van GET /api/beheer/statistieken.
export type AdminStats = {
  // Vandaag in Belgische tijd, volgens de server.
  today: string;
  updatedAt: string;
  // Eerste dag met een telling; null = nog niets geteld.
  since: string | null;
  totals: { visits: number; views: number };
  // Alleen dagen met een telling, oplopend; dagen zonder bezoek ontbreken (= 0).
  days: DagCijfers[];
  // Per periode de pagina's, meest bekeken eerst.
  pages: Record<PeriodeKeuze, PaginaCijfers[]>;
};
