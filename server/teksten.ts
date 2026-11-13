// Teksten van de website die de beheerder zelf aanpast (/beheer/, "Teksten van de website"; lijst in src/content/teksten.ts).
// Tabel site_texts (migratie 0009): één rij per aangepaste tekst. value NULL = de oorspronkelijke tekst uit de code;
// previous = de tekst vóór de laatste wijziging (NULL = de oorspronkelijke), voor "Vorige versie terugzetten".
// De website toont een tekst altijd als gewone tekst (React), nooit als HTML: opmaak of code in een tekst doet niets.
// Ontbreekt de tabel of de database, dan toont de website gewoon de oorspronkelijke teksten.
import type { AdminText } from "../src/content/teksten.ts";
import { errorMessage, fail, json, nowIso, readJson, type Env } from "./basis.ts";

// Gelijk aan MAX_TEXT_LENGTH in src/content/teksten.ts (tests/teksten.test.mjs bewaakt dat).
export const MAX_TEXT_LENGTH = 2000;
const KEY = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export const validTextKey = (key: unknown): key is string => typeof key === "string" && key.length <= 80 && KEY.test(key);

// Stuurtekens (behalve de nieuwe regel) en tekens die de leesrichting omkeren, horen niet in een websitetekst.
const INVISIBLE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F‪-‮⁦-⁩﻿]/g;

// null = terug naar de oorspronkelijke tekst. Een tab wordt een spatie, Windows-regeleinden worden gewone.
export function cleanTextValue(value: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: "Vul een tekst in." };
  const text = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(INVISIBLE, "")
    .trim();
  if (!text)
    return { ok: false, message: "Vul een tekst in. Wil je de oorspronkelijke tekst terug? Gebruik dan die knop." };
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, message: `Deze tekst is te lang (hooguit ${MAX_TEXT_LENGTH} tekens).` };
  return { ok: true, value: text };
}

type Row = { key: string; value: string | null; previous: string | null; updated_at: string };
const SELECT = "SELECT key, value, previous, updated_at FROM site_texts";
const toAdmin = (row: Row): AdminText => ({ key: row.key, value: row.value, previous: row.previous, updatedAt: row.updated_at });

const notReady = () =>
  fail(503, "NIET_GECONFIGUREERD", "De tekstopslag is nog niet ingesteld. De website toont intussen de oorspronkelijke teksten.");
const missingTable = (error: unknown) => errorMessage(error).includes("no such table");

// Fout door een ontbrekende tabel (migratie 0009 nog niet uitgevoerd): een duidelijke melding in plaats van een algemene fout.
async function guarded(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    if (missingTable(error)) return notReady();
    throw error;
  }
}

// Openbaar, voor beide websites: alleen de aangepaste teksten. De website kent zelf de oorspronkelijke.
export async function publicTexts(env: Env) {
  const db = env.DB;
  if (!db) return notReady();
  return guarded(async () => {
    const { results } = await db.prepare("SELECT key, value FROM site_texts WHERE value IS NOT NULL").all<{ key: string; value: string }>();
    return json({ teksten: Object.fromEntries(results.map((row) => [row.key, row.value])) });
  });
}

async function rowOf(db: D1Database, key: string) {
  return db.prepare(`${SELECT} WHERE key = ?1`).bind(key).first<Row>();
}

// Opslaan. Dezelfde tekst nog eens opslaan verandert niets, zodat de vorige versie bewaard blijft.
async function saveText(request: Request, db: D1Database, key: string) {
  const body = (await readJson(request)) ?? {};
  if (!Object.hasOwn(body, "value")) return fail(400, "VALIDATIE", "Vul een tekst in.");
  const cleaned = cleanTextValue(body.value);
  if (!cleaned.ok) return fail(400, "VALIDATIE", cleaned.message);
  await db
    .prepare(
      `INSERT INTO site_texts (key, value, previous, updated_at) VALUES (?1, ?2, NULL, ?3)
       ON CONFLICT (key) DO UPDATE SET previous = site_texts.value, value = excluded.value, updated_at = excluded.updated_at
       WHERE site_texts.value IS NOT excluded.value`,
    )
    .bind(key, cleaned.value, nowIso())
    .run();
  const row = await rowOf(db, key);
  return row ? json(toAdmin(row)) : fail(404, "NIET_GEVONDEN", "Onbekende tekst.");
}

// De vorige versie en de huidige wisselen van plaats: nog eens drukken zet de wijziging dus terug.
async function restorePrevious(db: D1Database, key: string) {
  const result = await db
    .prepare(
      "UPDATE site_texts SET value = previous, previous = value, updated_at = ?2 WHERE key = ?1 AND value IS NOT previous",
    )
    .bind(key, nowIso())
    .run();
  if (!result.meta.changes) return fail(409, "VERBODEN", "Er is geen vorige versie om terug te zetten.");
  const row = await rowOf(db, key);
  return row ? json(toAdmin(row)) : fail(404, "NIET_GEVONDEN", "Onbekende tekst.");
}

// /api/beheer/teksten[/<sleutel>[/vorige]], alleen na het inloggen (server/beheer.ts controleert sessie en herkomst).
export function handleTextsAdmin(request: Request, db: D1Database, path: string[]) {
  const [, key, action, ...rest] = path;
  const method = request.method;
  return guarded(async () => {
    if (rest.length) return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
    if (!key && method === "GET") {
      const { results } = await db.prepare(`${SELECT} ORDER BY key`).all<Row>();
      return json(results.map(toAdmin));
    }
    if (!validTextKey(key)) return fail(404, "NIET_GEVONDEN", "Onbekende tekst.");
    if (!action && method === "PATCH") return saveText(request, db, key);
    if (action === "vorige" && method === "POST") return restorePrevious(db, key);
    return fail(404, "NIET_GEVONDEN", "Onbekende beheeropdracht.");
  });
}
