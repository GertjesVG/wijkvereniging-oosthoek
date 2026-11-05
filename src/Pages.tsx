import { lazy, Suspense, useState, type ComponentType } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Gift,
  Mail,
  MapPin,
  MapPinned,
  Printer,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ButtonLink, PageHeading, Reglement, StatusNote } from "./components";
import { asset, dateLabel, event } from "./content/event";
import sponsors from "./content/sponsors.json";
import { sinterklaasRegistration } from "./inschrijving/evenementen";
import { registrationNotice } from "./inschrijving/periode";
import { RegistrationPanel } from "./inschrijving/RegistrationPanel";
import { useRegistrationStatus } from "./inschrijving/useRegistrationStatus";
import { ShareCode } from "./ShareCode";
import { SponsorList } from "./SponsorCards";
import { ageLabel, timeOf, useLiveGps, type LiveGpsView } from "./gps/useLiveGps";
import "./pages.css";

// Leaflet, de routekaart en de kaarttegels pas laden na een klik of als er een livepositie te tonen is.
const LiveMap = lazy(() => import("./gps/LiveMap"));

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
                  Een ouder of voogd schrijft je gratis in via het formulier op
                  deze pagina.
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
  const signup = useRegistrationStatus();
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
          {signup && (
            <StatusNote>
              {registrationNotice(signup.status, signup.period)}
            </StatusNote>
          )}
          <p>
            De inschrijving is gratis en verloopt online via de
            cadeauactiepagina. Per kind is er maximaal één cadeautje.
          </p>
          <ButtonLink href="#/cadeauactie" variant="outline">
            Naar de cadeauactie
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

