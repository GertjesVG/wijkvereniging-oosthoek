/**
 * Oosthoek — Automatische bevestigingsmails
 * Google Apps Script-project van vzwoosthoek@gmail.com. Deze code vervangt de inhoud van Code.gs in het BESTAANDE project;
 * maak geen tweede project. Het script haalt elke 5 minuten de wachtende bevestigingsmails op bij de website
 * (Cloudflare, server/mail.ts), verstuurt ze met MailApp vanaf het verenigingsaccount en meldt het resultaat terug.
 * Het script heeft geen webapp en neemt zelf geen verzoeken aan: het kan dus niet als open mailrelais misbruikt worden.
 *
 * Scripteigenschappen (Projectinstellingen → Scripteigenschappen), nooit in deze code:
 *   BACKEND_BASE_URL: https://wijkvereniging-oosthoek.pages.dev
 *   MAIL_API_TOKEN: hetzelfde geheim als MAIL_API_TOKEN in Cloudflare (minstens 32 tekens)
 * Eenmalig: functie installeerTrigger uitvoeren. Die verwijdert eerst alle bestaande triggers van dit project,
 * zodat er altijd precies één tijdtrigger is.
 *
 * Gratis Gmail-account: MailApp mag ongeveer 100 ontvangers per dag; wat niet past, blijft wachten tot de volgende dag.
 * (Bestandsextensie .js zoals bij clasp; in de Apps Script-editor heet het bestand Code.gs.)
 */

var MAX_PER_RUN = 20;
var SENT_PREFIX = 'verstuurd:';
var KEEP_DAYS = 60;

function verwerkWachtrij() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // vorige uitvoering loopt nog
  try {
    var props = PropertiesService.getScriptProperties();
    var base = String(props.getProperty('BACKEND_BASE_URL') || '').replace(/\/+$/, '');
    var sleutel = String(props.getProperty('MAIL_API_TOKEN') || '');
    if (!/^https:\/\/[^/]+$/.test(base) || sleutel.length < 32)
      throw new Error('Scripteigenschap BACKEND_BASE_URL of MAIL_API_TOKEN ontbreekt of is ongeldig.');
    var quota = MailApp.getRemainingDailyQuota();
    if (quota < 1) return;
    var reply = call_(base, sleutel, '/api/mail/wachtrij', { max: Math.min(MAX_PER_RUN, quota) });
    var jobs = reply && reply.jobs ? reply.jobs : [];
    var results = [];
    for (var i = 0; i < jobs.length; i++) results.push(send_(props, jobs[i]));
    if (results.length) call_(base, sleutel, '/api/mail/resultaat', { results: results });
    cleanUp_(props);
  } finally {
    lock.releaseLock();
  }
}

// Verstuurt één mail, tenzij dit bericht-id al verstuurd is (bv. als de terugmelding eerder mislukte).
function send_(props, job) {
  var result = { outboxId: job.outboxId, generation: job.generation, ok: true };
  var key = SENT_PREFIX + job.id;
  if (props.getProperty(key)) return result;
  try {
    if (!job.to || !job.subject || !job.html || !job.text) throw new Error('Onvolledige mail van de website.');
    MailApp.sendEmail({ to: job.to, subject: job.subject, body: job.text, htmlBody: job.html, name: job.fromName });
    props.setProperty(key, new Date().toISOString());
  } catch (e) {
    result.ok = false;
    result.error = String((e && e.message) || e).slice(0, 300);
  }
  return result;
}

function call_(base, sleutel, path, body) {
  var response = UrlFetchApp.fetch(base + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + sleutel },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
    followRedirects: false,
  });
  var code = response.getResponseCode();
  // Alleen de statuscode in de foutmelding: het antwoord kan persoonsgegevens bevatten.
  if (code !== 200) throw new Error('Website antwoordde HTTP ' + code + ' op ' + path + '.');
  return JSON.parse(response.getContentText());
}

// Vergeet verstuurde bericht-id's na KEEP_DAYS dagen (scripteigenschappen hebben een beperkte opslag).
function cleanUp_(props) {
  var all = props.getProperties();
  var limit = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
  for (var key in all) {
    if (key.indexOf(SENT_PREFIX) === 0 && Date.parse(all[key]) < limit) props.deleteProperty(key);
  }
}

function installeerTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) ScriptApp.deleteTrigger(triggers[i]);
  ScriptApp.newTrigger('verwerkWachtrij').timeBased().everyMinutes(5).create();
}
