// Afdrukvoorbeeld van "Kinderen op kaart": wijkkaart op A3 liggend, A4 met overzicht en detailkaarten per wijkdeel, en de
// genummerde adressenlijst (gewoon, of vertrouwelijk met de namen). De browser maakt er een PDF van ("Opslaan als PDF"):
// paginagrootte en marges liggen vast via @page, de kaarten zijn op millimeter gemaakt, dus niets wordt geschaald.
// De nummers zijn overal die van de adressenlijst (server/locaties.ts).
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { Printer, X } from "lucide-react";
import type { AdminMap, AdminMapAddress } from "../inschrijving/api";
import { addRoute, routeBounds } from "../gps/routeLagen";
import { addressLine, childrenLabel, latLng, onMap, osmTiles, printIcon, reliable, statusLabels, statusOf } from "./kaart";

export type PrintJob = { kind: "a3" | "a4" | "list" | "confidential"; showRoute: boolean };

const MARGIN = 10; // mm
const HEADER = 15; // mm
const FOOTER = 16; // mm: legende (soms op twee regels) en bronvermelding
const sizes = {
  a3: { w: 420, h: 297, css: "A3 landscape" },
  a4: { w: 297, h: 210, css: "A4 landscape" },
  list: { w: 210, h: 297, css: "A4 portrait" },
  confidential: { w: 210, h: 297, css: "A4 portrait" },
} as const;

// Detailkaarten A4: de wijk in vakken die op schaal ongeveer 1:3 500 (zoom 17) op één A4 liggend passen.
const CELL_W = 680; // meter
const CELL_H = 330;

export function detailParts(addresses: AdminMapAddress[]) {
  const located = addresses.filter(onMap);
  if (!located.length) return [];
  const lat0 = Math.max(...located.map((a) => a.location!.lat!));
  const lon0 = Math.min(...located.map((a) => a.location!.lon!));
  const perLat = 111_320;
  const perLon = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const cells = new Map<string, { row: number; col: number; list: AdminMapAddress[] }>();
  for (const a of located) {
    const row = Math.floor(((lat0 - a.location!.lat!) * perLat) / CELL_H);
    const col = Math.floor(((a.location!.lon! - lon0) * perLon) / CELL_W);
    const key = `${row}:${col}`;
    if (!cells.has(key)) cells.set(key, { row, col, list: [] });
    cells.get(key)!.list.push(a);
  }
  return [...cells.values()].sort((x, y) => x.row - y.row || x.col - y.col).map((c) => c.list.sort((x, y) => x.nr - y.nr));
}

// "1–4, 7, 9–10"
export function numberRanges(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : String(sorted[i]));
    i = j;
  }
  return parts.join(", ");
}

const printedAt = () =>
  new Intl.DateTimeFormat("nl-BE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Brussels" }).format(new Date());

// Markers die op papier (bijna) over elkaar zouden liggen, komen in een kleine cirkel rond hun gezamenlijke plaats, zodat
// elk nummer leesbaar blijft. Een groep groeit mee zolang een volgend adres dicht bij het midden ervan ligt.
export function spread(map: L.Map, addresses: AdminMapAddress[], size: number) {
  const groups: { center: L.Point; members: { address: AdminMapAddress; point: L.Point }[] }[] = [];
  for (const address of addresses) {
    const point = map.latLngToLayerPoint(latLng(address));
    const group = groups.find((g) => g.center.distanceTo(point) < size * 1.15);
    if (!group) {
      groups.push({ center: point, members: [{ address, point }] });
      continue;
    }
    group.members.push({ address, point });
    const n = group.members.length;
    group.center = group.members.reduce((sum, m) => sum.add(m.point), L.point(0, 0)).divideBy(n);
  }
  return groups.flatMap(({ center, members }) => {
    if (members.length === 1) return [{ address: members[0].address, at: latLng(members[0].address), moved: false }];
    const n = members.length;
    // Straal zo dat de nummers elkaar net niet raken, en minstens één markergrootte.
    const radius = Math.max(size * 1.05, (n * size * 1.15) / (2 * Math.PI));
    return members.map((m, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const at = map.layerPointToLatLng(center.add(L.point(Math.cos(angle) * radius, Math.sin(angle) * radius)));
      return { address: m.address, at, moved: true };
    });
  });
}

