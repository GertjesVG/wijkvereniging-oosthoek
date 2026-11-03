import { lazy, Suspense, useState, type ComponentType } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Gift,
  Heart,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Printer,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { ButtonLink, PageHeading, Reglement, StatusNote } from "./components";
import { asset, dateLabel, event } from "./content/event";
import sponsors from "./content/sponsors.json";
import { sponsorLogos } from "./content/sponsor-logos";
import { sinterklaasRegistration } from "./inschrijving/evenementen";
import { RegistrationPanel } from "./inschrijving/RegistrationPanel";
import { ShareCode } from "./ShareCode";
import { ageLabel, timeOf, useLiveGps, type LiveGpsView } from "./gps/useLiveGps";
import "./pages.css";

// Leaflet, de routekaart en de kaarttegels pas laden na een klik of als er een livepositie te tonen is.
const LiveMap = lazy(() => import("./gps/LiveMap"));

const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

function GiftPage() {
  return (
    <>
      <PageHeading
        eyebrow="EEN KLEIN CADEAUTJE, EEN GROTE GLIMLACH"
        title="Een verrassing van de Sint."
      >
        Kleur je mooiste tekening en kom mee genieten van een magische dag in
        Oosthoek.
      </PageHeading>
      <div className="content-two-column gift-layout">
        <section className="editorial-panel gift-intro">
          <span className="large-ornament" aria-hidden="true">
            <Gift size={64} strokeWidth={1} />
            <i>✦</i>
          </span>
          <p className="eyebrow">ZO DOE JE MEE</p>
          <h2>
            De voorpret begint
            <br />
            met een kleurpotlood.
          </h2>
          <ol className="numbered-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Maak er iets moois van</h3>
                <p>
                  Download de officiële kleurplaat en kleur je
                  Sinterklaastekening in.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Bekijk de inschrijving</h3>
                <p>
                  Een ouder of voogd verzorgt de inschrijving zodra deze
                  opengaat.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Kom de Sint begroeten</h3>
                <p>Breng je ingekleurde tekening mee op {dateLabel}.</p>
              </div>
            </li>
          </ol>
          <ButtonLink
            href="#/kleurwedstrijd"
            variant="outline"
            icon={<Download size={17} aria-hidden="true" />}
          >
            Kleurplaat & wedstrijdregels
          </ButtonLink>
        </section>
        <RegistrationPanel />
      </div>
    </>
  );
}

function ColouringPage() {
  return (
    <>
      <PageHeading
        eyebrow="CREATIEF VOOR SINTERKLAAS"
        title="Alle kleuren van de voorpret."
      >
        Pak je potloden erbij. De officiële Oosthoek-kleurplaat wacht op jouw
        mooiste kleuren!
      </PageHeading>
      <div className="content-two-column colouring-layout">
        <div className="colouring-preview">
          <span className="preview-sticker">
            <Printer size={17} aria-hidden="true" />
            Print op A4
          </span>
          <img
            src={asset("assets/kleurplaat.webp")}
            alt="Officiële kleurplaat met Sinterklaas in de huifkar, twee paarden en kinderen"
            width="660"
            height="934"
          />
        </div>
        <section className="colouring-instructions">
          <p className="eyebrow">KLEUR MEE</p>
          <h2>
            Een tekening
            <br />
            speciaal voor de Sint.
          </h2>
          <p>
            Download de kleurplaat, print hem op A4 en maak er thuis iets moois
            van. Vul je naam en leeftijd in op de tekening en geef hem aan
            Sinterklaas.
          </p>
          <ButtonLink
            href={asset(event.downloads.colouring)}
            download="Oosthoek-kleurplaat.pdf"
            icon={<Download size={18} aria-hidden="true" />}
          >
            Download de kleurplaat
          </ButtonLink>
          <ul className="checklist">
            <li>
              <Check size={17} aria-hidden="true" />
              Bij de flyer zit al één kleurplaat
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Meer kinderen in het gezin? Download en print hier een extra
              kleurplaat per kind
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Elk kind dient één eigen ingekleurde tekening in
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Maximaal één cadeautje per deelnemend kind
            </li>
          </ul>
          <div className="small-editorial-note">
            <Sparkles size={23} aria-hidden="true" />
            <p>
              Nieuwsgierig naar de cadeauactie?{" "}
              <a href="#/cadeauactie">Hier lees je hoe het werkt.</a>
            </p>
          </div>
        </section>
      </div>
      <Reglement />
    </>
  );
}

