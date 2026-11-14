// Bezoekersteller van de publieke website: meldt een paginaweergave (en bij aankomst van buitenaf een bezoek) aan
// /api/bezoek. Geen cookie, geen browseropslag, geen kenmerk van de bezoeker: alleen de naam van de pagina.
// Mislukt de melding, dan gebeurt er niets: de website zelf hangt er nooit van af.
import { paginaVan, type BezoekSite } from "./paginas";

// Komt deze bezoeker van buiten de website? Vernieuwen en teruggaan tellen niet als nieuw bezoek.
function aankomstVanBuiten() {
  const navigation = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigation && navigation.type !== "navigate") return false;
  if (!document.referrer) return true;
  try {
    return new URL(document.referrer).host !== location.host;
  } catch {
    return true;
  }
}

// Geautomatiseerde browsers (tests, controles) tellen niet mee.
const telt = () => !navigator.webdriver;

function meld(page: string, visit: boolean, view: boolean) {
  const body = JSON.stringify({ p: page, b: visit ? 1 : 0, w: view ? 1 : 0 });
  try {
    void fetch("/api/bezoek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    // Geen teller is geen probleem voor de bezoeker.
  }
}

// Telt de eerste pagina en daarna elke andere pagina waar de bezoeker binnen de website naartoe gaat.
export function startBezoekteller(site: BezoekSite) {
  if (!telt()) return;
  // Laadt de browser de pagina alvast op de achtergrond (prerender), dan telt ze pas als de bezoeker ze echt opent.
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener("prerenderingchange", () => startBezoekteller(site), { once: true });
    return;
  }
  let last: string | null = null;
  let first = true;
  const count = () => {
    const page = paginaVan(site, location.pathname, location.search, location.hash);
    if (!page || page === last) return;
    last = page;
    meld(page, first && aankomstVanBuiten(), true);
    first = false;
  };
  count();
  window.addEventListener("hashchange", count);
}

// Vlak voor een doorverwijzing naar de andere website (oude links): het bezoek tellen bij de pagina waar de bezoeker
// uitkomt. Daar lijkt de aankomst anders van binnen de website te komen. De paginaweergave telt de doelpagina zelf.
export function meldAankomstVoorDoorverwijzing(page: string | null) {
  if (page && telt() && aankomstVanBuiten()) meld(page, true, false);
}
