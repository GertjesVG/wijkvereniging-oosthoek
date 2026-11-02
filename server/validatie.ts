// Controle van een inschrijving vóór er iets wordt opgeslagen. Puur: geen database of netwerk.
import type { RegistrationEvent } from "../src/inschrijving/evenementen.ts";
import { addressKey, childKey, normalize } from "./basis.ts";

export type CleanRegistration = {
  submissionId: string;
  parentName: string;
  email: string;
  street: string | null;
  houseNumber: string | null;
  addressKey: string | null;
  // Adres niet zeker in de wijk: wordt aanvaard, maar in het beheer nagekeken.
  addressReview: boolean;
  participants: { name: string; age: number | null; childKey: string }[];
  // Turnstile-antwoord uit het formulier.
  challenge: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const email = /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+\.[^\s@<>()[\]",;:\\]{2,}$/;
// Huisnummer met eventuele letter of bus: 12, 12A, 12 bus 3, 12/3.
const houseNumber = /^[0-9]{1,5}[a-z0-9 /.-]{0,12}$/i;
const controlChars = /[\u0000-\u001f\u007f]/;
// Voornamen komen in de bevestigingsmail: alleen letters, spatie, koppelteken en apostrof, dus geen links of code.
const childName = /^\p{L}[\p{L}\p{M} '’-]*$/u;
export const CHILD_NAME_HINT = "Vul een voornaam in: alleen letters, spatie, - of '.";
const challengeField = "turnstileToken";

const text = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

function checkText(
  fields: Record<string, string>,
  key: string,
  value: string,
  min: number,
  max: number,
  label: string,
) {
  if (value.length < min) fields[key] = `Vul ${label} in.`;
  else if (value.length > max || controlChars.test(value))
    fields[key] = `${label[0].toUpperCase()}${label.slice(1)} is te lang of bevat ongeldige tekens.`;
}

export function validateRegistration(
  config: RegistrationEvent,
  body: Record<string, unknown>,
): { ok: true; value: CleanRegistration } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const parent = (body.parent ?? {}) as Record<string, unknown>;
  const address = (body.address ?? {}) as Record<string, unknown>;
  const confirmations = (body.confirmations ?? {}) as Record<string, unknown>;

  const submissionId = text(body.submissionId);
  if (!uuid.test(submissionId)) fields.submissionId = "Ongeldige inzending. Laad de pagina opnieuw.";
  if (text(body.website)) fields.website = "Ongeldige inzending.";

  const parentName = text(parent.name);
  checkText(fields, "parent.name", parentName, 2, 100, "je naam");
  const mail = text(parent.email);
  if (!email.test(mail) || mail.length > 254)
    fields["parent.email"] = "Vul een geldig e-mailadres in.";

  let street: string | null = null;
  let number: string | null = null;
  let review = false;
  if (config.area) {
    street = text(address.street);
    number = text(address.houseNumber);
    checkText(fields, "address.street", street, 2, 100, "de straat");
    if (!houseNumber.test(number)) fields["address.houseNumber"] = "Vul een geldig huisnummer in.";
    if (!fields["address.street"] && !fields["address.houseNumber"]) {
      const place = checkArea(config.area, street, number);
      street = place.street;
      review = place.review !== null;
    }
    if (confirmations.area !== true)
      fields["confirmations.area"] = `Bevestig dat je in ${config.area.name} woont.`;
  }
  if (confirmations.privacy !== true)
    fields["confirmations.privacy"] = "Bevestig dat je de privacyverklaring gelezen hebt.";

  const address_ = street && number ? addressKey(street, number) : null;
  const list = Array.isArray(body.participants) ? body.participants : [];
  const { singular, maxPerRegistration, age } = config.participant;
  if (list.length < 1) fields.participants = `Voeg minstens één ${singular} toe.`;
  if (list.length > maxPerRegistration)
    fields.participants = `Hooguit ${maxPerRegistration} per inschrijving.`;
  const seen = new Set<string>();
  const participants = list.slice(0, maxPerRegistration).map((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const name = text(item.name);
    checkText(fields, `participants.${i}.name`, name, 1, 50, "de voornaam");
    if (name && !fields[`participants.${i}.name`] && !childName.test(name)) fields[`participants.${i}.name`] = CHILD_NAME_HINT;
    let value: number | null = null;
    if (age) {
      value = typeof item.age === "number" ? item.age : Number.NaN;
      if (!Number.isInteger(value) || value < age.min || value > age.max)
        fields[`participants.${i}.age`] = `Kies een leeftijd van ${age.min} tot en met ${age.max} jaar.`;
    }
    const key = childKey(name, address_, mail);
    if (name && seen.has(key)) fields[`participants.${i}.name`] = `Dit ${singular} staat al in de lijst.`;
    seen.add(key);
    return { name, age: value, childKey: key };
  });

  const proof = text(body[challengeField]);
  if (!proof || proof.length > 2048) fields[challengeField] = "Bevestig eerst dat je geen robot bent.";

  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    value: {
      submissionId: submissionId.toLowerCase(),
      parentName,
      email: mail,
      street,
      houseNumber: number,
      addressKey: address_,
      addressReview: review,
      participants,
      challenge: proof,
    },
  };
}

// Ligt het adres volgens de officiële stratenlijst in de wijk? Nooit een weigering: bij twijfel een reden om na te
// kijken. Een herkende straat krijgt de officiële schrijfwijze ("dr paul janssenstraat" → "Dr. Paul Janssenstraat").
export function checkArea(
  area: NonNullable<RegistrationEvent["area"]>,
  street: string,
  houseNumber: string,
): { street: string; review: string | null } {
  const key = (value: string) => normalize(value).replace(/ /g, "");
  const wanted = key(street);
  const full = area.streets.find((s) => key(s) === wanted);
  if (full) return { street: full, review: null };
  const partial = Object.keys(area.partialStreets).find((s) => key(s) === wanted);
  if (!partial) return { street, review: `Straat staat niet in de officiële stratenlijst van ${area.name}.` };
  const n = Number(/^\d+/.exec(houseNumber.trim())?.[0]);
  const ranges = area.partialStreets[partial].filter((r) => !r.parity || (n % 2 === 0) === (r.parity === "even"));
  if (ranges.some((r) => n >= r.from && n < r.to)) return { street: partial, review: null };
  // "10 tot 48": of het laatste nummer er nog bij hoort, zegt de gemeentelijke lijst niet uitdrukkelijk.
  if (ranges.some((r) => n === r.to))
    return { street: partial, review: `Huisnummer ${n} is het grensnummer van ${partial} in de gemeentelijke lijst.` };
  return { street: partial, review: `Dit huisnummer van ${partial} hoort niet bij ${area.name} volgens de gemeentelijke lijst.` };
}

// Voor correcties in het beheer: dezelfde regels als het formulier; null = ongeldig.
export function cleanText(value: unknown, min: number, max: number) {
  const result = text(value);
  return result.length >= min && result.length <= max && !controlChars.test(result) ? result : null;
}
export const cleanChildName = (value: unknown) => {
  const name = cleanText(value, 1, 50);
  return name && childName.test(name) ? name : null;
};
export const cleanEmail = (value: unknown) => {
  const mail = text(value);
  return email.test(mail) && mail.length <= 254 ? mail : null;
};
export const cleanHouseNumber = (value: unknown) => {
  const number = text(value);
  return houseNumber.test(number) ? number : null;
};
