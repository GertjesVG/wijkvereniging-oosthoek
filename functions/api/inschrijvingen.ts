import type { Env } from "../../server/basis.ts";
import { register } from "../../server/inschrijven.ts";

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => register(request, env);
