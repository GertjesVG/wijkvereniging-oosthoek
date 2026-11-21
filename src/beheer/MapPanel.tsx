// Beheer → "Kinderen op kaart": één marker per uniek woonadres met het aantal actief ingeschreven kinderen, de officiële
// rondrit aan/uit, zoeken en filteren, de adressenlijst, correcties en de afdrukken (PrintSheet.tsx).
// Gegevens alleen via /api/beheer (server/locaties.ts), dus alleen na het inloggen.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./kaart.css";
import { FileDown, ListOrdered, LocateFixed, Maximize2, RefreshCw, ShieldAlert } from "lucide-react";
import type { AdminMap, AdminMapAddress } from "../inschrijving/api";
import { addRoute, routeBounds } from "../gps/routeLagen";
import { api, describeError } from "./client";
import { addressLine, childrenLabel, countIcon, latLng, onMap, osmTiles, reliable, statusLabels, statusOf } from "./kaart";
import { PrintSheet, type PrintJob } from "./PrintSheet";
import { ErrorNote } from "./ui";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Filters = { query: string; street: string; unreliableOnly: boolean };

function matches(a: AdminMapAddress, f: Filters) {
  if (f.street && a.street !== f.street) return false;
  if (f.unreliableOnly && reliable(a)) return false;
  const q = fold(f.query.trim());
  return !q || fold(`${a.nr} ${addressLine(a)} ${a.street} ${a.number}`).includes(q);
}

// Inhoud van de ballon bij een marker, als DOM: namen en adressen komen nooit als HTML in de pagina.
function popupContent(a: AdminMapAddress, actions: Actions) {
  const root = document.createElement("div");
  root.className = "kid-popup";
  const add = (tag: string, text: string, className?: string) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    root.append(el);
    return el;
  };
  add("p", `Nr. ${a.nr}`, "kid-popup-nr");
  add("strong", addressLine(a));
  if (a.location?.matched) add("p", a.location.matched, "kid-popup-muted");
  add("p", childrenLabel(a.children.length), "kid-popup-count");
  const list = document.createElement("ul");
  for (const c of a.children) {
    const li = document.createElement("li");
    li.textContent = c.age === null ? c.name : `${c.name} (${c.age} j)`;
    list.append(li);
  }
  root.append(list);
  const refs = document.createElement("p");
  refs.className = "kid-popup-refs";
  refs.append("Inschrijving: ");
  a.registrations.forEach((r, i) => {
    if (i) refs.append(", ");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "linkish";
    button.textContent = r.reference;
    button.addEventListener("click", () => actions.open(r.reference));
    refs.append(button);
  });
  root.append(refs);
  add("p", `${statusLabels[statusOf(a)]}${a.location?.detail ? ` – ${a.location.detail}` : ""}`, `kid-popup-status is-${statusOf(a)}`);
  const buttons = document.createElement("div");
  buttons.className = "kid-popup-actions";
  const action = (text: string, run: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-small btn-quiet";
    b.textContent = text;
    b.addEventListener("click", run);
    buttons.append(b);
  };
  action("Locatie verplaatsen", () => actions.place(a));
  if (a.location?.status === "handmatig") action("Automatisch opzoeken", () => actions.reset(a));
  else action("Opnieuw opzoeken", () => actions.again(a));
  root.append(buttons);
  return root;
}

type Actions = {
  open: (reference: string) => void;
  place: (a: AdminMapAddress) => void;
  again: (a: AdminMapAddress) => void;
  reset: (a: AdminMapAddress) => void;
};

