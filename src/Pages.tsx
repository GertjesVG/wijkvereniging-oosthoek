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
  Sparkles,
} from "lucide-react";
import { ButtonLink, PageHeading, Reglement, StatusNote } from "./components";
import { asset, dateLabel, event } from "./content/event";
import sponsors from "./content/sponsors.json";
import { sponsorTotal } from "./content/wijk";
import { registrationNotice } from "./inschrijving/periode";
import { RegistrationPanel } from "./inschrijving/RegistrationPanel";
import { useRegistrationStatus } from "./inschrijving/useRegistrationStatus";
import { ShareCode } from "./ShareCode";
import { SponsorList } from "./SponsorCards";
import { Lines, useTexts } from "./teksten";
import { ageLabel, timeOf, useLiveGps, type LiveGpsView } from "./gps/useLiveGps";
import "./pages.css";

// Leaflet, de routekaart en de kaarttegels pas laden na een klik of als er een livepositie te tonen is.
const LiveMap = lazy(() => import("./gps/LiveMap"));

function GiftPage() {
  const t = useTexts();
  return (
    <>
      <PageHeading eyebrow={t("sint.cadeau.boventitel")} title={t("sint.cadeau.titel")}>
        {t("sint.cadeau.intro")}
      </PageHeading>
      <div className="content-two-column gift-layout">
        <section className="editorial-panel gift-intro">
          <span className="large-ornament" aria-hidden="true">
            <Gift size={64} strokeWidth={1} />
            <i>✦</i>
          </span>
          <p className="eyebrow">ZO DOE JE MEE</p>
          <h2>
            <Lines text={t("sint.cadeau.stappen-titel")} />
          </h2>
          <ol className="numbered-steps">
            <li>
              <span>01</span>
              <div>
                <h3>{t("sint.cadeau.stap1-titel")}</h3>
                <p>{t("sint.cadeau.stap1-tekst")}</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>{t("sint.cadeau.stap2-titel")}</h3>
                <p>{t("sint.cadeau.stap2-tekst")}</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>{t("sint.cadeau.stap3-titel")}</h3>
                <p>{t("sint.cadeau.stap3-tekst")}</p>
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
  const t = useTexts();
  return (
    <>
      <PageHeading eyebrow={t("sint.kleur.boventitel")} title={t("sint.kleur.titel")}>
        {t("sint.kleur.intro")}
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
            <Lines text={t("sint.kleur.uitleg-titel")} />
          </h2>
          <p>{t("sint.kleur.uitleg-tekst")}</p>
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
              {t("sint.kleur.punt1")}
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              {t("sint.kleur.punt2")}
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              {t("sint.kleur.punt3")}
            </li>
            <li>
              <Check size={17} aria-hidden="true" />
              {t("sint.kleur.punt4")}
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
  const t = useTexts();
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
      <PageHeading eyebrow={t("sint.route.boventitel")} title={t("sint.route.titel")}>
        {t("sint.route.intro")}
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
              <p>{t("sint.route.kaart-tekst")}</p>
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
            <Lines text={t("sint.route.volg-titel")} />
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
              <dd>{t("sint.route.vervoer")}</dd>
            </div>
            <div>
              <dt>Tijden per straat</dt>
              <dd>{t("sint.route.tijden")}</dd>
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
          <h2 id="route-stops-title">{t("sint.route.lijst-titel")}</h2>
          <p>{t("sint.route.lijst-tekst")}</p>
          <StatusNote>{t("sint.route.draaien")}</StatusNote>
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
            <p className="route-disclaimer">{t("sint.route.kaart-indicatief")}</p>
          )}
        </div>
      </section>
    </>
  );
}

// Veelgestelde vragen: vraag en antwoord (teksten beheerbaar, zie src/content/teksten.ts).
const faqs = [
  ["sint.praktisch.vraag1", "sint.praktisch.antwoord1"],
  ["sint.praktisch.vraag2", "sint.praktisch.antwoord2"],
] as const;

