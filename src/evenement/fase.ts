// Evenementfasen van de Sinterklaaswebsite: welke weergave bezoekers krijgen (de volledige website of de bedankpagina)
// en wanneer dat automatisch wisselt. Eén bron voor de server (server/evenement.ts), de website en het beheer.
// Alleen wisbare TypeScript zonder imports: de Node-tests gebruiken dit bestand rechtstreeks.
//
// Alle tijdstippen in het beheer zijn Belgische tijd ("2026-11-28T20:00", Europe/Brussels). De server rekent ze om
// naar een vast tijdstip; zomer- en wintertijd volgen vanzelf. Er staan hier geen jaartallen of datums in de code:
// die komen uit de tabel event_years (migratie 0013) en zijn in het beheer aan te passen.

export const TIME_ZONE = "Europe/Brussels";

// Eén evenementjaar zoals het beheer het bewaart. "concept" = in voorbereiding, onzichtbaar voor bezoekers;
// "gepland" = gepubliceerd: de website opent op seasonOpen en sluit op closing (zie autoState).
export type EventYear = {
  year: number;
  title: string;
  eventDate: string | null; // "2026-11-28"
  seasonOpen: string; // "2026-10-01T00:00", Belgische tijd
  closing: string | null; // "2026-11-28T20:00", Belgische tijd
  prepFrom: string | null; // "2027-09-01T00:00", Belgische tijd: vanaf dan toont het beheer "Voorbereiding"
  status: "concept" | "gepland";
};

// Handmatige bediening. override = de keuze van de beheerder; die gaat voor tot overrideUntil (de eerstvolgende
// automatische wijziging op het moment van de keuze). overrideUntil null = tot de beheerder ze zelf opheft.
export type Control = {
  auto: boolean;
  override: Show | null;
  overrideAt: string | null;
  overrideUntil: string | null;
};

export type Show = "site" | "bedankt";
export type Stage = "seizoen" | "afsluiting-wacht" | "afgesloten" | "voorbereiding";

export type NextChange = { at: string | null; show: Show; year: number; waitsForGps?: boolean };

export type Phase = {
  show: Show;
  year: number | null; // het evenementjaar waarvan de website of bedankpagina getoond wordt
  stage: Stage;
  source: "automatisch" | "handmatig";
  overrideUntil: string | null;
  next: NextChange | null; // de eerstvolgende automatische wijziging (zonder rekening te houden met de handmatige keuze)
  closingPending: boolean; // afsluitingstijd voorbij, maar de live GPS loopt nog of staat op pauze
};

// Wat elke bezoeker krijgt (GET /api/evenement). Geen GPS-details of beheerinformatie.
export type PublicPhase = { show: Show; year: number | null; refreshSeconds: number };

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const validLocal = (value: unknown): value is string => typeof value === "string" && LOCAL.test(value) && brusselsToMs(value) !== null;
export const validDay = (value: unknown): value is string =>
  typeof value === "string" && DAY.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().startsWith(value);

// Verschil tussen Belgische tijd en UTC op een bepaald tijdstip, in milliseconden.
function brusselsOffsetMs(ms: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return local - Math.floor(ms / 1000) * 1000;
}

// "2026-11-28T20:00" (Belgische tijd) → milliseconden sinds 1970; null bij een ongeldige waarde.
export function brusselsToMs(local: string | null | undefined): number | null {
  const m = typeof local === "string" ? LOCAL.exec(local) : null;
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(asUtc).getUTCDate() !== d) return null;
  let guess = asUtc - brusselsOffsetMs(asUtc);
  guess = asUtc - brusselsOffsetMs(guess);
  return guess;
}

// Tijdstip → "2026-11-28T20:00" in Belgische tijd.
export function msToBrussels(ms: number) {
  const local = new Date(ms + brusselsOffsetMs(ms));
  return local.toISOString().slice(0, 16);
}

const iso = (ms: number) => new Date(ms).toISOString();

type Planned = EventYear & { openMs: number; closeMs: number | null };

function planned(years: EventYear[]): Planned[] {
  return years
    .filter((y) => y.status === "gepland")
    .map((y) => ({ ...y, openMs: brusselsToMs(y.seasonOpen) ?? Number.NaN, closeMs: brusselsToMs(y.closing) }))
    .filter((y) => !Number.isNaN(y.openMs))
    .sort((a, b) => a.openMs - b.openMs || a.year - b.year);
}

