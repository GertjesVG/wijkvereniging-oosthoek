import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, RotateCcw, Undo2 } from "lucide-react";
import { textSections, texts, type AdminText, type TextField, type TextKey } from "../content/teksten";
import { api, describeError } from "./client";
import { ErrorNote, formatDateTime, useAction } from "./ui";

// Teksten van de website aanpassen (lijst: src/content/teksten.ts, opslag: server/teksten.ts). De website toont een
// aangepaste tekst zodra een bezoeker de pagina opent of vernieuwt; opnieuw publiceren is niet nodig.

const allKeys = Object.keys(texts) as TextKey[];
const sections = textSections.map((section) => ({
  ...section,
  keys: allKeys.filter((key) => texts[key].section === section.id),
}));

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Zoals de server opslaat: zo herkent het beheer "niets gewijzigd" en "weer de oorspronkelijke tekst".
function tidy(text: string, lines: boolean | undefined) {
  const clean = text.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  return lines ? clean : clean.replace(/\s*\n\s*/g, " ");
}

const clock = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

function TextEditor({
  id,
  field,
  saved,
  href,
  hidden,
  onSaved,
  onDirty,
}: {
  id: TextKey;
  field: TextField;
  saved: AdminText | undefined;
  href: string;
  hidden: boolean;
  onSaved: (row: AdminText) => void;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  // Wat bezoekers nu zien: de aangepaste tekst, anders de oorspronkelijke.
  const shown = saved?.value ?? field.text;
  const [draft, setDraft] = useState(shown);
  const [done, setDone] = useState<string | null>(null);
  const action = useAction();

  useEffect(() => {
    setDraft(shown);
  }, [shown]);

  const value = tidy(draft, field.lines);
  const dirty = value !== shown;
  const changed = saved?.value != null;
  const canUndo = saved !== undefined && saved.previous !== saved.value;

  useEffect(() => {
    onDirty(id, dirty);
  }, [id, dirty, onDirty]);

  async function store(work: () => Promise<AdminText>, message: string) {
    setDone(null);
    const row = await action.run(work);
    if (row) {
      onSaved(row);
      setDone(`${message} (${clock.format(new Date())})`);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || !value || action.busy) return;
    // Is het weer exact de oorspronkelijke tekst, dan volgt de website voortaan gewoon de tekst uit de code.
    void store(() => api.saveText(id, value === field.text ? null : value), "Opgeslagen. Bezoekers zien nu deze tekst.");
  }

  const fieldId = `tekst-${id}`;
  // Ruim genoeg voor een smartphone (±32 tekens per regel); op een groot scherm iets te hoog, nooit te klein.
  const rows = Math.min(10, Math.max(2, Math.ceil(draft.length / 32) + (draft.match(/\n/g)?.length ?? 0)));

  return (
    <form className="text-field" onSubmit={submit} hidden={hidden}>
      <label className="text-label" htmlFor={fieldId}>
        {field.label}
        {changed && <span className="badge badge-ok">Aangepast</span>}
        {dirty && <span className="badge badge-warn">Niet opgeslagen</span>}
      </label>
      <textarea
        id={fieldId}
        value={draft}
        rows={rows}
        maxLength={2000}
        onChange={(e) => {
          setDone(null);
          setDraft(field.lines ? e.target.value : e.target.value.replace(/\r?\n/g, " "));
        }}
        disabled={action.busy}
        aria-invalid={dirty && !value ? true : undefined}
      />
      {field.lines && <p className="muted small">Een nieuwe regel (Enter) wordt op de website ook een nieuwe regel.</p>}
      {(changed || dirty) && value !== field.text && (
        <p className="text-original">
          <span>Oorspronkelijke tekst:</span> {field.text}
        </p>
      )}
      {dirty && !value && <p className="note note-error">Een tekst mag niet leeg zijn.</p>}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={action.busy || !dirty || !value}>
          {action.busy ? "Bezig…" : "Opslaan"}
        </button>
        {dirty && (
          <button type="button" className="btn btn-quiet" onClick={() => setDraft(shown)} disabled={action.busy}>
            Annuleren
          </button>
        )}
        {!dirty && canUndo && (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => void store(() => api.previousText(id), "Vorige versie teruggezet.")}
            disabled={action.busy}
          >
            <Undo2 size={15} aria-hidden="true" />
            Vorige versie terugzetten
          </button>
        )}
        {!dirty && changed && (
          <button
            type="button"
            className="btn btn-small btn-quiet"
            onClick={() => void store(() => api.saveText(id, null), "Oorspronkelijke tekst teruggezet.")}
            disabled={action.busy}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Oorspronkelijke tekst terugzetten
          </button>
        )}
      </div>
      {done && (
        <p className="note note-ok" role="status">
          {done}{" "}
          <a href={href} target="_blank" rel="noopener noreferrer">
            Bekijk op de website
          </a>
        </p>
      )}
      {!done && saved && changed && !dirty && (
        <p className="muted small">Laatst gewijzigd: {formatDateTime(saved.updatedAt)}</p>
      )}
      <ErrorNote>{action.error}</ErrorNote>
    </form>
  );
}

