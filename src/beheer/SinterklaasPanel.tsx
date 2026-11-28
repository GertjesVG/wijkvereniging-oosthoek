import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Download, Eye, Lock, PenLine, RotateCcw, Unlock, Wand2 } from "lucide-react";
import type { AdminEventSummary } from "../inschrijving/api";
import type { EventYear, Stage } from "../evenement/fase";
import { api, describeError, type AdminEventPhase, type SinterklaasAction } from "./client";
import { ErrorNote, useAction } from "./ui";

// Sinterklaasbeheer (server/evenement.ts, logica in src/evenement/fase.ts): de fase van de Sinterklaaswebsite, de
// automatische planning per evenementjaar, afsluiten en heropenen, en de stand van de gereden route.

const when = new Intl.DateTimeFormat("nl-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Brussels",
});
const short = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Brussels",
});
const fmt = (iso: string | null) => (iso ? when.format(new Date(iso)) : "–");

const stageLabels: Record<Stage, string> = {
  seizoen: "Actief Sinterklaasseizoen",
  "afsluiting-wacht": "Einde evenement: afsluiting wacht op de stoet",
  afgesloten: "Afgesloten: bedankpagina",
  voorbereiding: "Voorbereiding nieuw evenement",
};
const registrationLabels = { open: "Open", closed: "Gesloten", full: "Volzet", upcoming: "Opent later" } as const;

function Confirm({
  label,
  question,
  confirmLabel,
  icon,
  tone = "primary",
  disabled,
  onConfirm,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  icon: ReactNode;
  tone?: "primary" | "danger" | "quiet";
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className={`btn btn-${tone}`} disabled={disabled} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </button>
    );
  return (
    <div className="confirm-box" role="alertdialog" aria-label={label}>
      <p>{question}</p>
      <div className="confirm-actions">
        <button
          type="button"
          className={`btn btn-${tone === "quiet" ? "primary" : tone}`}
          disabled={disabled}
          onClick={() => {
            setOpen(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
          Annuleren
        </button>
      </div>
    </div>
  );
}

function YearForm({ year, busy, onSave }: { year: EventYear; busy: boolean; onSave: (patch: Partial<EventYear>) => void }) {
  const [draft, setDraft] = useState(year);
  useEffect(() => setDraft(year), [year]);
  const changed = JSON.stringify(draft) !== JSON.stringify(year);
  const field = (key: "seasonOpen" | "closing" | "prepFrom", label: string, hint?: string) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="datetime-local"
        value={draft[key] ?? ""}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value || null })}
        disabled={busy}
      />
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
  return (
    <form
      className="year-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: draft.title,
          eventDate: draft.eventDate,
          seasonOpen: draft.seasonOpen,
          closing: draft.closing,
          prepFrom: draft.prepFrom,
        });
      }}
    >
      <div className="year-head">
        <h3>{year.year}</h3>
        <span className={`badge badge-${year.status === "gepland" ? "ok" : "muted"}`}>
          {year.status === "gepland" ? "Gepubliceerd (automatische planning)" : "Concept: onzichtbaar voor bezoekers"}
        </span>
      </div>
      <div className="year-grid">
        <label className="field">
          <span>Naam van het evenement</span>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={busy} />
        </label>
        <label className="field">
          <span>Datum van de stoet</span>
          <input
            type="date"
            value={draft.eventDate ?? ""}
            onChange={(e) => setDraft({ ...draft, eventDate: e.target.value || null })}
            disabled={busy}
          />
        </label>
        {field("prepFrom", "Voorbereiding vanaf", "Alleen een aanduiding in het beheer.")}
        {field("seasonOpen", "Seizoensopening", "Vanaf dan de volledige Sinterklaaswebsite.")}
        {field("closing", "Afsluiting", "Dan de bedankpagina, zodra de live GPS gestopt is.")}
      </div>
      <div className="year-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || !changed}>
          Opslaan
        </button>
        {year.status === "concept" ? (
          <Confirm
            label="Publiceer dit evenementjaar"
            question={`Evenement ${year.year} publiceren? De website opent dan automatisch op de seizoensopening (${draft.seasonOpen.replace("T", " om ")}). Is die al voorbij, dan meteen.`}
            confirmLabel="Ja, publiceren"
            icon={<Unlock size={15} aria-hidden="true" />}
            tone="quiet"
            disabled={busy || changed}
            onConfirm={() => onSave({ status: "gepland" })}
          />
        ) : (
          <Confirm
            label="Terug naar concept"
            question={`Evenement ${year.year} terug naar concept zetten? Dan opent of sluit de website voor dit jaar niet meer automatisch.`}
            confirmLabel="Ja, terug naar concept"
            icon={<RotateCcw size={15} aria-hidden="true" />}
            tone="quiet"
            disabled={busy || changed}
            onConfirm={() => onSave({ status: "concept" })}
          />
        )}
        {changed && <span className="muted small">Eerst opslaan.</span>}
      </div>
    </form>
  );
}

