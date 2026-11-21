// Gedeelde stukjes van "Kinderen op kaart" (MapPanel.tsx) en de afdruk (PrintSheet.tsx).
import L from "leaflet";
import type { AdminMapAddress, LocationStatus } from "../inschrijving/api";
import { OSM_ATTRIBUTION, OSM_TILES } from "../gps/routeLagen";

export const statusLabels: Record<LocationStatus | "todo", string> = {
  gevonden: "Locatie gevonden",
  handmatig: "Locatie handmatig aangeduid",
  onzeker: "Locatie onzeker",
  niet_gevonden: "Niet gevonden",
  todo: "Nog niet opgezocht",
};

export const statusOf = (a: AdminMapAddress): LocationStatus | "todo" => a.location?.status ?? "todo";
// Betrouwbaar = exact gevonden in het Adressenregister, of door een beheerder aangeduid.
export const reliable = (a: AdminMapAddress) => a.location?.status === "gevonden" || a.location?.status === "handmatig";
// Op de kaart: alles met coördinaten, ook "onzeker" (met een eigen, gestreepte marker).
export const onMap = (a: AdminMapAddress) => a.location?.lat != null && a.location?.lon != null;
export const latLng = (a: AdminMapAddress) => L.latLng(a.location!.lat!, a.location!.lon!);

export const houseNumber = (a: AdminMapAddress) => (a.box ? `${a.number} bus ${a.box}` : a.number);
export const addressLine = (a: AdminMapAddress) => `${a.street} ${houseNumber(a)}`;
export const childrenLabel = (n: number) => `${n} ${n === 1 ? "kind" : "kinderen"}`;

// OpenStreetMap-tegels. Het beheer stuurt zelf geen Referer mee (Referrer-Policy: no-referrer), maar de tegelservers
// vragen er één: alleen het adres van de website gaat mee, nooit het pad van het beheer.
export const osmTiles = () =>
  L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION, referrerPolicy: "strict-origin-when-cross-origin" });

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Scherm: het aantal kinderen op het adres. Afdruk: het volgnummer, met het aantal kinderen klein erbij.
export const countIcon = (a: AdminMapAddress, selected: boolean) =>
  L.divIcon({
    className: `kid-marker is-${statusOf(a)}${selected ? " is-selected" : ""}`,
    html: `<span>${a.children.length}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });

export const printIcon = (a: AdminMapAddress, size: number) =>
  L.divIcon({
    className: `print-marker is-${statusOf(a)}`,
    html: `<span style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px">${escape(String(a.nr))}</span><b>${a.children.length}</b>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
