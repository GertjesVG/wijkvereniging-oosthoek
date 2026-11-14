import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./wijk.css";
import { legacySinterklaasUrl } from "../content/wijk";
import { paginaVan } from "../bezoek/paginas";
import { meldAankomstVoorDoorverwijzing, startBezoekteller } from "../bezoek/teller";
import { loadTexts } from "../teksten";
import WijkApp from "./WijkApp";

const legacy = legacySinterklaasUrl(location.search, location.hash);
if (legacy) {
  // Oude link naar een Sinterklaaspagina: het bezoek telt bij die pagina (zie src/bezoek/teller.ts).
  meldAankomstVoorDoorverwijzing(paginaVan("sinterklaas", "/sinterklaas/", location.search, location.hash));
  location.replace(legacy);
} else {
  // Aangepaste teksten ophalen terwijl de pagina al opbouwt; zonder antwoord blijven de oorspronkelijke staan.
  loadTexts();
  // Anonieme bezoekersteller: alleen aantallen per pagina, zie src/bezoek/paginas.ts.
  startBezoekteller("wijk");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <WijkApp />
    </React.StrictMode>,
  );
}