export function SinterklaasPanel({ events }: { events: AdminEventSummary[] }) {
  const [status, setStatus] = useState<AdminEventPhase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const action = useAction();

  const load = useCallback(async () => {
    try {
      setStatus(await api.sinterklaas());
      setLoadError(null);
    } catch (e) {
      setLoadError(describeError(e));
    }
  }, []);
  // Elke 30 s verversen zolang het scherm zichtbaar is: zo verschijnt de automatische afsluiting vanzelf.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const timer = setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const act = async (name: SinterklaasAction) => {
    const updated = await action.run(() => api.sinterklaasAction(name));
    if (updated) setStatus(updated);
  };
  const saveYear = async (year: number, patch: Partial<EventYear>) => {
    const updated = await action.run(() => api.saveYear(year, patch));
    if (updated) setStatus(updated);
  };

  if (!status)
    return (
      <section className="panel">
        <h2>Sinterklaasbeheer</h2>
        {loadError ? <ErrorNote>{loadError}</ErrorNote> : <p className="muted">Laden…</p>}
      </section>
    );

  const { phase, control, gps, years } = status;
  const year = phase.year;
  const registration = events.find((e) => e.id === `sinterklaas-${year}`);
  const next = phase.next;
  const nextText = !next
    ? "Geen geplande wijziging"
    : next.waitsForGps
      ? "Bedankpagina zodra de live GPS gestopt is"
      : `${next.show === "bedankt" ? "Bedankpagina" : `Sinterklaaswebsite ${next.year}`} op ${fmt(next.at)}`;
  const concept = years.find((y) => y.status === "concept" && y.year > (year ?? 0));
  const busy = action.busy;

  return (
    <>
      <section className="panel sint-panel" aria-labelledby="sint-title">
        <div className="panel-top">
          <div>
            <h2 id="sint-title">Sinterklaasbeheer</h2>
            <p className="muted small">De website wisselt vanzelf tussen de volledige Sinterklaaswebsite en de bedankpagina.</p>
          </div>
          <span className={`badge badge-${phase.show === "site" ? "ok" : "warn"}`}>
            Bezoekers zien: {phase.show === "site" ? "de Sinterklaaswebsite" : "de bedankpagina"}
          </span>
        </div>

        {phase.closingPending && (
          <p className="note note-warn" role="alert">
            <strong>De geplande afsluiting wacht.</strong> De afsluitingstijd is voorbij, maar de live GPS loopt nog of staat op
            pauze. De lopende stoet wordt niet onderbroken: de bedankpagina verschijnt automatisch zodra u de live GPS stopt
            (of met "Sluit Sinterklaasstoet af").
          </p>
        )}
        {phase.source === "handmatig" && (
          <p className="note">
            <strong>Handmatige keuze actief</strong> sinds {fmt(control.overrideAt)}:{" "}
            {control.override === "site" ? "de Sinterklaaswebsite" : "de bedankpagina"}.{" "}
            {phase.overrideUntil
              ? `De automatische planning neemt opnieuw over op ${fmt(phase.overrideUntil)}.`
              : control.auto
                ? "Er volgt geen automatische wijziging meer: deze keuze blijft tot u de automatische planning hervat."
                : "De automatische planning staat uit: deze keuze blijft tot u ze inschakelt."}
          </p>
        )}

        <dl className="sint-status">
          <div>
            <dt>Huidige evenementfase</dt>
            <dd>{stageLabels[phase.stage]}</dd>
          </div>
          <div>
            <dt>Actief evenementjaar</dt>
            <dd>{year ?? "–"}</dd>
          </div>
          <div>
            <dt>Huidige publieke weergave</dt>
            <dd>
              {phase.show === "site" ? "Volledige Sinterklaaswebsite" : "Bedankpagina met fotoalbum"}
              <small> · {phase.source === "handmatig" ? "handmatig" : "automatisch"}</small>
            </dd>
          </div>
          <div>
            <dt>Volgende geplande automatische wijziging</dt>
            <dd>{control.auto ? nextText : "Automatische planning staat uit"}</dd>
          </div>
          <div>
            <dt>Inschrijvingsstatus</dt>
            <dd>{registration ? registrationLabels[registration.publicStatus] : "–"}</dd>
          </div>
          <div>
            <dt>Live GPS</dt>
            <dd>{gps.busy ? "Actief of gepauzeerd" : "Uit"}</dd>
          </div>
          <div>
            <dt>Geregistreerde GPS-punten {year}</dt>
            <dd>
              {gps.track
                ? `${gps.track.points.toLocaleString("nl-BE")} punten · ${gps.track.sessions} sessies · ${gps.track.segments} segmenten`
                : "–"}
            </dd>
          </div>
          <div>
            <dt>Gepubliceerde foto's</dt>
            <dd>0 · het fotoalbum heeft nog geen foto's</dd>
          </div>
        </dl>

        <h3 className="sint-subtitle">Bediening</h3>
        <div className="sint-actions">
          {phase.show === "site" ? (
            <>
              <Confirm
                label="Sluit Sinterklaasstoet af"
                question="De live GPS stoppen (de positie verdwijnt meteen) en de bedankpagina tonen in plaats van de Sinterklaaswebsite? De gereden route blijft bewaard."
                confirmLabel="Ja, stoet afsluiten"
                icon={<Lock size={15} aria-hidden="true" />}
                tone="danger"
                disabled={busy}
                onConfirm={() => void act("afsluiten")}
              />
              <Confirm
                label="Publiceer bedankpagina"
                question={
                  gps.busy
                    ? "Let op: de live GPS loopt nog. Bezoekers zien dan de bedankpagina en niet meer de livekaart; de GPS zelf blijft lopen. Toch publiceren?"
                    : "De bedankpagina tonen in plaats van de Sinterklaaswebsite?"
                }
                confirmLabel="Ja, bedankpagina tonen"
                icon={<Lock size={15} aria-hidden="true" />}
                tone="quiet"
                disabled={busy}
                onConfirm={() => void act("bedankt")}
              />
            </>
          ) : (
            <Confirm
              label={phase.stage === "voorbereiding" ? "Publiceer Sinterklaaswebsite" : "Heropen evenement"}
              question="De volledige Sinterklaaswebsite opnieuw tonen aan alle bezoekers, in plaats van de bedankpagina?"
              confirmLabel="Ja, website tonen"
              icon={<Unlock size={15} aria-hidden="true" />}
              tone="quiet"
              disabled={busy}
              onConfirm={() => void act("site")}
            />
          )}
          {phase.source === "handmatig" && control.auto && (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void act("automatisch")}>
              <Wand2 size={15} aria-hidden="true" />
              Terug naar automatische planning
            </button>
          )}
          {control.auto ? (
            <Confirm
              label="Automatische planning uitschakelen"
              question="De automatische planning uitschakelen? De huidige weergave blijft dan staan tot u zelf iets kiest; ook de afsluiting en de seizoensopening gebeuren niet meer vanzelf."
              confirmLabel="Ja, uitschakelen"
              icon={<CalendarClock size={15} aria-hidden="true" />}
              tone="quiet"
              disabled={busy}
              onConfirm={() => void act("planning-uit")}
            />
          ) : (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void act("planning-aan")}>
              <CalendarClock size={15} aria-hidden="true" />
              Automatische planning inschakelen
            </button>
          )}
        </div>
        <p className="sint-links">
          <a href="/sinterklaas/?voorvertoning#/home" target="_blank" rel="noopener">
            <Eye size={15} aria-hidden="true" /> Voorvertoning Sinterklaaswebsite
          </a>
          <a href="/sinterklaas/?voorvertoning=bedankt#/bedankt" target="_blank" rel="noopener">
            <Eye size={15} aria-hidden="true" /> Voorvertoning bedankpagina
          </a>
          <a href="#teksten">
            <PenLine size={15} aria-hidden="true" /> Teksten en cijfers van de bedankpagina aanpassen
          </a>
        </p>
        <ErrorNote>{action.error}</ErrorNote>
        {loadError && <ErrorNote>Verversen mislukt: {loadError}</ErrorNote>}
      </section>

      <section className="panel" aria-labelledby="planning-title">
        <div className="panel-top">
          <div>
            <h2 id="planning-title">Jaarplanning en automatische publicatie</h2>
            <p className="muted small">
              Tijden in Belgische tijd. Een concept blijft onzichtbaar voor bezoekers; na "Publiceer dit evenementjaar" opent de
              website vanzelf op de seizoensopening.
            </p>
          </div>
          {!concept && (
            <Confirm
              label="Nieuw evenementjaar voorbereiden"
              question="Een nieuw evenementjaar als concept aanmaken met de instellingen van het laatste jaar (een jaar later)? Inschrijvingen, GPS-registraties en foto's worden niet meegekopieerd."
              confirmLabel="Ja, voorbereiden"
              icon={<CalendarClock size={15} aria-hidden="true" />}
              tone="quiet"
              disabled={busy}
              onConfirm={() => void act("nieuw-jaar")}
            />
          )}
        </div>
        {[...years].reverse().map((y) => (
          <YearForm key={y.year} year={y} busy={busy} onSave={(patch) => void saveYear(y.year, patch)} />
        ))}
      </section>

      <section className="panel" aria-labelledby="routes-title">
        <h2 id="routes-title">Gereden routes</h2>
        <p className="muted small">
          De oorspronkelijke GPS-metingen blijven altijd bewaard; afsluiten, een nieuw jaar of een nieuwe publicatie wist niets.
          {gps.track?.first && ` Eerste punt ${short.format(new Date(gps.track.first))}, laatste ${short.format(new Date(gps.track.last!))}.`}
        </p>
        <p className="sint-links">
          <a href="/api/beheer/gps?export=gpx" download>
            <Download size={15} aria-hidden="true" /> GPX
          </a>
          <a href="/api/beheer/gps?export=geojson" download>
            <Download size={15} aria-hidden="true" /> GeoJSON
          </a>
        </p>
      </section>

      {status.log.length > 0 && (
        <section className="panel" aria-labelledby="sint-log-title">
          <h2 id="sint-log-title">Logboek</h2>
          <ul className="sint-log">
            {status.log.map((entry, i) => (
              <li key={i}>
                <span className="muted">{short.format(new Date(entry.at))}</span> {entry.action}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