function PrintMap({
  addresses,
  showRoute,
  widthMm,
  heightMm,
  markerSize,
  maxZoom,
  fit,
  parts = [],
  onReady,
}: {
  addresses: AdminMapAddress[];
  showRoute: boolean;
  widthMm: number;
  heightMm: number;
  markerSize: number;
  maxZoom: number;
  fit: L.LatLngBounds;
  // Overzichtskaart A4: de vakken van de detailkaarten.
  parts?: AdminMapAddress[][];
  onReady: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const map = L.map(box.current!, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      zoomSnap: 0.25,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    });
    map.attributionControl.setPrefix(false);
    // Eerst het beeld, dan de lagen: lijnen en vakken op een kaart zonder beeld laten Leaflet vastlopen (A4 met detailkaarten).
    map.fitBounds(fit, { padding: [markerSize, markerSize], maxZoom });
    let done = false;
    const ready = () => {
      if (!done) {
        done = true;
        onReady();
      }
    };
    const tiles = osmTiles().on("load", ready).addTo(map);
    // Komt de laatste tegel niet, dan toch afdrukbaar na 20 seconden (het voorbeeld toont dan wat er is).
    const timer = setTimeout(ready, 20_000);
    if (showRoute) addRoute(map);
    parts.forEach((part, i) => {
      const bounds = L.latLngBounds(part.map(latLng)).pad(0.15);
      L.rectangle(bounds, { color: "#0c293d", weight: 2, dashArray: "6 5", fill: false, interactive: false })
        .bindTooltip(`Deel ${i + 1}`, { permanent: true, direction: "center", className: "print-part-label" })
        .addTo(map);
    });
    for (const { address: a, at, moved } of spread(map, addresses, markerSize)) {
      if (moved) {
        // Verschoven om overlap te vermijden: een stip op de echte plaats en een lijntje naar het nummer.
        L.polyline([latLng(a), at], { color: "#0c293d", weight: 1, interactive: false }).addTo(map);
        L.circleMarker(latLng(a), { radius: 2.5, color: "#0c293d", weight: 1, fillColor: "#0c293d", fillOpacity: 1, interactive: false }).addTo(map);
      }
      L.marker(at, { icon: printIcon(a, markerSize), interactive: false, keyboard: false, zIndexOffset: 1000 - a.nr }).addTo(map);
    }
    return () => {
      clearTimeout(timer);
      tiles.off();
      map.remove();
    };
  }, []);
  return <div ref={box} className="print-map" style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }} />;
}

function Legend({ showRoute }: { showRoute: boolean }) {
  return (
    <div className="print-legend">
      <span>
        <i className="print-marker is-gevonden" aria-hidden="true">
          <span>12</span>
          <b>2</b>
        </i>
        Nummer in de adressenlijst · klein: aantal kinderen
      </span>
      <span>
        <i className="print-marker is-onzeker" aria-hidden="true">
          <span>7</span>
        </i>
        Locatie onzeker
      </span>
      <span>
        <i className="legend-moved" aria-hidden="true" />
        Opzij gezet nummer: stip = echte plaats
      </span>
      {showRoute && (
        <span>
          <i className="legend-route" aria-hidden="true" />
          Officiële route, nummers = straatvolgorde
        </span>
      )}
    </div>
  );
}

const SOURCES =
  "Kaart © OpenStreetMap-bijdragers (openstreetmap.org/copyright) · Locaties: Adressenregister via de Geolocation Service, bron: Digitaal Vlaanderen · Alleen voor intern gebruik door de vereniging.";

