// Livekaart met de huifkar: Leaflet met OpenStreetMap-tegels. Wordt pas geladen als er een positie is (zie Pages.tsx).
// Tegelgebruik volgens operations.osmfoundation.org/policies/tiles: zichtbare attributie, geen eigen Referrer-Policy.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";

type Props = { lat: number; lon: number; accuracy: number | null; stale: boolean };

const ZOOM = 16;
const icon = (stale: boolean) =>
  L.divIcon({
    className: `sint-marker${stale ? " is-stale" : ""}`,
    html: '<span class="sint-pin"><span>Sint</span></span>',
    iconSize: [46, 46],
    // Punt van de gedraaide speld (zie .sint-pin in pages.css).
    iconAnchor: [23, 56],
  });

export default function LiveMap({ lat, lon, accuracy, stale }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);

  useEffect(() => {
    const created = L.map(box.current!, { scrollWheelZoom: false }).setView([lat, lon], ZOOM);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
    }).addTo(created);
    map.current = created;
    return () => {
      created.remove();
      map.current = marker.current = circle.current = null;
    };
    // De kaart wordt één keer gemaakt; nieuwe posities verplaatsen alleen de markering (effect hieronder).
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const here = L.latLng(lat, lon);
    if (!marker.current) marker.current = L.marker(here, { icon: icon(stale), keyboard: false, title: "Sinterklaas" }).addTo(m);
    else marker.current.setLatLng(here).setIcon(icon(stale));
    const radius = accuracy !== null && accuracy > 15 ? accuracy : 0;
    if (radius && !circle.current)
      circle.current = L.circle(here, { radius, color: "#a40029", weight: 1, fillOpacity: 0.08 }).addTo(m);
    else if (radius) circle.current!.setLatLng(here).setRadius(radius);
    else if (circle.current) {
      circle.current.remove();
      circle.current = null;
    }
    // Rijdt de huifkar uit beeld, dan schuift de kaart mee; wie zelf rondkijkt binnen het beeld, wordt niet gestoord.
    if (!m.getBounds().pad(-0.15).contains(here)) m.panTo(here);
  }, [lat, lon, accuracy, stale]);

  return (
    <div className="live-map-wrap">
      <div ref={box} className="live-map" aria-label="Kaart met de livepositie van de huifkar" role="region" />
      <button
        type="button"
        className="live-map-center"
        onClick={() => map.current?.setView([lat, lon], Math.max(map.current.getZoom(), ZOOM))}
      >
        <LocateFixed size={17} aria-hidden="true" />
        Naar de Sint
      </button>
    </div>
  );
}
