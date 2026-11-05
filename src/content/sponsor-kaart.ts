// Kaartlink per sponsor, op één plaats opgebouwd: Google Maps zoekt op naam en volledig adres uit sponsors.json.
// Geen Google-script, geen sleutel en geen locatieverzoek: de kaart opent pas na een klik op het adres, in een nieuw tabblad.
// Controle per bestemming: Bewijs\oosthoek-afwerking-2026-11-04-sponsoradressen.txt.
type MapSponsor = { name: string; address: string };

// Bedrijven waarvoor Google op de naam een ander adres, een ander bedrijf of een keuzelijst toont (gemeten op 4 november
// 2026). Daar zoekt de link alleen op het gepubliceerde adres, zodat de bezoeker niet op een verkeerde plaats uitkomt.
export const addressOnly = new Set<string>([
  "ZEEPVENTJE",
  "Strijkatelier Aerts Britt",
  "Gipsmachinecenter G.M.C.",
  "Taxi Adrienne EDLIH",
  "GNP",
  "Bouwwerken Rombouts",
  "VerZeker BV",
  "Wienerberger / Nova",
  "Tegeldiscount",
  "Polyesterwerken Stevens J.",
  "SIS",
  "Selouco",
  "Stef Nuyens",
]);

export function sponsorMapUrl(sponsor: MapSponsor) {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set(
    "query",
    addressOnly.has(sponsor.name)
      ? `${sponsor.address}, België`
      : `${sponsor.name}, ${sponsor.address}, België`,
  );
  return url.href;
}
