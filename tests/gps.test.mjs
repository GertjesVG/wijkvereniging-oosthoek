// Snelle controles van de live GPS zonder database of netwerk: OwnTracks-berichten, apparaatsleutel en wat bezoekers
// en het beheer te zien krijgen. De volledige keten met database staat in tests/integratie/gps.mjs (npm run test:gps).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  adminView,
  CONNECTED_WITHIN_SECONDS,
  deviceAuthorized,
  LOST_AFTER_SECONDS,
  parseLocation,
  publicView,
  REFRESH_LIVE_SECONDS,
  REFRESH_OFF_SECONDS,
  STALE_AFTER_SECONDS,
} from "../server/gps.ts";

const NOW = Date.parse("2026-11-28T10:45:00.000Z");
const iso = (offsetSeconds) => new Date(NOW + offsetSeconds * 1000).toISOString();
const tst = (offsetSeconds) => Math.floor((NOW + offsetSeconds * 1000) / 1000);
const empty = {
  public_since: null,
  public_until: null,
  lat: null,
  lon: null,
  accuracy: null,
  fix_at: null,
  seen_at: null,
  seen_fix_at: null,
  seen_accuracy: null,
  battery: null,
  charging: null,
};
const session = { ...empty, public_since: iso(-900), public_until: iso(3 * 3600) };
const withFix = (ageSeconds) => ({ ...session, lat: 51.31912, lon: 4.85401, accuracy: 6, fix_at: iso(-ageSeconds) });

test("OwnTracks-locatie wordt gelezen en afgerond; andere berichttypes worden genegeerd", () => {
  const fix = parseLocation(
    { _type: "location", lat: 51.319123456, lon: 4.854012345, acc: 7.6, tst: tst(-5), batt: 81, bs: 2, tid: "SK" },
    NOW,
  );
  assert.deepEqual(fix, { kind: "fix", lat: 51.31912, lon: 4.85401, accuracy: 8, fixAt: iso(-5), battery: 81, charging: true });
  for (const type of ["transition", "waypoint", "lwt", "status", "card", "encrypted"])
    assert.deepEqual(parseLocation({ _type: type }, NOW), { kind: "ignore" }, type);
  assert.equal(parseLocation({ _type: "location", lat: 51, lon: 4, tst: tst(0), bs: 1 }, NOW).charging, false);
});

test("onmogelijke posities of tijden worden geweigerd; een klok die net voorloopt telt als nu", () => {
  const ok = { _type: "location", lat: 51.3, lon: 4.85, tst: tst(0) };
  for (const bad of [
    null,
    {},
    { ...ok, lat: 91 },
    { ...ok, lon: -181 },
    { ...ok, lat: "51.3" },
    { ...ok, tst: undefined },
    { ...ok, tst: 1.5 },
    { ...ok, tst: tst(10 * 60) },
    { ...ok, acc: -1 },
  ])
    assert.deepEqual(parseLocation(bad, NOW), { kind: "invalid" }, JSON.stringify(bad));
  assert.equal(parseLocation({ ...ok, tst: tst(40) }, NOW).fixAt, iso(0));
});

test("alleen de juiste apparaatsleutel via Basic-authenticatie (zoals OwnTracks) wordt aanvaard", async () => {
  const token = randomBytes(24).toString("hex");
  const basic = (user, password) => ({ Authorization: `Basic ${btoa(`${user}:${password}`)}` });
  const req = (headers) => new Request("https://voorbeeld.test/api/gps/positie", { method: "POST", headers });
  assert.equal(await deviceAuthorized(req(basic("sinterklaas", token)), token), true);
  // Een dubbele punt in de sleutel zelf hoort bij de sleutel.
  assert.equal(await deviceAuthorized(req(basic("sint", `a:${token}`)), `a:${token}`), true);
  assert.equal(await deviceAuthorized(req(basic("sinterklaas", `${token}x`)), token), false);
  assert.equal(await deviceAuthorized(req(basic(token, "")), token), false);
  assert.equal(await deviceAuthorized(req({ Authorization: `Bearer ${token}` }), token), false);
  assert.equal(await deviceAuthorized(req({ Authorization: "Basic %%%geen-base64" }), token), false);
  assert.equal(await deviceAuthorized(req({}), token), false);
});

