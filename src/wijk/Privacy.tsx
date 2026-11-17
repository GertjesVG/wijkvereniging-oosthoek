import type { ReactNode } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { event } from "../content/event";
import { sinterklaasRegistration } from "../inschrijving/evenementen";
import { privacyHref, privacyPage, privacyUpdated } from "../content/wijk";

// De centrale privacyverklaring van de vereniging: website, activiteiten, lief en leed en sponsors. Eén tekst; het oude
// adres /sinterklaas/#/privacy stuurt hierheen (index.html, App.tsx). Basis: de tekst van Gert (17-11-2026), getoetst
// aan de werkelijke werking. Beschrijf alleen wat werkelijk gebeurt. Bewaartermijnen: alleen boekhoudstukken hebben een
// wettelijke termijn; de andere koos de vereniging zelf (GO Gert 17-11). Onderbouwing: Project dossier\AVG-VERANTWOORDING.md.

const org = event.organisation;
const registration = sinterklaasRegistration;
const area = registration.area?.name ?? "de wijk";
const longDate = (day: string) =>
  new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
const deleteByLabel = longDate(registration.deleteBy);
const [titleMain, titleOrg] = privacyPage.title.split(" – ");

// Volgorde van de onderdelen; het id is ook het anker ("#/privacy?sinterklaas").
const sections = [
  ["verantwoordelijke", "Wie zijn wij?"],
  ["website", "Onze website"],
  ["sinterklaas", "Sinterklaas en de kleurwedstrijd"],
  ["activiteiten", "Garageverkoop, paasfeest en wijkfeest"],
  ["publicaties", "Foto’s, tekeningen en uitslagen"],
  ["lief-en-leed", "Lief en leed in onze wijk"],
  ["sponsors", "Onze sponsors"],
  ["ontvangers", "Met wie delen we gegevens?"],
  ["bewaring", "Hoe lang bewaren we gegevens?"],
  ["rechten", "Wat zijn jouw rechten?"],
  ["contact", "Heb je een vraag of opmerking?"],
  ["wijzigingen", "Wijzigingen aan deze verklaring"],
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

// De wettelijke grond staat telkens apart, zodat de uitleg zelf in gewone taal blijft.
const Basis = ({ children }: { children: ReactNode }) => (
  <p className="privacy-basis">
    <strong>Waarom mag dit?</strong> {children}
  </p>
);
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
          <p className="eyebrow">Samen maken we onze wijk mooier</p>
          {/* Twee regels in beeld; voorgelezen en als tekst blijft het de volledige titel uit privacyPage. */}
          <h1 className="privacy-title">
            <span className="privacy-title-main">{titleMain}</span>
            <span className="visually-hidden"> – </span>
            <span className="privacy-title-org">{titleOrg}</span>
          </h1>
          <p className="lead">
            Bij Wijkvereniging Oosthoek vinden we het belangrijk dat iedereen zich welkom en gerespecteerd voelt. Daarom
            gaan we ook zorgvuldig om met je persoonsgegevens.
          </p>
          <p>
            Op deze pagina leggen we eenvoudig uit welke gegevens we gebruiken, waarom we dat doen en welke rechten je
            hebt.
          </p>
          <div className="privacy-ask">
            <p className="privacy-ask-title">Heb je een vraag of klopt er iets niet?</p>
            <p>
              <To id="contact">Laat het ons gerust weten</To>. We helpen je graag verder.
            </p>
          </div>
          <p className="privacy-date">
            <span>Voor onze website, activiteiten en sponsors</span>
            <span>Laatste inhoudelijke wijziging: {longDate(privacyUpdated)}</span>
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
                {org.name} organiseert activiteiten die de bewoners van de wijk samenbrengen. Voor de gegevens in deze
                verklaring zijn wij verantwoordelijk. Je bereikt ons zo:
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
              <p>
                Welke gegevens we gebruiken, hangt af van wat je bij ons doet. We vragen alleen wat we nodig hebben voor
                dat doel. We verkopen je gegevens niet en gebruiken ze niet voor reclame.
              </p>
            </Section>

            <Section id="website">
              <p>
                Cloudflare host onze website. Bij elk bezoek ontvangt Cloudflare technische gegevens, zoals je IP-adres.
                Dat is nodig om de pagina’s te tonen en de website te beveiligen.
              </p>
              <Basis>
                Ons gerechtvaardigd belang: een website die goed werkt en veilig is (artikel 6.1.f AVG).
              </Basis>
              <h3>Cookies en bezoekcijfers</h3>
              <p>
                Onze website zet zelf geen cookies en bewaart niets in je browser. Er zijn geen advertentie- of
                analysetrackers.
              </p>
              <p>
                We tellen wel hoeveel bezoeken er zijn per dag en per pagina. Dat zijn alleen aantallen, zonder IP-adres
                of ander gegeven over jou. We zien dus niet wie de website bezoekt of hoe vaak dezelfde persoon
                terugkomt.
              </p>
              <p>
                Alleen bestuursleden die inloggen in het beheergedeelte krijgen een cookie. Die is nodig om ingelogd te
                blijven en vervalt bij het afmelden of na hoogstens acht uur.
              </p>
              <h3>Kaarten en links naar andere websites</h3>
              <p>
                De kaarten van OpenStreetMap laden pas als je op de kaartknop klikt, bij de route van Sinterklaas of bij
                het wijkhuis. Op de routepagina laadt de kaart vanzelf terwijl de live GPS van de huifkar loopt.
                OpenStreetMap ontvangt dan technische gegevens, zoals je IP-adres.
              </p>
              <p>
                De live GPS toont alleen waar de huifkar van Sinterklaas is, nooit jouw locatie. Onze website vraagt
                nooit om je locatie.
              </p>
              <p>
                Klik je op een sponsoradres of op de routeknop bij het wijkhuis, dan opent Google Maps in een nieuw
                tabblad. Pas vanaf die klik ziet Google dat bezoek en geldt zijn eigen privacybeleid. Hetzelfde geldt
                voor de websites van sponsors en het e-loket van de gemeente Beerse waarnaar we linken.
              </p>
            </Section>

            <Section id="sinterklaas">
              <h3>Inschrijving voor de cadeauactie</h3>
              <p>Ouders of voogden kunnen hun kinderen inschrijven voor de cadeauactie van Sinterklaas. We vragen:</p>
              <ul>
                <li>van de ouder of voogd: de naam, het e-mailadres en het adres in {area};</li>
                <li>per kind: alleen de voornaam en de leeftijd.</li>
              </ul>
              <p>
                Daarnaast bewaren we je inschrijvingsnummer, je akkoord met het wedstrijdreglement (versie en tijdstip)
                en de status van je inschrijving, zoals adres nagekeken, mail verstuurd of cadeautje afgehaald. Soms
                staat er een korte notitie van een beheerder bij. Bij co-ouderschap mag het adres dat van de andere ouder
                zijn; over die ouder vragen we niets.
              </p>
              <p>
                We gebruiken deze gegevens om de inschrijvingen te beheren, de cadeautjes te voorzien, je een
                bevestigingsmail te sturen en je vragen te beantwoorden. Met de wijkindeling van de gemeente Beerse kijken
                we na of het adres in {area} ligt, en we letten op dubbele inschrijvingen. Staat een adres niet op die
                lijst, dan kijkt een beheerder het na: het wordt niet automatisch geweigerd.
              </p>
              <p>We gebruiken deze gegevens niet voor reclame en geven ze niet aan sponsors.</p>
              <p>
                Inschrijven is vrijwillig, maar zonder deze gegevens kunnen we geen cadeautje voorzien. Je kunt je
                inschrijving altijd laten annuleren en je gegevens laten wissen.
              </p>
              <Basis>
                Voor je eigen gegevens: de deelname die je aanvraagt en volgens het wedstrijdreglement aanvaardt (artikel
                6.1.b AVG). Voor de gegevens van je kinderen, de adres- en dubbelcontrole, het bewijs van je akkoord en de
                beveiliging van het formulier: ons gerechtvaardigd belang om deze gratis actie voor de kinderen van de
                wijk eerlijk en veilig te organiseren (artikel 6.1.f AVG). Schreef je in toen hier nog stond dat we dit
                met je toestemming doen (artikel 6.1.a AVG)? Dan blijft dat zo voor jouw inschrijving, en kun je die
                toestemming altijd intrekken.
              </Basis>
              <h3>Zo beschermen we de inschrijvingen</h3>
              <p>
                De inschrijvingen staan in een afgeschermde database bij Cloudflare, opgeslagen in de Europese Unie.
                Alleen bevoegde personen beheren ze, met een beheerwachtwoord.
              </p>
              <p>
                Bij het verzenden kijkt Cloudflare Turnstile na of er een mens achter het formulier zit. Cloudflare
                gebruikt daarvoor technische gegevens zoals je IP-adres en browsertype, en ook om die controle te
                verbeteren.
              </p>
              <p>
                Tegen misbruik van het formulier en van de beheerlogin bewaren we hoogstens een dag een versluierde code
                van je internetverbinding.
              </p>
              <p>
                De bevestigingsmail en onze antwoorden lopen via het gratis Gmail-account van de vereniging. Hoe lang we
                dit alles bewaren, lees je bij <To id="bewaring">Hoe lang bewaren we gegevens?</To>
              </p>
              <h3>Kleurwedstrijd</h3>
              <p>
                Op de tekening die je kind aan Sinterklaas geeft, staan de naam en de leeftijd van het kind. Zo weten we
                van welk kind de tekening is, voor de kleurwedstrijd en de cadeauactie. Meer vragen we op de tekening
                niet. Omdat het om kinderen gaat, houden we het bij die twee gegevens en gebruiken we ze nergens anders
                voor.
              </p>
              <Basis>Ons gerechtvaardigd belang om deze gratis actie eerlijk te organiseren (artikel 6.1.f AVG).</Basis>
            </Section>

            <Section id="activiteiten">
              <p>
                Naast Sinterklaas organiseren we ook de garageverkoop, het paasfeest en het wijkfeest. Voor de volgende
                edities liggen de datum en de manier van inschrijven nog niet vast. Via deze website kun je je er nog niet
                voor inschrijven, en we vragen er op dit moment geen gegevens voor.
              </p>
              <p>
                Vragen we voor zo’n activiteit wel gegevens, bijvoorbeeld voor een inschrijving of een deelnemerslijst,
                dan vullen we deze verklaring aan vóór de inschrijvingen starten: welke gegevens, waarvoor, op welke
                grond, wie ze te zien krijgt en hoe lang we ze bewaren.
              </p>
              <p>
                <strong>Inschrijven voor een activiteit betekent niet dat we je naam, je adres of foto’s van jou openbaar
                maken.</strong>{" "}
                Willen we bijvoorbeeld de deelnemende adressen van een garageverkoop op een openbare kaart tonen, dan
                zeggen we vooraf welke gegevens zichtbaar worden en op welke grond.
              </p>
              <p>
                Van vroegere activiteiten kan de vereniging nog inschrijfformulieren of deelnemerslijsten hebben. Wil je
                weten of we gegevens van jou hebben, of wil je ze laten wissen? <To id="contact">Laat het ons weten</To>.
              </p>
            </Section>

            <Section id="publicaties">
              <p>
                We delen graag mooie momenten uit de wijk. Tegelijk begrijpen we dat niet iedereen herkenbaar op een foto
                of in een publicatie wil staan.
              </p>
              <p>
                Op deze website publiceren we geen foto’s van deelnemers, geen tekeningen, geen uitslagen en geen namen
                van kinderen.
              </p>
              <p>
                Deelnemen aan een activiteit betekent niet dat we foto’s, tekeningen, uitslagen, namen of adressen mogen
                publiceren: dat is telkens een apart doel. Willen we iets publiceren, zoals foto’s van een activiteit of
                de winnaars van een wedstrijd, dan zeggen we vooraf wat we publiceren, waar en op welke grond, en vullen
                we deze verklaring aan. Bij herkenbare foto’s houden we ook rekening met het recht op afbeelding; bij
                kinderen zijn we extra voorzichtig.
              </p>
            </Section>

            <Section id="lief-en-leed">
              <p>
                Bij een geboorte, een overlijden of een huwelijksjubileum in de wijk maakt de vereniging graag een attent
                gebaar.
              </p>
              <p>
                Bezorg je ons een geboortekaartje of een doodsbrief, dan gebruiken we de gegevens daarop alleen om de
                attentie te bezorgen. Bij een overlijden loopt dat via de begrafenisondernemer. De privacyregels gelden
                niet voor gegevens van overledenen, wel voor de nabestaanden die op een doodsbrief staan.
              </p>
              <p>
                Een huwelijksjubileum meld je bij de gemeente Beerse. Alleen als je daar zelf toestemming voor geeft,
                bezorgt de gemeente je gegevens aan het wijkbestuur. Die gegevens krijgen we dus niet van jou, maar van
                de gemeente: het gaat om wat je op het gemeentelijke formulier invulde.
              </p>
              <p>
                Alleen de bestuursleden die de attentie verzorgen, zien deze gegevens. We zetten ze niet op de website en
                bewaren er online niets van.
              </p>
              <Basis>
                Ons gerechtvaardigd belang om mee te leven met de buurt (artikel 6.1.f AVG). Je bezorgt ons de stukken
                zelf of liet de gemeente je gegevens doorgeven, en we gebruiken ze alleen voor de attentie.
              </Basis>
            </Section>

            <Section id="sponsors">
              <p>
                Onze lokale sponsors helpen de activiteiten in de wijk mogelijk te maken. Daar zijn we hen dankbaar voor.
                Op de openbare sponsorpagina bedanken we hen en maken we hun onderneming zichtbaar.
              </p>
              <p>
                Daar kunnen, zoals met de sponsor afgesproken, de bedrijfsnaam, het logo, een korte omschrijving, het
                adres, het telefoonnummer, het e-mailadres en de website staan. Iedereen die de website bezoekt, kan dat
                zien.
              </p>
              <p>
                Bedrijfsgegevens kunnen ook persoonsgegevens zijn, bijvoorbeeld bij een eenmanszaak of een zaak op naam
                van een persoon. De gegevens komen uit onze afspraken met de sponsor; enkele logo’s en webadressen namen
                we over van de eigen website van de sponsor.
              </p>
              <Basis>De toestemming van de sponsor (artikel 6.1.a AVG).</Basis>
              <h3>Toestemming intrekken of iets laten aanpassen</h3>
              <p>
                Als sponsor kun je je toestemming altijd eenvoudig intrekken, zonder een reden te geven: een korte mail
                naar <MailLink /> volstaat. Dan halen we je vermelding zo snel mogelijk van de website. Het intrekken doet
                geen afbreuk aan de vermelding zoals die vóór de intrekking rechtmatig op je toestemming steunde.
              </p>
              <p>Klopt er iets niet, of wil je iets laten aanpassen? Mail ons, dan passen we het aan.</p>
            </Section>

            <Section id="ontvangers">
              <p>
                We delen gegevens alleen als dat nodig is voor de werking van de vereniging en we er een geldige grond
                voor hebben, of als de wet het vereist. Openbaar is alleen wat op deze website staat, zoals de
                sponsorpagina.
              </p>
              <p>We werken met deze dienstverleners:</p>
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
              <p>
                We bewaren gegevens niet langer dan nodig voor het doel waarvoor we ze gebruiken. Alleen voor
                boekhoudstukken schrijft de wet zelf een bewaartermijn voor. De andere termijnen hieronder kozen we zelf,
                zo kort als het doel toelaat.
              </p>
              <dl className="privacy-list">
                <div>
                  <dt>Inschrijvingen Sinterklaas {event.year}</dt>
                  <dd>
                    Op {deleteByLabel} wist de website automatisch de namen van ouders en kinderen, de e-mailadressen,
                    de adressen en de notities uit de database. Mails in Gmail, gedownloade lijsten en papieren kopieën
                    ruimen we apart op, ook uiterlijk die dag.
                  </dd>
                </div>
                <div>
                  <dt>Technische reservekopieën</dt>
                  <dd>
                    De reservekopie van de database verdwijnt daarna vanzelf, binnen 30 dagen. Bij Google duurt het
                    volledig verwijderen volgens zijn eigen beleid doorgaans ongeveer twee maanden, en versleutelde
                    reservekopieën kunnen tot zes maanden blijven bestaan.
                  </dd>
                </div>
                <div>
                  <dt>Cijfers voor volgende edities</dt>
                  <dd>
                    Om volgende edities voor te bereiden, houden we het inschrijvingsnummer met cijfers zoals leeftijden,
                    aantallen en afgehaalde cadeautjes, zonder naam, e-mailadres of adres. Omdat het inschrijvingsnummer
                    erbij blijft, behandelen we ook deze cijfers als persoonsgegevens. We bewaren ze tot de volgende
                    Sinterklaasactie voorbereid is, en uiterlijk tot 31 januari 2028.
                  </dd>
                </div>
                <div>
                  <dt>Versluierde code tegen misbruik</dt>
                  <dd>Hoogstens een dag.</dd>
                </div>
                <div>
                  <dt>Tekeningen</dt>
                  <dd>Tot na de kleurwedstrijd, en uiterlijk tot {deleteByLabel}.</dd>
                </div>
                <div>
                  <dt>Lief en leed</dt>
                  <dd>
                    Tot de attentie bezorgd is, en uiterlijk drie maanden na ontvangst. Daarna ruimen we het kaartje, de
                    doodsbrief of de gegevens van de gemeente op.
                  </dd>
                </div>
                <div>
                  <dt>Mails met een vraag</dt>
                  <dd>
                    Uiterlijk zes maanden nadat je vraag is afgehandeld. Een verzoek over je privacyrechten bewaren we één
                    jaar na de afhandeling, zodat we kunnen tonen hoe we het behandelden. Mails over de inschrijvingen van
                    Sinterklaas {event.year} ruimen we al op {deleteByLabel} op.
                  </dd>
                </div>
                <div>
                  <dt>Deelnemerslijsten van activiteiten</dt>
                  <dd>
                    Na afloop van een activiteit hebben we ze niet meer nodig: we ruimen ze op binnen drie maanden na de
                    activiteit. Lijsten van vroegere activiteiten die nog bestaan, kijkt het bestuur na volgens dezelfde
                    regel.
                  </dd>
                </div>
                <div>
                  <dt>Boekhoudstukken</dt>
                  <dd>
                    Moet de vereniging een stuk bewaren voor haar boekhouding, zoals een factuur of een rekeninguittreksel,
                    dan bewaren we het zo lang als de boekhoudwetgeving voorschrijft. Dat is een wettelijke bewaarplicht.
                    Zulke stukken houden we apart van de inschrijvingen; in de inschrijvingen staan geen betaalgegevens.
                  </dd>
                </div>
                <div>
                  <dt>Sponsorvermeldingen</dt>
                  <dd>
                    Zolang de sponsor met de vermelding akkoord is. Trekt een sponsor zijn toestemming in, dan halen we de
                    vermelding zo snel mogelijk weg.
                  </dd>
                </div>
              </dl>
            </Section>

            <Section id="rechten">
              <p>Gebruiken we gegevens van jou? Dan kun je ons vragen om:</p>
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
                Niet elk recht geldt in elke situatie; de wet stelt voorwaarden. Kunnen we een verzoek niet of maar
                gedeeltelijk uitvoeren, dan leggen we uit waarom. Ouders en voogden kunnen deze rechten ook voor hun
                kinderen uitoefenen. Twijfelen we of een verzoek echt van jou komt, dan kunnen we je vragen dat te
                bevestigen.
              </p>
              <p>
                Een verzoek is gratis. Alleen bij een verzoek dat duidelijk ongegrond of buitensporig is, laat de wet een
                redelijke vergoeding of een weigering toe.
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
                  <strong>We helpen je graag verder.</strong>
                </p>
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
                Mail je ons, dan gebruiken we je naam, je e-mailadres en wat je schrijft alleen om je bericht te
                beantwoorden en af te handelen.
              </p>
              <Basis>
                Ons gerechtvaardigd belang om vragen van bewoners en sponsors te beantwoorden (artikel 6.1.f AVG). Gaat je
                bericht over je privacyrechten, dan onze wettelijke plicht om daarop te antwoorden (artikel 6.1.c AVG).
              </Basis>
              <p>
                Je hebt ook het recht om een klacht in te dienen bij de{" "}
                <External href="https://www.gegevensbeschermingsautoriteit.be">Gegevensbeschermingsautoriteit</External>.
              </p>
            </Section>

            <Section id="wijzigingen">
              <p>
                Veranderen onze activiteiten of de manier waarop we gegevens gebruiken, dan passen we deze verklaring aan.
                Je ziet dat bovenaan aan de datum. De laatste inhoudelijke wijziging was op {longDate(privacyUpdated)}.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </article>
  );
}
