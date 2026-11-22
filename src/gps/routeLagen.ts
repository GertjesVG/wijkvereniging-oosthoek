// De officiële rondrit op een Leaflet-kaart: gekleurde, genummerde straten (volgorde = event.route.stops, ligging uit
// route-kaart.json) en gestreepte verbindingen. Gedeeld door de publieke routekaart (LiveMap.tsx) en het beheer
// ("Kinderen op kaart"), zodat beide exact dezelfde route tonen.
import L from "leaflet";
import routeMap from "../content/route-kaart.json";
import "./route.css";

export type LatLon = [number, number];

export const RED = "#a8002b";
export const GOLD = "#dca341";

export const streets = routeMap.straten as { naam: string; lijnen: LatLon[][]; label: LatLon }[];
export const links = routeMap.verbindingen as { na: number; via: string[]; lijnen: LatLon[][] }[];
// Vertrek aan het wijkhuis (Oosteneinde, bij de brug) en de aanloop naar straat 1: over de brug en langs het kanaal aan
// de kant van de Dijkstraat (Gert, 22 november 2026). Eén bron voor de publieke kaart, het beheer en de afdruk.
export const departure = routeMap.vertrek as unknown as {
  naam: string;
  plaats: string;
  punt: LatLon;
  naar: number;
  via: string[];
  lijnen: LatLon[][];
};
export const routeBounds = L.latLngBounds([
  ...streets.flatMap((s) => s.lijnen.flat()),
  ...departure.lijnen.flat(),
  departure.punt,
]);

// OpenStreetMap-tegels, volgens operations.osmfoundation.org/policies/tiles: zichtbare attributie en een Referer.
export const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers';

export const numberIcon = (n: number, active: boolean) =>
  L.divIcon({
    className: `route-number${active ? " is-active" : ""}`,
    html: `<span>${n}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export const streetStyle = (active: boolean): L.PolylineOptions => ({
  color: active ? GOLD : RED,
  weight: active ? 7 : 5,
  opacity: 0.95,
  lineCap: "round",
  lineJoin: "round",
});

// Tekent de route in een eigen laag (aan/uit te zetten). onSelect = klik op straat of nummer (index in event.route.stops).
export function addRoute(target: L.Map, onSelect?: (index: number) => void) {
  const layer = L.layerGroup().addTo(target);
  // Verbindingen tussen twee straten die elkaar niet raken (alleen de stukken buiten de route): gestreept.
  for (const link of links)
    L.polyline(link.lijnen, { color: "#0c293d", weight: 3, opacity: 0.75, dashArray: "2 8", lineCap: "round" })
      .bindTooltip(`Verbinding van ${link.na} naar ${link.na + 1} via ${link.via.join(", ")}`, { sticky: true })
      .addTo(layer);
  // Aanloop van het vertrek naar straat 1, in dezelfde stijl als een verbinding, en de vertrekplaats zelf.
  const first = `${departure.naar}. ${streets[departure.naar - 1].naam}`;
  L.polyline(departure.lijnen, { color: "#0c293d", weight: 3, opacity: 0.75, dashArray: "2 8", lineCap: "round" })
    .bindTooltip(`Van het vertrek naar ${first} via ${departure.via.join(", ")}`, { sticky: true })
    .addTo(layer);
  L.marker(departure.punt, {
    icon: L.divIcon({ className: "route-start", html: "<span>Vertrek</span>", iconSize: [58, 22], iconAnchor: [29, 11] }),
    keyboard: false,
    title: `Vertrek: ${departure.naam}, ${departure.plaats}`,
    zIndexOffset: 500,
  }).addTo(layer);
  const lines = streets.map((street, i) => {
    // Witte rand onder de lijn: leesbaar op elke achtergrond.
    L.polyline(street.lijnen, { color: "#fff", weight: 9, opacity: 0.9, lineCap: "round", interactive: false }).addTo(layer);
    return L.polyline(street.lijnen, streetStyle(false))
      .bindTooltip(`${i + 1}. ${street.naam}`, { sticky: true })
      .on("click", () => onSelect?.(i))
      .addTo(layer);
  });
  const numbers = streets.map((street, i) =>
    L.marker(street.label, { icon: numberIcon(i + 1, false), keyboard: false, title: `${i + 1}. ${street.naam}`, riseOnHover: true })
      .on("click", () => onSelect?.(i))
      .addTo(layer),
  );
  return { layer, lines, numbers };
}