test("bezoekers zien niets zonder actieve sessie, ook niet als er nog een positie zou staan", () => {
  assert.deepEqual(publicView(null, NOW), { state: "off", refreshSeconds: REFRESH_OFF_SECONDS });
  assert.deepEqual(publicView(empty, NOW), { state: "off", refreshSeconds: REFRESH_OFF_SECONDS });
  // Automatische veiligheidsstop: vanaf het stopuur is alles weg.
  const expired = { ...withFix(5), public_until: iso(0) };
  assert.deepEqual(publicView(expired, NOW), { state: "off", refreshSeconds: REFRESH_OFF_SECONDS });
});

test("na Start: eerst wachten op een positie; posities van vóór de start tellen niet", () => {
  assert.deepEqual(publicView(session, NOW), { state: "waiting", refreshSeconds: REFRESH_LIVE_SECONDS, endsInSeconds: 3 * 3600 });
  const fromBefore = { ...withFix(0), fix_at: iso(-901) };
  assert.equal(publicView(fromBefore, NOW).state, "waiting");
});

test("actuele positie met leeftijd en grenzen; na de verliesgrens geen coördinaten meer", () => {
  const live = publicView(withFix(20), NOW);
  assert.deepEqual(live, {
    state: "live",
    refreshSeconds: REFRESH_LIVE_SECONDS,
    endsInSeconds: 3 * 3600,
    lat: 51.31912,
    lon: 4.85401,
    accuracy: 6,
    fixAt: iso(-20),
    fixAgeSeconds: 20,
    staleAfterSeconds: STALE_AFTER_SECONDS,
    lostAfterSeconds: LOST_AFTER_SECONDS,
  });
  assert.equal(publicView(withFix(LOST_AFTER_SECONDS), NOW).state, "live");
  const lost = publicView(withFix(LOST_AFTER_SECONDS + 1), NOW);
  assert.deepEqual(lost, {
    state: "lost",
    refreshSeconds: REFRESH_LIVE_SECONDS,
    endsInSeconds: 3 * 3600,
    fixAt: iso(-LOST_AFTER_SECONDS - 1),
    fixAgeSeconds: LOST_AFTER_SECONDS + 1,
  });
  assert.ok(STALE_AFTER_SECONDS < LOST_AFTER_SECONDS);
});

test("het publiek krijgt nooit telefoongegevens zoals batterij of laatste contact", () => {
  const row = { ...withFix(3), seen_at: iso(-3), seen_fix_at: iso(-3), seen_accuracy: 6, battery: 37, charging: 1 };
  const text = JSON.stringify(publicView(row, NOW));
  for (const word of ["battery", "charging", "seen", "37"]) assert.ok(!text.includes(word), word);
});

test("beheer: verbindingsstatus van de telefoon, sessie en wat het publiek nu ziet", () => {
  const none = adminView(empty, NOW, false);
  assert.deepEqual([none.configured, none.session, none.device, none.public.state], [false, null, null, "off"]);
  const seen = { ...withFix(10), seen_at: iso(-10), seen_fix_at: iso(-10), seen_accuracy: 6, battery: 54, charging: 0 };
  const view = adminView(seen, NOW, true);
  assert.deepEqual(view.session, { since: iso(-900), until: iso(3 * 3600) });
  assert.deepEqual(view.device, {
    seenAt: iso(-10),
    ageSeconds: 10,
    connected: true,
    fixAt: iso(-10),
    accuracy: 6,
    battery: 54,
    charging: false,
  });
  assert.equal(view.public.state, "live");
  const quiet = adminView({ ...empty, seen_at: iso(-CONNECTED_WITHIN_SECONDS - 1) }, NOW, true);
  assert.equal(quiet.device.connected, false);
  assert.deepEqual([quiet.device.fixAt, quiet.device.battery, quiet.device.charging], [null, null, null]);
});
