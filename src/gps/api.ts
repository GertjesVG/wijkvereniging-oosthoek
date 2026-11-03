// Afspraken tussen website/beheer en de server voor de live GPS (server/gps.ts). Alleen types, geen code.

// Wat bezoekers op de routepagina krijgen. Leeftijden en resterende tijd in seconden, gemeten door de server:
// zo maakt een verkeerd ingestelde klok op de telefoon van een bezoeker niets uit.
export type PublicGps =
  // Geen actieve sessie: niets tonen.
  | { state: "off"; refreshSeconds: number }
  // Gestart in het beheer, maar nog geen positie ontvangen sinds de start.
  | { state: "waiting"; refreshSeconds: number; endsInSeconds: number }
  // Laatste positie te oud: geen coördinaten meer, alleen het tijdstip.
  | { state: "lost"; refreshSeconds: number; endsInSeconds: number; fixAt: string; fixAgeSeconds: number }
  | {
      state: "live";
      refreshSeconds: number;
      endsInSeconds: number;
      lat: number;
      lon: number;
      // Nauwkeurigheid in meter volgens de telefoon; null = niet doorgegeven.
      accuracy: number | null;
      fixAt: string;
      fixAgeSeconds: number;
      // Vanaf deze leeftijd "niet meer actueel" tonen; vanaf lostAfterSeconds de positie niet meer tonen.
      staleAfterSeconds: number;
      lostAfterSeconds: number;
    };

export type AdminGps = {
  // Het apparaatgeheim GPS_DEVICE_TOKEN staat in Cloudflare (de waarde zelf komt nooit in het beheer).
  configured: boolean;
  // Actieve publieke sessie met automatische stop; null = uit.
  session: { since: string; until: string } | null;
  // Precies wat bezoekers nu zien.
  public: PublicGps;
  // Laatste contact met de telefoon, ook buiten een sessie (zonder coördinaten).
  device: {
    seenAt: string;
    ageSeconds: number;
    connected: boolean;
    fixAt: string | null;
    accuracy: number | null;
    battery: number | null;
    charging: boolean | null;
  } | null;
  hours: { default: number; max: number };
};