export function PrintSheet({ job, data, title, onClose }: { job: PrintJob; data: AdminMap; title: string; onClose: () => void }) {
  const size = sizes[job.kind];
  const pageW = size.w - 2 * MARGIN;
  const pageH = size.h - 2 * MARGIN;
  const mapH = pageH - HEADER - FOOTER;
  const located = useMemo(() => data.addresses.filter(onMap), [data]);
  const parts = useMemo(() => (job.kind === "a4" ? detailParts(data.addresses) : []), [data, job.kind]);
  const missing = data.addresses.filter((a) => !onMap(a));
  const children = data.addresses.reduce((n, a) => n + a.children.length, 0);
  const stamp = useMemo(printedAt, []);
  const mapCount = job.kind === "a3" ? 1 : job.kind === "a4" ? 1 + parts.length : 0;
  const [ready, setReady] = useState(0);
  const allReady = ready >= mapCount;
  const overview = useMemo(() => {
    const points = located.map(latLng);
    const bounds = points.length ? L.latLngBounds(points) : routeBounds;
    return job.showRoute ? bounds.extend(routeBounds) : bounds;
  }, [located, job.showRoute]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@page { size: ${size.css}; margin: ${MARGIN}mm; }`;
    document.head.append(style);
    document.body.classList.add("is-printing-sheet");
    const close = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => {
      style.remove();
      document.body.classList.remove("is-printing-sheet");
      window.removeEventListener("keydown", close);
    };
  }, [size.css, onClose]);

  const done = () => setReady((n) => n + 1);
  const header = (subtitle: string) => (
    <header className="print-head" style={{ height: `${HEADER}mm` }}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <p className="print-stamp">
        {childrenLabel(children)} · {data.addresses.length} adressen
        {missing.length ? ` · ${missing.length} niet op de kaart` : ""}
        <br />
        Afgedrukt op {stamp}
      </p>
    </header>
  );
  const footer = (
    <footer className="print-foot" style={{ height: `${FOOTER}mm` }}>
      <Legend showRoute={job.showRoute} />
      <p>{SOURCES}</p>
    </footer>
  );
  const pageStyle = { width: `${pageW}mm`, height: `${pageH}mm` };

  const pages: ReactElement[] = [];
  if (job.kind === "a3" || job.kind === "a4")
    pages.push(
      <section className="print-page" style={pageStyle} key="overzicht">
        {header(job.kind === "a3" ? "Wijkkaart met alle adressen van ingeschreven kinderen" : "Overzichtskaart · de kaders zijn de detailkaarten")}
        <PrintMap
          addresses={located}
          showRoute={job.showRoute}
          widthMm={pageW}
          heightMm={mapH}
          markerSize={job.kind === "a3" ? 20 : 16}
          maxZoom={18}
          fit={overview}
          parts={job.kind === "a4" ? parts : []}
          onReady={done}
        />
        {footer}
      </section>,
    );
  if (job.kind === "a4")
    parts.forEach((part, i) =>
      pages.push(
        <section className="print-page" style={pageStyle} key={`deel-${i}`}>
          {header(`Detailkaart deel ${i + 1} van ${parts.length} · adressen ${numberRanges(part.map((a) => a.nr))}`)}
          <PrintMap
            addresses={located}
            showRoute={job.showRoute}
            widthMm={pageW}
            heightMm={mapH}
            markerSize={22}
            maxZoom={18}
            fit={L.latLngBounds(part.map(latLng))}
            onReady={done}
          />
          {footer}
        </section>,
      ),
    );

  const confidential = job.kind === "confidential";
  const list = (
    <section className={`print-list${confidential ? " is-confidential" : ""}`} style={{ width: `${pageW}mm` }} key="lijst">
      <header className="print-head print-list-head">
        <div>
          <h1>{title}</h1>
          <p>{confidential ? "Adressenlijst met namen – VERTROUWELIJK" : "Adressenlijst bij de kaart"}</p>
        </div>
        <p className="print-stamp">
          {childrenLabel(children)} · {data.addresses.length} adressen
          <br />
          Afgedrukt op {stamp}
        </p>
      </header>
      {confidential && (
        <p className="print-secret">
          Vertrouwelijk: bevat namen van minderjarigen. Alleen voor bestuursleden en vrijwilligers van de rondrit; niet doorgeven,
          niet fotograferen en vernietigen na Sinterklaas.
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th scope="col">Nr</th>
            <th scope="col">Straat en huisnummer</th>
            <th scope="col">Kinderen</th>
            {confidential && <th scope="col">Namen (leeftijd)</th>}
            <th scope="col">Op de kaart</th>
          </tr>
        </thead>
        <tbody>
          {data.addresses.map((a) => (
            <tr key={a.key}>
              <td className="num">{a.nr}</td>
              <td>{addressLine(a)}</td>
              <td className="num">{a.children.length}</td>
              {confidential && <td>{a.children.map((c) => (c.age === null ? c.name : `${c.name} (${c.age})`)).join(", ")}</td>}
              <td>{onMap(a) ? (reliable(a) ? "ja" : "onzeker") : statusLabels[statusOf(a)].toLowerCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="print-sources">{SOURCES}</p>
      {confidential && <p className="print-secret-foot">VERTROUWELIJK – namen van minderjarigen</p>}
    </section>
  );
  if (job.kind === "list" || confidential) pages.push(list);

  const kindLabel = { a3: "PDF A3 liggend", a4: "PDF A4", list: "Adressenlijst", confidential: "Adressenlijst met namen" }[job.kind];
  return createPortal(
    <div className="print-sheet" role="dialog" aria-modal="true" aria-label={`Afdrukvoorbeeld: ${kindLabel}`}>
      <div className="print-toolbar">
        <strong>{kindLabel}</strong>
        <span className="muted small" role="status">
          {allReady ? "Klaar om af te drukken. Kies in het venster \"Opslaan als PDF\" of een printer." : "Kaarten laden…"}
        </span>
        <button type="button" className="btn btn-small btn-primary" onClick={() => window.print()} disabled={!allReady}>
          <Printer size={15} aria-hidden="true" />
          Afdrukken of opslaan als PDF
        </button>
        <button type="button" className="btn btn-small btn-quiet" onClick={onClose}>
          <X size={15} aria-hidden="true" />
          Sluiten
        </button>
      </div>
      {pages}
    </div>,
    document.body,
  );
}