export default function MapPanel({
  eventId,
  eventTitle,
  onOpenRegistration,
}: {
  eventId: string;
  eventTitle: string;
  onOpenRegistration: (reference: string) => void;
}) {
  const [data, setData] = useState<AdminMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ query: "", street: "", unreliableOnly: false });
  const [showRoute, setShowRoute] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<AdminMapAddress | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const closePrint = useCallback(() => setPrintJob(null), []);

  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const lookupRun = useRef(0);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const fresh = await api.map(eventId);
      if (alive.current) setData(fresh);
      return fresh;
    } catch (e) {
      if (alive.current) setLoadError(describeError(e));
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [eventId]);

  // Zoekt alle adressen zonder locatie op, in kleine porties (de server vraagt de dienst één adres tegelijk).
  const lookupAll = useCallback(
    async (keys: string[] = []) => {
      const mine = ++lookupRun.current;
      setLookupError(null);
      try {
        for (let round = 0; round < 100; round++) {
          const result = await api.lookup(eventId, keys);
          if (mine !== lookupRun.current || !alive.current) return;
          const fresh = await load();
          const todo = fresh?.addresses.filter((a) => !a.location).length ?? 0;
          setProgress(todo ? `Locaties opzoeken bij Digitaal Vlaanderen… nog ${todo}` : null);
          if (keys.length || !result.remaining || !todo) break;
          if (result.failed && !result.checked) throw new Error("De geolocatiedienst gaf geen antwoord.");
        }
      } catch (e) {
        if (mine === lookupRun.current && alive.current) setLookupError(describeError(e));
      } finally {
        if (mine === lookupRun.current && alive.current) setProgress(null);
      }
    },
    [eventId, load],
  );

  useEffect(() => {
    alive.current = true;
    void load().then((fresh) => {
      if (fresh?.addresses.some((a) => !a.location)) {
        setProgress("Locaties opzoeken bij Digitaal Vlaanderen…");
        void lookupAll();
      }
    });
    return () => {
      alive.current = false;
      lookupRun.current++;
    };
  }, [load, lookupAll]);

  // De kaart: één keer opgebouwd, zelfde tegels en route als de publieke rondrit.
  useEffect(() => {
    if (!box.current || map.current) return;
    const created = L.map(box.current, { zoomSnap: 0.5, scrollWheelZoom: true });
    osmTiles().addTo(created);
    routeLayer.current = addRoute(created).layer;
    markerLayer.current = L.layerGroup().addTo(created);
    created.fitBounds(routeBounds, { padding: [18, 18] });
    map.current = created;
    return () => {
      created.remove();
      map.current = routeLayer.current = markerLayer.current = null;
      markers.current.clear();
    };
  }, [data !== null]);

  useEffect(() => {
    const m = map.current;
    if (!m || !routeLayer.current) return;
    if (showRoute) routeLayer.current.addTo(m);
    else routeLayer.current.remove();
  }, [showRoute, data !== null]);

  const actionsRef = useRef<Actions>(null!);
  actionsRef.current = {
    open: onOpenRegistration,
    place: (a) => {
      map.current?.closePopup();
      setPlacing(a);
    },
    again: async (a) => {
      setActionError(null);
      map.current?.closePopup();
      await lookupAll([a.key]);
    },
    reset: async (a) => {
      setActionError(null);
      map.current?.closePopup();
      try {
        await api.resetLocation(eventId, a.key);
        await lookupAll([a.key]);
      } catch (e) {
        setActionError(describeError(e));
      }
    },
  };

  const visible = useMemo(() => (data ? data.addresses.filter((a) => matches(a, filters)) : []), [data, filters]);

  // Markers opnieuw tekenen bij nieuwe gegevens of een andere filter.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    markers.current.clear();
    for (const a of visible) {
      if (!onMap(a)) continue;
      const marker = L.marker(latLng(a), {
        icon: countIcon(a, a.key === selectedRef.current),
        title: `Nr. ${a.nr} · ${addressLine(a)} · ${childrenLabel(a.children.length)}`,
        alt: `Nr. ${a.nr}, ${addressLine(a)}, ${childrenLabel(a.children.length)}`,
        riseOnHover: true,
      })
        .bindPopup(() => popupContent(a, actionsRef.current), { maxWidth: 300 })
        .on("click", () => setSelected(a.key))
        .addTo(layer);
      markers.current.set(a.key, marker);
    }
  }, [visible, data !== null]);

  // Gekozen adres: alleen de stijl van de markers aanpassen (een open ballon blijft open).
  useEffect(() => {
    for (const a of visible) {
      const marker = markers.current.get(a.key);
      if (!marker) continue;
      marker.setIcon(countIcon(a, a.key === selected));
      marker.setZIndexOffset(a.key === selected ? 1000 : 0);
    }
  }, [selected, visible]);

  // Andere straat gekozen: die straat in beeld.
  useEffect(() => {
    const m = map.current;
    if (!m || !filters.street) return;
    const points = visible.filter(onMap).map(latLng);
    if (points.length) m.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 18 });
  }, [filters.street, data !== null]);

  // Handmatig aanduiden: de volgende klik op de kaart wordt de locatie.
  useEffect(() => {
    const m = map.current;
    if (!m || !placing) return;
    const container = m.getContainer();
    container.classList.add("is-placing");
    const click = async (e: L.LeafletMouseEvent) => {
      setPlacing(null);
      setActionError(null);
      try {
        await api.setLocation(eventId, placing.key, e.latlng.lat, e.latlng.lng);
        await load();
        setSelected(placing.key);
      } catch (err) {
        setActionError(describeError(err));
      }
    };
    m.once("click", click);
    return () => {
      m.off("click", click);
      container.classList.remove("is-placing");
    };
  }, [placing, eventId, load]);

  function choose(a: AdminMapAddress) {
    setSelected(a.key);
    const marker = markers.current.get(a.key);
    if (marker && map.current) {
      map.current.setView(marker.getLatLng(), Math.max(map.current.getZoom(), 17));
      marker.openPopup();
      box.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const streets = useMemo(() => [...new Set(data?.addresses.map((a) => a.street) ?? [])], [data]);
  const totals = useMemo(() => {
    const list = data?.addresses ?? [];
    return {
      children: list.reduce((n, a) => n + a.children.length, 0),
      addresses: list.length,
      unreliable: list.filter((a) => !reliable(a)).length,
      todo: list.filter((a) => !a.location).length,
    };
  }, [data]);
  const filtered = filters.query !== "" || filters.street !== "" || filters.unreliableOnly;

  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <div className="panel-top">
        <div>
          <h2 id="map-title">Kinderen op kaart</h2>
          <p className="muted small">
            Eén marker per uniek woonadres, met het aantal actief ingeschreven kinderen. Locaties: Adressenregister via de
            geolocatiedienst van Digitaal Vlaanderen. Alleen zichtbaar voor beheerders.
          </p>
        </div>
        <button type="button" className="btn btn-small btn-quiet" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" />
          Vernieuwen
        </button>
      </div>

      {loadError && <ErrorNote>{loadError}</ErrorNote>}
      {!data && !loadError && <p className="muted">Adressen laden…</p>}

      {data && (
        <>
          <dl className="stats">
            <div className="stat">
              <dt>Kinderen</dt>
              <dd>{totals.children}</dd>
              <small>actief ingeschreven, met adres</small>
            </div>
            <div className="stat">
              <dt>Unieke adressen</dt>
              <dd>{totals.addresses}</dd>
            </div>
            <div className="stat">
              <dt>Zonder betrouwbare locatie</dt>
              <dd>{totals.unreliable}</dd>
              <small>{totals.todo ? `waarvan ${totals.todo} nog niet opgezocht` : "niet gevonden of onzeker"}</small>
            </div>
          </dl>
          {data.withoutAddress > 0 && (
            <p className="note">{childrenLabel(data.withoutAddress)} zonder adres: niet op de kaart, wel in de Excel-export.</p>
          )}
          {progress && (
            <p className="note" role="status">
              {progress}
            </p>
          )}
          {lookupError && (
            <div className="map-retry">
              <ErrorNote>{lookupError}</ErrorNote>
              <button type="button" className="btn btn-small" onClick={() => void lookupAll()}>
                Opnieuw proberen
              </button>
            </div>
          )}
          <ErrorNote>{actionError}</ErrorNote>

          <div className="filters map-filters">
            <label className="field search">
              <span>Zoeken op straat of adres</span>
              <input
                type="search"
                placeholder="bv. Asterstraat 12 of nummer"
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Straat</span>
              <select value={filters.street} onChange={(e) => setFilters((f) => ({ ...f, street: e.target.value }))}>
                <option value="">Alle straten</option>
                {streets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="check filter-check">
              <input
                type="checkbox"
                checked={filters.unreliableOnly}
                onChange={(e) => setFilters((f) => ({ ...f, unreliableOnly: e.target.checked }))}
              />
              <span>Alleen zonder betrouwbare locatie</span>
            </label>
            <label className="check filter-check">
              <input type="checkbox" checked={showRoute} onChange={(e) => setShowRoute(e.target.checked)} />
              <span>Officiële Sinterklaasroute tonen</span>
            </label>
            {filtered && (
              <button
                type="button"
                className="btn btn-small btn-quiet"
                onClick={() => setFilters({ query: "", street: "", unreliableOnly: false })}
              >
                Filters wissen
              </button>
            )}
          </div>

          {placing && (
            <p className="note map-placing" role="status">
              Klik op de kaart op de juiste plaats voor nr. {placing.nr}, {addressLine(placing)}.{" "}
              <button type="button" className="btn btn-small btn-quiet" onClick={() => setPlacing(null)}>
                Annuleren
              </button>
            </p>
          )}

          <div className="map-layout">
            <div className="map-box">
              <div ref={box} className="kid-map" role="region" aria-label="Kaart met de adressen van de ingeschreven kinderen" />
              <div className="map-actions">
                <button
                  type="button"
                  className="map-chip"
                  onClick={() => {
                    const points = visible.filter(onMap).map(latLng);
                    map.current?.fitBounds(points.length ? L.latLngBounds(points) : routeBounds, { padding: [30, 30], maxZoom: 18 });
                  }}
                >
                  <Maximize2 size={15} aria-hidden="true" />
                  Alle adressen
                </button>
              </div>
              <div className="map-legend">
                <span>
                  <i className="legend-kid" aria-hidden="true">2</i>
                  Aantal kinderen op het adres
                </span>
                <span>
                  <i className="legend-kid is-onzeker" aria-hidden="true">1</i>
                  Locatie onzeker
                </span>
                {showRoute && (
                  <span>
                    <i className="legend-route" aria-hidden="true" />
                    Officiële route (nummers = straatvolgorde)
                  </span>
                )}
              </div>
            </div>

            <div className="map-list">
              <p className="muted small" aria-live="polite">
                {visible.length === data.addresses.length
                  ? `${data.addresses.length} ${data.addresses.length === 1 ? "adres" : "adressen"}`
                  : `${visible.length} van ${data.addresses.length} adressen`}
              </p>
              {data.addresses.length === 0 ? (
                <p className="empty">Nog geen actief ingeschreven kinderen met een adres.</p>
              ) : (
                <ol className="address-list">
                  {visible.map((a) => (
                    <li key={a.key} className={a.key === selected ? "is-selected" : undefined}>
                      <button type="button" className="address-item" onClick={() => choose(a)} aria-pressed={a.key === selected}>
                        <span className="address-nr">{a.nr}</span>
                        <span className="address-main">
                          <strong>{addressLine(a)}</strong>
                          <small>
                            {childrenLabel(a.children.length)}
                            {a.addressReview && " · adres nakijken"}
                          </small>
                        </span>
                        {!reliable(a) && <span className={`badge badge-${a.location ? "warn" : "muted"}`}>{statusLabels[statusOf(a)]}</span>}
                      </button>
                      {a.key === selected && !onMap(a) && (
                        <div className="address-detail">
                          <p className="small">
                            {a.children.map((c) => (c.age === null ? c.name : `${c.name} (${c.age} j)`)).join(", ")}
                          </p>
                          {a.location?.detail && <p className="muted small">{a.location.detail}</p>}
                          <div className="actions">
                            <button type="button" className="btn btn-small" onClick={() => actionsRef.current.place(a)}>
                              <LocateFixed size={15} aria-hidden="true" />
                              Locatie aanduiden op de kaart
                            </button>
                            <button type="button" className="btn btn-small btn-quiet" onClick={() => void actionsRef.current.again(a)}>
                              Opnieuw opzoeken
                            </button>
                            {a.registrations.map((r) => (
                              <button key={r.id} type="button" className="btn btn-small btn-quiet" onClick={() => onOpenRegistration(r.reference)}>
                                Adres verbeteren ({r.reference})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="print-buttons">
            <h3>Afdrukken en exporteren</h3>
            <p className="muted small">
              Opent een afdrukvoorbeeld. Kies daar "Opslaan als PDF" (of een printer). De nummers op de kaarten zijn die van de
              adressenlijst; de route volgt de schakelaar hierboven.
            </p>
            <div className="actions">
              <button type="button" className="btn btn-small" onClick={() => setPrintJob({ kind: "a3", showRoute })}>
                <FileDown size={15} aria-hidden="true" />
                PDF A3 liggend (wijkkaart)
              </button>
              <button type="button" className="btn btn-small" onClick={() => setPrintJob({ kind: "a4", showRoute })}>
                <FileDown size={15} aria-hidden="true" />
                PDF A4 (overzicht en detailkaarten)
              </button>
              <button type="button" className="btn btn-small" onClick={() => setPrintJob({ kind: "list", showRoute })}>
                <ListOrdered size={15} aria-hidden="true" />
                Adressenlijst
              </button>
              <button type="button" className="btn btn-small btn-quiet" onClick={() => setPrintJob({ kind: "confidential", showRoute })}>
                <ShieldAlert size={15} aria-hidden="true" />
                Adressenlijst met namen (vertrouwelijk)
              </button>
            </div>
          </div>
        </>
      )}
      {printJob && data && <PrintSheet job={printJob} data={data} title={`${eventTitle} – kinderen op kaart`} onClose={closePrint} />}
    </section>
  );
}
