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
import { reglement } from "./content/reglement";
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
// Reglementtekst met **vet** naar React-knopen; alleen <strong>, verder geen opmaak.
function ReglementText({ text }: { text: string }) {
  return (
    <>
      {text
        .split("**")
        .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
}
// Het officiële wedstrijdreglement op de kleurwedstrijdpagina. Het inschrijfformulier linkt naar
// "#/kleurwedstrijd?reglement"; App.tsx scrolt dan naar dit id.
export function Reglement() {
  return (
    <section
      className="rules-panel reglement"
      id="reglement"
      aria-labelledby="reglement-title"
    >
      <p className="eyebrow">OFFICIEEL WEDSTRIJDREGLEMENT</p>
      <h2 id="reglement-title">{reglement.title}</h2>
      <p className="reglement-meta">
        <strong>Organisator:</strong> {reglement.organiser}
        <br />
        <strong>Evenement:</strong> {reglement.eventDate}
      </p>
      {reglement.articles.map((article) => (
        <article key={article.title}>
          <h3>{article.title}</h3>
          {article.body.map((part, i) =>
            Array.isArray(part) ? (
              <ul key={i}>
                {part.map((item) => (
                  <li key={item}>
                    <ReglementText text={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <p key={i}>
                <ReglementText text={part} />
              </p>
            ),
          )}
        </article>
      ))}
      <p className="reglement-signature">{reglement.signature}</p>
    </section>
  );
}
