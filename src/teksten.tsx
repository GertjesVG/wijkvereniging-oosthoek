// De beheerbare teksten op de website (lijst en oorspronkelijke teksten: src/content/teksten.ts).
// De pagina toont meteen de oorspronkelijke tekst en haalt op de achtergrond één keer /api/teksten op. Geen antwoord,
// een fout of een lege lijst: dan blijft alles zoals het was. Teksten worden als gewone tekst getoond, nooit als HTML.
import { Fragment, useSyncExternalStore } from "react";
import { textOverrides, texts, type TextKey } from "./content/teksten";

let current: Partial<Record<TextKey, string>> = {};
let started = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const snapshot = () => current;

// Eén keer per bezoek, bij het starten van de website (main.tsx).
export function loadTexts() {
  if (started) return;
  started = true;
  fetch("/api/teksten", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: unknown) => {
      const found = textOverrides(body);
      if (Object.keys(found).length === 0) return;
      current = found;
      listeners.forEach((listener) => listener());
    })
    .catch(() => {});
}

// t("sleutel") = de aangepaste tekst, anders de oorspronkelijke.
export function useTexts() {
  const overrides = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (key: TextKey) => overrides[key] ?? texts[key].text;
}

// Een tekst met "lines": elke nieuwe regel wordt een <br />, zoals in de oorspronkelijke opmaak van titels.
export function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {part}
        </Fragment>
      ))}
    </>
  );
}
