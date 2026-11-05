// Inhoud van de algemene wijkwebsite op het hoofdadres. Verenigingsgegevens en de datum van Sinterklaas komen uit
// event.ts, sponsors uit sponsors.json en sponsor-logos.ts: hier staat daarvan geen tweede kopie.
// Verzin hier niets: zonder bevestigde datum of locatie blijft het veld null en toont de site "Datum volgt".

// De melding bij een activiteit. Ze staat alleen op de website: ze opent of sluit niets op de server.
// Voor Sinterklaas komen status en zin van de server; de periode en de schakelaar staan in het beheer.
// "Voorbij" gaat over de datum, "gesloten" over de inschrijving: dat zijn twee aparte dingen, die samen kunnen voorkomen.
export type ActivityStatus = "info" | "open" | "closed" | "upcoming" | "past";

export const statusLabels: Record<ActivityStatus, string> = {
  info: "Informatie volgt",
  open: "Inschrijven mogelijk",
  closed: "Inschrijving gesloten",
  upcoming: "Inschrijving nog niet open",
  past: "Voorbij",
};

// Beeld op de hoofdpagina: altijd 3:2 (1536 × 1024, met een kleine versie), dus het vult het vak zonder iets af te snijden.
export type TileImage = {
  src: string;
  alt: string;
  // Korte vermelding op het beeld.
  note?: string;
};

export type Activity = {
  slug: string;
  name: string;
  title: string;
  teaser: string;
  more: string;
  text: string;
  image: string;
  imageAlt: string;
  tile: TileImage;
  // YYYY-MM-DD; na deze dag toont de site vanzelf ook "Voorbij". Dat sluit geen inschrijving.
  date: string | null;
  location: string | null;
  // "open" werkt alleen samen met registrationHref. registrationDeadline = de laatste dag; daarna toont de site gesloten.
  status: "info" | "open" | "closed";
  registrationHref: string | null;
  registrationDeadline: string | null;
};

export const activities: Activity[] = [
  {
    slug: "pasen",
    name: "Pasen",
    title: "Pasen in Oosthoek",
    teaser: "Een vrolijk lentemoment voor de kleinsten van onze wijk.",
    more: "Meer over Pasen",
    text: "Een vrolijke paasactiviteit voor onze wijk. De datum, het programma en de praktische afspraken worden hier bekendgemaakt zodra ze vastliggen.",
    image: "assets/oosthoek-pasen.webp",
    imageAlt: "Sfeerillustratie: een mand met beschilderde paaseieren en een wit konijn in een lentetuin, met kinderen die eieren zoeken.",
    tile: {
      src: "assets/tegel-pasen.webp",
      alt: "Sfeerillustratie: een rieten mand met beschilderde paaseieren en een wit paashaasje tussen de lentebloemen, in warm licht.",
    },
    date: null,
    location: null,
    status: "info",
    registrationHref: null,
    registrationDeadline: null,
  },
  {
    slug: "garageverkoop",
    name: "Garageverkoop",
    title: "Garageverkoop",
    teaser: "Een tweede leven voor spullen. Een gezellige babbel erbij.",
    more: "Meer over de verkoop",
    text: "Samen snuisteren in de wijk. Zodra de volgende editie vastligt, vind je hier de datum, informatie over deelname en de praktische afspraken.",
    image: "assets/oosthoek-garageverkoop.webp",
    imageAlt: "Sfeerillustratie: een buurvrouw toont spullen op een tafel voor haar garage aan een jong koppel, in een straat met bloemen.",
    tile: {
      src: "assets/tegel-garageverkoop.webp",
      alt: "Sfeerillustratie: een krijtbord met het opschrift Garage Verkoop naast een lamp, oude koffers en snuisterijen, in een zonnige straat.",
    },
    date: null,
    location: null,
    status: "info",
    registrationHref: null,
    registrationDeadline: null,
  },
  {
    slug: "wijkfeest",
    name: "Wijkfeest",
    title: "Wijkfeest",
    teaser: "Schuif aan, ontmoet je buren en geniet van de sfeer.",
    more: "Meer over het wijkfeest",
    text: "Een gezellig moment om samen te komen met de buurt. Datum, locatie, programma en eventuele inschrijvingen volgen zodra alles vastligt.",
    image: "assets/oosthoek-wijkfeest.webp",
    imageAlt: "Sfeerillustratie: buren van alle leeftijden aan een lange feesttafel in de straat, onder vlaggetjes en lichtjes.",
    tile: {
      src: "assets/tegel-wijkfeest.webp",
      alt: "Sfeerillustratie: buren van alle leeftijden lachen samen aan een lange feesttafel buiten, onder vlaggetjes en lichtjes.",
    },
    date: null,
    location: null,
    status: "info",
    registrationHref: null,
    registrationDeadline: null,
  },
];

