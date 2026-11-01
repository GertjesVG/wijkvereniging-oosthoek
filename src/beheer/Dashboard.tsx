import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Download, LogOut, RefreshCw, Trash2 } from "lucide-react";
import type { AdminEventSummary, AdminRegistration } from "../inschrijving/api";
import { AdminError, api, describeError, exportUrl, setUnauthorizedHandler } from "./client";
import { RegistrationItem } from "./RegistrationItem";
import { ErrorNote, useAction } from "./ui";

// ---------- Inloggen ----------

function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const { busy, error, run } = useAction();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    const ok = await run(async () => {
      await api.login(password);
      return true;
    });
    if (ok) {
      setPassword("");
      onLoggedIn();
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">WIJKVERENIGING OOSTHOEK</p>
        <h1>Beheer</h1>
        <label className="field">
          <span>Wachtwoord</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoFocus
            required
          />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" className="btn btn-primary" disabled={busy || !password}>
          {busy ? "Bezig…" : "Inloggen"}
        </button>
      </form>
    </main>
  );
}

// ---------- Evenement: kaarten en bediening ----------

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function EventPanel({
  event,
  onChange,
  onErased,
}: {
  event: AdminEventSummary;
  onChange: (updated: AdminEventSummary) => void;
  onErased: () => void;
}) {
  const open = event.status === "open";
  const toggle = useAction();
  const cap = useAction();
  const erase = useAction();
  const [capacity, setCapacity] = useState(String(event.capacity));
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setCapacity(String(event.capacity));
  }, [event.capacity, event.id]);
  useEffect(() => {
    setConfirming(false);
    setTyped("");
  }, [event.id]);

  const capacityNumber = Number(capacity);
  const capacityValid =
    capacity.trim() !== "" && Number.isInteger(capacityNumber) && capacityNumber >= 0;

  async function setStatus() {
    const updated = await toggle.run(() =>
      api.patchEvent(event.id, { status: open ? "closed" : "open" }),
    );
    if (updated) onChange(updated);
  }
  async function saveCapacity(e: FormEvent) {
    e.preventDefault();
    if (!capacityValid || capacityNumber === event.capacity) return;
    const updated = await cap.run(() => api.patchEvent(event.id, { capacity: capacityNumber }));
    if (updated) onChange(updated);
  }
  async function doErase(e: FormEvent) {
    e.preventDefault();
    if (typed !== "WISSEN") return;
    const updated = await erase.run(() => api.erase(event.id));
    if (updated) {
      setConfirming(false);
      setTyped("");
      onChange(updated);
      onErased();
    }
  }

  const mailWaiting = event.mail.pending + event.mail.sending;

  return (
    <section className="panel" aria-labelledby="event-title">
      <div className="panel-top">
        <div>
          <h2 id="event-title">{event.title}</h2>
          <p className="muted">{event.date}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          className={`switch ${open ? "is-on" : ""}`}
          onClick={setStatus}
          disabled={toggle.busy}
        >
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <span>Inschrijving {open ? "open" : "dicht"}</span>
        </button>
      </div>
      <ErrorNote>{toggle.error}</ErrorNote>

      <dl className="stats">
        <Stat label="Capaciteit" value={event.capacity} />
        <Stat label="Kinderen ingeschreven" value={event.active} />
        <Stat label="Vrije plaatsen" value={event.available} />
        <Stat label="Inschrijvingen" value={event.registrations} />
        <Stat label="Afgehaald" value={event.pickedUp} hint={`van ${event.active}`} />
        <Stat
          label="Mails"
          value={`${mailWaiting} / ${event.mail.sent} / ${event.mail.failed}`}
          hint="wachtend / verstuurd / mislukt"
        />
      </dl>

      <div className="controls">
        <form className="inline-form" onSubmit={saveCapacity}>
          <label className="field">
            <span>Capaciteit</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={cap.busy}
              aria-invalid={capacityValid ? undefined : true}
            />
          </label>
          <button
            type="submit"
            className="btn btn-small"
            disabled={cap.busy || !capacityValid || capacityNumber === event.capacity}
          >
            Capaciteit opslaan
          </button>
        </form>
        <a className="btn btn-small" href={exportUrl(event.id)} download>
          <Download size={15} aria-hidden="true" />
          CSV-export (Excel)
        </a>
      </div>
      <ErrorNote>{cap.error}</ErrorNote>

      <div className="erase">
        {event.personalDataErased ? (
          <p className="note">De persoonsgegevens van dit evenement zijn gewist.</p>
        ) : confirming ? (
          <form className="erase-confirm" onSubmit={doErase}>
            <p>
              Hiermee worden alle namen, e-mailadressen en adressen van dit evenement definitief
              gewist. Dit kan niet ongedaan gemaakt worden. Maak eerst de CSV-export als je de
              gegevens nog nodig hebt.
            </p>
            <label className="field">
              <span>Typ WISSEN om te bevestigen</span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                disabled={erase.busy}
              />
            </label>
            <div className="actions">
              <button
                type="submit"
                className="btn btn-danger btn-small"
                disabled={erase.busy || typed !== "WISSEN"}
              >
                Definitief wissen
              </button>
              <button
                type="button"
                className="btn btn-small btn-quiet"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
              >
                Annuleren
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-small btn-quiet"
              disabled={open}
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
              Persoonsgegevens wissen
            </button>
            {open && (
              <span className="muted small">Zet de inschrijving eerst op dicht om te kunnen wissen.</span>
            )}
          </>
        )}
        <ErrorNote>{erase.error}</ErrorNote>
      </div>
    </section>
  );
}

