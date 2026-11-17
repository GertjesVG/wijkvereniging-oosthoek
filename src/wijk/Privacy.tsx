import type { ReactNode } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { event } from "../content/event";
import { sinterklaasRegistration } from "../inschrijving/evenementen";
import { privacyHref, privacyPage, privacyUpdated } from "../content/wijk";

// De centrale privacyverklaring van de vereniging: website, activiteiten, lief en leed en sponsors. Eén tekst; het oude
// adres /sinterklaas/#/privacy stuurt hierheen (index.html, App.tsx). Beschrijf alleen wat werkelijk gebeurt; wat het
// bestuur nog niet besliste, staat er eerlijk als "nog niet vastgelegd". Onderbouwing: Project dossier\AVG-VERANTWOORDING.md.

const org = event.organisation;
const registration = sinterklaasRegistration;
const area = registration.area?.name ?? "de wijk";
const longDate = (day: string) =>
  new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
const deleteByLabel = longDate(registration.deleteBy);

// Volgorde van de onderdelen; het id is ook het anker ("#/privacy?sinterklaas").
const sections = [
  ["verantwoordelijke", "Wie is verantwoordelijk?"],
  ["website", "Onze website"],
  ["sinterklaas", "Sinterklaas"],
  ["activiteiten", "Garageverkoop, Pasen en wijkfeest"],
  ["publicaties", "Foto’s, tekeningen, uitslagen en adreslijsten"],
  ["lief-en-leed", "Lief en leed"],
  ["sponsors", "Onze sponsors"],
  ["ontvangers", "Wie ontvangt gegevens?"],
  ["bewaring", "Hoe lang bewaren we gegevens?"],
  ["rechten", "Je rechten"],
  ["contact", "Een vraag of opmerking?"],
  ["wijzigingen", "Wijzigingen"],
] as const;
type SectionId = (typeof sections)[number][0];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const index = sections.findIndex(([key]) => key === id);
  return (
    <section id={id} aria-labelledby={`${id}-titel`}>
      <h2 id={`${id}-titel`}>
        <span className="privacy-number">{index + 1}.</span> {sections[index][1]}
      </h2>
      {children}
    </section>
  );
}

const To = ({ id, children }: { id: SectionId; children: ReactNode }) => <a href={privacyHref(id)}>{children}</a>;
const MailLink = () => <a href={`mailto:${org.email}`}>{org.email}</a>;
const External = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
    <span className="visually-hidden"> (opent in een nieuw venster)</span>
  </a>
);

