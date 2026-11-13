import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/400-italic.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import App from "./App";
import { loadTexts } from "./teksten";
import "./styles.css";
import "./layout.css";
// Aangepaste teksten ophalen terwijl de pagina al opbouwt; zonder antwoord blijven de oorspronkelijke staan.
loadTexts();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
