// De inschrijvingsperiode: één bron voor server, beheer en website. Bewust zonder imports.
// Momenten staan in UTC, in de vorm van toISOString, zodat tekstvergelijking klopt, ook in de database (migratie 0008).
// Begin inbegrepen, einde niet: "tot 28 november 00:00" betekent dat 27 november de laatste dag is.
// Teksten en invoervelden gebruiken altijd Belgische tijd, waar de bezoeker of beheerder ook zit.

export type RegistrationPeriod = { opensAt: string; closesAt: string };
export type RegistrationStatus = "open" | "closed" | "full" | "upcoming";
export type PeriodPhase = "before" | "during" | "after";

const brusselsFormat = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Brussels",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function brusselsParts(iso: string) {
  const parts = brusselsFormat.formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") };
}
type Parts = ReturnType<typeof brusselsParts>;

// "2026-11-09T23:00:00.000Z" → "2026-11-10T00:00", de waarde van een datetime-local-veld.
export function toBrusselsInput(iso: string) {
  const p = brusselsParts(iso);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Omgekeerd; null = geen geldige datum, of een uur dat op die dag niet bestaat (zomertijd in maart).
// Komt een uur twee keer voor (wintertijd in oktober), dan telt het eerste.
export function fromBrusselsInput(text: unknown): string | null {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return null;
  const asUtc = Date.parse(`${text}:00.000Z`);
  if (Number.isNaN(asUtc)) return null;
  for (const offsetHours of [2, 1]) {
    const iso = new Date(asUtc - offsetHours * 3600_000).toISOString();
    if (toBrusselsInput(iso) === text) return iso;
  }
  return null;
}

export function periodPhase(period: RegistrationPeriod, now = new Date().toISOString()): PeriodPhase {
  if (now < period.opensAt) return "before";
  return now < period.closesAt ? "during" : "after";
}

// Wat een bezoeker nu kan. manual = de schakelaar in het beheer: gesloten gaat altijd voor, open laat de periode beslissen.
// Geen periode = dicht. Na het einde heropent niets vanzelf. available null = geen maximum (of niet meegeteld).
export function registrationStatus(
  manual: "open" | "closed",
  period: RegistrationPeriod | null,
  available: number | null,
  now = new Date().toISOString(),
): RegistrationStatus {
  if (manual !== "open" || !period) return "closed";
  const phase = periodPhase(period, now);
  if (phase === "before") return "upcoming";
  if (phase === "after") return "closed";
  return available === 0 ? "full" : "open";
}

const dayText = (p: Parts, withYear = true) => `${Number(p.day)} ${MONTHS[Number(p.month) - 1]}${withYear ? ` ${p.year}` : ""}`;
const hourText = (p: Parts) => `${Number(p.hour)}.${p.minute} uur`;
const atMidnight = (p: Parts) => p.hour === "00" && p.minute === "00";

// Eindigt de periode om middernacht, dan is de dag ervoor de laatste dag.
function endOf(period: RegistrationPeriod) {
  const end = brusselsParts(period.closesAt);
  if (!atMidnight(end)) return { end, wholeDay: false, text: `tot ${dayText(end)} om ${hourText(end)}` };
  const last = brusselsParts(new Date(Date.parse(period.closesAt) - 1).toISOString());
  return { end: last, wholeDay: true, text: `tot en met ${dayText(last)}` };
}

function rangeText(period: RegistrationPeriod) {
  const start = brusselsParts(period.opensAt);
  const { end, wholeDay, text } = endOf(period);
  const sameYear = start.year === end.year;
  const sameMonth = sameYear && start.month === end.month;
  if (atMidnight(start) && wholeDay && sameMonth && start.day === end.day) return `op ${dayText(start)}`;
  if (!atMidnight(start)) return `van ${dayText(start, !sameYear)} om ${hourText(start)} ${text}`;
  return `van ${sameMonth ? Number(start.day) : dayText(start, !sameYear)} ${text}`;
}

// De enige plek met deze zinnen: server, beheer en website halen ze hier.
export function registrationNotice(status: RegistrationStatus, period: RegistrationPeriod | null) {
  if (status === "full") return "De inschrijving is volzet. Alle cadeautjes zijn vergeven.";
  if (status === "closed" || !period) return "De inschrijvingen zijn gesloten.";
  return status === "upcoming"
    ? `Inschrijven mogelijk ${rangeText(period)}.`
    : `Inschrijvingen geopend ${endOf(period).text}.`;
}
