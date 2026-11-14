// Teksten die de beheerder zelf kan aanpassen in /beheer/ ("Teksten van de website"), per onderdeel van de website.
// "text" is de oorspronkelijke tekst: die toont de website zolang er niets aangepast is, en ook als de tekstopslag
// even niet bereikbaar is. Aangepaste teksten staan in de database (server/teksten.ts, migratie 0009) en worden altijd
// als gewone tekst getoond, nooit als HTML. "lines": een nieuwe regel in de tekst wordt op de website een nieuwe regel.
// Een tekst toevoegen: hier een regel, en in de pagina t("sleutel") (src/teksten.tsx) in plaats van de vaste tekst.
// Niet hier: adressen, datums, de route, sponsors, het reglement en de privacyverklaring. Die blijven vaste gegevens.
import { dateLabel, event } from "./event.ts";
import { activities, infoPages, lifeMoments, sinterklaas } from "./wijk.ts";

// Gelijk aan MAX_TEXT_LENGTH in server/teksten.ts (tests/teksten.test.mjs bewaakt dat).
export const MAX_TEXT_LENGTH = 2000;

export const textSections = [
  { id: "wijk-hoofdpagina", title: "Wijkwebsite · Hoofdpagina", href: "/" },
  { id: "wijk-pasen", title: "Wijkwebsite · Pasen", href: "/#/pasen" },
  { id: "wijk-garageverkoop", title: "Wijkwebsite · Garageverkoop", href: "/#/garageverkoop" },
  { id: "wijk-wijkfeest", title: "Wijkwebsite · Wijkfeest", href: "/#/wijkfeest" },
  { id: "wijk-sponsors", title: "Wijkwebsite · Onze sponsors", href: "/#/sponsors" },
  { id: "wijk-lief-en-leed", title: "Wijkwebsite · Lief en leed", href: "/#/lief-en-leed" },
  { id: "wijk-wijkhuis", title: "Wijkwebsite · Wijkhuis", href: "/#/wijkhuis" },
  { id: "sint-start", title: "Sinterklaas · Startpagina", href: "/sinterklaas/#/home" },
  { id: "sint-cadeauactie", title: "Sinterklaas · Cadeauactie", href: "/sinterklaas/#/cadeauactie" },
  { id: "sint-kleurwedstrijd", title: "Sinterklaas · Kleurwedstrijd", href: "/sinterklaas/#/kleurwedstrijd" },
  { id: "sint-route", title: "Sinterklaas · Route", href: "/sinterklaas/#/route" },
  { id: "sint-praktisch", title: "Sinterklaas · Praktische info", href: "/sinterklaas/#/praktisch" },
  { id: "sint-contact", title: "Sinterklaas · Contact", href: "/sinterklaas/#/contact" },
] as const;

export type TextSectionId = (typeof textSections)[number]["id"];
export type TextField = { section: TextSectionId; label: string; text: string; lines?: boolean };

// Wat het beheer van één tekst krijgt. value null = de oorspronkelijke tekst; previous = de tekst vóór de laatste wijziging.
export type AdminText = { key: string; value: string | null; previous: string | null; updatedAt: string };

const activity = (slug: string) => activities.find((a) => a.slug === slug)!;
const infoPage = (slug: string) => infoPages.find((p) => p.slug === slug)!;
const moment = (icon: string) => lifeMoments.find((m) => m.icon === icon)!;

const BOVENREGEL = "Bovenregel (kleine letters boven de titel)";
const TEGEL = "Korte tekst op de tegel van de hoofdpagina";

