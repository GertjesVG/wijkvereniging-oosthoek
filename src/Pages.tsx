import { useState, type ComponentType } from "react";
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
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { ButtonLink, PageHeading, Rules, StatusNote } from "./components";
import { asset, dateLabel, event } from "./content/event";
import sponsors from "./content/sponsors.json";
import { sinterklaasRegistration } from "./inschrijving/evenementen";
import { RegistrationPanel } from "./inschrijving/RegistrationPanel";
import { ShareCode } from "./ShareCode";
import "./pages.css";

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
              De originele kleurplaat als PDF
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Thuis printen, kleuren en meenemen
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
      <Rules />
    </>
  );
}

function RoutePage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="MET DE HUIFKAR DOOR DE WIJK"
        title="Waar is de Sint?"
      >
        De huifkar en de witte paarden komen naar Oosthoek. Hier vind je straks
        de route en de livepositie.
      </PageHeading>
      <div className="route-overview">
        <section
          className="route-map-panel"
          aria-label="Omgevingskaart van Beerse"
        >
          {mapLoaded && event.route.mapEmbedUrl ? (
            <iframe
              title="Interactieve omgevingskaart van Beerse — geen rondgang of livepositie"
              src={event.route.mapEmbedUrl}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="map-awaiting">
              <span className="map-ornament" aria-hidden="true">
                <MapPinned size={76} strokeWidth={1} />
                <i>✦</i>
              </span>
              <p className="eyebrow">EEN DAG OM NAAR UIT TE KIJKEN</p>
              <h2 id="route-map-title">
                De route wordt nog
                <br />
                bekendgemaakt.
              </h2>
              <p>
                Zodra de officiële rondgang beschikbaar is, zie je hier waar de
                huifkar langskomt.
              </p>
              {event.route.mapEmbedUrl && (
                <>
                  <button
                    type="button"
                    className="button button-gold"
                    onClick={() => setMapLoaded(true)}
                  >
                    <MapPin size={18} aria-hidden="true" />
                    Bekijk de omgevingskaart
                  </button>
                  <small>
                    Laadt OpenStreetMap. Dit is een kaart van de omgeving, geen
                    officiële route.
                  </small>
                </>
              )}
            </div>
          )}
          <div className="map-caption">
            <MapPin size={16} aria-hidden="true" />
            Omgevingskaart van Beerse
            <span>Nog geen rondgang of livepositie</span>
          </div>
        </section>
        <aside className="route-aside">
          <p className="eyebrow">VOLG DE SINT</p>
          <h2>
            De hele wijk
            <br />
            kijkt ernaar uit.
          </h2>
          <StatusNote tone="blue">{event.gps.message}</StatusNote>
          <div className="route-date">
            <CalendarDays size={23} aria-hidden="true" />
            <div>
              <span>De Sint komt op</span>
              <strong>{dateLabel}</strong>
            </div>
          </div>
          <dl className="compact-facts">
            <div>
              <dt>Vertrekuur</dt>
              <dd>Nog niet bekendgemaakt</dd>
            </div>
            <div>
              <dt>Haltes & aankomsttijden</dt>
              <dd>Nog niet bekendgemaakt</dd>
            </div>
          </dl>
          <a className="text-link" href="#/praktisch">
            Alle praktische informatie
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </aside>
      </div>
      {event.route.stops.length > 0 && (
        <section className="route-stops">
          <p className="eyebrow">DE OFFICIËLE RONDGANG</p>
          <h2>Hier komen we langs</h2>
          <ol>
            {event.route.stops.map((stop) => (
              <li key={stop}>{stop}</li>
            ))}
          </ol>
        </section>
      )}
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
          <p>De precieze uren worden nog bekendgemaakt.</p>
        </article>
        <article>
          <MapPin size={28} aria-hidden="true" />
          <span className="eyebrow">WAAR</span>
          <h2>Oosthoek in Beerse</h2>
          <p>
            De Sint rijdt met de huifkar en witte paarden door onze wijk. De
            haltes zijn nog niet bekend.
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
          <StatusNote>{event.registration.message}</StatusNote>
          <p>
            Je kunt op dit moment nog geen cadeautje reserveren. Op de
            cadeauactiepagina lees je hoe je straks meedoet.
          </p>
          <ButtonLink href="#/cadeauactie" variant="outline">
            Bekijk de cadeauactie
          </ButtonLink>
        </section>
        <section aria-labelledby="practical-route-title">
          <p className="eyebrow">ROUTE & LIVE VOLGEN</p>
          <h2 id="practical-route-title">Waar komt de huifkar langs?</h2>
          <StatusNote tone="blue">{event.gps.message}</StatusNote>
          <p>
            De officiële rondgang volgt nog. Op de routepagina vind je de route
            en het live volgen zodra die beschikbaar zijn.
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
          <article className="sponsor-card" key={sponsor.name}>
            <span className="sponsor-star" aria-hidden="true">
              ✦
            </span>
            <p className="sponsor-category">{sponsor.category}</p>
            <h2>{sponsor.name}</h2>
            <p className="sponsor-address">
              <MapPin size={15} aria-hidden="true" />
              {sponsor.address}
            </p>
            <div className="sponsor-contacts">
              {sponsor.phones.map((phone) => (
                <a href={phoneHref(phone)} key={phone}>
                  <Phone size={14} aria-hidden="true" />
                  {phone}
                </a>
              ))}
              {sponsor.email && (
                <a href={`mailto:${sponsor.email}`}>
                  <Mail size={14} aria-hidden="true" />
                  {sponsor.email}
                </a>
              )}
            </div>
            {sponsor.website && (
              <a
                className="sponsor-website"
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Bezoek de website van ${sponsor.name}`}
              >
                Website bezoeken
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </article>
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
  return (
    <>
      <PageHeading
        eyebrow="ZORGVULDIG MET JOUW GEGEVENS"
        title="Privacy, helder uitgelegd."
      >
        Hier lees je welke gegevens we vragen als je kinderen inschrijft voor de
        cadeauactie, waarvoor we ze gebruiken en wanneer we ze wissen.
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
              Geen advertentie- of analysetrackers
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Gewist uiterlijk {deleteByLabel}
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              Kaart alleen na jouw klik
            </li>
          </ul>
        </aside>
        <div className="privacy-articles">
          <section>
            <span className="section-number">01</span>
            <h2>Wie zit achter de website?</h2>
            <p>
              {org.name}, {org.address}. Ondernemingsnummer {org.enterprise}.
              Voor vragen over gegevens kun je mailen naar{" "}
              <a href={`mailto:${org.email}`}>{org.email}</a> of bellen naar{" "}
              <a href={phoneHref(org.phone)}>{org.phone}</a>.
            </p>
          </section>
          <section>
            <span className="section-number">02</span>
            <h2>De website zelf</h2>
            <p>
              De website staat bij Cloudflare, dat daarbij verbindingsgegevens
              zoals je IP-adres ontvangt. Er zijn geen advertentie- of
              analysetrackers. De website gebruikt geen cookies of lokale
              browseropslag om bezoekers te volgen. Afbeeldingen, lettertypen en
              downloads komen van de website zelf. De sponsorzoekfunctie werkt
              alleen op jouw scherm en wordt niet bewaard.
            </p>
          </section>
          <section>
            <span className="section-number">03</span>
            <h2>Inschrijven voor de cadeauactie</h2>
            <p>
              Een ouder of verantwoordelijke schrijft de kinderen in. We vragen
              je naam en e-mailadres, je straat en huisnummer (de actie is voor
              kinderen uit {registration.area?.name ?? "de wijk"}) en per kind
              alleen de voornaam en de leeftijd. Je krijgt een
              inschrijvingsnummer.
            </p>
            <p>
              We gebruiken die gegevens alleen om het juiste aantal cadeautjes
              voor te bereiden, één cadeautje per kind te geven, je een
              bevestiging te sturen en je vragen te beantwoorden. Inschrijven is
              vrijwillig; zonder deze gegevens kunnen we geen cadeautje
              voorzien.
            </p>
            <p>
              Alleen de vrijwilligers van de vereniging die het
              beheerwachtwoord kennen, zien de inschrijvingen. De gegevens staan
              in een afgeschermde database bij Cloudflare. Een spamcontrole van
              Cloudflare (Turnstile) bekijkt bij het verzenden of er een mens
              achter het formulier zit. Tegen misbruik bewaren we hooguit een
              dag een onomkeerbaar gemaakte code van je internetverbinding,
              zonder je adres zelf. De bevestigingsmail vertrekt via het
              Gmail-account van de vereniging ({org.email}) bij Google. We
              verkopen of delen niets met anderen.
            </p>
            <p>
              Uiterlijk op {deleteByLabel} wissen we namen, e-mailadressen en
              adressen. Daarna houden we alleen aantallen en leeftijden over,
              zonder namen.
            </p>
          </section>
          <section>
            <span className="section-number">04</span>
            <h2>Kaart en contactlinks</h2>
            <p>
              Een beschikbare omgevingskaart wordt pas geladen nadat je op de
              kaartknop klikt. Vanaf dat moment maakt je browser verbinding met
              de kaartaanbieder, die daarbij onder meer je IP-adres ontvangt.
              Dit is geen live GPS-verbinding.
            </p>
            <p>
              Een e-mail- of telefoonlink opent je eigen mail- of belprogramma.
              Wat je vervolgens verstuurt, loopt via dat programma. De website
              verstuurt zelf geen contactformulier.
            </p>
          </section>
          <section>
            <span className="section-number">05</span>
            <h2>Een vraag of verzoek?</h2>
            <p>
              Je mag altijd vragen welke gegevens we van je hebben, ze laten
              verbeteren of de inschrijving laten annuleren en wissen. Mail
              daarvoor naar <a href={`mailto:${org.email}`}>{org.email}</a> en
              vermeld je inschrijvingsnummer. Vermeld alleen wat nodig is om je
              vraag te beantwoorden. Ben je niet tevreden over ons antwoord, dan
              kun je terecht bij de Gegevensbeschermingsautoriteit.
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
