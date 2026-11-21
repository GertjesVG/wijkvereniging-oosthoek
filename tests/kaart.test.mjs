// "Kinderen op kaart" en de Excel-export zonder database of netwerk: adressen normaliseren en groeperen, de beoordeling
// van het antwoord van de geolocatiedienst, wat er naar die dienst gaat, en het .xlsx-bestand zelf.
// De keten met database staat in tests/integratie/kaart.mjs (npm run test:kaart).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sinterklaasRegistration } from "../src/inschrijving/evenementen.ts";
import { event } from "../src/content/event.ts";
import { groupAddresses, insideArea, judge, lookup, mapKey, parseHouseNumber } from "../server/locaties.ts";
import { column, xlsx } from "../server/xlsx.ts";
import { belgianTime } from "../server/beheer.ts";
import { readXlsx } from "./xlsx-lezen.mjs";

const area = sinterklaasRegistration.area;

test("huisnummers: letter hoort bij het nummer, bus apart, in elke gangbare schrijfwijze", () => {
  const cases = {
    "12": ["12", null],
    "012": ["12", null],
    "12A": ["12A", null],
    "12 a": ["12A", null],
    "12 bus 3": ["12", "3"],
    "12 Bus 3": ["12", "3"],
    "12/3": ["12", "3"],
    "12-3": ["12", "3"],
    "12 b3": ["12", "3"],
    "12 bte 3": ["12", "3"],
    "12b 3": ["12B", "3"],
    "12A bus 101": ["12A", "101"],
    "19B": ["19B", null],
  };
  for (const [raw, [number, box]] of Object.entries(cases)) assert.deepEqual(parseHouseNumber(raw), { number, box }, raw);
});

test("hetzelfde adres in andere schrijfwijze is één adres; een ander nummer of andere bus niet", () => {
  assert.equal(mapKey("Dr. Paul Janssenstraat", "4"), mapKey("dr paul janssenstraat ", "04"));
  assert.equal(mapKey("Asterstraat", "12 bus 3"), mapKey("ASTERSTRAAT", "12/3"));
  assert.equal(mapKey("Asterstraat", "12a"), mapKey("Asterstraat", "12 A"));
  assert.notEqual(mapKey("Asterstraat", "12"), mapKey("Asterstraat", "12A"));
  assert.notEqual(mapKey("Asterstraat", "12/3"), mapKey("Asterstraat", "12/4"));
  assert.notEqual(mapKey("Asterstraat", "12"), mapKey("Asterstraat", "123"));
});

const row = (registration_id, reference, street, house_number, name, extra = {}) => ({
  registration_id,
  reference,
  street,
  house_number,
  address_review: 0,
  name,
  age: 5,
  ...extra,
});

test("groeperen: één adres per woning met alle kinderen, nummering volgens de rondrit en dan huisnummer", () => {
  const groups = groupAddresses([
    row(1, "SINT26-0001", "Opstal", "5", "Noor"),
    row(1, "SINT26-0001", "Opstal", "5", "Milan"),
    row(2, "SINT26-0002", "Gorenstraat", "10", "Lien"),
    row(3, "SINT26-0003", "opstal", "05", "Jules", { address_review: 1 }),
    row(4, "SINT26-0004", "Gorenstraat", "9", "Fien"),
    row(5, "SINT26-0005", "Kongostraat", "3", "Rik"),
    row(6, "SINT26-0006", "Gorenstraat", "10 bus 2", "Mats"),
    row(7, "SINT26-0007", null, null, "Zonder"),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.nr, g.street, g.number, g.box, g.children.length]),
    [
      [1, "Gorenstraat", "9", null, 1],
      [2, "Gorenstraat", "10", null, 1],
      [3, "Gorenstraat", "10", "2", 1],
      [4, "Opstal", "5", null, 3],
      [5, "Kongostraat", "3", null, 1],
    ],
  );
  const opstal = groups[3];
  assert.deepEqual(opstal.children.map((c) => c.name), ["Noor", "Milan", "Jules"]);
  assert.deepEqual(opstal.registrations.map((r) => r.reference), ["SINT26-0001", "SINT26-0003"]);
  assert.equal(opstal.addressReview, true);
  // Elk kind precies één keer, op één adres; het kind zonder adres staat op geen enkel adres.
  assert.equal(groups.reduce((n, g) => n + g.children.length, 0), 7);
  // Gorenstraat is straat 1 en Opstal straat 22 van de rondrit; een straat buiten de route komt achteraan.
  assert.equal(event.route.stops[0], "Gorenstraat");
});

