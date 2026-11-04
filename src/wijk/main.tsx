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
import WijkApp from "./WijkApp";

const legacy = legacySinterklaasUrl(location.search, location.hash);
if (legacy) location.replace(legacy);
else
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <WijkApp />
    </React.StrictMode>,
  );
