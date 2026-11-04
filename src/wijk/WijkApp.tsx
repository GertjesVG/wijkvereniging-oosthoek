import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Baby,
  Flower2,
  Heart,
  Mail,
  Menu,
  Phone,
  X,
} from "lucide-react";
import { event } from "../content/event";
import sponsors from "../content/sponsors.json";
import { sponsorLogos } from "../content/sponsor-logos";
import { sinterklaasRegistration } from "../inschrijving/evenementen";
import type { PublicEventStatus } from "../inschrijving/api";
import {
  activities,
  activityStatus,
  dateText,
  legacySinterklaasUrl,
  lifeMoments,
  municipalityJubileeUrl,
  publicFile,
  readRoute,
  sinterklaas,
  sinterklaasStatus,
  statusLabels,
  todayInBrussels,
  type Activity,
  type ActivityStatus,
} from "../content/wijk";

type Sponsor = (typeof sponsors)[number];

const org = event.organisation;
const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const FIRST_SPONSORS = 8;

function StatusChip({ status }: { status: ActivityStatus }) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

// De echte inschrijfstatus van Sinterklaas, zoals de inschrijfpagina die ook opvraagt. Zonder antwoord: null.
function useSinterklaasStatus(today: string) {
  const [server, setServer] = useState<PublicEventStatus["status"] | null>(null);
  const finished = today > event.date;
  useEffect(() => {
    if (finished) return;
    const controller = new AbortController();
    fetch(`/api/evenementen/${sinterklaasRegistration.id}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const status = body?.status;
        if (status === "open" || status === "closed" || status === "full") setServer(status);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [finished]);
  return sinterklaasStatus(event.date, server, today);
}

function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !document.getElementById("navigation")?.contains(target) &&
        !document.getElementById("menu-toggle")?.contains(target)
      )
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="brand" href="#welkom" aria-label="Oosthoek, naar het begin van de pagina" onClick={close}>
          <img src={publicFile("assets/oosthoek-logo.webp")} alt="Logo van VZW Wijkvereniging Oosthoek" width="1117" height="1409" />
          <span>
            <strong>Oosthoek</strong>
            <small>VZW Wijkvereniging · Beerse</small>
          </span>
        </a>
        <button
          type="button"
          className="menu"
          id="menu-toggle"
          aria-label={open ? "Menu sluiten" : "Menu openen"}
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <nav id="navigation" className={open ? "is-open" : undefined} aria-label="Hoofdnavigatie">
          <a href="#activiteiten" onClick={close}>Activiteiten</a>
          <a href="#leeft-mee" onClick={close}>Oosthoek leeft mee</a>
          <a href="#sponsors" onClick={close}>Onze sponsors</a>
          <a className="nav-contact" href="#contact" onClick={close}>Contact</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="welkom" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" aria-hidden="true" />
            Welkom in onze wijk
          </p>
          <h1 id="hero-title">
            Hier kennen{" "}
            <br />
            we elkaar.{" "}
            <br />
            <em>Hier is Oosthoek.</em>
          </h1>
          <p className="intro">
            Een fijne buurt begint bij elkaar. We brengen buren samen, vieren mooie momenten en leven met elkaar mee.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#activiteiten">
              Ontdek wat er leeft <ArrowDown size={18} aria-hidden="true" />
            </a>
            <a className="textlink" href="#leeft-mee">Een hart voor de wijk</a>
          </div>
        </div>
        <div className="hero-art">
          <img
            src={publicFile("assets/oosthoek-wijk.webp")}
            alt="Sfeerillustratie van buren die samenkomen in een groene straat met bakstenen huizen, vlaggetjes en een gedekte tafel."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <div className="stamp" aria-hidden="true">
            Samen
            <br />
            is gezelliger.
            <small>Oosthoek · Beerse</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  return (
    <div className="ticker">
      <div className="wrap">
        <span className="ticker-label">Op de kalender</span>
        <p>
          <strong>{dateText(event.date)}</strong>
          <span aria-hidden="true"> · </span> {sinterklaas.title}
        </p>
        <a href={sinterklaas.href}>
          Naar de Sinterklaaswebsite <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

function ActivityImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`event-art${className ? ` ${className}` : ""}`}>
      <img src={publicFile(src)} alt={alt} width="1536" height="1024" loading="lazy" decoding="async" />
    </div>
  );
}

function ActivityCard({ activity, today }: { activity: Activity; today: string }) {
  return (
    <article className="event">
      <ActivityImage src={activity.image} alt={activity.imageAlt} />
      <div className="event-copy">
        <div className="event-meta">
          <span className="pill">{dateText(activity.date)}</span>
          <StatusChip status={activityStatus(activity, today)} />
        </div>
        <h3>{activity.name}</h3>
        <p>{activity.teaser}</p>
        <div className="event-links">
          <a href={`#/${activity.slug}`}>
            {activity.more} <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

function SinterklaasCard({ status }: { status: ActivityStatus | null }) {
  return (
    <article className="event event-sinterklaas">
      <ActivityImage src={sinterklaas.image} alt={sinterklaas.imageAlt} />
      <div className="event-copy">
        <div className="event-meta">
          <span className="pill">{dateText(event.date)}</span>
          {status && <StatusChip status={status} />}
        </div>
        <h3>{sinterklaas.name}</h3>
        <p>{sinterklaas.teaser}</p>
        <div className="event-links">
          <a href={sinterklaas.href}>
            Naar Sinterklaas <ArrowRight size={17} aria-hidden="true" />
          </a>
          {status === "open" && (
            <a href={sinterklaas.registrationHref}>
              Inschrijven voor de cadeauactie <ArrowRight size={17} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Activities({ today, status }: { today: string; status: ActivityStatus | null }) {
  return (
    <section className="section" id="activiteiten" aria-labelledby="activiteiten-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">Buiten komen. Buren ontmoeten.</p>
            <h2 id="activiteiten-title">Er leeft iets in Oosthoek.</h2>
          </div>
          <p>Van paaseieren tot feestlichtjes: hier vind je onze activiteiten bij elkaar.</p>
        </div>
        <div className="events">
          {activities.map((activity) => (
            <ActivityCard activity={activity} today={today} key={activity.slug} />
          ))}
          <SinterklaasCard status={status} />
        </div>
      </div>
    </section>
  );
}

function LifeIcon({ icon }: { icon: (typeof lifeMoments)[number]["icon"] }) {
  const Icon = icon === "birth" ? Baby : icon === "loss" ? Flower2 : Heart;
  return <Icon size={34} strokeWidth={1.5} aria-hidden="true" />;
}

function LeeftMee() {
  return (
    <section className="section together" id="leeft-mee" aria-labelledby="leeft-mee-title">
      <div className="wrap together-grid">
        <div className="together-intro">
          <p className="eyebrow">Dichtbij, ook op bijzondere momenten</p>
          <h2 id="leeft-mee-title">
            Oosthoek{" "}
            <br />
            leeft mee.
          </h2>
          <p>Bij een nieuw begin, een groot jubileum of een moeilijk afscheid: als wijk staan we graag even stil bij wat telt.</p>
        </div>
        <div>
          <div className="moments">
            {lifeMoments.map((moment) => (
              <article className="moment" key={moment.title}>
                <div className="symbol">
                  <LifeIcon icon={moment.icon} />
                </div>
                <h3>{moment.title}</h3>
                <p>{moment.text}</p>
                {moment.icon === "jubilee" && (
                  <a href={municipalityJubileeUrl} target="_blank" rel="noopener noreferrer">
                    Informatie bij de gemeente <ArrowUpRight size={15} aria-hidden="true" />
                    <span className="visually-hidden"> (opent in een nieuw venster)</span>
                  </a>
                )}
              </article>
            ))}
          </div>
          <p className="mailbox">
            <strong>Een geboorte of overlijden melden?</strong>
            <br />
            Deponeer het originele geboortekaartje of de originele doodsbrief in de brievenbus op{" "}
            <strong>{org.address}</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}

// Het logo uit de centrale lijst; wie (nog) geen logo heeft, krijgt zijn naam als plaat. Geen verzonnen beeldmerk.
function SponsorLogo({ sponsor, alt = true }: { sponsor: Sponsor; alt?: boolean }) {
  const logo = sponsorLogos[sponsor.name];
  return (
    <span className="sponsor-logo" style={logo?.backdrop ? { backgroundColor: logo.backdrop } : undefined}>
      {logo ? (
        <img
          src={publicFile(`assets/${logo.file}`)}
          alt={alt ? `Logo van ${sponsor.name}` : ""}
          width={logo.width}
          height={logo.height}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="wordmark">{sponsor.name}</span>
      )}
    </span>
  );
}

function SponsorDialog({ sponsor, onClose }: { sponsor: Sponsor | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (sponsor && !dialog.current?.open) dialog.current?.showModal();
  }, [sponsor]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="sponsor-title"
      onClose={onClose}
      // Een klik buiten het venster komt op de dialog zelf terecht; de inhoud zit in dialog-body.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      {sponsor && (
        <div className="dialog-body">
          <button type="button" className="close" aria-label="Venster sluiten" onClick={() => dialog.current?.close()}>
            <X size={22} aria-hidden="true" />
          </button>
          <SponsorLogo sponsor={sponsor} />
          <h2 id="sponsor-title">{sponsor.name}</h2>
          <p className="dialog-category">{sponsor.category}</p>
          <p className="dialog-address">{sponsor.address}</p>
          <div className="dialog-links">
            {sponsor.phones.map((phone) => (
              <a className="btn outline" href={phoneHref(phone)} key={phone}>
                <Phone size={16} aria-hidden="true" />
                {phone}
              </a>
            ))}
            {sponsor.email && (
              <a className="btn outline" href={`mailto:${sponsor.email}`}>
                <Mail size={16} aria-hidden="true" />
                E-mail
              </a>
            )}
            {sponsor.website && (
              <a className="btn" href={sponsor.website} target="_blank" rel="noopener noreferrer">
                Website <ArrowUpRight size={16} aria-hidden="true" />
                <span className="visually-hidden"> (opent in een nieuw venster)</span>
              </a>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

function Sponsors() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Sponsor | null>(null);
  const normalized = query.trim().toLocaleLowerCase("nl-BE");
  const found = sponsors.filter((s) =>
    `${s.name} ${s.category} ${s.address}`.toLocaleLowerCase("nl-BE").includes(normalized),
  );
  const list = expanded || normalized ? found : found.slice(0, FIRST_SPONSORS);
  return (
    <section className="section sponsors" id="sponsors" aria-labelledby="sponsors-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">Lokaal engagement, een groot verschil</p>
            <h2 id="sponsors-title">Onze wijkmakers.</h2>
          </div>
          <label className="search-field">
            <span className="eyebrow">Zoek een sponsor</span>
            <input
              type="search"
              placeholder="Naam, activiteit of gemeente"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <p className="sponsor-intro">
          Dankzij onze sponsors kunnen we mooie dingen doen voor de wijk. Ontdek de ondernemers die Oosthoek mee mogelijk
          maken. Klik op een naam voor de contactgegevens.
        </p>
        <div className="sponsor-grid">
          {list.map((sponsor) => (
            <button
              type="button"
              className="sponsor"
              aria-label={`Contactgegevens ${sponsor.name}`}
              onClick={() => setActive(sponsor)}
              key={sponsor.name}
            >
              <SponsorLogo sponsor={sponsor} alt={false} />
              <span className="sponsor-caption">
                <span>{sponsor.name}</span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
        {found.length === 0 && <p className="empty">Geen sponsor gevonden. Probeer een andere zoekterm.</p>}
        <div className="sponsor-controls">
          {!normalized && (
            <button type="button" className="btn outline" onClick={() => setExpanded(!expanded)}>
              {expanded ? (
                <>
                  Toon minder <ArrowUp size={17} aria-hidden="true" />
                </>
              ) : (
                <>
                  Bekijk alle {sponsors.length} sponsors <ArrowDown size={17} aria-hidden="true" />
                </>
              )}
            </button>
          )}
          <p className="result-count" role="status">
            {list.length} van {found.length} sponsors
          </p>
        </div>
      </div>
      <SponsorDialog sponsor={active} onClose={() => setActive(null)} />
    </section>
  );
}

function Contact() {
  return (
    <section className="wrap" id="contact" aria-labelledby="contact-title">
      <div className="contact-band">
        <div>
          <h2 id="contact-title">
            Een vraag, een idee,{" "}
            <br />
            of gewoon even hallo?
          </h2>
          <p>We horen graag van je. Samen maken we de wijk.</p>
        </div>
        <div className="contact-links">
          <a href={`mailto:${org.email}`}>
            <Mail size={18} aria-hidden="true" />
            {org.email}
          </a>
          <a href={phoneHref(org.phone)}>
            <Phone size={18} aria-hidden="true" />
            {org.phone}
          </a>
          <p>{org.address}</p>
        </div>
      </div>
    </section>
  );
}

function Home({ today, status }: { today: string; status: ActivityStatus | null }) {
  return (
    <>
      <Hero />
      {today <= event.date && <Ticker />}
      <Activities today={today} status={status} />
      <LeeftMee />
      <Sponsors />
      <Contact />
    </>
  );
}

function OtherLink({ href, image, name, date }: { href: string; image: string; name: string; date: string | null }) {
  return (
    <li>
      <a href={href}>
        <img src={publicFile(image)} alt="" width="1536" height="1024" loading="lazy" decoding="async" />
        <span>
          <strong>{name}</strong>
          <small>{dateText(date)}</small>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </li>
  );
}

function ActivityPage({ activity, today }: { activity: Activity; today: string }) {
  const status = activityStatus(activity, today);
  return (
    <article className="section activity">
      <div className="wrap">
        <a className="back-link" href="#activiteiten">
          <ArrowLeft size={17} aria-hidden="true" />
          Alle activiteiten
        </a>
        <div className="activity-grid">
          <div className="activity-hero">
            <img src={publicFile(activity.image)} alt={activity.imageAlt} width="1536" height="1024" fetchPriority="high" />
          </div>
          <div className="activity-copy">
            <p className="eyebrow">Activiteit in Oosthoek</p>
            <h1>{activity.title}</h1>
            <p className="lead">{activity.text}</p>
            <dl className="activity-facts">
              <div>
                <dt>Datum</dt>
                <dd>{dateText(activity.date)}</dd>
              </div>
              {activity.location && (
                <div>
                  <dt>Locatie</dt>
                  <dd>{activity.location}</dd>
                </div>
              )}
              <div>
                <dt>Stand van zaken</dt>
                <dd>
                  <StatusChip status={status} />
                </dd>
              </div>
            </dl>
            <div className="activity-actions">
              {status === "open" && activity.registrationHref && (
                <a className="btn" href={activity.registrationHref}>
                  Inschrijven <ArrowRight size={17} aria-hidden="true" />
                </a>
              )}
              <a className="btn outline" href={`mailto:${org.email}`}>
                Een vraag? Mail ons <Mail size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <section className="other" aria-labelledby="other-title">
          <h2 id="other-title">Ook in Oosthoek</h2>
          <ul>
            {activities
              .filter((other) => other.slug !== activity.slug)
              .map((other) => (
                <OtherLink href={`#/${other.slug}`} image={other.image} name={other.name} date={other.date} key={other.slug} />
              ))}
            <OtherLink href={sinterklaas.href} image={sinterklaas.image} name={sinterklaas.name} date={event.date} />
          </ul>
        </section>
      </div>
    </article>
  );
}

export default function WijkApp() {
  const [route, setRoute] = useState(() => readRoute(location.hash));
  const main = useRef<HTMLElement>(null);
  const previousPage = useRef(route.page);
  const today = todayInBrussels();
  const status = useSinterklaasStatus(today);
  const activity = activities.find((a) => a.slug === route.page);

  useEffect(() => {
    const change = () => {
      const legacy = legacySinterklaasUrl(location.search, location.hash);
      if (legacy) location.replace(legacy);
      else setRoute(readRoute(location.hash));
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);

  useEffect(() => {
    document.title = activity ? `${activity.title} · Wijkvereniging Oosthoek` : "Wijkvereniging Oosthoek · Beerse";
    if (previousPage.current !== route.page) {
      main.current?.focus({ preventScroll: true });
      previousPage.current = route.page;
    }
    const target = route.anchor ? document.getElementById(route.anchor) : null;
    if (target) {
      target.scrollIntoView();
      // Webfonts die na de eerste opbouw laden, verschuiven de inhoud erboven; daarna nog één keer uitlijnen.
      document.fonts?.ready.then(() => target.scrollIntoView());
    } else window.scrollTo({ top: 0, behavior: "instant" });
  }, [activity, route]);

  return (
    <>
      <a
        className="skip-link"
        href="#inhoud"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
          main.current?.scrollIntoView();
        }}
      >
        Ga naar de inhoud
      </a>
      <div className="topline" aria-hidden="true" />
      <Header />
      <main id="inhoud" ref={main} tabIndex={-1}>
        {activity ? <ActivityPage activity={activity} today={today} /> : <Home today={today} status={status} />}
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <p className="footer-name">{org.name}</p>
              <p className="footer-details">
                {org.address} · Ondernemingsnummer {org.enterprise}
              </p>
              <p className="footer-links">
                <a href={sinterklaas.privacyHref}>Privacy</a>
                <a href={sinterklaas.href}>Sinterklaaswebsite</a>
              </p>
            </div>
            <p className="footer-tagline">Kleine momenten. Een hechte wijk.</p>
          </div>
          <p className="footer-note">
            Data en praktische afspraken voor Pasen, garageverkoop en wijkfeest worden nog aangevuld. De illustraties zijn
            sfeerbeelden, geen foto's van onze wijk.
          </p>
        </div>
      </footer>
    </>
  );
}