export function TextsPanel() {
  const [saved, setSaved] = useState<Record<string, AdminText> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Een tekst die tijdens deze zoekopdracht is opgeslagen, blijft zichtbaar (met zijn bevestiging), ook als hij niet
  // meer op de zoekterm past.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const unsaved = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await api.texts();
      setSaved(Object.fromEntries(rows.map((row) => [row.key, row])));
    } catch (e) {
      setLoadError(describeError(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Waarschuwen als het venster sluit terwijl er nog een tekst niet opgeslagen is.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (unsaved.current.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const onDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) unsaved.current.add(id);
    else unsaved.current.delete(id);
  }, []);
  const onSaved = useCallback((row: AdminText) => {
    setSaved((all) => ({ ...all, [row.key]: row }));
    setKept((keys) => new Set(keys).add(row.key));
  }, []);

  const q = fold(query.trim());
  const matches = (key: TextKey, sectionTitle: string) =>
    !q ||
    kept.has(key) ||
    [texts[key].label, sectionTitle, texts[key].text, saved?.[key]?.value ?? ""].some((part) => fold(part).includes(q));
  const found = saved ? sections.reduce((n, s) => n + s.keys.filter((key) => matches(key, s.title)).length, 0) : 0;

  return (
    <section className="panel texts-panel" aria-labelledby="texts-title">
      <div className="panel-top">
        <div>
          <h2 id="texts-title">Teksten van de website</h2>
          <p className="muted small">
            Open een onderdeel, pas de tekst aan en klik op Opslaan. Bezoekers zien de nieuwe tekst zodra ze de pagina openen of
            vernieuwen. Opnieuw publiceren is niet nodig.
          </p>
        </div>
      </div>
      {loadError && (
        <div className="texts-error">
          <ErrorNote>{loadError}</ErrorNote>
          <button type="button" className="btn btn-small" onClick={load}>
            Opnieuw proberen
          </button>
        </div>
      )}
      {saved === null && !loadError && <p className="muted">Teksten laden…</p>}
      {saved && (
        <>
          <label className="field texts-search">
            <span>Zoek een tekst</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setKept(new Set());
              }}
              placeholder="bijvoorbeeld paarden of kleurplaat"
              autoComplete="off"
            />
          </label>
          {q && (
            <p className="muted small" aria-live="polite">
              {found === 0 ? "Geen tekst gevonden." : `${found} ${found === 1 ? "tekst" : "teksten"} gevonden.`}
            </p>
          )}
          <div className="text-sections">
            {sections.map((section) => {
              const visible = section.keys.filter((key) => matches(key, section.title));
              const changedCount = section.keys.filter((key) => saved[key]?.value != null).length;
              return (
                <details className="text-section" key={section.id} open={q ? true : undefined} hidden={visible.length === 0}>
                  <summary>
                    <span className="text-section-title">{section.title}</span>
                    {changedCount > 0 && <span className="badge badge-ok">{changedCount} aangepast</span>}
                  </summary>
                  <div className="text-fields">
                    <a className="text-view" href={section.href} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={15} aria-hidden="true" />
                      Deze pagina op de website bekijken
                    </a>
                    {section.keys.map((key) => (
                      <TextEditor
                        key={key}
                        id={key}
                        field={texts[key]}
                        saved={saved[key]}
                        href={section.href}
                        hidden={!visible.includes(key)}
                        onSaved={onSaved}
                        onDirty={onDirty}
                      />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
          <p className="muted small">
            Adressen, datums, de route, sponsors, het inschrijfformulier, het reglement en de privacyverklaring staan hier
            bewust niet bij: die blijven vaste gegevens van de website.
          </p>
        </>
      )}
    </section>
  );
}