const hit = (over = {}) => ({
  Municipality: "Beerse",
  Zipcode: "2340",
  Thoroughfarename: "Opstal",
  Housenumber: "5",
  FormattedAddress: "Opstal 5, 2340 Beerse",
  Location: { Lat_WGS84: 51.3278983, Lon_WGS84: 4.8681662 },
  LocationType: "basisregisters_huisnummer_afgeleidVanObject",
  ...over,
});
const place = { street: "Opstal", number: "5", box: null };

test("dienst: alleen een exacte treffer telt; nooit een buur, straat of verzonnen plaats", () => {
  const ok = judge(place, area, [hit()]);
  assert.deepEqual([ok.status, ok.lat, ok.lon, ok.matched], ["gevonden", 51.3278983, 4.8681662, "Opstal 5, 2340 Beerse"]);
  // Onbekend nummer: de dienst geeft buren (Asterstraat 1 → 10, 11, 12). Die tellen niet.
  const neighbours = judge({ street: "Asterstraat", number: "1", box: null }, area, [
    hit({ Thoroughfarename: "Asterstraat", Housenumber: "10" }),
    hit({ Thoroughfarename: "Asterstraat", Housenumber: "11" }),
  ]);
  assert.deepEqual([neighbours.status, neighbours.lat, neighbours.lon], ["niet_gevonden", null, null]);
  // Alleen de straat, of een andere gemeente of postcode: niet gevonden.
  assert.equal(judge(place, area, [hit({ Housenumber: null, LocationType: "basisregisters_straat" })]).status, "niet_gevonden");
  assert.equal(judge(place, area, [hit({ Municipality: "Turnhout", Zipcode: "2300" })]).status, "niet_gevonden");
  assert.equal(judge(place, area, [hit({ Thoroughfarename: "Korenveldstraat" })]).status, "niet_gevonden");
  assert.equal(judge(place, area, []).status, "niet_gevonden");
  assert.equal(judge(place, area, undefined).status, "niet_gevonden");
  assert.equal(judge(place, area, [hit({ Location: { Lat_WGS84: "x" } })]).status, "niet_gevonden");
  // Letter en schrijfwijze: 12a = 12A, maar 12 ≠ 12A.
  assert.equal(judge({ street: "Opstal", number: "12A", box: null }, area, [hit({ Housenumber: "12a" })]).status, "gevonden");
  assert.equal(judge({ street: "Opstal", number: "12", box: null }, area, [hit({ Housenumber: "12A" })]).status, "niet_gevonden");
  assert.equal(judge({ street: "Dr. Paul Janssenstraat", number: "5", box: null }, area, [hit({ Thoroughfarename: "Dr. Paul Janssenstraat" })]).status, "gevonden");
});

test("dienst: geschatte positie of buiten de wijk = onzeker, met reden", () => {
  const interpolated = judge(place, area, [hit({ LocationType: "basisregisters_huisnummer_geïnterpoleerd" })]);
  assert.equal(interpolated.status, "onzeker");
  assert.match(interpolated.detail, /geïnterpoleerd/);
  const far = judge(place, area, [hit({ Location: { Lat_WGS84: 51.2, Lon_WGS84: 4.8 } })]);
  assert.equal(far.status, "onzeker");
  assert.match(far.detail, /buiten Wijk Oosthoek/);
  assert.equal(judge(place, area, [hit({ LocationType: "basisregisters_huisnummer_aangeduidDoorBeheerder" })]).status, "gevonden");
  // De randstraten van de wijk vallen binnen het vak met marge (gemeten 21-11-2026: Krikskensstraat tot 4,8902 O).
  assert.ok(insideArea(area, 51.3293, 4.8902));
  assert.ok(!insideArea(area, 51.30, 4.87));
});