function SponsorsPage() {
  return (
    <>
      <PageHeading
        eyebrow="MET DANK AAN ONZE SPONSORS"
        title="Samen maken we de buurt sterker."
      >
        Deze {sponsors.length} lokale sponsors steunen Wijkvereniging Oosthoek.
        Koop lokaal en steun onze middenstand.
      </PageHeading>
      <SponsorList assetUrl={asset} />
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
                Zetel en correspondentie
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
              Wissen uiterlijk {deleteByLabel}, zie onderdeel 04
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
              (versie en tijdstip). We noteren ook de status van je inschrijving,
              zoals adres nagekeken, mail verstuurd en cadeautje afgehaald, en
              soms een korte notitie van een beheerder. Bij co-ouderschap mag het
              adres dat van de andere ouder zijn; over die ouder vragen we niets.
            </p>
          </section>
          <section>
            <span className="section-number">02</span>
            <h2>Waarvoor en op welke grond?</h2>
            <p>
              Om de inschrijvingen te beheren, de cadeautjes te voorzien, je een
              bevestigingsmail te sturen en je vragen te beantwoorden. Of het
              adres in {area} ligt, kijken we na met de wijkindeling van de
              gemeente Beerse; we letten ook op dubbele inschrijvingen. We
              gebruiken niets voor commerciële doeleinden en geven niets aan
              sponsors.
            </p>
            <p>
              Voor je eigen gegevens steunen we op de uitvoering van de deelname
              die je aanvraagt en volgens het wedstrijdreglement aanvaardt
              (artikel 6.1.b AVG). Voor de gegevens van je kinderen, de adres- en
              dubbelcontrole, het bewijs van je akkoord, de technische werking van
              de website en de beveiliging steunen we op ons gerechtvaardigd belang
              om deze gratis actie voor de kinderen van de wijk eerlijk en veilig
              te organiseren, met een website die werkt (artikel 6.1.f AVG).
            </p>
            <p>
              Inschrijven is vrijwillig, maar zonder deze gegevens kunnen we geen
              cadeautje voorzien. Je kunt je inschrijving altijd laten annuleren
              en je gegevens laten wissen. Schreef je in toen hier nog stond dat
              we dit met je toestemming doen (artikel 6.1.a AVG)? Dan blijft dat
              zo voor jouw inschrijving, en kun je die toestemming altijd
              intrekken.
            </p>
          </section>
          <section>
            <span className="section-number">03</span>
            <h2>Dienstverleners en beveiliging</h2>
            <p>
              De inschrijvingen staan in een afgeschermde database bij
              Cloudflare, opgeslagen in de Europese Unie. Alleen bevoegde personen
              beheren ze, met een beheerwachtwoord. Cloudflare host ook de
              website. Bij het verzenden controleert Cloudflare Turnstile of er
              een mens achter het formulier zit, met technische gegevens zoals je
              IP-adres en browsertype; Cloudflare gebruikt die ook om deze
              controle te verbeteren. Tegen misbruik bewaren we hoogstens een dag
              een versluierde code van je internetverbinding.
            </p>
            <p>
              De bevestigingsmail en onze antwoorden lopen via het gratis
              Gmail-account van de vereniging. Voor Gmail is Google (Google
              Ireland Limited) volgens zijn eigen privacybeleid zelf
              verantwoordelijk.
            </p>
            <p>
              Bij elk bezoek ontvangt Cloudflare technische verbindingsgegevens,
              zoals je IP-adres. De kaart van OpenStreetMap ontvangt die pas als
              ze laadt: na je klik op de kaartknop bij de route of bij het
              wijkhuis, of vanzelf op de routepagina terwijl de live GPS loopt. De
              live GPS toont alleen de huifkar tijdens de rondrit, nooit jouw
              locatie. Er zijn geen advertentie- of analysetrackers, en geen
              cookies of browseropslag om bezoekers te volgen.
            </p>
            <p>
              Klik je op een sponsoradres of op de routeknop bij het wijkhuis, dan
              opent Google Maps in een nieuw tabblad. Pas vanaf die klik ziet
              Google dat bezoek en geldt zijn eigen privacybeleid. Onze website
              vraagt nooit om je locatie.
            </p>
            <p>
              Cloudflare en Google kunnen gegevens ook buiten de Europese Unie
              verwerken, onder meer in de Verenigde Staten. Beide staan als actief
              op de{" "}
              <a
                href="https://www.dataprivacyframework.gov/list"
                target="_blank"
                rel="noopener noreferrer"
              >
                officiële lijst
              </a>{" "}
              van het EU-VS-gegevensprivacykader (nagekeken op 4 november 2026),
              waarvoor een adequaatheidsbesluit van de Europese Commissie geldt.
              Meer lees je in het privacybeleid van{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare
              </a>{" "}
              en{" "}
              <a
                href="https://policies.google.com/privacy/frameworks?hl=nl"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google
              </a>
              .
            </p>
          </section>
          <section>
            <span className="section-number">04</span>
            <h2>Bewaartermijn</h2>
            <p>
              Op {deleteByLabel} wist de website de namen, e-mailadressen en
              adressen van Sinterklaas {event.year} automatisch uit de database.
              Mails in Gmail, gedownloade lijsten en papieren kopieën ruimen we
              apart op, ook uiterlijk die dag.
            </p>
            <p>
              Technische kopieën verdwijnen daarna vanzelf: de reservekopie van de
              database binnen 30 dagen. Bij Google duurt het volledig verwijderen
              volgens zijn eigen beleid doorgaans ongeveer twee maanden, en
              versleutelde reservekopieën kunnen tot zes maanden blijven bestaan.
            </p>
            <p>
              Om volgende edities voor te bereiden, bewaren we alleen het
              inschrijvingsnummer met cijfers zoals leeftijden, aantallen en
              afgehaalde cadeautjes, zonder naam, e-mailadres of adres.
            </p>
          </section>
          <section>
            <span className="section-number">05</span>
            <h2>Jouw rechten en contact</h2>
            <p>
              Je mag altijd vragen welke gegevens we van je hebben, ze laten
              verbeteren of verwijderen, de verwerking laten beperken of je
              gegevens in een gangbare vorm krijgen om door te geven. Ouders en
              voogden kunnen dat ook voor hun kinderen. Mail naar{" "}
              <a href={`mailto:${org.email}`}>{org.email}</a> en vermeld je
              inschrijvingsnummer.
            </p>
            <p>
              <strong>Recht van bezwaar:</strong> waar we steunen op ons
              gerechtvaardigd belang, kun je bezwaar maken om redenen die met je
              eigen situatie te maken hebben.
            </p>
            <p>
              Verantwoordelijk: {org.name}, {org.address}, ondernemingsnummer{" "}
              {org.enterprise}. Je kunt ook altijd een klacht indienen bij de{" "}
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
