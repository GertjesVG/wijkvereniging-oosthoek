// Evenementfasen (src/evenement/fase.ts): automatische afsluiting, wachten op de live GPS, handmatige keuze, seizoensopening.
import assert from "node:assert/strict";
import test from "node:test";
import {
  brusselsToMs,
  computePhase,
  fillYear,
  msToBrussels,
  nextYearDraft,
  overrideUntilFor,
  publicPhase,
} from "../src/evenement/fase.ts";

// Zoals migratie 0013 ze zet.
const y2026 = {
  year: 2026,
  title: "Sinterklaas in Oosthoek 2026",
  eventDate: "2026-11-28",
  seasonOpen: "2026-10-01T00:00",
  closing: "2026-11-28T20:00",
  prepFrom: "2026-09-01T00:00",
  status: "gepland",
};
const y2027 = {
  year: 2027,
  title: "Sinterklaas in Oosthoek 2027",
  eventDate: null,
  seasonOpen: "2027-10-01T00:00",
  closing: null,
  prepFrom: "2027-09-01T00:00",
  status: "concept",
};
const years = [y2026, y2027];
const auto = { auto: true, override: null, overrideAt: null, overrideUntil: null };
const at = (local) => brusselsToMs(local);

test("Belgische tijd: winter- en zomertijd", () => {
  assert.equal(new Date(at("2026-11-28T20:00")).toISOString(), "2026-11-28T19:00:00.000Z");
  assert.equal(new Date(at("2027-10-01T00:00")).toISOString(), "2027-09-30T22:00:00.000Z");
  assert.equal(msToBrussels(Date.parse("2026-11-28T19:00:00Z")), "2026-11-28T20:00");
  assert.equal(brusselsToMs("2026-02-30T10:00"), null);
  assert.equal(brusselsToMs("28-11-2026 20:00"), null);
});

test("vóór 20.00 uur de website, vanaf 20.00 uur de bedankpagina", () => {
  const before = computePhase(years, auto, at("2026-11-28T19:59"), false);
  assert.equal(before.show, "site");
  assert.equal(before.stage, "seizoen");
  assert.equal(before.next.at, "2026-11-28T19:00:00.000Z");
  assert.equal(before.next.show, "bedankt");
  const after = computePhase(years, auto, at("2026-11-28T20:00"), false);
  assert.equal(after.show, "bedankt");
  assert.equal(after.year, 2026);
  assert.equal(after.stage, "afgesloten");
  // 2027 is nog een concept: geen automatische opening gepland.
  assert.equal(after.next, null);
});

test("loopt de live GPS nog (of pauze), dan wacht de afsluiting tot de stoet gestopt is", () => {
  const busy = computePhase(years, auto, at("2026-11-28T20:30"), true);
  assert.equal(busy.show, "site");
  assert.equal(busy.closingPending, true);
  assert.equal(busy.stage, "afsluiting-wacht");
  assert.equal(busy.next.waitsForGps, true);
  assert.equal(computePhase(years, auto, at("2026-11-28T20:31"), false).show, "bedankt");
});

test("handmatige keuze gaat voor tot de volgende automatische wijziging", () => {
  // Bedankpagina om 18.00 uur: geldt tot 20.00 uur, daarna neemt de planning (ook bedankpagina) over.
  const until = overrideUntilFor(years, auto, at("2026-11-28T18:00"));
  assert.equal(until, "2026-11-28T19:00:00.000Z");
  const control = { auto: true, override: "bedankt", overrideAt: "x", overrideUntil: until };
  const manual = computePhase(years, control, at("2026-11-28T18:30"), true);
  assert.equal(manual.show, "bedankt");
  assert.equal(manual.source, "handmatig");
  assert.equal(computePhase(years, control, at("2026-11-28T20:00"), false).source, "automatisch");
  // Heropenen na de afsluiting: geen volgende wijziging gepland, dus tot de beheerder ze opheft.
  const reopen = { auto: true, override: "site", overrideAt: "x", overrideUntil: overrideUntilFor(years, auto, at("2026-11-28T21:00")) };
  assert.equal(reopen.overrideUntil, null);
  assert.equal(computePhase(years, reopen, at("2026-12-15T12:00"), false).show, "site");
});

test("gepubliceerd volgend jaar opent vanzelf op de seizoensopening", () => {
  const planned2027 = { ...y2027, eventDate: "2027-11-27", closing: "2027-11-27T20:00", status: "gepland" };
  const list = [y2026, planned2027];
  const sept = computePhase(list, auto, at("2027-09-15T12:00"), false);
  assert.equal(sept.show, "bedankt");
  assert.equal(sept.year, 2026);
  assert.equal(sept.stage, "voorbereiding");
  assert.equal(sept.next.at, "2027-09-30T22:00:00.000Z");
  const oct = computePhase(list, auto, at("2027-10-01T00:00"), false);
  assert.equal(oct.show, "site");
  assert.equal(oct.year, 2027);
});

test("bezoekers verversen uiterlijk vlak na de volgende wijziging", () => {
  const phase = computePhase(years, auto, at("2026-11-28T19:59"), false);
  assert.equal(publicPhase(phase, at("2026-11-28T19:59")).refreshSeconds, 60);
  const late = computePhase(years, auto, at("2026-11-28T19:59:30".slice(0, 16)), false);
  assert.ok(publicPhase(late, at("2026-11-28T19:59") + 50_000).refreshSeconds <= 60);
});

test("nieuw jaar voorbereiden kopieert alleen instellingen, een jaar later, als concept", () => {
  const draft = nextYearDraft(y2026);
  assert.deepEqual(draft, {
    year: 2027,
    title: "Sinterklaas in Oosthoek 2027",
    eventDate: null,
    seasonOpen: "2027-10-01T00:00",
    closing: null,
    prepFrom: "2027-09-01T00:00",
    status: "concept",
  });
});

test("{jaar} en {volgend jaar} in teksten", () => {
  assert.equal(fillYear("Tot in {volgend jaar}!", 2026), "Tot in 2027!");
  assert.equal(fillYear("Fotoalbum van {jaar}", 2026), "Fotoalbum van 2026");
});
