// Logo's van de sponsors, gekoppeld op de exacte naam uit sponsors.json (die blijft de enige bron
// van de bedrijfsgegevens). Bron: het sponsorpakket van 3 november 2026 (Documentatie\Sponsors),
// gecontroleerd op naam, adres en contactgegevens. De bestanden in public/assets/ zijn webversies:
// alleen de lege rand weggesneden en verkleind, kleuren en vorm ongewijzigd.
// Een sponsor zonder regel hier krijgt de naam als typografische plaat in de logozone.
// Logo toevoegen: bestand als public/assets/sponsor-<naam>.webp, en hier één regel met de
// afmetingen van het bestand. `backdrop` = de egale achtergrondkleur van het logo zelf, zodat
// de hele logozone die kleur krijgt (nodig bij een wit of licht logo, of een logo op een eigen vlak).
export type SponsorLogo = {
  file: string;
  width: number;
  height: number;
  backdrop?: string;
};

export const sponsorLogos: Record<string, SponsorLogo> = {
  ZEEPVENTJE: { file: "sponsor-zeepventje.webp", width: 840, height: 323 },
  "Delaplace Tuinen": { file: "sponsor-delaplace-tuinen.webp", width: 404, height: 176 },
  "Strijkatelier Aerts Britt": {
    file: "sponsor-strijkatelier-aerts-britt.webp",
    width: 409,
    height: 340,
    backdrop: "#fefaf4",
  },
  "Gipsmachinecenter G.M.C.": {
    file: "sponsor-gmc.webp",
    width: 783,
    height: 340,
    backdrop: "#939292",
  },
  "Herenkapsalon Dooley’s": {
    file: "sponsor-dooleys.webp",
    width: 840,
    height: 238,
    backdrop: "#433c42",
  },
  "Drankhandel Den Brouwer": {
    file: "sponsor-den-brouwer.webp",
    width: 840,
    height: 314,
    backdrop: "#9bb02b",
  },
  "Haarstudio Imago": {
    file: "sponsor-haarstudio-imago.webp",
    width: 840,
    height: 168,
    backdrop: "#303030",
  },
  "Een Hart Voor Zorg": { file: "sponsor-een-hart-voor-zorg.webp", width: 325, height: 340 },
  Aerts: { file: "sponsor-grafzerken-aerts.webp", width: 840, height: 192 },
  "Slagerij Havermans Dennis": {
    file: "sponsor-havermans.webp",
    width: 413,
    height: 192,
    backdrop: "#ffffff",
  },
  "Van Bladel R.": { file: "sponsor-van-bladel.webp", width: 250, height: 250 },
  "Stanny Roefs & Zonen": {
    file: "sponsor-stanny-roefs.webp",
    width: 840,
    height: 292,
    backdrop: "#233b50",
  },
  "VerZeker BV": {
    file: "sponsor-verzeker.webp",
    width: 316,
    height: 110,
    backdrop: "#173657",
  },
  "Walbers Zonweringen": { file: "sponsor-walbers.webp", width: 196, height: 36 },
  "Brasserie De Sjokola": {
    file: "sponsor-de-sjokola.webp",
    width: 276,
    height: 127,
    backdrop: "#ffffff",
  },
  "Wienerberger / Nova": { file: "sponsor-wienerberger.svg", width: 150, height: 28 },
  "Joy's Decor & Retouches": {
    file: "sponsor-joys-decor.webp",
    width: 496,
    height: 340,
    backdrop: "#fefaf3",
  },
  "Fietsen Eric": {
    file: "sponsor-fietsen-eric.webp",
    width: 749,
    height: 340,
    backdrop: "#242826",
  },
  "Jacko Sound": { file: "sponsor-jacko-sound.webp", width: 457, height: 42 },
  "Traiteur Delaplace - De Open Keuken": {
    file: "sponsor-de-open-keuken.webp",
    width: 417,
    height: 69,
  },
  "Color Nuance - Wim Stessens": { file: "sponsor-color-nuance.webp", width: 840, height: 213 },
  "David Neirynck": { file: "sponsor-neirynck.webp", width: 840, height: 245 },
  "Polyesterwerken Stevens J.": {
    file: "sponsor-stevens-j.webp",
    width: 840,
    height: 286,
    backdrop: "#ffffff",
  },
  "Stef Nuyens": {
    file: "sponsor-stef-nuyens.webp",
    width: 840,
    height: 340,
    backdrop: "#010001",
  },
};