// Tekst bij de livekaart, per toestand van de GPS (zie src/gps/useLiveGps.ts).
function liveNote(view: LiveGpsView) {
  if (view.kind === "waiting")
    return "De live GPS is gestart. De positie van de huifkar verschijnt hier zo dadelijk.";
  if (view.kind === "lost")
    return "De verbinding met de huifkar is weggevallen. Zodra ze terug is, verschijnt de huifkar weer op de kaart.";
  if (view.kind === "live")
    return view.stale
      ? "De verbinding met de huifkar is even weggevallen. De positie op de kaart is niet meer actueel."
      : "De huifkar is onderweg! De kaart ververst vanzelf ongeveer elke minuut.";
  return event.gps.offMessage;
}

function LiveCaption({ view }: { view: LiveGpsView }) {
  if (view.kind === "live")
    return (
      <>
        <span className={`live-dot${view.stale ? " is-stale" : ""}`} aria-hidden="true" />
        {view.stale ? "Niet actueel" : "Live"}: laatste positie om {timeOf(view.fixAt)}
        <span>{ageLabel(view.ageSeconds)}</span>
      </>
    );
  if (view.kind === "lost")
    return (
      <>
        <span className="live-dot is-stale" aria-hidden="true" />
        Verbinding weg sinds {timeOf(view.fixAt)}
        <span>Geen actuele positie</span>
      </>
    );
  return (
    <>
      <span className="live-dot" aria-hidden="true" />
      Live GPS gestart
      <span>Wachten op de eerste positie</span>
    </>
  );
}

