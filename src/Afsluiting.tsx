// De bedankpagina na het evenement en het fotoalbum. Vervangt de volledige Sinterklaaswebsite zolang de evenementfase
// "bedankt" is (src/evenement/fase.ts). Alle teksten en cijfers zijn aanpasbaar in het beheer ("Teksten van de
// website", onderdeel Bedankpagina); {jaar} en {volgend jaar} vullen zich vanzelf in.
import { ArrowLeft, ArrowRight, Camera, Heart, Sparkles, Star } from "lucide-react";
import { asset } from "./content/event";
import type { TextKey } from "./content/teksten";
import { fillYear } from "./evenement/fase";
import { Lines, useTexts } from "./teksten";
import "./afsluiting.css";

const OOSTHOEK = "https://wijkvereniging-oosthoek.pages.dev/";

function useYearTexts(year: number) {
  const t = useTexts();
  return (key: TextKey) => fillYear(t(key), year);
}

export function Afsluiting({ year }: { year: number }) {
  const t = useYearTexts(year);
  const figures = [
    { value: t("sint.bedankt.cijfer1-waarde"), label: t("sint.bedankt.cijfer1-tekst") },
    { value: t("sint.bedankt.cijfer2-waarde"), label: t("sint.bedankt.cijfer2-tekst") },
    { value: t("sint.bedankt.cijfer3-waarde"), label: t("sint.bedankt.cijfer3-tekst") },
    { value: t("sint.bedankt.cijfer4-waarde"), label: t("sint.bedankt.cijfer4-tekst") },
  ];
  return (
    <div className="farewell">
      <section className="farewell-hero" aria-labelledby="farewell-title">
        <div className="farewell-stage">
          <img
            className="farewell-image"
            src={asset("assets/afscheid.webp")}
            srcSet={`${asset("assets/afscheid-768.webp")} 768w, ${asset("assets/afscheid.webp")} 1536w`}
            sizes="(max-width: 56rem) 100vw, 1536px"
            alt="Sinterklaas en zijn Pieten zwaaien vanaf de feestelijk versierde huifkar met paarden de kinderen van Oosthoek uit, in het warme avondlicht."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <span className="farewell-veil" aria-hidden="true" />
          <span className="hero-spark spark-one" aria-hidden="true">
            ✦
          </span>
          <div className="container farewell-content">
            <div className="farewell-copy">
              <p className="eyebrow farewell-eyebrow">
                <span aria-hidden="true">✦</span>
                {t("sint.bedankt.boventitel")}
              </p>
              <h1 id="farewell-title">
                <Lines text={t("sint.bedankt.titel")} />
              </h1>
              <p className="farewell-lead">{t("sint.bedankt.alinea1")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="farewell-figures" aria-label="Wat we samen beleefden">
          {figures.map((f, i) => (
            <div className="farewell-figure" key={i}>
              <Star className="farewell-figure-star" size={18} aria-hidden="true" />
              <strong>{f.value}</strong>
              <span>{f.label}</span>
            </div>
          ))}
        </section>

        <article className="farewell-letter" aria-label="Bedankt van Sinterklaas en het bestuur">
          <span className="farewell-letter-ornament" aria-hidden="true">
            ✦ ✦ ✦
          </span>
          <p>{t("sint.bedankt.alinea2")}</p>
          <p>{t("sint.bedankt.alinea3")}</p>
          <p>{t("sint.bedankt.alinea4")}</p>
          <p className="farewell-hug">
            <Heart size={18} aria-hidden="true" /> {t("sint.bedankt.knuffel")}
          </p>
          <p className="farewell-promise-intro">{t("sint.bedankt.afspraak")}</p>
          <h2 className="farewell-promise">{t("sint.bedankt.afspraak-titel")}</h2>
          <p className="farewell-thanks">{t("sint.bedankt.dank")}</p>
          <p className="farewell-signature">{t("sint.bedankt.ondertekening")}</p>
        </article>

        <section className="farewell-photos" aria-labelledby="farewell-photos-title">
          <div className="farewell-photos-art" aria-hidden="true">
            <img src={asset("assets/afscheid-768.webp")} alt="" width="768" height="512" loading="lazy" />
            <span className="farewell-photos-badge">
              <Camera size={26} />
            </span>
          </div>
          <div className="farewell-photos-copy">
            <p className="eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              FOTOALBUM {year}
            </p>
            <h2 id="farewell-photos-title">{t("sint.bedankt.fotos-titel")}</h2>
            <p>{t("sint.bedankt.fotos-tekst")}</p>
            <a className="button button-gold" href="#/fotos">
              <Camera size={19} aria-hidden="true" />
              {t("sint.bedankt.fotos-knop")}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="farewell-closing" aria-labelledby="farewell-closing-title">
          <img src={asset("assets/oosthoek-logo-2026.webp")} alt="Logo van VZW Wijkvereniging Oosthoek" width="160" height="160" loading="lazy" />
          <div>
            <p className="eyebrow">VZW WIJKVERENIGING OOSTHOEK</p>
            <h2 id="farewell-closing-title">{t("sint.bedankt.slot-titel")}</h2>
            <p>{t("sint.bedankt.slot-tekst")}</p>
          </div>
          <a className="button button-primary" href={OOSTHOEK}>
            Terug naar Oosthoek
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
}

// Het fotoalbum per evenementjaar. Zolang er geen gepubliceerde foto's zijn: de melding dat ze eraan komen.
export function Fotoalbum({ year }: { year: number }) {
  const t = useYearTexts(year);
  return (
    <div className="container album">
      <header className="album-heading">
        <p className="eyebrow">
          <Sparkles size={15} aria-hidden="true" />
          {t("sint.fotos.boventitel")}
        </p>
        <h1>{t("sint.fotos.titel")}</h1>
        <p className="page-lead">{t("sint.fotos.intro")}</p>
      </header>
      <section className="album-empty" aria-live="polite">
        <span className="album-empty-icon" aria-hidden="true">
          <Camera size={34} strokeWidth={1.5} />
        </span>
        <h2>{t("sint.fotos.leeg-titel")}</h2>
        <p>{t("sint.fotos.leeg-tekst")}</p>
      </section>
      <p className="album-back">
        <a className="button button-outline" href="#/bedankt">
          <ArrowLeft size={18} aria-hidden="true" />
          Terug naar de bedankpagina
        </a>
      </p>
    </div>
  );
}
