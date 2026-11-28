// Welke weergave de Sinterklaaswebsite toont: de volledige website of de bedankpagina (server/evenement.ts beslist).
// - Vraagt GET /api/evenement bij het openen, daarna opnieuw na refreshSeconds en wanneer het tabblad weer zichtbaar
//   wordt: zo wisselt een open pagina vanzelf om 20.00 uur, zonder vernieuwen.
// - Geen antwoord binnen 5 s, een fout of geen server (lokaal `npm run dev`): de volledige website (veilige terugval).
// - "?voorvertoning" (website) of "?voorvertoning=bedankt" in het adres: alleen voor een aangemelde beheerder
//   (GET /api/beheer/sinterklaas moet lukken) toont de pagina die weergave, met een melding bovenaan.
import { useEffect, useState } from "react";
import type { PublicPhase, Show } from "./fase";

export type PhaseView =
  | { status: "loading" }
  | { status: "ready"; show: Show; year: number | null; preview: Show | null; publicShow: Show };

const previewWanted = (): Show | null => {
  const value = new URLSearchParams(window.location.search).get("voorvertoning");
  if (value === null) return null;
  return value === "bedankt" ? "bedankt" : "site";
};

const valid = (body: unknown): body is PublicPhase => {
  const b = body as PublicPhase | null;
  return Boolean(b && (b.show === "site" || b.show === "bedankt") && typeof b.refreshSeconds === "number");
};

async function fetchPhase(): Promise<PublicPhase | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/api/evenement", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const body: unknown = response.ok ? await response.json() : null;
    return valid(body) ? body : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function previewAllowed() {
  try {
    const response = await fetch("/api/beheer/sinterklaas", { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export function useEventPhase(): PhaseView {
  const [view, setView] = useState<PhaseView>({ status: "loading" });
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const wanted = previewWanted();
    const preview = wanted ? previewAllowed() : Promise.resolve(false);
    const load = async () => {
      window.clearTimeout(timer);
      const [phase, allowed] = await Promise.all([fetchPhase(), preview]);
      if (stopped) return;
      setView((previous) => {
        // Bij een fout blijft de laatst gekende weergave staan; zonder eerdere weergave de volledige website.
        const publicShow: Show = phase?.show ?? (previous.status === "ready" ? previous.publicShow : "site");
        const year = phase?.year ?? (previous.status === "ready" ? previous.year : null);
        const shownPreview = allowed ? wanted : null;
        return { status: "ready", show: shownPreview ?? publicShow, year, preview: shownPreview, publicShow };
      });
      timer = window.setTimeout(load, (phase?.refreshSeconds ?? 60) * 1000);
    };
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  return view;
}
