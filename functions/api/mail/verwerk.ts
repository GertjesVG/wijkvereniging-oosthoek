// Tijdtrigger van het mailscript (mail/apps-script.gs) roept dit elke 10 minuten aan: wachtende en mislukte mails
// opnieuw proberen. Pages Functions hebben zelf geen geplande taken.
import { fail, json, readJson, sameText, sha256Hex, type Env } from "../../../server/basis.ts";
import { processOutbox } from "../../../server/mail.ts";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.MAIL_SECRET || !env.MAIL_WEBHOOK_URL)
    return fail(503, "NIET_GECONFIGUREERD", "Mailkoppeling niet ingesteld.");
  const body = await readJson(request);
  const given = typeof body?.sleutel === "string" ? body.sleutel : "";
  if (!given || !sameText(await sha256Hex(given), await sha256Hex(env.MAIL_SECRET)))
    return fail(403, "VERBODEN", "Verzoek geweigerd.");
  return json(await processOutbox(env, 10));
};