// De bestaande Sinterklaaswebsite. Met #-route, want het kale /sinterklaas/ is het adres van de gedrukte QR en opent de wijkpagina.
export const sinterklaas = {
  name: "Sinterklaas",
  title: "Sinterklaas in Oosthoek",
  teaser: "De Sint komt naar Oosthoek. Alle informatie op zijn eigen website.",
  image: "assets/hero.webp",
  imageAlt: "Sinterklaas zwaait vanuit een feestelijk verlichte huifkar, getrokken door twee witte paarden.",
  href: "/sinterklaas/#/home",
  registrationHref: "/sinterklaas/#/cadeauactie",
  privacyHref: "/sinterklaas/#/privacy",
};

// De plaats van het wijkhuis, aangeleverd door Gert via de kaart "Afhaling prijzen" met de rode cirkel. Het adres in
// event.organisation is het zetel- en correspondentieadres, niet deze plaats. Geen huisnummer: het gebouw heeft er geen.
// De coördinaten zijn het midden van het gebouw binnen de rode cirkel, afgeleid uit luchtfoto en GRB (Digitaal Vlaanderen)
// en OpenStreetMap; de berekening staat in Project dossier\ONTWERP-EN-BOUWPLAN.md.
export const wijkhuisLocation = {
  name: "Wijkhuis Oosthoek",
  address: "Oosteneinde, vlak bij de brug over het kanaal, 2340 Beerse.",
  lat: 51.32974,
  lon: 4.86997,
  zoom: 17,
  routeUrl: "https://www.google.com/maps/dir/?api=1&destination=51.32974%2C4.86997",
};

// Wijkinformatie: eigen tegel en pagina, zonder evenementdatum of inschrijfstatus.
export type InfoPage = {
  slug: string;
  name: string;
  teaser: string;
  more: string;
  image: string;
  imageAlt: string;
  tile: TileImage;
};

export const infoPages: InfoPage[] = [
  {
    slug: "sponsors",
    name: "Onze sponsors",
    teaser: "Dankzij onze sponsors kunnen we mooie dingen doen voor de wijk.",
    more: "Ontdek wie onze wijk steunt",
    image: "assets/oosthoek-sponsors.webp",
    imageAlt: "Sfeerillustratie: twee mensen geven elkaar een warme handdruk aan een tafel met zonnebloemen, terwijl buren op de achtergrond een straatfeest klaarzetten.",
    tile: {
      src: "assets/tegel-sponsors.webp",
      alt: "Sfeerillustratie: twee mensen schudden elkaar de hand boven een bloemenperk, met een ingepakt cadeau op de voorgrond.",
    },
  },
  {
    slug: "lief-en-leed",
    name: "Lief en leed in onze wijk",
    teaser: "Geboorte, overlijden en huwelijksjubileum: Oosthoek leeft mee.",
    more: "Ontdek onze attenties",
    image: "assets/oosthoek-lief-en-leed.webp",
    imageAlt: "Sfeerillustratie: een slapende baby in een rieten wieg, een krans van witte rozen en een lachend ouder echtpaar dat elkaars hand vasthoudt.",
    tile: {
      src: "assets/tegel-lief-en-leed.webp",
      alt: "Sfeerillustratie: een slapende baby in een rieten wieg, een boeket witte bloemen en een lachend ouder echtpaar dat elkaars hand vasthoudt.",
    },
  },
  {
    slug: "wijkhuis",
    name: "Waar is ons wijkhuis?",
    teaser: "Een kijkje bij het witte wijkhuis van onze vereniging, tussen het groen.",
    more: "Bekijk de locatie en route",
    image: "assets/oosthoek-wijkhuis.webp",
    imageAlt: "Schilderachtige bewerking van het witte wijkhuis met het opschrift vzw Wijkvereniging Oosthoek, tussen hoge bomen, met een pad van klinkers, een fietsenrek, een picknicktafel en een mededelingenbord.",
    tile: {
      // Hetzelfde beeld als op de wijkhuispagina (keuze Gert, 4 november 2026).
      src: "assets/oosthoek-wijkhuis.webp",
      alt: "Illustratie, geen foto: het kleine witte wijkhuis met het opschrift vzw Wijkvereniging Oosthoek, tussen hoge bomen, met een pad van klinkers, een fietsenrek, een picknicktafel en een mededelingenbord.",
      note: "Illustratie",
    },
  },
];