export default function PrivacyPage() {
  return (
    <article className="section privacy-page">
      <div className="wrap">
        <a className="back-link" href="#activiteiten">
          <ArrowLeft size={17} aria-hidden="true" />
          Terug naar de hoofdpagina
        </a>
        <header className="privacy-head">
          <p className="eyebrow">Zorgvuldig met je gegevens</p>
          <h1>{privacyPage.title}</h1>
          <p className="lead">
            We gaan zorgvuldig om met je gegevens. In deze verklaring lees je welke gegevens onze wijkvereniging gebruikt,
            waarvoor we die nodig hebben, hoe lang we ze bewaren en hoe je ons kunt bereiken met een vraag over je privacy.
          </p>
          <p className="privacy-date">
            Geldt voor de website, de activiteiten en de sponsors van de vereniging. Laatste inhoudelijke wijziging:{" "}
            {longDate(privacyUpdated)}.
          </p>
        </header>
        <div className="privacy-grid">
          <nav className="privacy-toc" aria-labelledby="privacy-inhoud">
            <h2 id="privacy-inhoud">Inhoud</h2>
            <ol>
              {sections.map(([id, title]) => (
                <li key={id}>
                  <a href={privacyHref(id)}>{title}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="privacy-body">
            <Section id="verantwoordelijke">
              <p>
                {org.name} is verantwoordelijk voor de gegevens in deze verklaring. Je bereikt ons zo:
              </p>
              <dl className="privacy-facts">
                <div>
                  <dt>Adres</dt>
                  <dd>{org.address}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>
                    <MailLink />
                  </dd>
                </div>
                <div>
                  <dt>Ondernemingsnummer</dt>
                  <dd>
                    {org.enterprise}, {org.register}
                  </dd>
                </div>
              </dl>
            </Section>

            <Section id="website">
              <p>
                Cloudflare host deze website. Bij elk bezoek ontvangt Cloudflare technische verbindingsgegevens, zoals je
                IP-adres. Dat is nodig om de pagina’s te tonen en de website te beveiligen. We steunen hiervoor op ons
                gerechtvaardigd belang: een website die werkt en veilig is (artikel 6.1.f AVG).
              </p>
              <p>
                Onze website zet zelf geen cookies en bewaart niets in je browser. Er zijn geen advertentie- of
                analysetrackers. We tellen wel hoe vaak de website bezocht en een pagina geopend wordt: alleen aantallen
                per dag en per pagina, zonder IP-adres of ander gegeven over jou. We kunnen dus niet zien wie de website
                bezoekt of hoe vaak dezelfde persoon terugkomt. Alleen wie als bestuurslid inlogt in het beheergedeelte,
                krijgt een cookie: dat is nodig om ingelogd te blijven en vervalt bij het afmelden of na hoogstens acht
                uur.
              </p>
              <p>
                De kaarten van OpenStreetMap laden pas na je klik op de kaartknop, bij de route van Sinterklaas of bij
                het wijkhuis, of vanzelf op de routepagina terwijl de live GPS van de huifkar loopt. OpenStreetMap
                ontvangt dan technische gegevens zoals je IP-adres. De live GPS toont alleen de huifkar, nooit jouw
                locatie. Onze website vraagt nooit om je locatie.
              </p>
              <p>
                Klik je op een sponsoradres of op de routeknop bij het wijkhuis, dan opent Google Maps in een nieuw
                tabblad. Pas vanaf die klik ziet Google dat bezoek en geldt zijn eigen privacybeleid. Hetzelfde geldt
                voor de websites van sponsors en het e-loket van de gemeente Beerse waarnaar we linken.
              </p>
            </Section>

            <Section id="sinterklaas">
              <h3>Inschrijving voor de cadeauactie</h3>
              <p>
                Van de ouder of voogd vragen we naam, e-mailadres en adres in {area}. Per kind alleen de voornaam en de
                leeftijd; die gegevens krijgen we van jou als ouder of voogd. Verder bewaren we je inschrijvingsnummer
                en je akkoord met het wedstrijdreglement (versie en tijdstip). We noteren ook de status van je
                inschrijving, zoals adres nagekeken, mail verstuurd en cadeautje afgehaald, en soms een korte notitie
                van een beheerder. Bij co-ouderschap mag het adres dat van de andere ouder zijn; over die ouder vragen
                we niets.
              </p>
              <p>
                We gebruiken deze gegevens om de inschrijvingen te beheren, de cadeautjes te voorzien, je een
                bevestigingsmail te sturen en je vragen te beantwoorden. Of het adres in {area} ligt, kijken we na met
                de wijkindeling van de gemeente Beerse; we letten ook op dubbele inschrijvingen. Een adres dat niet op
                die lijst staat, wordt niet automatisch geweigerd: een beheerder kijkt het na. We gebruiken niets voor
                commerciële doeleinden en geven niets aan sponsors.
              </p>
              <p>
                Voor je eigen gegevens steunen we op de uitvoering van de deelname die je aanvraagt en volgens het
                wedstrijdreglement aanvaardt (artikel 6.1.b AVG). Voor de gegevens van je kinderen, de adres- en
                dubbelcontrole, het bewijs van je akkoord en de beveiliging van het formulier steunen we op ons
                gerechtvaardigd belang om deze gratis actie voor de kinderen van de wijk eerlijk en veilig te
                organiseren (artikel 6.1.f AVG).
              </p>
              <p>
                Inschrijven is vrijwillig, maar zonder deze gegevens kunnen we geen cadeautje voorzien. Je kunt je
                inschrijving altijd laten annuleren en je gegevens laten wissen. Schreef je in toen hier nog stond dat
                we dit met je toestemming doen (artikel 6.1.a AVG)? Dan blijft dat zo voor jouw inschrijving, en kun je
                die toestemming altijd intrekken.
              </p>
              <p>
                De inschrijvingen staan in een afgeschermde database bij Cloudflare, opgeslagen in de Europese Unie.
                Alleen bevoegde personen beheren ze, met een beheerwachtwoord. Bij het verzenden controleert Cloudflare
                Turnstile of er een mens achter het formulier zit, met technische gegevens zoals je IP-adres en
                browsertype; Cloudflare gebruikt die ook om deze controle te verbeteren. Tegen misbruik van het formulier
                en van de beheerlogin bewaren we hoogstens een dag een versluierde code van je internetverbinding.
              </p>
              <p>
                De bevestigingsmail en onze antwoorden lopen via het gratis Gmail-account van de vereniging. Hoe lang we
                dit alles bewaren, lees je in het <To id="bewaring">onderdeel over bewaren</To>.
              </p>
              <h3>Kleurwedstrijd</h3>
              <p>
                Op de tekening die je kind aan Sinterklaas geeft, staan de naam en de leeftijd van het kind. Die hebben
                we nodig om te weten van welk kind een tekening is, voor de kleurwedstrijd en de cadeauactie; meer vragen
                we op de tekening niet. We steunen hiervoor op ons gerechtvaardigd belang om deze gratis actie eerlijk te
                organiseren (artikel 6.1.f AVG). Omdat het om kinderen gaat, houden we het bij die twee gegevens en
                gebruiken we ze nergens anders voor.
              </p>
            </Section>

            <Section id="activiteiten">
              <p>
                Voor de garageverkoop, het paasfeest en het wijkfeest liggen de datum en de manier van inschrijven nog
                niet vast. Via deze website kun je je er nog niet voor inschrijven, en we vragen er op dit moment geen
                gegevens voor.
              </p>
              <p>
                Vragen we voor zo’n activiteit wel gegevens, bijvoorbeeld voor een inschrijving, een betaling of een
                deelnemerslijst, dan vullen we deze verklaring eerst aan: welke gegevens, waarvoor, op welke grond, wie
                ze te zien krijgt en hoe lang we ze bewaren.
              </p>
              <p>
                Van vroegere activiteiten kan de vereniging nog inschrijfformulieren of deelnemerslijsten hebben. Wil je
                weten of we gegevens van jou hebben, of wil je ze laten wissen? <To id="contact">Laat het ons weten</To>.
              </p>
            </Section>

            <Section id="publicaties">
              <p>
                Op deze website publiceren we geen foto’s van deelnemers, geen tekeningen, geen uitslagen en geen namen
                van kinderen.
              </p>
              <p>
                Deelnemen aan een activiteit betekent niet dat we foto’s, tekeningen, uitslagen, namen of adressen mogen
                publiceren: dat is telkens een apart doel. Willen we iets publiceren, zoals foto’s van een activiteit, de
                winnaars van een wedstrijd of de deelnemende adressen van een garageverkoop, dan vermelden we vooraf wat
                we publiceren, waar en op welke grond, en vullen we deze verklaring aan.
              </p>
            </Section>

            <Section id="lief-en-leed">
              <p>
                Bezorg je ons een geboortekaartje of een doodsbrief, dan gebruiken we de gegevens daarop alleen om de
                attentie van de vereniging te bezorgen; bij een overlijden loopt dat via de begrafenisondernemer. De
                privacyregels gelden niet voor gegevens van overledenen, wel voor de nabestaanden die op een doodsbrief
                staan.
              </p>
              <p>
                Een huwelijksjubileum meld je bij de gemeente Beerse. Alleen als je daar zelf toestemming voor geeft,
                bezorgt de gemeente je gegevens aan het wijkbestuur. Die gegevens krijgen we dus niet van jou, maar van
                de gemeente: het gaat om wat je op het gemeentelijke formulier invulde. Alleen de bestuursleden die de
                attentie verzorgen, zien deze gegevens.
              </p>
              <p>
                Voor lief en leed steunen we op ons gerechtvaardigd belang om mee te leven met de buurt (artikel 6.1.f
                AVG): je bezorgt ons de stukken zelf of liet de gemeente je gegevens doorgeven, en we gebruiken ze alleen
                voor de attentie. Online bewaren we hiervan niets.
              </p>
            </Section>

            <Section id="sponsors">
              <p>
                Onze sponsors steunen de wijk. Op de openbare sponsorpagina bedanken we hen en maken we hun onderneming
                zichtbaar. Daar kunnen, zoals met de sponsor afgesproken, de bedrijfsnaam, het logo, een korte
                omschrijving, het adres, het telefoonnummer, het e-mailadres en de website staan.
              </p>
              <p>
                Bedrijfsgegevens kunnen ook persoonsgegevens zijn, bijvoorbeeld bij een eenmanszaak of een zaak op naam
                van een persoon. De gegevens komen uit onze afspraken met de sponsor; enkele logo’s en webadressen namen
                we over van de eigen website van de sponsor.
              </p>
              <p>
                De vermelding op de website gebeurt met de toestemming van de sponsor (artikel 6.1.a AVG). Die
                toestemming kun je altijd eenvoudig intrekken met een mail naar <MailLink />; dan halen we je vermelding
                zo snel mogelijk van de website. Het intrekken doet geen afbreuk aan de vermelding zoals die vóór de
                intrekking rechtmatig op je toestemming steunde.
              </p>
              <p>
                Wil je als sponsor iets laten aanpassen, of klopt er iets niet? Mail ons, dan passen we het aan.
              </p>
            </Section>

            <Section id="ontvangers">
              <p>
                Openbaar is alleen wat op deze website staat, zoals de sponsorpagina. Daarnaast werken we met deze
                dienstverleners:
              </p>
              <ul>
                <li>
                  <strong>Cloudflare</strong> host de website en bewaart de inschrijvingen in een database in de Europese
                  Unie; Cloudflare Turnstile beveiligt het inschrijfformulier.
                </li>
                <li>
                  <strong>Google</strong> (Google Ireland Limited) levert het gratis Gmail-account van de vereniging. Voor
                  Gmail is Google volgens zijn eigen privacybeleid zelf verantwoordelijk.
                </li>
                <li>
                  <strong>OpenStreetMap</strong> levert de kaarten, alleen als die laden (zie{" "}
                  <To id="website">Onze website</To>).
                </li>
              </ul>
              <p>
                Cloudflare en Google kunnen gegevens ook buiten de Europese Unie verwerken, onder meer in de Verenigde
                Staten. Beide staan als actief op de{" "}
                <External href="https://www.dataprivacyframework.gov/list">officiële lijst</External> van het
                EU-VS-gegevensprivacykader (nagekeken op 4 november 2026), waarvoor een adequaatheidsbesluit van de
                Europese Commissie geldt. Meer lees je in het privacybeleid van{" "}
                <External href="https://www.cloudflare.com/privacypolicy/">Cloudflare</External> en{" "}
                <External href="https://policies.google.com/privacy/frameworks?hl=nl">Google</External>.
              </p>
            </Section>

            <Section id="bewaring">
              <dl className="privacy-list">
                <div>
                  <dt>Inschrijvingen Sinterklaas {event.year}</dt>
                  <dd>
                    Op {deleteByLabel} wist de website de namen, e-mailadressen en adressen automatisch uit de database.
                    Mails in Gmail, gedownloade lijsten en papieren kopieën ruimen we apart op, ook uiterlijk die dag.
                    Technische kopieën verdwijnen daarna vanzelf: de reservekopie van de database binnen 30 dagen. Bij
                    Google duurt het volledig verwijderen volgens zijn eigen beleid doorgaans ongeveer twee maanden, en
                    versleutelde reservekopieën kunnen tot zes maanden blijven bestaan. Om volgende edities voor te
                    bereiden, bewaren we alleen het inschrijvingsnummer met cijfers zoals leeftijden, aantallen en
                    afgehaalde cadeautjes, zonder naam, e-mailadres of adres.
                  </dd>
                </div>
                <div>
                  <dt>Versluierde code tegen misbruik</dt>
                  <dd>Hoogstens een dag.</dd>
                </div>
                <div>
                  <dt>Tekeningen, lief en leed en stukken van vroegere activiteiten</dt>
                  <dd>
                    Hiervoor is nog geen vaste bewaartermijn vastgelegd; het bestuur beslist daar nog over. Tot dan
                    bewaren we ze niet langer dan nodig is voor de wedstrijd, de actie, de activiteit of de attentie.
                  </dd>
                </div>
                <div>
                  <dt>Mails met een vraag</dt>
                  <dd>
                    Nog geen vaste termijn vastgelegd; we bewaren ze niet langer dan nodig om je vraag af te handelen.
                  </dd>
                </div>
                <div>
                  <dt>Sponsorvermeldingen</dt>
                  <dd>Zolang de sponsor met de vermelding akkoord is.</dd>
                </div>
              </dl>
            </Section>

            <Section id="rechten">
              <p>Je kunt ons altijd vragen om:</p>
              <ul>
                <li>
                  <strong>inzage:</strong> welke gegevens we van je hebben, waarvoor we ze gebruiken, en een kopie;
                </li>
                <li>
                  <strong>verbetering</strong> van gegevens die niet kloppen;
                </li>
                <li>
                  <strong>verwijdering</strong>, bijvoorbeeld als we je gegevens niet meer nodig hebben of als je je
                  toestemming intrekt;
                </li>
                <li>
                  <strong>beperking:</strong> je gegevens tijdelijk niet te gebruiken, bijvoorbeeld terwijl we nakijken
                  of ze kloppen;
                </li>
                <li>
                  <strong>bezwaar:</strong> waar we steunen op ons gerechtvaardigd belang, kun je bezwaar maken om
                  redenen die met je eigen situatie te maken hebben;
                </li>
                <li>
                  <strong>overdraagbaarheid:</strong> de gegevens die je ons zelf online bezorgde op basis van je
                  toestemming of je deelname, in een gangbare vorm om door te geven;
                </li>
                <li>
                  <strong>intrekken van je toestemming,</strong> waar we op toestemming steunen. Dat doet geen afbreuk
                  aan wat we daarvoor rechtmatig deden.
                </li>
              </ul>
              <p>
                Sommige rechten gelden alleen onder de voorwaarden van de wet. Kunnen we een verzoek niet of maar
                gedeeltelijk uitvoeren, dan leggen we uit waarom. Ouders en voogden kunnen deze rechten ook voor hun
                kinderen uitoefenen. Twijfelen we of een verzoek echt van jou komt, dan kunnen we je vragen dat te
                bevestigen. Een verzoek is gratis.
              </p>
              <p>
                We antwoorden zonder onnodige vertraging en in beginsel binnen één maand na ontvangst. Is een verzoek
                ingewikkeld of krijgen we er veel tegelijk, dan mag die termijn met hoogstens twee maanden verlengd
                worden. Dat laten we je dan binnen de eerste maand weten, met de reden.
              </p>
            </Section>

            <Section id="contact">
              <div className="privacy-contact">
                <p>
                  Heb je een vraag over je gegevens, klopt er iets niet of merk je iets op aan onze website? Laat het ons
                  gerust weten. We bekijken je bericht zorgvuldig en zoeken graag samen naar een passende oplossing.
                </p>
                <a className="btn" href={`mailto:${org.email}`}>
                  <Mail size={18} aria-hidden="true" />
                  {org.email}
                </a>
                <p className="privacy-contact-note">
                  Gaat het over een inschrijving, vermeld dan je inschrijvingsnummer als je er een hebt.
                </p>
              </div>
              <p>
                Je hebt ook het recht om een klacht in te dienen bij de{" "}
                <External href="https://www.gegevensbeschermingsautoriteit.be">Gegevensbeschermingsautoriteit</External>.
              </p>
            </Section>

            <Section id="wijzigingen">
              <p>
                Passen we deze verklaring inhoudelijk aan, bijvoorbeeld voor een nieuwe activiteit, dan zie je dat
                bovenaan aan de datum. De laatste inhoudelijke wijziging was op {longDate(privacyUpdated)}.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </article>
  );
}
