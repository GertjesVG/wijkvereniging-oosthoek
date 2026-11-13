// Openbaar: de teksten die de beheerder aanpaste (zie server/teksten.ts). Zonder antwoord toont de website de oorspronkelijke.
import type { Env } from "../../server/basis.ts";
import { publicTexts } from "../../server/teksten.ts";

export const onRequestGet: PagesFunction<Env> = ({ env }) => publicTexts(env);
