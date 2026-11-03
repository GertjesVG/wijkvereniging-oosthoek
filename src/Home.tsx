import { Gift, MapPin, Download, ArrowRight, Radio } from "lucide-react";
import { event, asset } from "./content/event";
import sponsors from "./content/sponsors.json";
import { ButtonLink, DateTag, FeatureCard } from "./components";
import { useLiveGps } from "./gps/useLiveGps";

export default function Home() {
  // Eén keer kijken of de live GPS loopt; verversen gebeurt alleen op de routepagina.
  const { view } = useLiveGps({ poll: false });
  return (
    <>
      <Hero />
      <div className="container home-content">
        <section className="feature-grid" aria-label="Ontdek de Sinterklaasdag">
          <FeatureCard
            href="#/cadeauactie"
            title="Cadeauactie"
            description="Kleur je tekening en ontdek hoe je een gratis cadeautje van de Sint krijgt."
            kind="gift"
          />
          <FeatureCard
            href="#/route"
            title="Route & live tracking"
            description="Ontdek de rondgang en de status van de livekaart op de dag zelf."
            kind="route"
          />
          <FeatureCard
            href="#/praktisch"
            title="Praktische info"
            description="Alles wat je moet weten voor een onvergetelijke dag in de wijk."
            kind="info"
          />
        </section>
        <section className="home-panels" aria-label="Volg de Sint en kleur mee">
          <article className="tracking-panel">
            <div className="tracking-copy">
              <p className="eyebrow">
                VOLG DE SINT <span aria-hidden="true">✦</span>
              </p>
              <h2>
                Waar is de
                <br />
                huifkar nu?
              </h2>
              <p>Straks volg je de Sint op zijn tocht door de wijk.</p>
              <ButtonLink href="#/route" variant="gold">
                Bekijk de route
              </ButtonLink>
            </div>
            <div className="map-illustration" aria-hidden="true">
              <svg viewBox="0 0 480 250">
                <g stroke="#7595a2" opacity=".12" fill="none" strokeWidth="8">
                  <path d="m-30 70 500 120M10-20l150 300M130-40l230 300M340-40 70 340M-20 150 500-90M-20 230 500-95" />
                </g>
                <g
                  fill="none"
                  stroke="#efbc55"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                >
                  <path d="M95 210C-30 70 222 55 195 120S360 250 390 104" />
                </g>
                <g fill="#ffc95e">
                  <path
                    d="M85 70a13 13 0 1 1 26 0c0 13-13 27-13 27S85 83 85 70m7 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M259 154a13 13 0 1 1 26 0c0 13-13 27-13 27s-13-14-13-27m7 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M377 87a13 13 0 1 1 26 0c0 13-13 27-13 27s-13-14-13-27m7 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0"
                    fillRule="evenodd"
                  />
                  <path d="m365 25 3 10 10 3-10 3-3 10-3-10-10-3 10-3ZM160 186l3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
                </g>
                <g fill="none" stroke="#edbd60" strokeWidth="2">
                  <path d="M160 160v-36q5-25 50-18v51zM171 124h30v22h-30zM182 106v-13h10v12M156 153h64M213 149l35 4M244 140l8-12 13 3 5 17 12 8M247 155l-2 15m15-17 8 17" />
                  <circle cx="169" cy="163" r="12" />
                  <circle cx="208" cy="163" r="12" />
                </g>
              </svg>
              <div className="live-tag">
                <Radio size={21} />
                <span>
                  Livekaart
                  <br />
                  <strong>{view.kind === "off" ? "nog niet actief" : "nu actief"}</strong>
                </span>
              </div>
            </div>
          </article>
          <article className="colouring-panel">
            <div>
              <p className="eyebrow">CREATIEF VOOR SINTERKLAAS</p>
              <h2>
                Download de
                <br />
                kleurplaat
              </h2>
              <p>Pak je mooiste kleuren en maak een tekening voor de Sint!</p>
              <ButtonLink
                href={asset(event.downloads.colouring)}
                variant="outline"
                download="Oosthoek-kleurplaat.pdf"
                icon={<Download size={17} aria-hidden="true" />}
              >
                Download de kleurplaat
              </ButtonLink>
            </div>
            <img
              src={asset("assets/kleurplaat.webp")}
              alt="De officiële Oosthoek-kleurplaat met Sinterklaas, de huifkar en paarden"
              width="715"
              height="1010"
              loading="lazy"
            />
            <a className="colouring-details" href="#/kleurwedstrijd">
              Zo doe je mee <ArrowRight size={14} />
            </a>
          </article>
        </section>
        <section
          className="sponsor-strip"
          aria-label="Met dank aan onze 33 sponsors"
        >
          <p>
            MET DANK AAN
            <br />
            ONZE SPONSORS
          </p>
          <div className="sponsor-names">
            {[sponsors[0], sponsors[1], sponsors[7], sponsors[14]].map((s) => (
              <span key={s.name}>{s.name}</span>
            ))}
          </div>
          <a className="sponsors-link" href="#/sponsors">
            Alle {sponsors.length} sponsors <ArrowRight size={16} />
          </a>
        </section>
      </div>
    </>
  );
}

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-stage">
        <div className="hero-illustration">
          <img
            src={asset("assets/hero.webp")}
            alt="Sinterklaas zwaait vanuit een feestelijk verlichte huifkar, getrokken door twee witte paarden."
            fetchPriority="high"
            width="1817"
            height="866"
          />
        </div>
        <span className="ribbon ribbon-left" aria-hidden="true" />
        <span className="hero-spark spark-one" aria-hidden="true">
          ✦
        </span>
        <span className="hero-spark spark-two" aria-hidden="true">
          ✧
        </span>
        <div className="container hero-content">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true">✦</span>
              {event.copy.eyebrow}
            </p>
            <h1 id="hero-title">
              <span>Sinterklaas</span>
              <br />
              komt naar
              <br />
              Oosthoek!
            </h1>
            <p className="hero-description">{event.copy.intro}</p>
            <div className="hero-actions">
              <ButtonLink
                href="#/cadeauactie"
                icon={<Gift size={21} aria-hidden="true" />}
              >
                Ik doe mee met de cadeauactie
              </ButtonLink>
              <ButtonLink
                href="#/route"
                variant="outline"
                icon={<MapPin size={20} aria-hidden="true" />}
              >
                Bekijk de route
              </ButtonLink>
            </div>
          </div>
        </div>
        <DateTag />
      </div>
    </section>
  );
}
