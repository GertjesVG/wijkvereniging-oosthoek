import { useEffect, useState } from "react";
import type { PublicEventStatus } from "./api";
import { sinterklaasRegistration } from "./evenementen";

function isPeriod(value: unknown) {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.opensAt === "string" && typeof v.closesAt === "string";
}

function isStatus(value: unknown): value is PublicEventStatus {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    (v.status === "open" || v.status === "closed" || v.status === "full" || v.status === "upcoming") &&
    // null = geen maximum ingesteld.
    (v.available === null || typeof v.available === "number") &&
    isPeriod(v.period) &&
    (v.turnstileSiteKey === null || typeof v.turnstileSiteKey === "string")
  );
}

// De actuele status van de server, voor de inschrijfpagina en de wijkwebsite. null = nog geen antwoord, of een fout
// (netwerk, 404, geen JSON): dan belooft de site niets en blijft het formulier dicht.
export function useRegistrationStatus(eventId = sinterklaasRegistration.id) {
  const [status, setStatus] = useState<PublicEventStatus | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/evenementen/${eventId}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body: unknown = await response.json();
        return isStatus(body) ? body : null;
      })
      .catch(() => null)
      .then((result) => {
        if (!controller.signal.aborted) setStatus(result);
      });
    return () => controller.abort();
  }, [eventId]);
  return status;
}
