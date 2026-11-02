// Bevestigingsmails per evenement, gedeeld door de server (mailwachtrij) en het beheer (voorbeeld).
// Elk sjabloon heeft precies twee velden: {{inschrijvingsnummer}} en {{kind_namen}}; de rest is vaste, goedgekeurde tekst.
// Nieuw evenement met online inschrijving = ook hier een sjabloon met dezelfde sleutel als in evenementen.ts.
// Sinterklaas 2026: oorspronkelijke feestelijke stijl uit Documentatie/Oosthoek_Sinterklaas_Email_Template.html.
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
<title>Bevestiging inschrijving — Sinterklaas Oosthoek 2026</title></head>
<body style="margin:0;padding:0;background-color:#fff8ed;color:#092443;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#fff8ed;opacity:0;">Piet heeft jullie inschrijving goed ontvangen. Hier zijn de bevestigingsgegevens.</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fff8ed;border-collapse:collapse;"><tr><td align="center" style="padding:12px 6px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;background:#fff0d4;border-collapse:collapse;">
<tr><td><img alt="Sinterklaas en zijn Pieten — Hoera, jouw inschrijving is goed aangekomen! Piet heeft jullie inschrijving in het grote boek geschreven; de Sint kijkt uit naar jullie tekeningen." src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-boven.png" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>
<tr><td style="background-color:#fff3dc;padding:0 7% 1px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border:1px dashed #b4243f;border-radius:12px;background-color:#fff9ed;border-collapse:separate;">
    <tr><td style="padding:9px 12px 5px;font-size:14px;font-weight:700;vertical-align:top;width:44%;">🎟️ Inschrijvingsnummer</td><td style="padding:9px 12px 5px;font-size:16px;font-weight:700;background-color:#ffebae;overflow-wrap:anywhere;">{{inschrijvingsnummer}}</td></tr>
    <tr><td style="padding:9px 12px 5px;font-size:14px;font-weight:700;vertical-align:top;">👧 Ingeschreven kind(eren)</td><td style="padding:9px 12px 5px;font-size:16px;font-weight:700;background-color:#ffebae;overflow-wrap:anywhere;">{{kind_namen}}</td></tr>
    <tr><td style="padding:9px 12px 12px;font-size:14px;font-weight:700;vertical-align:top;">📅 Datum</td><td style="padding:9px 12px 12px;font-size:15px;font-weight:700;background-color:#ffebae;">zaterdag 28 november 2026</td></tr>
  </table>
</td></tr>
<tr><td style="background-color:#fff3dc;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td><a href="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/" target="_blank" style="text-decoration:none;"><img alt="Meer informatie, kleurplaat en sponsors: https://wijkvereniging-oosthoek.pages.dev/sinterklaas/" src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-website.png" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></a></td></tr>
<tr><td><a href="mailto:vzwoosthoek@gmail.com" style="text-decoration:none;"><img alt="Vragen? Mail ons: vzwoosthoek@gmail.com" src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-contact.png" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></a></td></tr>
<tr><td><img alt="Vrolijke groetjes van Zwarte Piets Hulpjes, namens Sinterklaas en VZW Wijkvereniging Oosthoek." src="https://wijkvereniging-oosthoek.pages.dev/sinterklaas/email/email-onder.png" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>
</table>
</td></tr></table></body></html>
`;

const sinterklaasText = `Beste mama, papa of verzorger,

Hoera! Jullie inschrijving voor Sinterklaas in Oosthoek is goed aangekomen! Zwarte Piets Hulpjes hebben alles in het grote boek van Sinterklaas geschreven. De Sint kijkt uit naar jullie tekeningen!

Inschrijvingsnummer: {{inschrijvingsnummer}}
Ingeschreven kind(eren): {{kind_namen}}
Datum: zaterdag 28 november 2026

Meer informatie, de kleurplaat en onze sponsors:
https://wijkvereniging-oosthoek.pages.dev/sinterklaas/

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
