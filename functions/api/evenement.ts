// Openbaar: welke weergave de Sinterklaaswebsite nu toont (volledige website of bedankpagina). Zie server/evenement.ts.
import type { Env } from "../../server/basis.ts";
import { publicEvent } from "../../server/evenement.ts";

export const onRequestGet: PagesFunction<Env> = ({ env }) => publicEvent(env);
