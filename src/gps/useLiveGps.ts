import { useEffect, useState } from "react";
import type { PublicGps } from "./api";

// Wat de pagina nu toont. De server geeft leeftijden in seconden; hier telt de tijd sinds het antwoord erbij, zodat
// een positie ook zonder nieuw antwoord (verbinding van de bezoeker weg) vanzelf "niet actueel" en daarna onzichtbaar wordt.
export type LiveGpsView =
  | { kind: "off" }
  | { kind: "waiting" }
  | { kind: "lost"; fixAt: string }
  | { kind: "live"; lat: number; lon: number; accuracy: number | null; fixAt: string; ageSeconds: number; stale: boolean };

type Received = { data: PublicGps; at: number };

export function viewOf(received: Received | null, now: number): LiveGpsView {
  if (!received || received.data.state === "off") return { kind: "off" };
  const { data } = received;
  const elapsed = Math.max(0, (now - received.at) / 1000);
  // Automatische stop: ook zonder nieuw antwoord verdwijnt alles op het stopuur.
  if (elapsed >= data.endsInSeconds) return { kind: "off" };
  if (data.state === "waiting") return { kind: "waiting" };
  if (data.state === "lost") return { kind: "lost", fixAt: data.fixAt };
  const ageSeconds = Math.round(data.fixAgeSeconds + elapsed);
  if (ageSeconds > data.lostAfterSeconds) return { kind: "lost", fixAt: data.fixAt };
  return {
    kind: "live",
    lat: data.lat,
    lon: data.lon,
    accuracy: data.accuracy,
    fixAt: data.fixAt,
    ageSeconds,
    stale: ageSeconds > data.staleAfterSeconds,
  };
}

async function load(): Promise<PublicGps | null> {
  try {
    const response = await fetch("/api/gps", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as PublicGps;
    return data && typeof data.state === "string" && typeof data.refreshSeconds === "number" ? data : null;
  } catch {
    return null;
  }
}

// poll = false: één keer kijken (startpagina). Anders verversen zolang de pagina zichtbaar is, met het interval dat
// de server meegeeft (tijdens de rondrit 60 s) plus een paar willekeurige seconden, zodat niet iedereen tegelijk vraagt.
export function useLiveGps({ poll = true }: { poll?: boolean } = {}) {
  const [received, setReceived] = useState<Received | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastAsk = 0;
    let refreshSeconds = 30;
    async function ask() {
      clearTimeout(timer);
      lastAsk = Date.now();
      const data = await load();
      if (stopped) return;
      if (data) {
        refreshSeconds = data.refreshSeconds;
        setReceived({ data, at: Date.now() });
      }
      setFailed(!data);
      setNow(Date.now());
      if (poll && document.visibilityState === "visible")
        timer = setTimeout(ask, refreshSeconds * 1000 + Math.random() * 3000);
    }
    function onVisibility() {
      if (document.visibilityState !== "visible") clearTimeout(timer);
      else if (Date.now() - lastAsk > 5000) void ask();
    }
    void ask();
    if (poll) document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  // Klok voor de leeftijd ("20 s geleden") en het moment waarop een positie niet meer actueel is.
  useEffect(() => {
    if (!poll) return;
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(tick);
  }, [poll]);

  return { view: viewOf(received, now), failed };
}

const clock = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
// "11:42"
export const timeOf = (iso: string) => clock.format(new Date(iso));
// "25 s geleden", "3 min geleden"
export const ageLabel = (seconds: number) =>
  seconds < 60 ? `${Math.max(0, Math.round(seconds))} s geleden` : `${Math.round(seconds / 60)} min geleden`;
