import type { Env } from "../../../server/basis.ts";
import { handleAdmin } from "../../../server/beheer.ts";

export const onRequest: PagesFunction<Env> = (context) => {
  const pad = context.params.pad;
  return handleAdmin(context.request, context.env, context, Array.isArray(pad) ? pad : pad ? [pad] : []);
};