export const lifeMoments = [
  {
    title: "Geboorte",
    icon: "birth",
    text: "Een nieuw gezichtje in de wijk? We verwelkomen de kleine met een attentie.",
  },
  {
    title: "Overlijden",
    icon: "loss",
    text: "Als blijk van medeleven voorzien we via de begrafenisondernemer een bloemstukje of krans.",
  },
  {
    title: "Jubilarissen",
    icon: "jubilee",
    text: "Voor 50 jaar huwelijk is er een waardebon voor een etentje en een bloemetje. De officiële melding blijft via de gemeente Beerse verlopen.",
  },
] as const;

// De aanvraag van de gemeente zelf; www.beerse.be/jubileum verwijst ernaar. Geen kopie of formulier op onze website.
export const municipalityJubileeUrl =
  "https://eloket.beerse.be/nl/beerseweb/eloket/1/31/0?at=0&sc=ETm3UovYl8RDHhBNXeNVr3oADZp2xR3PMwGxdbjVI3d";

// Bestanden uit public/ staan online onder /sinterklaas/ (één kopie, gedeeld met de Sinterklaaswebsite).
export const publicFile = (path: string) => `/sinterklaas/${path}`;

// Kleinere versie voor tegels en miniaturen. Het Sinterklaasbeeld is al licht en heeft er geen.
export const smallImage = (path: string) =>
  /^assets\/(oosthoek|tegel)-/.test(path) ? path.replace(/\.webp$/, "-768.webp") : null;

export const todayInBrussels = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(now);

export function dateText(date: string | null) {
  if (!date) return "Datum volgt";
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function activityStatuses(
  activity: Pick<Activity, "date" | "status" | "registrationHref" | "registrationDeadline">,
  today: string,
): ActivityStatus[] {
  const past: ActivityStatus[] = activity.date && today > activity.date ? ["past"] : [];
  if (activity.status === "closed") return [...past, "closed"];
  if (activity.status === "open" && activity.registrationHref) {
    const ended = activity.registrationDeadline && today > activity.registrationDeadline;
    return [...past, ended ? "closed" : "open"];
  }
  return past.length ? past : ["info"];
}

// De inschrijving volgt altijd de server (schakelaar, periode en maximum in het beheer), ook na de datum van het
// evenement. Geen antwoord van de server: dan zegt de wijkpagina niets over de inschrijving.
export function sinterklaasStatuses(
  date: string,
  server: "open" | "closed" | "full" | "upcoming" | null,
  today: string,
): ActivityStatus[] {
  const past: ActivityStatus[] = today > date ? ["past"] : [];
  if (server === "open" || server === "upcoming") return [...past, server];
  return server ? [...past, "closed"] : past;
}

// "#/pasen" = informatiepagina, "#activiteiten" = onderdeel van de hoofdpagina.
export function readRoute(hash: string): { page: string | null; anchor: string | null } {
  if (hash.startsWith("#/")) {
    const [page, anchor] = hash.slice(2).split("?");
    return { page, anchor: anchor ?? null };
  }
  return { page: null, anchor: hash.slice(1) || null };
}

// Voor de wijkwebsite stuurde het hoofdadres alles naar Sinterklaas, met #-route. Oude links als "/#/route" en de
// GitHub-doorverwijzing daarvan blijven zo op dezelfde Sinterklaaspagina uitkomen, met hun zoekdeel.
export function legacySinterklaasUrl(search: string, hash: string) {
  if (!hash.startsWith("#/")) return null;
  const { page } = readRoute(hash);
  const ownPage = [...activities, ...infoPages].some((item) => item.slug === page);
  return ownPage ? null : `/sinterklaas/${search}${hash}`;
}
