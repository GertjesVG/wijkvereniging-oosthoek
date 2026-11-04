import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Baby,
  Flower2,
  Heart,
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
} from "lucide-react";
import { event } from "../content/event";
import sponsors from "../content/sponsors.json";
import { sinterklaasRegistration } from "../inschrijving/evenementen";
import type { PublicEventStatus } from "../inschrijving/api";
import { phoneHref, SponsorList } from "../SponsorCards";
import {
  activities,
  activityStatuses,
  dateText,
  infoPages,
  legacySinterklaasUrl,
  lifeMoments,
  municipalityJubileeUrl,
  publicFile,
  readRoute,
  sinterklaas,
  sinterklaasStatuses,
  smallImage,
  statusLabels,
  todayInBrussels,
  wijkhuisLocation,
  type Activity,
  type ActivityStatus,
  type InfoPage,
} from "../content/wijk";

const org = event.organisation;
const infoPage = (slug: string) => infoPages.find((page) => page.slug === slug)!;

function StatusChips({ statuses }: { statuses: ActivityStatus[] }) {
  return (
    <>
      {statuses.map((status) => (
        <span className={`status status-${status}`} key={status}>
          <span className="status-dot" aria-hidden="true" />
          {statusLabels[status]}
        </span>
      ))}
    </>
  );
}

// De echte inschrijfstatus van Sinterklaas, zoals de inschrijfpagina die ook opvraagt, ook na de datum van het evenement.
function useSinterklaasStatuses(today: string) {
  const [server, setServer] = useState<PublicEventStatus["status"] | null>(null);
  useEffect(() => {
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
  }, []);
  return sinterklaasStatuses(event.date, server, today);
}

