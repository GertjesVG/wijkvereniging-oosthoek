// Locatiekaart van het wijkhuis: Leaflet met OpenStreetMap-tegels, los van de route en de live GPS van Sinterklaas.
// Wordt pas geladen na de klik op "Toon de kaart" (WijkApp.tsx); tot dan gaat er geen enkel verzoek naar OpenStreetMap.
// Tegelgebruik volgens operations.osmfoundation.org/policies/tiles: zichtbare attributie, geen eigen Referrer-Policy.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { wijkhuisLocation } from "../content/wijk";

const HERE: L.LatLngTuple = [wijkhuisLocation.lat, wijkhuisLocation.lon];
const pin = L.divIcon({
  className: "wijkhuis-marker",
  html: '<span class="wijkhuis-pin"></span>',
  iconSize: [36, 36],
  // Punt van de gedraaide speld (zie .wijkhuis-pin in wijk.css).
  iconAnchor: [18, 44],
  tooltipAnchor: [0, -44],
});

export default function WijkhuisMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    const created = L.map(box.current!, { scrollWheelZoom: false, zoomSnap: 0.5 }).setView(HERE, wijkhuisLocation.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
    }).addTo(created);
    L.marker(HERE, { icon: pin, title: wijkhuisLocation.name, alt: wijkhuisLocation.name })
      .bindTooltip(wijkhuisLocation.name, { permanent: true, direction: "top", className: "wijkhuis-tooltip" })
      .addTo(created);
    // De knop "Toon de kaart" is net verdwenen: de toetsenbordfocus gaat naar de kaart zelf.
    created.getContainer().focus({ preventScroll: true });
    map.current = created;
    return () => {
      created.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="wijkhuis-map-wrap">
      <div ref={box} className="wijkhuis-map" role="region" aria-label={`Kaart met de plaats van ${wijkhuisLocation.name}`} />
      <button type="button" className="wijkhuis-map-center" onClick={() => map.current?.setView(HERE, wijkhuisLocation.zoom)}>
        <LocateFixed size={17} aria-hidden="true" />
        Terug naar het wijkhuis
      </button>
    </div>
  );
}
