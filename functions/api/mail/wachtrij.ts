// Het Apps Script haalt hier de bevestigingsmails op die nu verstuurd moeten worden (zie server/mail.ts).
// Alleen met het gedeelde geheim MAIL_API_TOKEN; zonder geheim of database blijft alles in de wachtrij.
import { bearerMatches, fail, json, readJson, type Env } from "../../../server/basis.ts";
import { claimMail, MAX_PER_CLAIM } from "../../../server/mail.ts";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.MAIL_API_TOKEN || env.MAIL_API_TOKEN.length < 32)
    return fail(503, "NIET_GECONFIGUREERD", "Mailkoppeling niet ingesteld.");
  if (!(await bearerMatches(request, env.MAIL_API_TOKEN))) return fail(403, "VERBODEN", "Verzoek geweigerd.");
  const body = await readJson(request);
  const max = typeof body?.max === "number" && Number.isInteger(body.max) ? body.max : 10;
  if (max < 1 || max > MAX_PER_CLAIM) return fail(400, "VALIDATIE", `max moet tussen 1 en ${MAX_PER_CLAIM} liggen.`);
  return json({ jobs: await claimMail(env, max) });
};
