import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Play, Square } from "lucide-react";
import type { AdminGps } from "../gps/api";
import { api, describeError } from "./client";
import { ErrorNote, useAction } from "./ui";

// Live GPS van de huifkar (server/gps.ts, handleiding in GPS.md). De telefoon stuurt altijd zelf; bezoekers zien de
// positie alleen tussen Start en Stop (of de automatische stop).

const clock = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
const clockSeconds = new Intl.DateTimeFormat("nl-BE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Brussels",
});
const ago = (seconds: number) => (seconds < 90 ? `${seconds} s geleden` : `${Math.round(seconds / 60)} min geleden`);

function publicState(status: AdminGps): { text: string; tone: "ok" | "warn" | "bad" | "muted" } {
  const shown = status.public;
  if (shown.state === "live")
    return shown.fixAgeSeconds > shown.staleAfterSeconds
      ? { text: "Zichtbaar, maar niet actueel", tone: "warn" }
      : { text: "Positie publiek zichtbaar", tone: "ok" };
  if (shown.state === "waiting") return { text: "Aan: wacht op eerste positie", tone: "warn" };
  if (shown.state === "lost") return { text: "Aan: verbinding weg, niets zichtbaar", tone: "bad" };
  return { text: "Uit: niets zichtbaar", tone: "muted" };
}

export function GpsPanel() {
  const [status, setStatus] = useState<AdminGps | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const action = useAction();

  const load = useCallback(async () => {
    try {
      setStatus(await api.gps());
      setLoadError(null);
    } catch (e) {
      setLoadError(describeError(e));
    }
  }, []);

  // Elke 10 s verversen zolang het beheer zichtbaar is (bv. op de gsm tijdens de rondrit).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const timer = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const chosen = hours ?? status?.hours.default ?? 4;
  async function start() {
    const updated = await action.run(() => api.gpsStart(chosen));
    if (updated) {
      setStatus(updated);
      setHours(null);
    }
  }
  async function stop() {
    const updated = await action.run(() => api.gpsStop());
    if (updated) setStatus(updated);
  }

  const device = status?.device ?? null;
  const shown = status ? publicState(status) : null;
  const hourOptions = Array.from({ length: status?.hours.max ?? 8 }, (_, i) => i + 1);
  const hourSelect = (label: string) => (
    <label className="field">
      <span>{label}</span>
      <select value={chosen} onChange={(e) => setHours(Number(e.target.value))} disabled={action.busy}>
        {hourOptions.map((h) => (
          <option key={h} value={h}>
            {h} uur
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="panel gps-panel" aria-labelledby="gps-title">
      <div className="panel-top">
        <div>
          <h2 id="gps-title">Live GPS Sinterklaas</h2>
          <p className="muted small">Bezoekers zien de positie pas na Start, tot Stop of de automatische stop.</p>
        </div>
        {shown && <span className={`badge badge-${shown.tone}`}>{shown.text}</span>}
      </div>
      <ErrorNote>{loadError}</ErrorNote>
      {status && !status.configured && (
        <p className="note note-error">
          Het apparaatgeheim GPS_DEVICE_TOKEN staat nog niet in Cloudflare: de telefoon kan nog geen posities doorgeven.
          Zie GPS.md.
        </p>
      )}
      {status && (
        <>
          <dl className="stats">
            <div className="stat">
              <dt>Telefoon</dt>
              <dd>
                {!device ? (
                  <span className="badge badge-muted">Nog geen contact</span>
                ) : device.connected ? (
                  <span className="badge badge-ok">Verbonden</span>
                ) : (
                  <span className="badge badge-warn">Geen contact</span>
                )}
              </dd>
              <small>
                {device
                  ? `Laatste contact ${ago(device.ageSeconds)}${device.battery !== null ? ` · batterij ${device.battery}%` : ""}${device.charging ? " (aan de lader)" : ""}`
                  : "Zet OwnTracks op de Pixel op Move."}
              </small>
            </div>
            <div className="stat">
              <dt>Laatste GPS-update</dt>
              <dd>{device?.fixAt ? clockSeconds.format(new Date(device.fixAt)) : "–"}</dd>
              {device && device.accuracy !== null && (
                <small>
                  Nauwkeurigheid {device.accuracy} m
                  {/* Zelfde grens als MAX_ACCURACY_METERS in server/gps.ts. */}
                  {device.accuracy > 150 && ": te onnauwkeurig, niet gepubliceerd"}
                </small>
              )}
            </div>
            <div className="stat">
              <dt>Publiek</dt>
              <dd>{status.public.state === "live" ? "Zichtbaar" : "Niet zichtbaar"}</dd>
              <small>{status.public.state === "live" ? "Bezoekers zien de huifkar op de kaart" : "Bezoekers zien geen positie"}</small>
            </div>
            <div className="stat">
              <dt>Automatische stop</dt>
              <dd>{status.session ? clock.format(new Date(status.session.until)) : "–"}</dd>
              <small>{status.session ? `Gestart om ${clock.format(new Date(status.session.since))}` : "Live GPS staat uit"}</small>
            </div>
          </dl>

          <div className="controls gps-controls">
            {status.session ? (
              <>
                <button type="button" className="btn btn-danger gps-main" onClick={stop} disabled={action.busy}>
                  <Square size={17} aria-hidden="true" />
                  Stop live GPS
                </button>
                {hourSelect("Stopuur aanpassen: nog")}
                <button type="button" className="btn btn-small" onClick={start} disabled={action.busy}>
                  Stopuur opslaan
                </button>
              </>
            ) : (
              <>
                {hourSelect("Automatische stop na")}
                <button type="button" className="btn btn-primary gps-main" onClick={start} disabled={action.busy}>
                  <Play size={17} aria-hidden="true" />
                  Start live GPS
                </button>
              </>
            )}
            <a className="btn btn-small btn-quiet" href="/sinterklaas/#/route" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} aria-hidden="true" />
              Publieke kaart
            </a>
          </div>
          {!status.session && !device?.connected && (
            <p className="muted small">
              Nog geen recent contact met de telefoon. Starten kan, maar bezoekers zien pas iets zodra OwnTracks op Move
              staat en een positie doorgeeft.
            </p>
          )}
          <ErrorNote>{action.error}</ErrorNote>
        </>
      )}
    </section>
  );
}