// ---------- Inschrijvingen: zoeken, filters, lijst ----------

type Filters = {
  query: string;
  status: "all" | "active" | "cancelled";
  mail: "all" | "waiting" | "sent" | "failed" | "none";
  duplicate: boolean;
  pickup: "all" | "done" | "open";
};
const emptyFilters: Filters = {
  query: "",
  status: "all",
  mail: "all",
  duplicate: false,
  pickup: "all",
};

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function matches(reg: AdminRegistration, f: Filters): boolean {
  if (f.status !== "all" && reg.status !== f.status) return false;
  if (f.duplicate && !reg.suspectedDuplicate) return false;
  const mail = reg.mail?.status ?? null;
  if (f.mail === "none" && mail !== null) return false;
  if (f.mail === "waiting" && mail !== "pending" && mail !== "sending") return false;
  if (f.mail === "sent" && mail !== "sent") return false;
  if (f.mail === "failed" && mail !== "failed") return false;
  if (f.pickup !== "all") {
    const active = reg.participants.filter((p) => p.status === "active");
    const done = active.length > 0 && active.every((p) => p.pickedUpAt !== null);
    const open = active.some((p) => p.pickedUpAt === null);
    if (f.pickup === "done" && !done) return false;
    if (f.pickup === "open" && !open) return false;
  }
  const q = fold(f.query.trim());
  if (q) {
    const hay = fold(
      [
        reg.reference,
        reg.parentName,
        reg.email,
        reg.street ?? "",
        `${reg.street ?? ""} ${reg.houseNumber ?? ""}`,
        ...reg.participants.map((p) => p.name),
      ].join("\n"),
    );
    if (!hay.includes(q)) return false;
  }
  return true;
}

