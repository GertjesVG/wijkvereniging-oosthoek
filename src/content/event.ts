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
  gps: {
    status: "unavailable" as const,
    message: "De livepositie is nog niet beschikbaar.",
  },
  programme: [
    {
      title: "Sinterklaas in de wijk",
      detail:
        "Met de huifkar en witte paarden door de straten van Wijkvereniging Oosthoek.",
      time: null as string | null,
    },
  ],
  route: {
    stops: [] as string[],
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=4.822%2C51.302%2C4.887%2C51.336&layer=mapnik" as
        string | null,
  },
  rules: [
    "Kleur je mooiste Sinterklaastekening en doe mee!",
    "EEN KLEURPLAAT PER KIND  -  MAXIMAAL EEN CADEAUTJE PER KIND",
    "Meerdere tekeningen van hetzelfde kind leveren geen extra cadeautje op.",
    "Zo blijft het eerlijk en leuk voor alle kinderen!",
  ],
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
