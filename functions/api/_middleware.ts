// Onverwachte fouten nooit ruw naar de browser: alleen een algemene melding, details in de Cloudflare-logs.
import { errorMessage, fail } from "../../server/basis.ts";

export const onRequest: PagesFunction = async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    console.error("api", errorMessage(error));
    return fail(500, "ONBEKEND", "Er ging iets mis. Probeer het later opnieuw.");
  }
};