function RoutePage() {
  // Kaart pas na een klik (privacy: dan pas verbinding met OpenStreetMap), of vanzelf zolang er een livepositie is.
  const [mapOpen, setMapOpen] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const { view, failed } = useLiveGps();
  const active = view.kind !== "off";
  const position =
    view.kind === "live" ? { lat: view.lat, lon: view.lon, accuracy: view.accuracy, stale: view.stale } : null;
  const showMap = mapOpen || position !== null;
  const { stops } = event.route;
  function showStreet(index: number) {
    setMapOpen(true);
    setFocus(index);
    document.getElementById("routekaart")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const openMap = (
    <>
      <button type="button" className="button button-gold" onClick={() => setMapOpen(true)}>
        <MapPin size={18} aria-hidden="true" />
        Bekijk de route op de kaart
      </button>
      <small>Laadt de kaart van OpenStreetMap.</small>
    </>
  );
  return (
    <>
      <PageHeading eyebrow="MET DE HUIFKAR DOOR DE WIJK" title="Waar is de Sint?">
        De huifkar en de witte paarden rijden door {stops.length} straten van
        Oosthoek. Hier vind je de route en, tijdens de rondrit, de livepositie.
      </PageHeading>
      <div className="route-overview">
        <section
          id="routekaart"
          className="route-map-panel"
          aria-label={active ? "Livekaart van de huifkar" : "Kaart van de rondrit"}
        >
          {showMap ? (
            <Suspense fallback={<div className="live-map" />}>
              <LiveMap position={position} focus={focus} onFocus={setFocus} />
            </Suspense>
          ) : active ? (
            <div className="map-awaiting">
              <span className="map-ornament" aria-hidden="true">
                <Radio size={76} strokeWidth={1} />
                <i>✦</i>
              </span>
              <p className="eyebrow">LIVE GPS</p>
              <h2>
                {view.kind === "waiting" ? "De Sint vertrekt" : "Even geduld"}
                <br />
                {view.kind === "waiting" ? "zo dadelijk." : "met de huifkar."}
              </h2>
              <p>
                {view.kind === "waiting"
                  ? "De eerste positie verschijnt hier vanzelf."
                  : "Zodra de verbinding terug is, verschijnt de huifkar hier weer."}
              </p>
              {openMap}
            </div>
          ) : (
            <div className="map-awaiting">
              <span className="map-ornament" aria-hidden="true">
                <MapPinned size={76} strokeWidth={1} />
                <i>✦</i>
              </span>
              <p className="eyebrow">DE RONDRIT VAN {event.year}</p>
              <h2>
                {stops.length} straten,
                <br />
                één feestelijke tocht.
              </h2>
              <p>
                Bekijk op de kaart door welke straten de huifkar rijdt. De
                volgorde staat ook hieronder.
              </p>
              {openMap}
            </div>
          )}
          <div className="map-caption" aria-live="polite">
            {active ? (
              <LiveCaption view={view} />
            ) : (
              <>
                <MapPin size={16} aria-hidden="true" />
                Route van de rondrit
                <span>Geen livepositie: de live GPS staat uit</span>
              </>
            )}
          </div>
        </section>
        <aside className="route-aside">
          <p className="eyebrow">VOLG DE SINT</p>
          <h2>
            De hele wijk
            <br />
            kijkt ernaar uit.
          </h2>
          <StatusNote tone="blue">{liveNote(view)}</StatusNote>
          {failed && active && (
            <p className="live-offline" role="status">
              Deze pagina kan de positie nu niet verversen. Controleer je
              internetverbinding.
            </p>
          )}
          <div className="route-date">
            <CalendarDays size={23} aria-hidden="true" />
            <div>
              <span>De Sint komt op</span>
              <strong>{dateLabel}</strong>
            </div>
          </div>
          <dl className="compact-facts">
            <div>
              <dt>Vertrek</dt>
              <dd>{event.departure}</dd>
            </div>
            <div>
              <dt>Vervoer</dt>
              <dd>{event.route.transport}</dd>
            </div>
            <div>
              <dt>Tijden per straat</dt>
              <dd>Niet bekendgemaakt. Volg de huifkar live tijdens de rondrit.</dd>
            </div>
          </dl>
          <a className="text-link" href="#/praktisch">
            Alle praktische informatie
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </aside>
      </div>
      <section className="route-stops" aria-labelledby="route-stops-title">
        <div className="route-stops-intro">
          <p className="eyebrow">DE OFFICIËLE ROUTE</p>
          <h2 id="route-stops-title">Hier komen we langs</h2>
          <p>
            Vanaf het vertrek aan Wijkhuis Oosthoek rijdt de huifkar de straten
            in deze volgorde. Tik op een straat om ze op de kaart te zien.
          </p>
          <StatusNote>{event.route.turnNote}</StatusNote>
        </div>
        <div className="route-list-wrap">
          <ol className="route-list">
            {stops.map((stop, i) => (
              <li key={stop}>
                <button
                  type="button"
                  className={focus === i ? "is-active" : undefined}
                  aria-pressed={focus === i}
                  onClick={() => showStreet(i)}
                >
                  <span className="route-nr" aria-hidden="true">
                    {i + 1}
                  </span>
                  {stop}
                </button>
              </li>
            ))}
          </ol>
          {!event.route.mapChecked && (
            <p className="route-disclaimer">
              De straten en hun volgorde liggen vast. De kaart is indicatief: de
              precieze rijweg in en tussen de straten kan afwijken.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

const faqs = [
  [
    "Hoe druk ik de kleurplaat af?",
    "Download de originele PDF op de kleurwedstrijdpagina en print hem op A4.",
  ],
  [
    "Leveren meerdere tekeningen extra cadeautjes op?",
    "Nee. Er geldt één kleurplaat en maximaal één cadeautje per kind, ook als je meerdere tekeningen meebrengt.",
  ],
];

function PracticalPage() {
  return (
    <>
      <PageHeading eyebrow="ALLES VOOR EEN FIJNE DAG" title="Goed om te weten.">
        Plan je bezoek aan de Sint in Oosthoek. Hier vind je de praktische
        informatie en de actuele stand van zaken.
      </PageHeading>
      <div className="practical-facts">
        <article>
          <CalendarDays size={28} aria-hidden="true" />
          <span className="eyebrow">DATUM</span>
          <h2>{dateLabel}</h2>
          <p>{event.departure}</p>
        </article>
        <article>
          <MapPin size={28} aria-hidden="true" />
          <span className="eyebrow">WAAR</span>
          <h2>Oosthoek in Beerse</h2>
          <p>
            De Sint rijdt met de huifkar en witte paarden door{" "}
            {event.route.stops.length} straten van onze wijk.
          </p>
        </article>
        <article>
          <Gift size={28} aria-hidden="true" />
          <span className="eyebrow">WAT MEEBRENGEN</span>
          <h2>Je ingekleurde tekening</h2>
          <p>
            Vul je naam en leeftijd in en breng je kleurplaat mee voor de Sint.
          </p>
          <a className="text-link" href="#/kleurwedstrijd">
            Kleurplaat downloaden
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </article>
      </div>
      <div className="practical-updates">
        <section aria-labelledby="practical-registration-title">
          <p className="eyebrow">CADEAUACTIE</p>
          <h2 id="practical-registration-title">
            Een verrassing voor de kleintjes
          </h2>
          <p>
            Schrijf je kinderen gratis online in op de cadeauactiepagina. Er
            zijn 150 cadeautjes, één per kind. Daar zie je ook of er nog
            plaatsen vrij zijn.
          </p>
          <ButtonLink href="#/cadeauactie" variant="outline">
            Naar de inschrijving
          </ButtonLink>
        </section>
        <section aria-labelledby="practical-route-title">
          <p className="eyebrow">ROUTE & LIVE VOLGEN</p>
          <h2 id="practical-route-title">Waar komt de huifkar langs?</h2>
          <StatusNote tone="blue">{event.gps.dayMessage}</StatusNote>
          <p>
            Op de routepagina vind je de straten in volgorde, de kaart en
            tijdens de rondrit de livepositie van de huifkar.
          </p>
          <ButtonLink href="#/route" variant="outline">
            Bekijk de routepagina
          </ButtonLink>
        </section>
      </div>
      <section className="faq-section" aria-labelledby="faq-title">
        <div className="faq-intro">
          <p className="eyebrow">VEELGESTELDE VRAGEN</p>
          <h2 id="faq-title">Nog even handig om te weten</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        className="practical-contact"
        aria-labelledby="practical-contact-title"
      >
        <div>
          <h2 id="practical-contact-title">Een andere vraag?</h2>
          <p>De wijkvereniging helpt je graag verder.</p>
        </div>
        <ButtonLink href="#/contact" variant="outline">
          Neem contact op
        </ButtonLink>
      </section>
    </>
  );
}

type Sponsor = (typeof sponsors)[number];

// Logozone: het officiële logo (zie content/sponsor-logos.ts), anders de naam als
// typografische plaat; geen verzonnen beeldmerk. Korte namen krijgen grotere letters.
function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const logo = sponsorLogos[sponsor.name];
  if (!logo) {
    const size =
      sponsor.name.length <= 4
        ? "short"
        : sponsor.name.length <= 13
          ? "medium"
          : "long";
    return (
      <div
        className={`sponsor-logo sponsor-nameplate is-${size}`}
        aria-hidden="true"
      >
        <span>{sponsor.name}</span>
      </div>
    );
  }
  return (
    <div
      className={`sponsor-logo${logo.backdrop ? " has-backdrop" : ""}`}
      style={logo.backdrop ? { backgroundColor: logo.backdrop } : undefined}
    >
      <img
        src={asset(`assets/${logo.file}`)}
        alt={`Logo van ${sponsor.name}`}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

// Eén actie per kaart: de bevestigde eigen website, anders e-mail, anders bellen.
function SponsorAction({ sponsor }: { sponsor: Sponsor }) {
  if (sponsor.website)
    return (
      <a
        className="sponsor-action sponsor-website"
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>
          Website bezoeken
          <span className="visually-hidden">
            : {sponsor.name}, opent in een nieuw venster
          </span>
        </span>
        <ArrowUpRight size={20} strokeWidth={1.7} aria-hidden="true" />
      </a>
    );
  if (sponsor.email)
    return (
      <a className="sponsor-action" href={`mailto:${sponsor.email}`}>
        <span>
          Stuur een e-mail
          <span className="visually-hidden"> naar {sponsor.name}</span>
        </span>
        <Mail size={19} strokeWidth={1.7} aria-hidden="true" />
      </a>
    );
  if (sponsor.phones.length)
    return (
      <a className="sponsor-action" href={phoneHref(sponsor.phones[0])}>
        <span>
          Bellen<span className="visually-hidden"> met {sponsor.name}</span>
        </span>
        <Phone size={19} strokeWidth={1.7} aria-hidden="true" />
      </a>
    );
  return null;
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  return (
    <article className="sponsor-card">
      <SponsorLogo sponsor={sponsor} />
      <p className="sponsor-eyebrow">
        Onze lokale sponsor<span aria-hidden="true">✦</span>
      </p>
      <div className="sponsor-title">
        <h2>{sponsor.name}</h2>
        <p>{sponsor.category}</p>
      </div>
      <ul className="sponsor-details">
        <li>
          <MapPin size={19} strokeWidth={1.6} aria-hidden="true" />
          <span>
            <span className="visually-hidden">Adres: </span>
            {sponsor.address}
          </span>
        </li>
        {sponsor.phones.length > 0 && (
          <li>
            <Phone size={19} strokeWidth={1.6} aria-hidden="true" />
            <span className="sponsor-phones">
              <span className="visually-hidden">Telefoon: </span>
              {sponsor.phones.map((phone) => (
                <a href={phoneHref(phone)} key={phone}>
                  {phone}
                </a>
              ))}
            </span>
          </li>
        )}
        {sponsor.email && (
          <li>
            <Mail size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>
              <span className="visually-hidden">E-mail: </span>
              {/* op een smal scherm liefst afbreken na de @ */}
              <a href={`mailto:${sponsor.email}`}>
                {sponsor.email.split("@")[0]}@<wbr />
                {sponsor.email.split("@")[1]}
              </a>
            </span>
          </li>
        )}
      </ul>
      <SponsorAction sponsor={sponsor} />
      <p className="sponsor-thanks">
        <Heart size={21} strokeWidth={1.6} aria-hidden="true" />
        Bedankt voor jullie steun aan onze wijk
      </p>
    </article>
  );
}

function SponsorsPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("nl-BE");
  const filtered = sponsors.filter((sponsor) =>
    `${sponsor.name} ${sponsor.category} ${sponsor.address}`
      .toLocaleLowerCase("nl-BE")
      .includes(normalized),
  );
  return (
    <>
      <PageHeading
        eyebrow="MET DANK AAN ONZE SPONSORS"
        title="Samen maken we de buurt sterker."
      >
        Deze {sponsors.length} lokale sponsors steunen Wijkvereniging Oosthoek.
        Koop lokaal en steun onze middenstand.
      </PageHeading>
      <div className="sponsor-toolbar">
        <div>
          <Heart size={19} aria-hidden="true" />
          <span>Grote dank aan onze lokale partners</span>
        </div>
        <div className="sponsor-search">
          <Search size={18} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="sponsor-search">
            Zoek een sponsor, activiteit of gemeente
          </label>
          <input
            id="sponsor-search"
            type="search"
            placeholder="Zoek een sponsor, activiteit of gemeente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Wis de zoekopdracht"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>
      <p className="search-count" role="status">
        {filtered.length} van {sponsors.length} sponsors
        {query.trim() ? ` voor “${query.trim()}”` : ""}
      </p>
      <div className="sponsor-grid">
        {filtered.map((sponsor) => (
          <SponsorCard sponsor={sponsor} key={sponsor.name} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-search">
          <Search size={35} aria-hidden="true" />
          <h2>Geen sponsor gevonden</h2>
          <p>Probeer een andere naam, activiteit of gemeente.</p>
          <button
            className="button button-outline"
            onClick={() => setQuery("")}
          >
            Toon alle sponsors
          </button>
        </div>
      )}
      <div className="sponsor-source-note">
        <p>
          Klopt er iets niet?{" "}
          <a href={`mailto:${event.organisation.email}`}>
            Geef een wijziging door.
          </a>
        </p>
      </div>
    </>
  );
}

function ContactPage() {
  const org = event.organisation;
  return (
    <>
      <PageHeading
        eyebrow="DICHT BIJ ELKAAR, DICHT BIJ DE BUURT"
        title="We horen graag van je."
      >
        Een vraag over de Sinterklaasdag of de vereniging? Neem gerust contact
        met ons op.
      </PageHeading>
      <div className="content-two-column contact-layout">
        <section className="contact-details">
          <p className="eyebrow">DE VERENIGING</p>
          <h2>{org.name}</h2>
          <dl>
            <div>
              <dt>
                <MapPin size={21} aria-hidden="true" />
                Adres
              </dt>
              <dd>{org.address}</dd>
            </div>
            <div>
              <dt>
                <Mail size={21} aria-hidden="true" />
                E-mail
              </dt>
              <dd>
                <a href={`mailto:${org.email}`}>
                  {org.email}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div>
              <dt>
                <Phone size={21} aria-hidden="true" />
                Telefoon
              </dt>
              <dd>
                <a href={phoneHref(org.phone)}>
                  {org.phone}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div>
              <dt>Ondernemingsnummer</dt>
              <dd>{org.enterprise}</dd>
            </div>
          </dl>
          <p className="contact-source">
            Officiële verenigingsgegevens uit de aangeleverde flyer.
          </p>
        </section>
        <aside className="contact-message">
          <ShareCode />
        </aside>
      </div>
    </>
  );
}

const registration = sinterklaasRegistration;
const deleteByLabel = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date(`${registration.deleteBy}T12:00:00`));

function PrivacyPage() {
  const org = event.organisation;
  const area = registration.area?.name ?? "de wijk";
  return (
    <>
      <PageHeading
        eyebrow="ZORGVULDIG MET JOUW GEGEVENS"
        title="Privacy, helder uitgelegd."
      >
        Kort en duidelijk: welke gegevens we vragen als je kinderen inschrijft
        voor de cadeauactie, waarvoor, en hoe lang we ze bewaren.
      </PageHeading>
      <div className="privacy-layout">
        <aside className="privacy-summary">
          <ShieldCheck size={42} strokeWidth={1.4} aria-hidden="true" />
          <h2>
            Alleen wat nodig is
            <br />
            voor het cadeautje.
          </h2>
          <ul>
            <li>
              <Check size={17} aria-hidden="true" />
              Per kind alleen voornaam en leeftijd
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Nooit voor reclame of aan sponsors
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Geen advertentie- of analysetrackers
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Verwijderd uiterlijk {deleteByLabel}
            </li>
          </ul>
        </aside>
        <div className="privacy-articles">
          <section>
            <span className="section-number">01</span>
            <h2>Welke gegevens?</h2>
            <p>
              Van de ouder of voogd: naam, e-mailadres en adres in {area}. Per
              kind: alleen de voornaam en de leeftijd. Verder je
              inschrijvingsnummer en je akkoord met het wedstrijdreglement
              (versie en tijdstip). Bij co-ouderschap mag het adres dat van de
              andere ouder zijn; over die ouder vragen we niets.
            </p>
          </section>
          <section>
            <span className="section-number">02</span>
            <h2>Waarvoor?</h2>
            <p>
              Om de inschrijvingen te beheren, de cadeautjes te voorzien, je een
              bevestigingsmail te sturen en je vragen te beantwoorden. Of het
              adres in {area} ligt, kijken we na met de wijkindeling van de
              gemeente Beerse. We gebruiken niets voor commerciële doeleinden en
              geven niets door aan sponsors of anderen.
            </p>
            <p>
              Dat doen we met je toestemming (artikel 6.1.a AVG). Inschrijven is
              vrijwillig, maar zonder deze gegevens kunnen we geen cadeautje
              voorzien. Je toestemming intrekken kan altijd: laat de inschrijving
              dan annuleren.
            </p>
          </section>
          <section>
            <span className="section-number">03</span>
            <h2>Beveiliging</h2>
            <p>
              De inschrijvingen staan in een afgeschermde database bij
              Cloudflare, waar ook de website draait. Alleen bevoegde
              vrijwilligers van de vereniging zien ze, met een beheerwachtwoord.
              De bevestigingsmail vertrekt via het Gmail-account van de
              vereniging bij Google. Bij het verzenden controleert Cloudflare
              Turnstile of er een mens achter het formulier zit, en tegen misbruik
              bewaren we hoogstens een dag een onomkeerbaar gemaakte code van je
              internetverbinding.
            </p>
            <p>
              Bij elk bezoek ontvangt Cloudflare technische verbindingsgegevens,
              zoals je IP-adres. De kaart van OpenStreetMap ontvangt die pas als
              ze laadt: na je klik op de kaartknop, of vanzelf terwijl de live
              GPS loopt. De live GPS toont alleen de huifkar tijdens de rondrit,
              nooit jouw locatie. Cloudflare en Google kunnen gegevens ook buiten
              de Europese Unie verwerken. Er zijn geen advertentie- of
              analysetrackers, en geen cookies of browseropslag om bezoekers te
              volgen. Voor deze beveiliging en technische werking steunen we op
              ons gerechtvaardigd belang bij een veilige, werkende website
              (artikel 6.1.f AVG).
            </p>
          </section>
          <section>
            <span className="section-number">04</span>
            <h2>Bewaartermijn</h2>
            <p>
              Uiterlijk op {deleteByLabel} verwijderen we alle persoonsgegevens
              van Sinterklaas {event.year}: de inschrijvingen in de database
              automatisch, en ook de bijbehorende mails in de mailbox van de
              vereniging. Daarna blijven alleen anonieme cijfers over, zoals
              aantallen en leeftijden, om volgende edities voor te bereiden.
            </p>
          </section>
          <section>
            <span className="section-number">05</span>
            <h2>Jouw rechten en contact</h2>
            <p>
              Je mag altijd vragen welke gegevens we van je hebben, ze laten
              verbeteren of laten verwijderen. Je mag ook bezwaar maken of de
              verwerking laten beperken. Mail naar{" "}
              <a href={`mailto:${org.email}`}>{org.email}</a> of bel{" "}
              <a href={phoneHref(org.phone)}>{org.phone}</a> en vermeld je
              inschrijvingsnummer.
            </p>
            <p>
              Verantwoordelijk: {org.name}, {org.address}, ondernemingsnummer{" "}
              {org.enterprise}. Ben je niet tevreden over ons antwoord, dan kun
              je een klacht indienen bij de{" "}
              <a
                href="https://www.gegevensbeschermingsautoriteit.be"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gegevensbeschermingsautoriteit
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export function ContentPage({ page }: { page: string }) {
  const pages: Record<string, ComponentType> = {
    cadeauactie: GiftPage,
    kleurwedstrijd: ColouringPage,
    route: RoutePage,
    praktisch: PracticalPage,
    sponsors: SponsorsPage,
    contact: ContactPage,
    privacy: PrivacyPage,
  };
  const Page = pages[page];
  return (
    <div className="content-page">
      {Page ? (
        <Page />
      ) : (
        <>
          <PageHeading
            eyebrow="EVEN DE WEG KWIJT?"
            title="Deze pagina bestaat niet."
          >
            Via het menu vind je alle informatie over Sinterklaas in Oosthoek.
          </PageHeading>
          <ButtonLink href="#/home">Terug naar home</ButtonLink>
        </>
      )}
    </div>
  );
}
