import { useEffect, useRef, useState } from "react";
import { Menu, X, Heart, ArrowUpRight } from "lucide-react";
import { pageLinks } from "./components";
import { event, dateLabel, asset } from "./content/event";
import Home from "./Home";
import { ContentPage } from "./Pages";

function readPage() {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0] || "home";
}
function Brand({ onNavigate }: { onNavigate: () => void }) {
  return (
    <a
      className="brand"
      href="#/home"
      aria-label="Oosthoek — naar de homepage"
      onClick={onNavigate}
    >
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 42">
          <path d="M7 31L9 21 20 5 31 21 33 31Z" fill="#ffdf8c" />
          <path d="M20 10V32M12 23H28" stroke="#a30026" strokeWidth="3" />
          <path d="M8 34H32" stroke="#ffdf8c" strokeWidth="3" />
        </svg>
      </span>
      <span>
        <strong>Oosthoek</strong>
        <small>SINTERKLAAS {event.year}</small>
      </span>
    </a>
  );
}
function Village() {
  return (
    <div className="village" aria-hidden="true">
      <img
        src={asset("assets/village.webp")}
        alt=""
        width="2172"
        height="724"
        loading="lazy"
      />
      <p>
        <Heart size={23} />
        {event.copy.footer}
      </p>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState(readPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const previousPage = useRef(page);
  useEffect(() => {
    const change = () => {
      // Online is er één sponsorpagina, op de wijkwebsite (zie ook index.html). Lokaal met `npm run dev` staat
      // Sinterklaas op de hoofdmap en blijft de pagina hier.
      if (window.location.pathname === "/sinterklaas/" && readPage() === "sponsors") {
        window.location.replace(`/${window.location.search}${window.location.hash}`);
        return;
      }
      setPage(readPage());
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const label =
      pageLinks.find(([key]) => key === page)?.[1] ?? "Pagina niet gevonden";
    document.title = `${label} · Sinterklaas Oosthoek ${event.year}`;
    if (previousPage.current !== page) {
      main.current?.focus({ preventScroll: true });
      previousPage.current = page;
    }
    // "#/pagina?anker" opent de pagina bij dat onderdeel (bv. het reglement vanuit het inschrijfformulier).
    const anchor = window.location.hash.split("?")[1];
    const target = anchor ? document.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView();
      // Webfonts die na de eerste opbouw laden, verschuiven de inhoud erboven (gemeten: tot ±36 px);
      // daarna het onderdeel nog één keer uitlijnen.
      document.fonts?.ready.then(() => target.scrollIntoView());
    } else window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 75rem)");
    const closeOnDesktop = () => {
      if (!mobile.matches) setMenuOpen(false);
    };
    mobile.addEventListener("change", closeOnDesktop);
    return () => mobile.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !document.getElementById("main-nav")?.contains(target) &&
        !document.getElementById("menu-toggle")?.contains(target)
      )
        setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);
  const known = pageLinks.some(([key]) => key === page);
  return (
    <>
      <a
        className="skip-link"
        href="#inhoud"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
          main.current?.scrollIntoView();
        }}
      >
        Ga naar de inhoud
      </a>
      <div className="back-bar">
        <div className="container">
          <a className="button button-outline" href="https://wijkvereniging-oosthoek.pages.dev/">
            <span aria-hidden="true">←</span> Terug naar Oosthoek
          </a>
        </div>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Brand onNavigate={() => setMenuOpen(false)} />
          <button
            className="menu-toggle"
            id="menu-toggle"
            aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav
            id="main-nav"
            className={menuOpen ? "navigation is-open" : "navigation"}
            aria-label="Hoofdnavigatie"
          >
            {pageLinks.map(([key, label]) => (
              <a
                key={key}
                href={`#/${key}`}
                aria-current={page === key ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="inhoud" ref={main} tabIndex={-1}>
        {page === "home" ? (
          <Home />
        ) : known ? (
          <div className="container inner-page">
            <ContentPage page={page} />
          </div>
        ) : (
          <div className="container not-found">
            <p className="eyebrow">VERDWAALD IN DE WIJK?</p>
            <h1>Deze pagina bestaat niet.</h1>
            <a className="button button-primary" href="#/home">
              Terug naar de homepage
            </a>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <Village />
        <div className="footer-bottom container">
          <div>
            <strong>{event.organisation.name}</strong>
            <span>{dateLabel}</span>
          </div>
          <div className="footer-links">
            <a href="#/contact">
              Contact <ArrowUpRight size={13} />
            </a>
            <a href="#/privacy">Privacy</a>
            <span>
              Met liefde voor de wijk <Heart size={12} />
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