// De automatische planning, zonder handmatige keuze:
// - het laatst geopende geplande jaar is "actief" van seasonOpen tot closing;
// - na closing de bedankpagina, maar pas wanneer de live GPS niet meer loopt of pauzeert (gpsBusy): een lopende stoet
//   wordt nooit onderbroken;
// - vóór de eerste opening of tussen twee seizoenen: de bedankpagina van het laatst afgesloten jaar.
export function autoState(years: EventYear[], nowMs: number, gpsBusy: boolean) {
  const list = planned(years);
  const current = [...list].reverse().find((y) => y.openMs <= nowMs) ?? null;
  if (current && (current.closeMs === null || nowMs < current.closeMs))
    return { show: "site" as Show, year: current.year, pending: false };
  if (current && gpsBusy) return { show: "site" as Show, year: current.year, pending: true };
  if (current) return { show: "bedankt" as Show, year: current.year, pending: false };
  const lastClosed = [...years]
    .filter((y) => (brusselsToMs(y.closing) ?? Infinity) <= nowMs)
    .sort((a, b) => b.year - a.year)[0];
  return { show: "bedankt" as Show, year: lastClosed?.year ?? null, pending: false };
}

// De eerstvolgende automatische wijziging na nowMs.
export function nextAutoChange(years: EventYear[], nowMs: number, gpsBusy: boolean): NextChange | null {
  const list = planned(years);
  const state = autoState(years, nowMs, gpsBusy);
  if (state.show === "site" && state.pending) return { at: null, show: "bedankt", year: state.year!, waitsForGps: true };
  if (state.show === "site") {
    const current = list.find((y) => y.year === state.year);
    if (current?.closeMs != null) return { at: iso(current.closeMs), show: "bedankt", year: current.year };
    return null;
  }
  const upcoming = list.find((y) => y.openMs > nowMs);
  return upcoming ? { at: iso(upcoming.openMs), show: "site", year: upcoming.year } : null;
}

const overrideActive = (control: Control, nowMs: number) =>
  Boolean(control.override && (control.overrideUntil === null || nowMs < Date.parse(control.overrideUntil)));

export function computePhase(years: EventYear[], control: Control, nowMs: number, gpsBusy: boolean): Phase {
  const auto = autoState(years, nowMs, gpsBusy);
  const next = nextAutoChange(years, nowMs, gpsBusy);
  const manual = overrideActive(control, nowMs);
  const show = manual ? control.override! : auto.show;
  const closingPending = !manual && auto.pending;
  // Het getoonde jaar: bij een handmatige keuze het jaar van de automatische planning (of het laatste jaar).
  const year = auto.year ?? (years.length ? Math.max(...years.map((y) => y.year)) : null);
  let stage: Stage = show === "site" ? (closingPending ? "afsluiting-wacht" : "seizoen") : "afgesloten";
  if (show === "bedankt") {
    const preparing = years.some((y) => {
      const prep = brusselsToMs(y.prepFrom);
      const open = brusselsToMs(y.seasonOpen);
      return prep !== null && open !== null && prep <= nowMs && nowMs < open;
    });
    if (preparing) stage = "voorbereiding";
  }
  return {
    show,
    year,
    stage,
    source: manual ? "handmatig" : "automatisch",
    overrideUntil: manual ? control.overrideUntil : null,
    next,
    closingPending,
  };
}

// Tot wanneer een handmatige keuze geldt: tot de eerstvolgende automatische wijziging, of (planning uit) tot de
// beheerder ze opheft. Een wachtende afsluiting telt niet als tijdstip.
export function overrideUntilFor(years: EventYear[], control: Pick<Control, "auto">, nowMs: number): string | null {
  if (!control.auto) return null;
  const next = nextAutoChange(years, nowMs, false);
  return next?.at ?? null;
}

export function publicPhase(phase: Phase, nowMs: number): PublicPhase {
  const base = phase.show === "site" ? 60 : 300;
  const candidates = [base];
  const until = phase.source === "handmatig" ? phase.overrideUntil : phase.next?.at ?? null;
  if (until) candidates.push(Math.max(15, Math.ceil((Date.parse(until) - nowMs) / 1000) + 2));
  return { show: phase.show, year: phase.year, refreshSeconds: Math.min(...candidates) };
}

// Teksten met {jaar} en {volgend jaar}: zo hoeft niemand een jaartal in een tekst aan te passen.
export function fillYear(text: string, year: number | null) {
  if (year === null) return text;
  return text.replaceAll("{jaar}", String(year)).replaceAll("{volgend jaar}", String(year + 1));
}

// Hetzelfde evenementjaar een jaar later, als concept: alleen de instellingen, nooit inschrijvingen, GPS of foto's.
export function nextYearDraft(from: EventYear): EventYear {
  const shift = (value: string | null) => (value ? `${Number(value.slice(0, 4)) + 1}${value.slice(4)}` : null);
  const year = from.year + 1;
  return {
    year,
    title: from.title.replaceAll(String(from.year), String(year)),
    eventDate: null,
    seasonOpen: shift(from.seasonOpen)!,
    closing: null,
    prepFrom: shift(from.prepFrom) ?? `${year}-09-01T00:00`,
    status: "concept",
  };
}
