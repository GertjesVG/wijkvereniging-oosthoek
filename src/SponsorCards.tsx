// De goedgekeurde sponsorkaarten met zoekfunctie, gedeeld door de Sinterklaaswebsite en de wijkwebsite.
// De gegevens komen uit één bron: content/sponsors.json en content/sponsor-logos.ts.
import { useState } from "react";
import { ArrowUpRight, Heart, Mail, MapPin, Phone, Search, X } from "lucide-react";
import { event } from "./content/event";
import sponsors from "./content/sponsors.json";
import { sponsorLogos } from "./content/sponsor-logos";
import { sponsorMapUrl } from "./content/sponsor-kaart";
import "./sponsors.css";

type Sponsor = (typeof sponsors)[number];
// Publieke bestanden staan online onder /sinterklaas/; elke website geeft zijn eigen weg ernaartoe mee.
type AssetUrl = (path: string) => string;

export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// Logozone: het officiële logo (zie content/sponsor-logos.ts), anders de naam als
// typografische plaat; geen verzonnen beeldmerk. Korte namen krijgen grotere letters.
function SponsorLogo({ sponsor, assetUrl }: { sponsor: Sponsor; assetUrl: AssetUrl }) {
  const logo = sponsorLogos[sponsor.name];
  if (!logo) {
    const size =
      sponsor.name.length <= 4
        ? "short"
        : sponsor.name.length <= 13
          ? "medium"
          : "long";
    return (
      <div
        className={`sponsor-logo sponsor-nameplate is-${size}`}
        aria-hidden="true"
      >
        <span>{sponsor.name}</span>
      </div>
    );
  }
  return (
    <div
      className={`sponsor-logo${logo.backdrop ? " has-backdrop" : ""}`}
      style={logo.backdrop ? { backgroundColor: logo.backdrop } : undefined}
    >
      <img
        src={assetUrl(`assets/${logo.file}`)}
        alt={`Logo van ${sponsor.name}`}
        width={logo.width}
        height={logo.height}
        style={logo.maxWidth ? { maxWidth: logo.maxWidth } : undefined}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

// Eén actie per kaart: de bevestigde eigen website, anders e-mail, anders bellen.
function SponsorAction({ sponsor }: { sponsor: Sponsor }) {
  if (sponsor.website)
    return (
      <a
        className="sponsor-action sponsor-website"
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>
          Website bezoeken
          <span className="visually-hidden">
            : {sponsor.name}, opent in een nieuw venster
          </span>
        </span>
        <ArrowUpRight size={20} strokeWidth={1.7} aria-hidden="true" />
      </a>
    );
  if (sponsor.email)
    return (
      <a className="sponsor-action" href={`mailto:${sponsor.email}`}>
        <span>
          Stuur een e-mail
          <span className="visually-hidden"> naar {sponsor.name}</span>
        </span>
        <Mail size={19} strokeWidth={1.7} aria-hidden="true" />
      </a>
    );
  if (sponsor.phones.length)
    return (
      <a className="sponsor-action" href={phoneHref(sponsor.phones[0])}>
        <span>
          Bellen<span className="visually-hidden"> met {sponsor.name}</span>
        </span>
        <Phone size={19} strokeWidth={1.7} aria-hidden="true" />
      </a>
    );
  return null;
}

function SponsorCard({ sponsor, assetUrl }: { sponsor: Sponsor; assetUrl: AssetUrl }) {
  return (
    <article className="sponsor-card">
      <SponsorLogo sponsor={sponsor} assetUrl={assetUrl} />
      <p className="sponsor-eyebrow">
        Onze lokale sponsor<span aria-hidden="true">✦</span>
      </p>
      <div className="sponsor-title">
        <h2>{sponsor.name}</h2>
        <p>{sponsor.category}</p>
      </div>
      <ul className="sponsor-details">
        <li>
          <a
            className="sponsor-address"
            href={sponsorMapUrl(sponsor)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>
              <span className="visually-hidden">Adres: </span>
              {sponsor.address}
              <span className="visually-hidden">
                , toon in Google Maps, opent in een nieuw venster
              </span>
            </span>
          </a>
        </li>
        {sponsor.phones.length > 0 && (
          <li>
            <Phone size={19} strokeWidth={1.6} aria-hidden="true" />
            <span className="sponsor-phones">
              <span className="visually-hidden">Telefoon: </span>
              {sponsor.phones.map((phone) => (
                <a href={phoneHref(phone)} key={phone}>
                  {phone}
                </a>
              ))}
            </span>
          </li>
        )}
        {sponsor.email && (
          <li>
            <Mail size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>
              <span className="visually-hidden">E-mail: </span>
              {/* op een smal scherm liefst afbreken na de @ */}
              <a href={`mailto:${sponsor.email}`}>
                {sponsor.email.split("@")[0]}@<wbr />
                {sponsor.email.split("@")[1]}
              </a>
            </span>
          </li>
        )}
      </ul>
      <SponsorAction sponsor={sponsor} />
      <p className="sponsor-thanks">
        <Heart size={21} strokeWidth={1.6} aria-hidden="true" />
        Bedankt voor jullie steun aan onze wijk
      </p>
    </article>
  );
}

export function SponsorList({ assetUrl }: { assetUrl: AssetUrl }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("nl-BE");
  const filtered = sponsors.filter((sponsor) =>
    `${sponsor.name} ${sponsor.category} ${sponsor.address}`
      .toLocaleLowerCase("nl-BE")
      .includes(normalized),
  );
  return (
    <>
      <div className="sponsor-toolbar">
        <div>
          <Heart size={19} aria-hidden="true" />
          <span>Grote dank aan onze lokale partners</span>
        </div>
        <div className="sponsor-search">
          <Search size={18} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="sponsor-search">
            Zoek een sponsor, activiteit of gemeente
          </label>
          <input
            id="sponsor-search"
            type="search"
            placeholder="Zoek een sponsor, activiteit of gemeente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Wis de zoekopdracht"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>
      <p className="search-count" role="status">
        {filtered.length} van {sponsors.length} sponsors
        {query.trim() ? ` voor “${query.trim()}”` : ""}
      </p>
      <div className="sponsor-grid">
        {filtered.map((sponsor) => (
          <SponsorCard sponsor={sponsor} assetUrl={assetUrl} key={sponsor.name} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-search">
          <Search size={35} aria-hidden="true" />
          <h2>Geen sponsor gevonden</h2>
          <p>Probeer een andere naam, activiteit of gemeente.</p>
          {/* "button" is de knopstijl van de Sinterklaaswebsite, "btn" die van de wijkwebsite */}
          <button
            className="button button-outline btn outline"
            onClick={() => setQuery("")}
          >
            Toon alle sponsors
          </button>
        </div>
      )}
      <div className="sponsor-source-note">
        <p>
          Klopt er iets niet?{" "}
          <a href={`mailto:${event.organisation.email}`}>
            Geef een wijziging door.
          </a>
        </p>
      </div>
    </>
  );
}