test("dienst: alleen straat, huisnummer, bus, postcode en gemeente gaan mee; een storing bewaart niets", async () => {
  const asked = [];
  const fake = async (url, init) => {
    asked.push({ url, init });
    return new Response(JSON.stringify({ LocationResult: [hit({ Thoroughfarename: "Asterstraat", Housenumber: "12" })] }), { status: 200 });
  };
  const found = await lookup({ street: "Asterstraat", number: "12", box: "3" }, area, "https://dienst.example/Location", fake);
  assert.equal(found.status, "gevonden");
  assert.equal(asked.length, 1);
  const url = new URL(asked[0].url);
  assert.deepEqual([...url.searchParams.keys()].sort(), ["c", "q"]);
  assert.equal(url.searchParams.get("q"), "Asterstraat 12 bus 3, 2340 Beerse");
  assert.equal(asked[0].init.method, undefined);
  assert.ok(!("body" in asked[0].init));
  assert.equal(await lookup(place, area, "https://dienst.example/Location", async () => new Response("kapot", { status: 500 })), null);
  assert.equal(await lookup(place, area, "https://dienst.example/Location", async () => { throw new Error("netwerk"); }), null);
  assert.equal(await lookup(place, area, "https://dienst.example/Location", async () => new Response("<html>", { status: 200 })), null);
});

test("xlsx: geldig zipbestand, twee bladen, koppen, filters, vaste kopregel en kolombreedtes", () => {
  const file = xlsx([
    { name: "Kinderen", header: ["Nr", "Naam", "Notitie"], rows: [[1, "Noor", "=HYPERLINK(\"x\")"], [2, "Émile & <Jan>", null]] },
    { name: "Adressen: test/1", header: ["Straat"], rows: [["Opstal"]] },
  ]);
  assert.deepEqual([...file.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const sheets = readXlsx(file);
  assert.deepEqual(Object.keys(sheets), ["Kinderen", "Adressen  test 1"]);
  assert.deepEqual(sheets.Kinderen.rows, [["Nr", "Naam", "Notitie"], ["1", "Noor", '=HYPERLINK("x")'], ["2", "Émile & <Jan>", ""]]);
  const xml = sheets.Kinderen.xml;
  assert.match(xml, /<autoFilter ref="A1:C3"\/>/);
  assert.match(xml, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  assert.equal([...xml.matchAll(/<col min="\d+" max="\d+" width="\d+" customWidth="1"\/>/g)].length, 3);
  // Een formule die een ouder typte, blijft tekst: geen <f> en als inlineStr bewaard.
  assert.ok(!xml.includes("<f>"));
  assert.match(xml, /t="inlineStr"><is><t xml:space="preserve">=HYPERLINK\(&quot;x&quot;\)<\/t>/);
  // Getallen als getal, kopregel vet (stijl 1).
  assert.match(xml, /<c r="A2"><v>1<\/v><\/c>/);
  assert.match(xml, /<c r="A1" s="1" t="inlineStr">/);
});

test("xlsx: stuurtekens verdwijnen, kolomletters na Z, Belgische tijd", () => {
  const sheets = readXlsx(xlsx([{ name: "A", header: ["x"], rows: [["a\u0000b\u0007c\td"]] }]));
  assert.equal(sheets.A.rows[1][0], "abc\td");
  assert.deepEqual([0, 25, 26, 27, 701, 702].map(column), ["A", "Z", "AA", "AB", "ZZ", "AAA"]);
  assert.equal(belgianTime("2026-11-03T13:05:00.000Z"), "2026-11-03 14:05");
  assert.equal(belgianTime("2026-07-01T22:30:00.000Z"), "2026-07-02 00:30");
  assert.equal(belgianTime(null), "");
});
