import type { Env } from "../../server/basis.ts";
import { register } from "../../server/inschrijven.ts";

export const onRequestPost: PagesFunction<Env> = (context) => register(context.request, context.env, context);