const catalogue = {
  // ---------- Wijkwebsite ----------
  "wijk.welkom.boventitel": { section: "wijk-hoofdpagina", label: "Welkom: bovenregel", text: "Welkom in onze wijk" },
  "wijk.welkom.intro": {
    section: "wijk-hoofdpagina",
    label: "Welkom: inleiding",
    text: "Een fijne buurt begint bij elkaar. We brengen buren samen, vieren mooie momenten en leven met elkaar mee.",
  },
  "wijk.activiteiten.boventitel": {
    section: "wijk-hoofdpagina",
    label: "Activiteiten: bovenregel",
    text: "Activiteiten en wijkinformatie",
  },
  "wijk.activiteiten.titel": { section: "wijk-hoofdpagina", label: "Activiteiten: titel", text: "Ontdek wat er leeft in Oosthoek." },
  "wijk.activiteiten.intro": {
    section: "wijk-hoofdpagina",
    label: "Activiteiten: inleiding",
    text: "Van paaseieren tot ons wijkhuis: hier vind je onze activiteiten en wijkinformatie bij elkaar.",
  },
  "wijk.sinterklaas.tegel": { section: "wijk-hoofdpagina", label: "Tegel Sinterklaas: korte tekst", text: sinterklaas.teaser },
  "wijk.contact.titel": {
    section: "wijk-hoofdpagina",
    label: "Contact: titel",
    text: "Een vraag, een idee, \nof gewoon even hallo?",
    lines: true,
  },
  "wijk.contact.tekst": { section: "wijk-hoofdpagina", label: "Contact: tekst", text: "We horen graag van je. Samen maken we de wijk." },
  "wijk.voet.slogan": { section: "wijk-hoofdpagina", label: "Zin onderaan elke pagina", text: "Kleine momenten. Een hechte wijk." },

  "wijk.pasen.tegel": { section: "wijk-pasen", label: TEGEL, text: activity("pasen").teaser },
  "wijk.pasen.tekst": { section: "wijk-pasen", label: "Tekst op de eigen pagina", text: activity("pasen").text },
  "wijk.garageverkoop.tegel": { section: "wijk-garageverkoop", label: TEGEL, text: activity("garageverkoop").teaser },
  "wijk.garageverkoop.tekst": { section: "wijk-garageverkoop", label: "Tekst op de eigen pagina", text: activity("garageverkoop").text },
  "wijk.wijkfeest.tegel": { section: "wijk-wijkfeest", label: TEGEL, text: activity("wijkfeest").teaser },
  "wijk.wijkfeest.tekst": { section: "wijk-wijkfeest", label: "Tekst op de eigen pagina", text: activity("wijkfeest").text },

  "wijk.sponsors.tegel": { section: "wijk-sponsors", label: TEGEL, text: infoPage("sponsors").teaser },

  "wijk.lief-en-leed.tegel": { section: "wijk-lief-en-leed", label: TEGEL, text: infoPage("lief-en-leed").teaser },
  "wijk.lief-en-leed.intro": {
    section: "wijk-lief-en-leed",
    label: "Inleiding op de eigen pagina",
    text: "Bij een nieuw begin, een groot jubileum of een moeilijk afscheid: als wijk staan we graag even stil bij wat telt.",
  },
  "wijk.lief-en-leed.geboorte": { section: "wijk-lief-en-leed", label: "Geboorte: tekst", text: moment("birth").text },
  "wijk.lief-en-leed.overlijden": { section: "wijk-lief-en-leed", label: "Overlijden: tekst", text: moment("loss").text },
  "wijk.lief-en-leed.jubilarissen": { section: "wijk-lief-en-leed", label: "Jubilarissen: tekst", text: moment("jubilee").text },

  "wijk.wijkhuis.intro": {
    section: "wijk-wijkhuis",
    label: "Inleiding op de eigen pagina",
    text: "Dit is het witte wijkhuis van onze vereniging, tussen het groen.",
  },

  // ---------- Sinterklaaswebsite ----------
  "sint.home.boventitel": { section: "sint-start", label: "Bovenaan: bovenregel", text: event.copy.eyebrow },
  "sint.home.intro": { section: "sint-start", label: "Bovenaan: inleiding", text: event.copy.intro },
  "sint.home.kaart-cadeauactie": {
    section: "sint-start",
    label: "Kaart Cadeauactie: tekst",
    text: "Kleur je tekening en ontdek hoe je een gratis cadeautje van de Sint krijgt.",
  },
  "sint.home.kaart-route": {
    section: "sint-start",
    label: "Kaart Route & live tracking: tekst",
    text: "Ontdek de rondgang en de status van de livekaart op de dag zelf.",
  },
  "sint.home.kaart-praktisch": {
    section: "sint-start",
    label: "Kaart Praktische info: tekst",
    text: "Alles wat je moet weten voor een onvergetelijke dag in de wijk.",
  },
  "sint.home.volg-titel": { section: "sint-start", label: "Volg de Sint: titel", text: "Waar is de\nhuifkar nu?", lines: true },
  "sint.home.volg-tekst": { section: "sint-start", label: "Volg de Sint: tekst", text: "Straks volg je de Sint op zijn tocht door de wijk." },
  "sint.home.kleurplaat-titel": { section: "sint-start", label: "Kleurplaat: titel", text: "Download de\nkleurplaat", lines: true },
  "sint.home.kleurplaat-tekst": {
    section: "sint-start",
    label: "Kleurplaat: tekst",
    text: "Pak je mooiste kleuren en maak een tekening voor de Sint!",
  },
  "sint.voet.slogan": { section: "sint-start", label: "Zin onderaan elke Sinterklaaspagina", text: event.copy.footer },

  "sint.cadeau.boventitel": { section: "sint-cadeauactie", label: BOVENREGEL, text: "EEN KLEIN CADEAUTJE, EEN GROTE GLIMLACH" },
  "sint.cadeau.titel": { section: "sint-cadeauactie", label: "Titel", text: "Een verrassing van de Sint." },
  "sint.cadeau.intro": {
    section: "sint-cadeauactie",
    label: "Inleiding",
    text: "Kleur je mooiste tekening en kom mee genieten van een magische dag in Oosthoek.",
  },
  "sint.cadeau.stappen-titel": {
    section: "sint-cadeauactie",
    label: "Zo doe je mee: titel",
    text: "De voorpret begint\nmet een kleurpotlood.",
    lines: true,
  },
  "sint.cadeau.stap1-titel": { section: "sint-cadeauactie", label: "Stap 1: titel", text: "Maak er iets moois van" },
  "sint.cadeau.stap1-tekst": {
    section: "sint-cadeauactie",
    label: "Stap 1: tekst",
    text: "Download de officiële kleurplaat en kleur je Sinterklaastekening in.",
  },
  "sint.cadeau.stap2-titel": { section: "sint-cadeauactie", label: "Stap 2: titel", text: "Bekijk de inschrijving" },
  "sint.cadeau.stap2-tekst": {
    section: "sint-cadeauactie",
    label: "Stap 2: tekst",
    text: "Een ouder of voogd schrijft je gratis in via het formulier op deze pagina.",
  },
  "sint.cadeau.stap3-titel": { section: "sint-cadeauactie", label: "Stap 3: titel", text: "Kom de Sint begroeten" },
  "sint.cadeau.stap3-tekst": {
    section: "sint-cadeauactie",
    label: "Stap 3: tekst",
    text: `Breng je ingekleurde tekening mee op ${dateLabel}.`,
  },

  "sint.kleur.boventitel": { section: "sint-kleurwedstrijd", label: BOVENREGEL, text: "CREATIEF VOOR SINTERKLAAS" },
  "sint.kleur.titel": { section: "sint-kleurwedstrijd", label: "Titel", text: "Alle kleuren van de voorpret." },
  "sint.kleur.intro": {
    section: "sint-kleurwedstrijd",
    label: "Inleiding",
    text: "Pak je potloden erbij. De officiële Oosthoek-kleurplaat wacht op jouw mooiste kleuren!",
  },
  "sint.kleur.uitleg-titel": {
    section: "sint-kleurwedstrijd",
    label: "Kleur mee: titel",
    text: "Een tekening\nspeciaal voor de Sint.",
    lines: true,
  },
  "sint.kleur.uitleg-tekst": {
    section: "sint-kleurwedstrijd",
    label: "Kleur mee: tekst",
    text: "Download de kleurplaat, print hem op A4 en maak er thuis iets moois van. Vul je naam en leeftijd in op de tekening en geef hem aan Sinterklaas.",
  },
  "sint.kleur.punt1": { section: "sint-kleurwedstrijd", label: "Lijstje: punt 1", text: "Bij de flyer zit al één kleurplaat" },
  "sint.kleur.punt2": {
    section: "sint-kleurwedstrijd",
    label: "Lijstje: punt 2",
    text: "Meer kinderen in het gezin? Download en print hier een extra kleurplaat per kind",
  },
  "sint.kleur.punt3": { section: "sint-kleurwedstrijd", label: "Lijstje: punt 3", text: "Elk kind dient één eigen ingekleurde tekening in" },
  "sint.kleur.punt4": { section: "sint-kleurwedstrijd", label: "Lijstje: punt 4", text: "Maximaal één cadeautje per deelnemend kind" },

  "sint.route.boventitel": { section: "sint-route", label: BOVENREGEL, text: "MET DE HUIFKAR DOOR DE WIJK" },
  "sint.route.titel": { section: "sint-route", label: "Titel", text: "Waar is de Sint?" },
  "sint.route.intro": {
    section: "sint-route",
    label: "Inleiding",
    text: `De huifkar en de paarden rijden door ${event.route.stops.length} straten van Oosthoek. Hier vind je de route en, tijdens de rondrit, de livepositie.`,
  },
  "sint.route.kaart-tekst": {
    section: "sint-route",
    label: "Kaartvak (zonder live GPS): tekst",
    text: "Bekijk op de kaart door welke straten de huifkar rijdt. De volgorde staat ook hieronder.",
  },
  "sint.route.volg-titel": { section: "sint-route", label: "Volg de Sint: titel", text: "De hele wijk\nkijkt ernaar uit.", lines: true },
  "sint.route.vervoer": { section: "sint-route", label: "Vervoer", text: event.route.transport },
  "sint.route.tijden": {
    section: "sint-route",
    label: "Tijden per straat",
    text: "Niet bekendgemaakt. Volg de huifkar live tijdens de rondrit.",
  },
  "sint.route.lijst-titel": { section: "sint-route", label: "Straten: titel", text: "Hier komen we langs" },
  "sint.route.lijst-tekst": {
    section: "sint-route",
    label: "Straten: tekst",
    text: "Vanaf het vertrek aan Wijkhuis Oosthoek rijdt de huifkar de straten in deze volgorde. Tik op een straat om ze op de kaart te zien.",
  },
  "sint.route.draaien": { section: "sint-route", label: "Straten: melding over draaien", text: event.route.turnNote },
  "sint.route.kaart-indicatief": {
    section: "sint-route",
    label: "Straten: opmerking onder de lijst",
    text: "De straten en hun volgorde liggen vast. De kaart is indicatief: de precieze rijweg in en tussen de straten kan afwijken.",
  },

  "sint.praktisch.boventitel": { section: "sint-praktisch", label: BOVENREGEL, text: "ALLES VOOR EEN FIJNE DAG" },
  "sint.praktisch.titel": { section: "sint-praktisch", label: "Titel", text: "Goed om te weten." },
  "sint.praktisch.intro": {
    section: "sint-praktisch",
    label: "Inleiding",
    text: "Plan je bezoek aan de Sint in Oosthoek. Hier vind je de praktische informatie en de actuele stand van zaken.",
  },
  "sint.praktisch.waar-titel": { section: "sint-praktisch", label: "Waar: titel", text: "Oosthoek in Beerse" },
  // Correctie van Gert, 13 november 2026: "huifkar en paarden" (het woord "witte" vervalt; op 14 november overal).
  "sint.praktisch.waar-tekst": {
    section: "sint-praktisch",
    label: "Waar: tekst",
    text: `De Sint rijdt met de huifkar en paarden door ${event.route.stops.length} straten van onze wijk.`,
  },
  "sint.praktisch.meebrengen-titel": { section: "sint-praktisch", label: "Wat meebrengen: titel", text: "Je ingekleurde tekening" },
  "sint.praktisch.meebrengen-tekst": {
    section: "sint-praktisch",
    label: "Wat meebrengen: tekst",
    text: "Vul je naam en leeftijd in en breng je kleurplaat mee voor de Sint.",
  },
  "sint.praktisch.cadeau-titel": { section: "sint-praktisch", label: "Cadeauactie: titel", text: "Een verrassing voor de kleintjes" },
  "sint.praktisch.cadeau-tekst": {
    section: "sint-praktisch",
    label: "Cadeauactie: tekst",
    text: "De inschrijving is gratis en verloopt online via de cadeauactiepagina. Per kind is er maximaal één cadeautje.",
  },
  "sint.praktisch.route-titel": { section: "sint-praktisch", label: "Route: titel", text: "Waar komt de huifkar langs?" },
  "sint.praktisch.route-tekst": {
    section: "sint-praktisch",
    label: "Route: tekst",
    text: "Op de routepagina vind je de straten in volgorde, de kaart en tijdens de rondrit de livepositie van de huifkar.",
  },
  "sint.praktisch.vragen-titel": { section: "sint-praktisch", label: "Veelgestelde vragen: titel", text: "Nog even handig om te weten" },
  "sint.praktisch.vraag1": { section: "sint-praktisch", label: "Vraag 1", text: "Hoe druk ik de kleurplaat af?" },
  "sint.praktisch.antwoord1": {
    section: "sint-praktisch",
    label: "Antwoord 1",
    text: "Download de originele PDF op de kleurwedstrijdpagina en print hem op A4.",
  },
  "sint.praktisch.vraag2": { section: "sint-praktisch", label: "Vraag 2", text: "Leveren meerdere tekeningen extra cadeautjes op?" },
  "sint.praktisch.antwoord2": {
    section: "sint-praktisch",
    label: "Antwoord 2",
    text: "Nee. Er geldt één kleurplaat en maximaal één cadeautje per kind, ook als je meerdere tekeningen meebrengt.",
  },
  "sint.praktisch.contact-titel": { section: "sint-praktisch", label: "Andere vraag: titel", text: "Een andere vraag?" },
  "sint.praktisch.contact-tekst": { section: "sint-praktisch", label: "Andere vraag: tekst", text: "De wijkvereniging helpt je graag verder." },

  "sint.contact.boventitel": { section: "sint-contact", label: BOVENREGEL, text: "DICHT BIJ ELKAAR, DICHT BIJ DE BUURT" },
  "sint.contact.titel": { section: "sint-contact", label: "Titel", text: "We horen graag van je." },
  "sint.contact.intro": {
    section: "sint-contact",
    label: "Inleiding",
    text: "Een vraag over de Sinterklaasdag of de vereniging? Neem gerust contact met ons op.",
  },
} satisfies Record<string, TextField>;

export type TextKey = keyof typeof catalogue;
export const texts: Record<TextKey, TextField> = catalogue;

// Voor sleutels die uit een slug volgen ("wijk.pasen.tegel"): null als zo'n tekst niet bestaat.
export const optionalKey = (key: string): TextKey | null => (Object.hasOwn(texts, key) ? (key as TextKey) : null);

// Het antwoord van /api/teksten nagekeken: alleen bekende teksten, gewone tekst, niet leeg en niet te lang.
// Een tekst zonder "lines" krijgt nooit een regeleinde.
export function textOverrides(body: unknown): Partial<Record<TextKey, string>> {
  const found: Partial<Record<TextKey, string>> = {};
  const list = body && typeof body === "object" ? (body as { teksten?: unknown }).teksten : null;
  if (!list || typeof list !== "object" || Array.isArray(list)) return found;
  for (const [name, value] of Object.entries(list)) {
    const key = optionalKey(name);
    if (!key || typeof value !== "string" || !value.trim() || value.length > MAX_TEXT_LENGTH) continue;
    found[key] = texts[key].lines ? value : value.replace(/\s*\n\s*/g, " ");
  }
  return found;
}