function PracticalPage() {
  const t = useTexts();
  const signup = useRegistrationStatus();
  return (
    <>
      <PageHeading eyebrow={t("sint.praktisch.boventitel")} title={t("sint.praktisch.titel")}>
        {t("sint.praktisch.intro")}
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
          <h2>{t("sint.praktisch.waar-titel")}</h2>
          <p>{t("sint.praktisch.waar-tekst")}</p>
        </article>
        <article>
          <Gift size={28} aria-hidden="true" />
          <span className="eyebrow">WAT MEEBRENGEN</span>
          <h2>{t("sint.praktisch.meebrengen-titel")}</h2>
          <p>{t("sint.praktisch.meebrengen-tekst")}</p>
          <a className="text-link" href="#/kleurwedstrijd">
            Kleurplaat downloaden
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </article>
      </div>
      <div className="practical-updates">
        <section aria-labelledby="practical-registration-title">
          <p className="eyebrow">CADEAUACTIE</p>
          <h2 id="practical-registration-title">{t("sint.praktisch.cadeau-titel")}</h2>
          {signup && (
            <StatusNote>
              {registrationNotice(signup.status, signup.period)}
            </StatusNote>
          )}
          <p>{t("sint.praktisch.cadeau-tekst")}</p>
          <ButtonLink href="#/cadeauactie" variant="outline">
            Naar de cadeauactie
          </ButtonLink>
        </section>
        <section aria-labelledby="practical-route-title">
          <p className="eyebrow">ROUTE & LIVE VOLGEN</p>
          <h2 id="practical-route-title">{t("sint.praktisch.route-titel")}</h2>
          <StatusNote tone="blue">{event.gps.dayMessage}</StatusNote>
          <p>{t("sint.praktisch.route-tekst")}</p>
          <ButtonLink href="#/route" variant="outline">
            Bekijk de routepagina
          </ButtonLink>
        </section>
      </div>
      <section className="faq-section" aria-labelledby="faq-title">
        <div className="faq-intro">
          <p className="eyebrow">VEELGESTELDE VRAGEN</p>
          <h2 id="faq-title">{t("sint.praktisch.vragen-titel")}</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {t(question)}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <p>{t(answer)}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        className="practical-contact"
        aria-labelledby="practical-contact-title"
      >
        <div>
          <h2 id="practical-contact-title">{t("sint.praktisch.contact-titel")}</h2>
          <p>{t("sint.praktisch.contact-tekst")}</p>
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
        Met dank aan onze {sponsorTotal} sponsors voor hun steun aan de wijk.
        Hieronder stellen we {sponsors.length} van hen aan je voor. Koop lokaal
        en steun onze middenstand.
      </PageHeading>
      <SponsorList assetUrl={asset} />
    </>
  );
}

function ContactPage() {
  const t = useTexts();
  const org = event.organisation;
  return (
    <>
      <PageHeading eyebrow={t("sint.contact.boventitel")} title={t("sint.contact.titel")}>
        {t("sint.contact.intro")}
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
              <dd>
                {org.enterprise}
                <br />
                {org.register}
              </dd>
            </div>
          </dl>
          <p className="contact-source">
            Officiële verenigingsgegevens volgens de Kruispuntbank van
            Ondernemingen.
          </p>
        </section>
        <aside className="contact-message">
          <ShareCode />
        </aside>
      </div>
    </>
  );
}

// De privacyverklaring staat online op de wijkwebsite (src/wijk/Privacy.tsx); /sinterklaas/#/privacy stuurt daarheen
// (index.html, App.tsx). Alleen lokaal met `npm run dev`, waar de wijkwebsite niet meedraait, verschijnt deze verwijzing.
function PrivacyPage() {
  const central = "https://wijkvereniging-oosthoek.pages.dev/#/privacy?sinterklaas";
  return (
    <>
      <PageHeading eyebrow="ZORGVULDIG MET JOUW GEGEVENS" title="Onze privacyverklaring">
        De privacyverklaring van de vereniging staat op de algemene website, met een eigen onderdeel over Sinterklaas.
      </PageHeading>
      <ButtonLink href={central}>Naar de privacyverklaring</ButtonLink>
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