function Registrations({
  eventId,
  reloadKey,
  onMutated,
}: {
  eventId: string;
  reloadKey: number;
  onMutated: () => void;
}) {
  const [items, setItems] = useState<AdminRegistration[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [expanded, setExpanded] = useState<number | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await api.registrations(eventId);
      if (mine === requestId.current) setItems(list);
    } catch (e) {
      if (mine === requestId.current) setLoadError(describeError(e));
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setItems(null);
    setExpanded(null);
    void load();
  }, [load, reloadKey]);

  const visible = useMemo(
    () => (items ? items.filter((r) => matches(r, filters)) : []),
    [items, filters],
  );
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const filtered =
    filters.query !== "" ||
    filters.status !== "all" ||
    filters.mail !== "all" ||
    filters.duplicate ||
    filters.pickup !== "all";

  function update(updated: AdminRegistration) {
    setItems((list) => list && list.map((r) => (r.id === updated.id ? updated : r)));
    onMutated();
  }

  return (
    <section className="panel" aria-labelledby="regs-title">
      <div className="panel-top">
        <h2 id="regs-title">Inschrijvingen</h2>
        <button type="button" className="btn btn-small btn-quiet" onClick={load} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" />
          Vernieuwen
        </button>
      </div>
      <div className="filters">
        <label className="field search">
          <span>Zoeken</span>
          <input
            type="search"
            placeholder="Nummer, naam, e-mail, kind of straat"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={filters.status} onChange={(e) => set("status", e.target.value as Filters["status"])}>
            <option value="all">Alle</option>
            <option value="active">Actief</option>
            <option value="cancelled">Geannuleerd</option>
          </select>
        </label>
        <label className="field">
          <span>Mail</span>
          <select value={filters.mail} onChange={(e) => set("mail", e.target.value as Filters["mail"])}>
            <option value="all">Alle</option>
            <option value="waiting">Wachtend</option>
            <option value="sent">Verstuurd</option>
            <option value="failed">Mislukt</option>
            <option value="none">Geen mail</option>
          </select>
        </label>
        <label className="field">
          <span>Afgehaald</span>
          <select value={filters.pickup} onChange={(e) => set("pickup", e.target.value as Filters["pickup"])}>
            <option value="all">Alle</option>
            <option value="done">Alles afgehaald</option>
            <option value="open">Nog af te halen</option>
          </select>
        </label>
        <label className="check filter-check">
          <input
            type="checkbox"
            checked={filters.duplicate}
            onChange={(e) => set("duplicate", e.target.checked)}
          />
          <span>Mogelijk dubbel</span>
        </label>
        {filtered && (
          <button type="button" className="btn btn-small btn-quiet" onClick={() => setFilters(emptyFilters)}>
            Filters wissen
          </button>
        )}
      </div>

      {loadError && (
        <div>
          <ErrorNote>{loadError}</ErrorNote>
        </div>
      )}
      {items === null && !loadError && <p className="muted">Inschrijvingen laden…</p>}
      {items && (
        <>
          <p className="muted small" aria-live="polite">
            {visible.length === items.length
              ? `${items.length} ${items.length === 1 ? "inschrijving" : "inschrijvingen"}`
              : `${visible.length} van ${items.length} inschrijvingen`}
          </p>
          {visible.length === 0 ? (
            <p className="empty">
              {items.length === 0 ? "Nog geen inschrijvingen." : "Geen inschrijvingen gevonden met deze zoekopdracht."}
            </p>
          ) : (
            <ul className="registrations">
              {visible.map((r) => (
                <RegistrationItem
                  key={r.id}
                  registration={r}
                  expanded={expanded === r.id}
                  onToggle={() => setExpanded((id) => (id === r.id ? null : r.id))}
                  onUpdate={update}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// ---------- Dashboard en app ----------

function Dashboard({
  initialEvents,
  onLogout,
}: {
  initialEvents: AdminEventSummary[];
  onLogout: () => void;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState(initialEvents[0]?.id ?? "");
  const [reloadKey, setReloadKey] = useState(0);
  const logout = useAction();

  const refreshEvents = useCallback(async () => {
    try {
      setEvents(await api.events());
    } catch {
      // Een mislukte verversing laat de bestaande cijfers staan.
    }
  }, []);
  const event = events.find((e) => e.id === selected) ?? events[0];

  async function doLogout() {
    await logout.run(() => api.logout());
    // Ook bij een mislukte logout verdwijnen de gegevens uit het scherm.
    onLogout();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Beheer</strong>
            <span className="muted">Wijkvereniging Oosthoek</span>
          </div>
          {events.length > 0 && (
            <label className="field event-pick">
              <span>Evenement</span>
              <select value={event?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn btn-small btn-quiet" onClick={doLogout}>
            <LogOut size={15} aria-hidden="true" />
            Uitloggen
          </button>
        </div>
      </header>
      <main className="page">
        {!event ? (
          <p className="empty">Er zijn geen evenementen.</p>
        ) : (
          <>
            <EventPanel
              event={event}
              onChange={(updated) =>
                setEvents((list) => list.map((e) => (e.id === updated.id ? updated : e)))
              }
              onErased={() => setReloadKey((n) => n + 1)}
            />
            <Registrations eventId={event.id} reloadKey={reloadKey} onMutated={refreshEvents} />
          </>
        )}
      </main>
    </>
  );
}

type Phase =
  | { name: "checking" }
  | { name: "login" }
  | { name: "error"; message: string }
  | { name: "ready"; events: AdminEventSummary[] };

export function App() {
  const [phase, setPhase] = useState<Phase>({ name: "checking" });

  const check = useCallback(async () => {
    setPhase({ name: "checking" });
    try {
      setPhase({ name: "ready", events: await api.events() });
    } catch (e) {
      if (e instanceof AdminError && e.status === 401) setPhase({ name: "login" });
      else setPhase({ name: "error", message: describeError(e) });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setPhase({ name: "login" }));
    void check();
    return () => setUnauthorizedHandler(null);
  }, [check]);

  if (phase.name === "login") return <Login onLoggedIn={check} />;
  if (phase.name === "ready")
    return (
      <Dashboard
        initialEvents={phase.events}
        onLogout={() => setPhase({ name: "login" })}
      />
    );
  if (phase.name === "error")
    return (
      <main className="login-wrap">
        <div className="login-card">
          <h1>Beheer</h1>
          <ErrorNote>{phase.message}</ErrorNote>
          <button type="button" className="btn btn-primary" onClick={check}>
            Opnieuw proberen
          </button>
        </div>
      </main>
    );
  return (
    <main className="login-wrap">
      <p className="muted" role="status">
        Laden…
      </p>
    </main>
  );
}
