// Bevestigingsmails per evenement, gedeeld door de server (mailwachtrij) en het beheer (voorbeeld).
// Elk sjabloon heeft precies twee velden: {{inschrijvingsnummer}} en {{kind_namen}}; de rest is vaste, goedgekeurde tekst.
// Nieuw evenement met online inschrijving = ook hier een sjabloon met dezelfde sleutel als in evenementen.ts.
// Sinterklaas 2026: oorspronkelijke feestelijke stijl uit Documentatie/Oosthoek_Sinterklaas_Email_Template.html; op
// 3 november 2026 de gegevens op het perkament gezet (leesbaar in Gmail donker) en de beelden als lichtere JPG.
// De beelden staan in public/email/ en zijn pas bereikbaar na publicatie op Cloudflare; de gegevens zelf zijn HTML-tekst.

export type ConfirmationTemplate = {
  subject: string;
  // Naam van de afzender zoals de ontvanger die ziet; het adres is altijd het verenigingsaccount.
  fromName: string;
  html: string;
  text: string;
  // Antwoorden van ouders in Gmail van vzwoosthoek@gmail.com: een filter op deze onderwerpwoorden zet ze onder dit
  // label. Filter en label maak je in Gmail zelf (Instellingen → Filters); de woorden moeten in subject staan.
  gmail?: { label: string; subjectFilter: string };
};

export type ConfirmationValues = { reference: string; childNames: string[] };

const sinterklaasHtml = `<!DOCTYPE html>
<html lang="nl-BE">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>Bevestiging inschrijving — Sinterklaas Oosthoek 2026</title></head>
<body style="margin:0;padding:0;background-color:#fff8ed;color:#092443;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#fff8ed;opacity:0;">Piet heeft jullie inschrijving goed ontvangen. Hier zijn de bevestigingsgegevens.</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fff8ed;border-collapse:collapse;"><tr><td align="center" style="padding:12px 6px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;background:#fff0d4;border-collapse:collapse;">
<tr><td><img alt="Sinterklaas en zijn Pieten — Hoera, jouw inschrijving is goed aangekomen! Piet heeft jullie inschrijving in het grote boek geschreven; de Sint kijkt uit naar jullie tekeningen." src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-boven.jpg" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>
<!-- Gegevens op het perkament. Het perkament is een achtergrondbeeld: de Gmail-app in donkere modus kleurt achtergrondkleuren
     donker en donkere tekst licht, maar laat beelden ongemoeid. Daarom staan de gegevens in wit op een rood lint (donker blijft
     donker, wit blijft wit) en is het perkament eromheen een beeld, geen kleur. -->
<tr><td background="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-perkament.jpg" bgcolor="#faf4e9" style="background-color:#faf4e9;background-image:url('https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-perkament.jpg');background-repeat:repeat;padding:4px 8% 16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#a3172b" style="width:100%;background-color:#a3172b;border:2px dashed #f6c76b;border-radius:14px;border-collapse:separate;">
    <tr><td style="padding:12px 18px 0;font-size:13px;line-height:18px;font-weight:700;color:#ffd98a;">🎟️ Inschrijvingsnummer</td></tr>
    <tr><td style="padding:2px 18px 10px;font-size:21px;line-height:27px;font-weight:700;color:#ffffff;letter-spacing:1px;">{{inschrijvingsnummer}}</td></tr>
    <tr><td style="padding:0 18px;font-size:13px;line-height:18px;font-weight:700;color:#ffd98a;">👧 Ingeschreven kind(eren)</td></tr>
    <tr><td style="padding:2px 18px 10px;font-size:21px;line-height:27px;font-weight:700;color:#ffffff;overflow-wrap:anywhere;">{{kind_namen}}</td></tr>
    <tr><td style="padding:0 18px;font-size:13px;line-height:18px;font-weight:700;color:#ffd98a;">📅 Datum</td></tr>
    <tr><td style="padding:2px 18px 14px;font-size:18px;line-height:24px;font-weight:700;color:#ffffff;">zaterdag 28 november 2026</td></tr>
  </table>
</td></tr>
<tr><td><a href="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/#/home" target="_blank" style="text-decoration:none;"><img alt="Meer informatie, kleurplaat en sponsors: https://wijkvereniging-oosthoek.pages.dev/sinterklaas/#/home" src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-website.png" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></a></td></tr>
<tr><td><a href="mailto:vzwoosthoek@gmail.com" style="text-decoration:none;"><img alt="Vragen? Mail ons: vzwoosthoek@gmail.com" src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-contact.png" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></a></td></tr>
<tr><td><img alt="Vrolijke groetjes van Zwarte Piets Hulpjes, namens Sinterklaas en VZW Wijkvereniging Oosthoek." src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-onder.jpg" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>
</table>
</td></tr></table></body></html>
`;

const sinterklaasText = `Beste mama, papa of verzorger,

Hoera! Jullie inschrijving voor Sinterklaas in Oosthoek is goed aangekomen! Zwarte Piets Hulpjes hebben alles in het grote boek van Sinterklaas geschreven. De Sint kijkt uit naar jullie tekeningen!

Inschrijvingsnummer: {{inschrijvingsnummer}}
Ingeschreven kind(eren): {{kind_namen}}
Datum: zaterdag 28 november 2026

Meer informatie, de kleurplaat en onze sponsors:
https://wijkvereniging-oosthoek.pages.dev/sinterklaas/#/home

Vragen? vzwoosthoek@gmail.com

Vrolijke groetjes,
Zwarte Piets Hulpjes
namens Sinterklaas en VZW Wijkvereniging Oosthoek
`;

export const confirmationTemplates: Record<string, ConfirmationTemplate> = {
  "sinterklaas-2026": {
    // Het nummer staat ook in het onderwerp: zo staat niet elke bevestiging in één gesprek in "Verzonden".
    subject: "Bevestiging inschrijving — Sinterklaas Oosthoek 2026 — {{inschrijvingsnummer}}",
    fromName: "VZW Wijkvereniging Oosthoek",
    html: sinterklaasHtml,
    text: sinterklaasText,
    // Bestaand label van de vereniging; filter subject:("Sinterklaas Oosthoek 2026") ingesteld op 2 november 2026.
    gmail: { label: "2026 - Sinterklaas", subjectFilter: "Sinterklaas Oosthoek 2026" },
  },
};

// Link voor het beheer naar de antwoorden van ouders (Gmail-label van het verenigingsaccount); null = geen label.
export function repliesInGmail(eventId: string) {
  const label = confirmationTemplates[eventId]?.gmail?.label;
  return label
    ? `https://mail.google.com/mail/u/?authuser=vzwoosthoek@gmail.com#label/${encodeURIComponent(label).replace(/%20/g, "+")}`
    : null;
}

const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => htmlEntities[c]);

// "Noor", "Noor en Milan", "Noor, Milan en Lotte".
export function joinNames(names: string[]) {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}

function fill(template: string, reference: string, names: string) {
  return template.replace(/\{\{(inschrijvingsnummer|kind_namen)\}\}/g, (_, field: string) =>
    field === "inschrijvingsnummer" ? reference : names,
  );
}

// null = geen sjabloon voor dit evenement (dan wordt er niets verstuurd).
export function renderConfirmation(eventId: string, values: ConfirmationValues) {
  const template = confirmationTemplates[eventId];
  if (!template) return null;
  const names = joinNames(values.childNames);
  return {
    subject: fill(template.subject, values.reference, names),
    fromName: template.fromName,
    html: fill(template.html, escapeHtml(values.reference), escapeHtml(names)),
    text: fill(template.text, values.reference, names),
  };
}
