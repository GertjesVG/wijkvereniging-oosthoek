// Openbaar: de website meldt hier een paginaweergave of bezoek voor de bezoekersteller (zie server/bezoek.ts).
// Alleen aantallen per dag en per pagina; het antwoord is altijd leeg (204).
import type { Env } from "../../server/basis.ts";
import { recordVisit } from "../../server/bezoek.ts";

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => recordVisit(request, env);
