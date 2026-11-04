// Inhoud van de algemene wijkwebsite op het hoofdadres. Verenigingsgegevens en de datum van Sinterklaas komen uit
// event.ts, sponsors uit sponsors.json en sponsor-logos.ts: hier staat daarvan geen tweede kopie.
// Verzin hier niets: zonder bevestigde datum of locatie blijft het veld null en toont de site "Datum volgt".

// De melding bij een activiteit. Ze staat alleen op de website: ze opent of sluit niets op de server.
// Voor Sinterklaas komt de status van de server; open of dicht zetten gebeurt in het beheer.
export type ActivityStatus = "info" | "open" | "closed" | "past";

export const statusLabels: Record<ActivityStatus, string> = {
  info: "Informatie volgt",
  open: "Inschrijven mogelijk",
  closed: "Inschrijving gesloten",
  past: "Voorbij",
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
  // YYYY-MM-DD; na deze dag toont de site vanzelf "Voorbij".
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

export const lifeMoments = [
  {
    title: "Een geboorte",
    icon: "birth",
    text: "Een nieuw gezichtje in de wijk? We verwelkomen de kleine met een attentie.",
  },
  {
    title: "Een overlijden",
    icon: "loss",
    text: "Als blijk van medeleven voorzien we via de begrafenisondernemer een bloemstukje of krans.",
  },
  {
    title: "50 jaar getrouwd",
    icon: "jubilee",
    text: "Een gouden jubileum vieren we met een waardebon voor een etentje en een bloemetje. De officiële melding verloopt via de gemeente Beerse.",
  },
] as const;

export const municipalityJubileeUrl = "https://www.beerse.be/jubileum";

// Bestanden uit public/ staan online onder /sinterklaas/ (één kopie, gedeeld met de Sinterklaaswebsite).
export const publicFile = (path: string) => `/sinterklaas/${path}`;

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

export function activityStatus(
  activity: Pick<Activity, "date" | "status" | "registrationHref" | "registrationDeadline">,
  today: string,
): ActivityStatus {
  if (activity.date && today > activity.date) return "past";
  if (activity.status !== "open") return activity.status;
  if (!activity.registrationHref) return "info";
  return activity.registrationDeadline && today > activity.registrationDeadline ? "closed" : "open";
}

// null = de server antwoordde niet: dan zegt de wijkpagina niets over de inschrijving.
export function sinterklaasStatus(
  date: string,
  server: "open" | "closed" | "full" | null,
  today: string,
): ActivityStatus | null {
  if (today > date) return "past";
  if (server === "open") return "open";
  return server ? "closed" : null;
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
  return activities.some((activity) => activity.slug === page) ? null : `/sinterklaas/${search}${hash}`;
}
