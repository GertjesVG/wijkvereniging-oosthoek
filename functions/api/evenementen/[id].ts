import type { Env } from "../../../server/basis.ts";
import { publicStatus } from "../../../server/inschrijven.ts";

export const onRequestGet: PagesFunction<Env> = ({ env, params }) => publicStatus(env, String(params.id));
