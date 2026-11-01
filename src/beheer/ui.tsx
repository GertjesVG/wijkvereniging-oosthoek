import { useCallback, useState, type ReactNode } from "react";
import type { MailStatus } from "../inschrijving/api";
import { describeError } from "./client";

// Voert één schrijfactie tegelijk uit en houdt busy/foutmelding bij.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(describeError(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="note note-error" role="alert">
      {children}
    </p>
  );
}

const mailLabels: Record<MailStatus | "none", string> = {
  pending: "Mail wacht",
  sending: "Mail wordt verstuurd",
  sent: "Mail verstuurd",
  failed: "Mail mislukt",
  none: "Geen mail",
};
const mailTones: Record<MailStatus | "none", string> = {
  pending: "warn",
  sending: "warn",
  sent: "ok",
  failed: "bad",
  none: "muted",
};

export function MailBadge({ status }: { status: MailStatus | null }) {
  const key = status ?? "none";
  return <span className={`badge badge-${mailTones[key]}`}>{mailLabels[key]}</span>;
}

// De database kan tijden zonder zone geven ("2026-11-01 10:00:00"); die zijn UTC.
export function parseDate(value: string): Date {
  const iso = /^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(value)
    ? value.replace(" ", "T") + "Z"
    : value;
  return new Date(iso);
}

const dateTime = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Brussels",
});
export function formatDateTime(value: string | null): string {
  if (!value) return "–";
  const d = parseDate(value);
  return Number.isNaN(d.getTime()) ? value : dateTime.format(d);
}
