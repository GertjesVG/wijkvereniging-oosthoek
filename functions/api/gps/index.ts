// Openbaar: de livepositie van de huifkar, alleen tijdens een sessie die het beheer gestart heeft (zie server/gps.ts).
import type { Env } from "../../../server/basis.ts";
import { publicGps } from "../../../server/gps.ts";

export const onRequestGet: PagesFunction<Env> = ({ env }) => publicGps(env);
