// Kaart van de routepagina: Leaflet met OpenStreetMap-tegels. Toont altijd de straten van de rondrit
// (src/content/route-kaart.json, volgorde = event.route.stops) en de huifkar alleen als de live GPS een positie geeft.
// Wordt pas geladen na een klik of tijdens de live GPS (zie Pages.tsx).
// Tegelgebruik volgens operations.osmfoundation.org/policies/tiles: zichtbare attributie, geen eigen Referrer-Policy.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Maximize2 } from "lucide-react";
import { event } from "../content/event";
import routeMap from "../content/route-kaart.json";

export type Position = { lat: number; lon: number; accuracy: number | null; stale: boolean };
type Props = {
  // null = geen livepositie: dan staat er geen huifkar op de kaart.
  position: Position | null;
  // Index in event.route.stops van de straat die in beeld moet; null = geen keuze.
  focus: number | null;
  onFocus: (index: number) => void;
};
type LatLon = [number, number];

const ZOOM = 16;
const RED = "#a8002b";
const GOLD = "#dca341";
const icon = (stale: boolean) =>
  L.divIcon({
    className: `sint-marker${stale ? " is-stale" : ""}`,
    html: '<span class="sint-pin"><span>Sint</span></span>',
    iconSize: [46, 46],
    // Punt van de gedraaide speld (zie .sint-pin in pages.css).
    iconAnchor: [23, 56],
  });
const numberIcon = (n: number, active: boolean) =>
  L.divIcon({
    className: `route-number${active ? " is-active" : ""}`,
    html: `<span>${n}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
const streetStyle = (active: boolean): L.PolylineOptions => ({
  color: active ? GOLD : RED,
  weight: active ? 7 : 5,
  opacity: 0.95,
  lineCap: "round",
  lineJoin: "round",
});

const streets = routeMap.straten as { naam: string; lijnen: LatLon[][]; label: LatLon }[];
const links = routeMap.verbindingen as { na: number; via: string[]; lijnen: LatLon[][] }[];
const routeBounds = L.latLngBounds(streets.flatMap((s) => s.lijnen.flat()));

export default function LiveMap({ position, focus, onFocus }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const lines = useRef<L.Polyline[]>([]);
  const numbers = useRef<L.Marker[]>([]);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const selectRef = useRef(onFocus);
  selectRef.current = onFocus;

  useEffect(() => {
    const created = L.map(box.current!, { scrollWheelZoom: false, zoomSnap: 0.5 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
    }).addTo(created);
    // Verbindingen tussen twee straten die elkaar niet raken (alleen de stukken buiten de route): gestreept.
    for (const link of links)
      L.polyline(link.lijnen, { color: "#0c293d", weight: 3, opacity: 0.75, dashArray: "2 8", lineCap: "round" })
        .bindTooltip(`Verbinding van ${link.na} naar ${link.na + 1} via ${link.via.join(", ")}`, { sticky: true })
        .addTo(created);
    lines.current = streets.map((street, i) => {
      // Witte rand onder de lijn: leesbaar op elke achtergrond.
      L.polyline(street.lijnen, { color: "#fff", weight: 9, opacity: 0.9, lineCap: "round", interactive: false }).addTo(created);
      return L.polyline(street.lijnen, streetStyle(false))
        .bindTooltip(`${i + 1}. ${street.naam}`, { sticky: true })
        .on("click", () => selectRef.current(i))
        .addTo(created);
    });
    numbers.current = streets.map((street, i) =>
      L.marker(street.label, { icon: numberIcon(i + 1, false), keyboard: false, title: `${i + 1}. ${street.naam}`, riseOnHover: true })
        .on("click", () => selectRef.current(i))
        .addTo(created),
    );
    if (position) created.setView([position.lat, position.lon], ZOOM);
    else created.fitBounds(routeBounds, { padding: [18, 18] });
    map.current = created;
    return () => {
      created.remove();
      map.current = marker.current = circle.current = null;
      lines.current = [];
      numbers.current = [];
    };
    // De kaart wordt één keer gemaakt; nieuwe posities en een andere straat passen alleen de lagen aan (hieronder).
  }, []);

  // Gekozen straat: goud, bovenop en in beeld.
  useEffect(() => {
    lines.current.forEach((line, i) => {
      line.setStyle(streetStyle(i === focus));
      if (i === focus) line.bringToFront();
    });
    numbers.current.forEach((m, i) => {
      m.setIcon(numberIcon(i + 1, i === focus));
      m.setZIndexOffset(i === focus ? 1000 : 0);
    });
    if (focus !== null && map.current && lines.current[focus])
      map.current.fitBounds(lines.current[focus].getBounds(), { padding: [40, 40], maxZoom: 17 });
  }, [focus]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    // Geen livepositie (GPS uit, verbinding weg, stopuur): niets van de huifkar op de kaart laten staan.
    if (!position) {
      marker.current?.remove();
      circle.current?.remove();
      marker.current = circle.current = null;
      return;
    }
    const { lat, lon, accuracy, stale } = position;
    const here = L.latLng(lat, lon);
    if (!marker.current)
      marker.current = L.marker(here, { icon: icon(stale), keyboard: false, title: "Sinterklaas", zIndexOffset: 2000 }).addTo(m);
    else marker.current.setLatLng(here).setIcon(icon(stale));
    const radius = accuracy !== null && accuracy > 15 ? accuracy : 0;
    if (radius && !circle.current)
      circle.current = L.circle(here, { radius, color: RED, weight: 1, fillOpacity: 0.08 }).addTo(m);
    else if (radius) circle.current!.setLatLng(here).setRadius(radius);
    else if (circle.current) {
      circle.current.remove();
      circle.current = null;
    }
    // Rijdt de huifkar uit beeld, dan schuift de kaart mee; wie zelf rondkijkt binnen het beeld, wordt niet gestoord.
    if (!m.getBounds().pad(-0.15).contains(here)) m.panTo(here);
  }, [position?.lat, position?.lon, position?.accuracy, position?.stale, position !== null]);

  return (
    <div className="live-map-wrap">
      <div
        ref={box}
        className="live-map"
        aria-label={position ? "Kaart met de livepositie van de huifkar" : "Kaart met de route van de huifkar"}
        role="region"
      />
      <div className="live-map-actions">
        {position && (
          <button
            type="button"
            className="live-map-center"
            onClick={() => map.current?.setView([position.lat, position.lon], Math.max(map.current.getZoom(), ZOOM))}
          >
            <LocateFixed size={17} aria-hidden="true" />
            Naar de Sint
          </button>
        )}
        <button
          type="button"
          className="live-map-center"
          onClick={() => map.current?.fitBounds(routeBounds, { padding: [18, 18] })}
        >
          <Maximize2 size={16} aria-hidden="true" />
          Hele route
        </button>
      </div>
      <div className="route-legend">
        <span>
          <i className="legend-street" aria-hidden="true" />
          Straat van de rondrit
        </span>
        <span>
          <i className="legend-number" aria-hidden="true">1</i>
          Volgorde
        </span>
        {links.length > 0 && (
          <span>
            <i className="legend-link" aria-hidden="true" />
            Verbinding
          </span>
        )}
        {!event.route.mapChecked && <strong>Indicatieve kaart</strong>}
      </div>
    </div>
  );
}
