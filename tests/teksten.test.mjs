// Beheerbare teksten (src/content/teksten.ts, server/teksten.ts): de lijst, de terugvaltekst en de controle bij het opslaan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MAX_TEXT_LENGTH, optionalKey, textOverrides, textSections, texts } from "../src/content/teksten.ts";
import { activities, infoPages } from "../src/content/wijk.ts";
import { event } from "../src/content/event.ts";
import { cleanTextValue, MAX_TEXT_LENGTH as SERVER_MAX, validTextKey } from "../server/teksten.ts";

const keys = Object.keys(texts);

test("de gevraagde correctie onder Waar: huifkar en paarden, zonder 'witte'", () => {
  assert.equal(texts["sint.praktisch.waar-titel"].text, "Oosthoek in Beerse");
  assert.equal(
    texts["sint.praktisch.waar-tekst"].text,
    "De Sint rijdt met de huifkar en paarden door 24 straten van onze wijk.",
  );
  assert.equal(event.route.stops.length, 24);
});

test("nergens nog 'witte paarden': teksten, Vervoer en beeldbeschrijvingen zeggen 'paarden' (Gert, 14 november 2026)", () => {
  const walk = (dir) =>
    readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}${entry.name}/`) : [`${dir}${entry.name}`],
    );
  const files = [...walk("../src/"), "../index.html", "../wijk/index.html"].filter((f) => /\.(tsx?|json|html)$/.test(f));
  assert.ok(files.length > 30);
  for (const file of files)
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), "utf8"), /witte paard/i, file);
  assert.equal(event.route.transport, "Huifkar met paarden");
});

test("elke tekst: geldige sleutel, bestaand onderdeel, label en een oorspronkelijke tekst die het opslaan ongewijzigd overleeft", () => {
  const sections = new Set(textSections.map((s) => s.id));
  assert.ok(keys.length >= 60, `te weinig teksten: ${keys.length}`);
  for (const key of keys) {
    const field = texts[key];
    assert.ok(validTextKey(key), key);
    assert.ok(sections.has(field.section), `${key}: onbekend onderdeel ${field.section}`);
    assert.ok(field.label.trim().length > 0, `${key}: geen label`);
    assert.ok(field.text.length > 0 && field.text.length <= MAX_TEXT_LENGTH, `${key}: lengte`);
    assert.deepEqual(cleanTextValue(field.text), { ok: true, value: field.text }, `${key}: verandert bij opslaan`);
    if (!field.lines) assert.ok(!field.text.includes("\n"), `${key}: nieuwe regel in een tekst van één regel`);
  }
});

test("elk onderdeel heeft teksten en een link naar de eigen pagina", () => {
  assert.equal(new Set(textSections.map((s) => s.id)).size, textSections.length);
  for (const section of textSections) {
    assert.ok(keys.some((key) => texts[key].section === section.id), `${section.id}: leeg`);
    assert.match(section.href, /^\/(sinterklaas\/)?(\?voorvertoning=bedankt)?(#\/[a-z-]+)?$/, section.href);
  }
});

test("activiteiten en wijkinformatie: de oorspronkelijke teksten komen uit wijk.ts", () => {
  for (const activity of activities) {
    assert.equal(texts[optionalKey(`wijk.${activity.slug}.tegel`)].text, activity.teaser);
    assert.equal(texts[optionalKey(`wijk.${activity.slug}.tekst`)].text, activity.text);
  }
  for (const slug of ["sponsors", "lief-en-leed"])
    assert.equal(texts[optionalKey(`wijk.${slug}.tegel`)].text, infoPages.find((p) => p.slug === slug).teaser);
  // Het wijkhuis toont op zijn tegel het adres: dat blijft een vast gegeven, geen vrije tekst.
  assert.equal(optionalKey("wijk.wijkhuis.tegel"), null);
  assert.equal(optionalKey("bestaat.niet"), null);
});

test("de website gebruikt alleen bestaande teksten, en elke tekst wordt ergens getoond", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = `${dir}/${name}`;
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx$/.test(name) && !/\.stories\.tsx$/.test(name)) files.push(full);
    }
  };
  walk(fileURLToPath(new URL("../src", import.meta.url)));
  const source = files.map((f) => readFileSync(f, "utf8")).join("\n");
  // Elke letterlijke sleutel in de code, zoals t("sint.praktisch.titel") of in een lijstje.
  const used = [...source.matchAll(/"((?:wijk|sint)\.[a-z0-9.-]+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 40, `te weinig vaste teksten gevonden: ${used.length}`);
  for (const key of used) assert.ok(Object.hasOwn(texts, key), `onbekende tekst in de code: ${key}`);
  const dynamic = [...activities, ...infoPages].map((p) => `wijk.${p.slug}.`);
  for (const key of keys)
    assert.ok(used.includes(key) || dynamic.some((prefix) => key.startsWith(prefix)), `nergens getoond: ${key}`);
});

test("antwoord van /api/teksten: alleen bekende teksten, gewone tekst, binnen de grens", () => {
  assert.deepEqual(textOverrides(null), {});
  assert.deepEqual(textOverrides("x"), {});
  assert.deepEqual(textOverrides({ teksten: [] }), {});
  assert.deepEqual(
    textOverrides({
      teksten: {
        "sint.praktisch.waar-tekst": "Nieuwe zin.",
        "onbekend.sleutel": "x",
        "sint.home.intro": 5,
        "sint.home.boventitel": "   ",
        "sint.praktisch.titel": "x".repeat(MAX_TEXT_LENGTH + 1),
        "sint.praktisch.intro": "Regel een\nregel twee",
        "sint.home.volg-titel": "Waar is de\nhuifkar?",
        toString: "x",
      },
    }),
    {
      "sint.praktisch.waar-tekst": "Nieuwe zin.",
      // Een tekst van één regel krijgt geen regeleinde op de website.
      "sint.praktisch.intro": "Regel een regel twee",
      "sint.home.volg-titel": "Waar is de\nhuifkar?",
    },
  );
});

test("opslaan: tekst wordt opgeschoond, nooit als code behandeld, en lege of te lange tekst wordt geweigerd", () => {
  assert.equal(SERVER_MAX, MAX_TEXT_LENGTH);
  assert.deepEqual(cleanTextValue(null), { ok: true, value: null });
  assert.deepEqual(cleanTextValue("  Hallo\r\nwereld\r  "), { ok: true, value: "Hallo\nwereld" });
  assert.deepEqual(cleanTextValue("A\u0000B‮C\u0007\tD﻿"), { ok: true, value: "ABC D" });
  assert.deepEqual(cleanTextValue("één"), { ok: true, value: "één" });
  const markup = '<script>alert(1)</script> <img src=x onerror="alert(2)"> & "quotes"';
  assert.deepEqual(cleanTextValue(markup), { ok: true, value: markup });
  assert.deepEqual(cleanTextValue("x".repeat(MAX_TEXT_LENGTH)), { ok: true, value: "x".repeat(MAX_TEXT_LENGTH) });
  for (const bad of ["", "   \n ", "x".repeat(MAX_TEXT_LENGTH + 1), 42, {}, [], undefined, true]) {
    const result = cleanTextValue(bad);
    assert.equal(result.ok, false, JSON.stringify(bad)?.slice(0, 30));
    assert.ok(result.message.length > 0);
  }
});

test("sleutels: alleen kleine letters, cijfers, punt en streepje", () => {
  for (const good of ["sint.praktisch.waar-tekst", "wijk.lief-en-leed.tegel", "a1"]) assert.ok(validTextKey(good), good);
  for (const bad of ["", "A", "../etc", "a..b", "a.", "-a", "a b", "a/b", "a".repeat(81), 5, null, "__proto__"])
    assert.equal(validTextKey(bad), false, String(bad));
});
