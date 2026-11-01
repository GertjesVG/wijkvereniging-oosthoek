// Het Apps Script meldt hier per opgehaalde mail of verzenden lukte (zie server/mail.ts).
import { bearerMatches, fail, json, readJson, type Env } from "../../../server/basis.ts";
import { MAX_PER_CLAIM, reportMail, type MailResult } from "../../../server/mail.ts";

function toResult(value: unknown): MailResult | null {
  const v = (value ?? {}) as Record<string, unknown>;
  if (!Number.isInteger(v.outboxId) || !Number.isInteger(v.generation) || typeof v.ok !== "boolean") return null;
  return {
    outboxId: v.outboxId as number,
    generation: v.generation as number,
    ok: v.ok,
    error: typeof v.error === "string" ? v.error.slice(0, 300) : undefined,
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.MAIL_API_TOKEN || env.MAIL_API_TOKEN.length < 32)
    return fail(503, "NIET_GECONFIGUREERD", "Mailkoppeling niet ingesteld.");
  if (!(await bearerMatches(request, env.MAIL_API_TOKEN))) return fail(403, "VERBODEN", "Verzoek geweigerd.");
  const body = await readJson(request);
  const list = Array.isArray(body?.results) ? body.results : null;
  const results = list?.map(toResult);
  if (!results || results.length > MAX_PER_CLAIM || results.some((r) => r === null))
    return fail(400, "VALIDATIE", "Ongeldige resultaten.");
  return json({ updated: await reportMail(env, results as MailResult[]) });
};
