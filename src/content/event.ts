import type { PublicWebsite } from "./public-website";
// Alleen openbare evenementgegevens. Geen sleutels of deelnemersgegevens in deze website.
export const event = {
  year: 2026,
  date: "2026-11-28",
  timeZone: "Europe/Brussels",
  // Vast QR-adres: de Sinterklaaswebsite zelf op /sinterklaas/ van Cloudflare Pages (online gecontroleerd 1 november 2026). Het oude GitHub-adres en de gedrukte QR-codes daarvan sturen door (github-pages/index.html).
  publicWebsite: {
    url: "https://wijkvereniging-oosthoek.pages.dev/sinterklaas/",
    verified: true,
  } as PublicWebsite,
  organisation: {
    name: "VZW Wijkvereniging Oosthoek",
    address: "Opstal 5, 2340 Beerse",
    phone: "0496 56 06 79",
    email: "vzwoosthoek@gmail.com",
    enterprise: "BE0553.481.505",
  },
  registration: {
    status: "unavailable" as "unavailable" | "closed",
    message: "De online inschrijving is nog niet beschikbaar.",
  },
  // Live GPS van de huifkar: het beheer zet ze aan en uit (GPS.md). De route- en startpagina vragen de status op.
  gps: {
    offMessage: "De live GPS is nu niet actief. Tijdens de rondrit volg je hier de huifkar.",
    dayMessage: "Tijdens de rondrit volg je de huifkar live op de routepagina.",
  },
  // Letterlijk zo aangeleverd door de vereniging (3 november 2026): geen straat of huisnummer toevoegen.
  departure: "Vertrek om 10.30 uur aan Wijkhuis Oosthoek.",
  programme: [
    {
      title: "Sinterklaas in de wijk",
      detail:
        "Met de huifkar en witte paarden door de straten van Wijkvereniging Oosthoek.",
      time: null as string | null,
    },
  ],
  // Rondrit 2026, bevestigd door de vereniging (Gert, 3 november 2026): dezelfde straatvolgorde als in 2025, vertrek
  // zie `departure`. Officiële straatnamen voluit (de flyer kort ze af). De nummers op de kaart volgen deze volgorde;
  // de straatligging staat in route-kaart.json (OpenStreetMap). Geen haltes, afslagen of tijden per straat toevoegen.
  route: {
    stops: [
      "Gorenstraat",
      "Veldstraat",
      "Huffelenstraat",
      "Paddesteenstraat",
      "Zandstraat",
      "Veerpontstraat",
      "Leemstraat",
      "Rozenstraat",
      "Daliastraat",
      "Tulpenstraat",
      "Boterbloemstraat",
      "Asterstraat",
      "Leliestraat",
      "Korenbloemstraat",
      "Violierstraat",
      "Steenovensstraat",
      "Beukenlaan",
      "Kattespoelstraat",
      "Frans Lauwersstraat",
      "Jan Vaertenstraat",
      "Dr. Paul Janssenstraat",
      "Opstal",
      "Scheperstraat",
      "Oosteneinde",
    ],
    transport: "Huifkar met witte paarden",
    // false = de kaart toont de straten van de rondrit, maar de precieze rijweg binnen en tussen de straten is nog
    // niet nagekeken; de kaart heet dan "indicatief". Pas op true zetten nadat Gert de getekende route controleerde.
    mapChecked: false as boolean,
    turnNote:
      "In straten waar de huifkar moeilijk kan draaien, vragen we bewoners om aan het begin van de straat te komen.",
  },
  // Het wedstrijdreglement staat in content/reglement.ts.
  copy: {
    eyebrow: "MAGISCHE DAG IN DE WIJK",
    heroTitle: "Sinterklaas komt naar Oosthoek!",
    intro:
      "De Sint trekt met zijn huifkar en witte paarden door onze wijk. Kleur je tekening in, ontdek de cadeauactie en beleef een onvergetelijke dag!",
    footer: "Samen maken we er een magische dag van!",
  },
  downloads: {
    colouring: "downloads/kleurplaat.pdf",
  },
};
const day = new Date(`${event.date}T12:00:00`);
export const dateLabel = new Intl.DateTimeFormat("nl-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(day);
export const dateParts = {
  day: new Intl.DateTimeFormat("nl-BE", { day: "numeric" }).format(day),
  weekday: new Intl.DateTimeFormat("nl-BE", { weekday: "long" }).format(day),
  month: new Intl.DateTimeFormat("nl-BE", { month: "long" }).format(day),
};
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
