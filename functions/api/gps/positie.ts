// De GPS-telefoon (OwnTracks, HTTP-modus) stuurt hier zijn posities naar; alleen met het geheim GPS_DEVICE_TOKEN.
import type { Env } from "../../../server/basis.ts";
import { receivePosition } from "../../../server/gps.ts";

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => receivePosition(request, env);
