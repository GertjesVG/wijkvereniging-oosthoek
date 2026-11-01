import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Gift,
  MapPinned,
  Radio,
  Sparkles,
} from "lucide-react";
import { event, dateParts, dateLabel } from "./content/event";
export const pageLinks = [
  ["home", "Home"],
  ["cadeauactie", "Cadeauactie"],
  ["kleurwedstrijd", "Kleurwedstrijd"],
  ["route", "Route & live GPS"],
  ["praktisch", "Praktische info"],
  ["sponsors", "Sponsors"],
  ["contact", "Contact"],
  ["privacy", "Privacy"],
] as const;
export function ButtonLink({
  href,
  children,
  variant = "primary",
  download,
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "gold";
  download?: string;
  icon?: ReactNode;
}) {
  return (
    <a className={`button button-${variant}`} href={href} download={download}>
      {icon}
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </a>
  );
}
export function StatusNote({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "blue";
}) {
  return (
    <div className={`status-note status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <p className="eyebrow">
        <Sparkles size={15} aria-hidden="true" />
        {eyebrow}
      </p>
      <h1>{title}</h1>
      {children && <p className="page-lead">{children}</p>}
      <span className="heading-star" aria-hidden="true">
        ✦
      </span>
    </header>
  );
}
export function DateTag() {
  return (
    <div className="date-tag" aria-label={dateLabel}>
      <CalendarDays size={26} aria-hidden="true" />
      <span>{dateParts.weekday}</span>
      <strong>{dateParts.day}</strong>
      <span>{dateParts.month}</span>
      <small>{event.year}</small>
    </div>
  );
}
export function FeatureCard({
  title,
  description,
  href,
  kind,
}: {
  title: string;
  description: string;
  href: string;
  kind: "gift" | "route" | "info";
}) {
  const Icon = kind === "gift" ? Gift : kind === "route" ? Radio : MapPinned;
  return (
    <a className={`feature-card feature-${kind}`} href={href}>
      <span className="feature-art" aria-hidden="true">
        <Icon strokeWidth={1.4} />
        <i>✦</i>
      </span>
      <span className="feature-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </span>
      <span className="round-arrow">
        <ArrowRight size={21} aria-hidden="true" />
      </span>
    </a>
  );
}
export function Rules() {
  return (
    <section className="rules-panel" aria-labelledby="rules-title">
      <p className="eyebrow">UIT DE OFFICIËLE FLYER</p>
      <h2 id="rules-title">Zo blijft het leuk voor iedereen</h2>
      {event.rules.map((rule, i) => (
        <p className={i === 1 ? "rule-emphasis" : ""} key={rule}>
          {rule}
        </p>
      ))}
    </section>
  );
}
