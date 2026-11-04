// Inhoud van de algemene wijkwebsite op het hoofdadres. Verenigingsgegevens en de datum van Sinterklaas komen uit
// event.ts, sponsors uit sponsors.json en sponsor-logos.ts: hier staat daarvan geen tweede kopie.
// Verzin hier niets: zonder bevestigde datum of locatie blijft het veld null en toont de site "Datum volgt".

// De melding bij een activiteit. Ze staat alleen op de website: ze opent of sluit niets op de server.
// Voor Sinterklaas komt de inschrijfstatus van de server; open of dicht zetten gebeurt in het beheer.
// "Voorbij" gaat over de datum, "gesloten" over de inschrijving: dat zijn twee aparte dingen, die samen kunnen voorkomen.
export type ActivityStatus = "info" | "open" | "closed" | "past";

export const statusLabels: Record<ActivityStatus, string> = {
  info: "Informatie volgt",
  open: "Inschrijven mogelijk",
  closed: "Inschrijving gesloten",
  past: "Voorbij",
};

// Beeld op de hoofdpagina. De eigen pagina's houden hun grotere beeld (`image`): deze uitsneden zijn daarvoor te klein.
export type TileImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  // Welk deel in beeld blijft als het vak smaller is dan het beeld.
  position?: string;
  // Zeer brede uitsnede: helemaal tonen, want in een 3:2-vak zou een onderwerp wegvallen.
  whole?: boolean;
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
      width: 349,
      height: 153,
      position: "38% 50%",
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
      width: 336,
      height: 153,
      position: "70% 50%",
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
      width: 331,
      height: 153,
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

// Alleen na bevestiging invullen. Het adres in event.organisation is het correspondentieadres; dat het wijkhuis daar staat, is nergens bevestigd.
// Met een locatie toont de site vanzelf het adres, de kaart- en routeknop en de knoptekst "Bekijk de locatie en route".
export type WijkhuisLocation = { address: string; mapUrl: string; routeUrl: string };
export const wijkhuisLocation = null as WijkhuisLocation | null;

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
      width: 465,
      height: 105,
      whole: true,
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
      width: 468,
      height: 105,
      whole: true,
    },
  },
  {
    slug: "wijkhuis",
    name: "Waar is ons wijkhuis?",
    teaser: "Een kijkje bij het witte wijkhuis van onze vereniging, tussen het groen.",
    more: wijkhuisLocation ? "Bekijk de locatie en route" : "Bekijk ons wijkhuis",
    image: "assets/oosthoek-wijkhuis.webp",
    imageAlt: "Schilderachtige bewerking van het witte wijkhuis met het opschrift vzw Wijkvereniging Oosthoek, tussen hoge bomen, met een pad van klinkers, een fietsenrek, een picknicktafel en een mededelingenbord.",
    tile: {
      src: "assets/tegel-wijkhuis.webp",
      alt: "Illustratie, geen foto: een wit wijkhuis met het opschrift VZW Wijkvereniging Oosthoek, tussen bomen en bloemen.",
      width: 458,
      height: 105,
      whole: true,
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

export const municipalityJubileeUrl = "https://www.beerse.be/jubileum";

// Bestanden uit public/ staan online onder /sinterklaas/ (één kopie, gedeeld met de Sinterklaaswebsite).
export const publicFile = (path: string) => `/sinterklaas/${path}`;

// Kleinere versie voor tegels en miniaturen. Het Sinterklaasbeeld is al licht en heeft er geen.
export const smallImage = (path: string) =>
  path.startsWith("assets/oosthoek-") ? path.replace(/\.webp$/, "-768.webp") : null;

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

// De inschrijving volgt altijd de server, ook na de datum: alleen het beheer sluit ze. Blijft ze na de datum open, dan
// toont de site dat ook. Geen antwoord van de server: dan zegt de wijkpagina niets over de inschrijving.
export function sinterklaasStatuses(
  date: string,
  server: "open" | "closed" | "full" | null,
  today: string,
): ActivityStatus[] {
  const past: ActivityStatus[] = today > date ? ["past"] : [];
  if (server === "open") return [...past, "open"];
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