function Header({ page }: { page: string | null }) {
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
  const pageLink = (slug: string, label: string) => (
    <a href={`#/${slug}`} aria-current={page === slug ? "page" : undefined} onClick={close}>
      {label}
    </a>
  );
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className="brand" href="#welkom" aria-label="Oosthoek, naar de hoofdpagina" onClick={close}>
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
          <a href={sinterklaas.href} onClick={close}>Sinterklaas</a>
          {pageLink("sponsors", "Onze sponsors")}
          {pageLink("lief-en-leed", "Lief en leed")}
          {pageLink("wijkhuis", "Wijkhuis")}
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
            <a className="textlink" href="#/lief-en-leed">Een hart voor de wijk</a>
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

// De hele tegel is aanklikbaar: de hoofdlink rekt uit over de tegel (.event-main in wijk.css).
function Tile({
  href,
  image,
  alt,
  title,
  text,
  more,
  className,
  meta,
  extraLink,
}: {
  href: string;
  image: string;
  alt: string;
  title: string;
  text: string;
  more: string;
  className?: string;
  meta?: ReactNode;
  extraLink?: ReactNode;
}) {
  const small = smallImage(image);
  return (
    <article className={`event${className ? ` ${className}` : ""}`}>
      <div className="event-art">
        <img
          src={publicFile(image)}
          srcSet={small ? `${publicFile(small)} 768w, ${publicFile(image)} 1536w` : undefined}
          sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 33vw"
          alt={alt}
          width="1536"
          height="1024"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="event-copy">
        {meta && <div className="event-meta">{meta}</div>}
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="event-links">
          <a className="event-main" href={href}>
            {more} <ArrowRight size={17} aria-hidden="true" />
          </a>
          {extraLink}
        </div>
      </div>
    </article>
  );
}

function ActivityTile({ activity, today }: { activity: Activity; today: string }) {
  return (
    <Tile
      href={`#/${activity.slug}`}
      image={activity.image}
      alt={activity.imageAlt}
      title={activity.name}
      text={activity.teaser}
      more={activity.more}
      meta={
        <>
          <span className="pill">{dateText(activity.date)}</span>
          <StatusChips statuses={activityStatuses(activity, today)} />
        </>
      }
    />
  );
}

function SinterklaasTile({ statuses }: { statuses: ActivityStatus[] }) {
  return (
    <Tile
      className="event-sinterklaas"
      href={sinterklaas.href}
      image={sinterklaas.image}
      alt={sinterklaas.imageAlt}
      title={sinterklaas.name}
      text={sinterklaas.teaser}
      more="Naar Sinterklaas"
      meta={
        <>
          <span className="pill">{dateText(event.date)}</span>
          <StatusChips statuses={statuses} />
        </>
      }
      extraLink={
        statuses.includes("open") && (
          <a href={sinterklaas.registrationHref}>
            Inschrijven voor de cadeauactie <ArrowRight size={17} aria-hidden="true" />
          </a>
        )
      }
    />
  );
}

function InfoTile({ page }: { page: InfoPage }) {
  return (
    <Tile
      className="event-info"
      href={`#/${page.slug}`}
      image={page.image}
      alt={page.imageAlt}
      title={page.name}
      text={page.teaser}
      more={page.more}
    />
  );
}

function Tiles({ today, statuses }: { today: string; statuses: ActivityStatus[] }) {
  return (
    <section className="section" id="activiteiten" aria-labelledby="activiteiten-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">Activiteiten en wijkinformatie</p>
            <h2 id="activiteiten-title">Ontdek wat er leeft in Oosthoek.</h2>
          </div>
          <p>Van paaseieren tot ons wijkhuis: hier vind je onze activiteiten en wijkinformatie bij elkaar.</p>
        </div>
        <div className="events">
          {activities.map((activity) => (
            <ActivityTile activity={activity} today={today} key={activity.slug} />
          ))}
          <SinterklaasTile statuses={statuses} />
          {infoPages.map((page) => (
            <InfoTile page={page} key={page.slug} />
          ))}
        </div>
      </div>
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

function Home({ today, statuses }: { today: string; statuses: ActivityStatus[] }) {
  return (
    <>
      <Hero />
      {today <= event.date && <Ticker />}
      <Tiles today={today} statuses={statuses} />
      <Contact />
    </>
  );
}

function OtherLink({ href, image, name, detail }: { href: string; image: string; name: string; detail: string }) {
  return (
    <li>
      <a href={href}>
        <img src={publicFile(smallImage(image) ?? image)} alt="" width="768" height="512" loading="lazy" decoding="async" />
        <span>
          <strong>{name}</strong>
          <small>{detail}</small>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </li>
  );
}

// De vaste opbouw van elke eigen pagina: de weg terug, het beeld met de kop, de inhoud en de andere tegels.
function SubPage({
  slug,
  image,
  alt,
  eyebrow,
  title,
  lead,
  side,
  children,
}: {
  slug: string;
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  lead: ReactNode;
  side?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="section activity">
      <div className="wrap">
        <a className="back-link" href="#activiteiten">
          <ArrowLeft size={17} aria-hidden="true" />
          Terug naar de hoofdpagina
        </a>
        <div className="activity-grid">
          <div className="activity-hero">
            <img src={publicFile(image)} alt={alt} width="1536" height="1024" fetchPriority="high" />
          </div>
          <div className="activity-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lead">{lead}</p>
            {side}
          </div>
        </div>
        {children}
        <section className="other" aria-labelledby="other-title">
          <h2 id="other-title">Ook in Oosthoek</h2>
          <ul>
            {activities
              .filter((other) => other.slug !== slug)
              .map((other) => (
                <OtherLink href={`#/${other.slug}`} image={other.image} name={other.name} detail={dateText(other.date)} key={other.slug} />
              ))}
            <OtherLink href={sinterklaas.href} image={sinterklaas.image} name={sinterklaas.name} detail={dateText(event.date)} />
            {infoPages
              .filter((other) => other.slug !== slug)
              .map((other) => (
                <OtherLink href={`#/${other.slug}`} image={other.image} name={other.name} detail="Wijkinformatie" key={other.slug} />
              ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function ActivityPage({ activity, today }: { activity: Activity; today: string }) {
  const statuses = activityStatuses(activity, today);
  return (
    <SubPage
      slug={activity.slug}
      image={activity.image}
      alt={activity.imageAlt}
      eyebrow="Activiteit in Oosthoek"
      title={activity.title}
      lead={activity.text}
      side={
        <>
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
              <dd className="status-list">
                <StatusChips statuses={statuses} />
              </dd>
            </div>
          </dl>
          <div className="activity-actions">
            {statuses.includes("open") && activity.registrationHref && (
              <a className="btn" href={activity.registrationHref}>
                Inschrijven <ArrowRight size={17} aria-hidden="true" />
              </a>
            )}
            <a className="btn outline" href={`mailto:${org.email}`}>
              Een vraag? Mail ons <Mail size={17} aria-hidden="true" />
            </a>
          </div>
        </>
      }
    />
  );
}

function SponsorsPage() {
  const page = infoPage("sponsors");
  return (
    <SubPage
      slug={page.slug}
      image={page.image}
      alt={page.imageAlt}
      eyebrow="Met dank aan onze sponsors"
      title={page.name}
      lead={`Deze ${sponsors.length} lokale sponsors steunen Wijkvereniging Oosthoek. Koop lokaal en steun onze middenstand.`}
    >
      <section className="sponsors-page" aria-label="Alle sponsors">
        <SponsorList assetUrl={publicFile} />
      </section>
    </SubPage>
  );
}

function LifeIcon({ icon }: { icon: (typeof lifeMoments)[number]["icon"] }) {
  const Icon = icon === "birth" ? Baby : icon === "loss" ? Flower2 : Heart;
  return <Icon size={34} strokeWidth={1.5} aria-hidden="true" />;
}

function LifePage() {
  const page = infoPage("lief-en-leed");
  return (
    <SubPage
      slug={page.slug}
      image={page.image}
      alt={page.imageAlt}
      eyebrow="Oosthoek leeft mee"
      title={page.name}
      lead="Bij een nieuw begin, een groot jubileum of een moeilijk afscheid: als wijk staan we graag even stil bij wat telt."
    >
      <section className="moments-band" aria-label="Onze attenties">
        <div className="moments">
          {lifeMoments.map((moment) => (
            <div className="moment" key={moment.title}>
              <div className="symbol">
                <LifeIcon icon={moment.icon} />
              </div>
              <h2>{moment.title}</h2>
              <p>{moment.text}</p>
              {moment.icon === "jubilee" && (
                <a href={municipalityJubileeUrl} target="_blank" rel="noopener noreferrer">
                  Huwelijksjubileum bij de gemeente Beerse <ArrowUpRight size={15} aria-hidden="true" />
                  <span className="visually-hidden"> (opent in een nieuw venster)</span>
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="mailbox">
          Deponeer het originele geboortekaartje of de originele doodsbrief in de brievenbus op <strong>{org.address}</strong>.
        </p>
      </section>
    </SubPage>
  );
}

// Zonder bevestigde locatie (wijkhuisLocation in wijk.ts) geen adres, kaart of route: alleen wat vaststaat.
function WijkhuisPage({ today }: { today: string }) {
  const page = infoPage("wijkhuis");
  const location = wijkhuisLocation;
  return (
    <SubPage
      slug={page.slug}
      image={page.image}
      alt={page.imageAlt}
      eyebrow="Wijkinformatie"
      title={page.name}
      lead={
        location
          ? "Dit is het witte wijkhuis van onze vereniging, tussen het groen."
          : "Dit is het witte wijkhuis van onze vereniging, tussen het groen. De exacte locatie en de route vullen we hier aan zodra ze bevestigd zijn."
      }
      side={
        <>
          <dl className="activity-facts">
            <div>
              <dt>Naam</dt>
              <dd>Wijkhuis Oosthoek</dd>
            </div>
            {location && (
              <div>
                <dt>Adres</dt>
                <dd>{location.address}</dd>
              </div>
            )}
            {today <= event.date && (
              <div>
                <dt>Sinterklaas, {dateText(event.date)}</dt>
                <dd>{event.departure}</dd>
              </div>
            )}
          </dl>
          <div className="activity-actions">
            {location ? (
              <>
                <a className="btn" href={location.routeUrl} target="_blank" rel="noopener noreferrer">
                  Route naar het wijkhuis <ArrowUpRight size={17} aria-hidden="true" />
                  <span className="visually-hidden"> (opent in een nieuw venster)</span>
                </a>
                <a className="btn outline" href={location.mapUrl} target="_blank" rel="noopener noreferrer">
                  Bekijk op de kaart <MapPin size={17} aria-hidden="true" />
                  <span className="visually-hidden"> (opent in een nieuw venster)</span>
                </a>
              </>
            ) : (
              <a className="btn outline" href={`mailto:${org.email}`}>
                Een vraag? Mail ons <Mail size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        </>
      }
    />
  );
}

export default function WijkApp() {
  const [route, setRoute] = useState(() => readRoute(location.hash));
  const main = useRef<HTMLElement>(null);
  const previousPage = useRef(route.page);
  const today = todayInBrussels();
  const statuses = useSinterklaasStatuses(today);
  const activity = activities.find((a) => a.slug === route.page);
  const info = infoPages.find((p) => p.slug === route.page);

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
    const pageTitle = activity?.title ?? info?.name;
    document.title = pageTitle ? `${pageTitle} · Wijkvereniging Oosthoek` : "Wijkvereniging Oosthoek · Beerse";
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
  }, [activity, info, route]);

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
      <Header page={route.page} />
      <main id="inhoud" ref={main} tabIndex={-1}>
        {activity ? (
          <ActivityPage activity={activity} today={today} />
        ) : route.page === "sponsors" ? (
          <SponsorsPage />
        ) : route.page === "lief-en-leed" ? (
          <LifePage />
        ) : route.page === "wijkhuis" ? (
          <WijkhuisPage today={today} />
        ) : (
          <Home today={today} statuses={statuses} />
        )}
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
            sfeerbeelden, geen foto's van onze wijk; het beeld van het wijkhuis is een schilderachtige bewerking van het echte gebouw.
          </p>
        </div>
      </footer>
    </>
  );
}
