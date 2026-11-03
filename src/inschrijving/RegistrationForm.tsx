import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Gift, Plus, ShieldCheck, X } from "lucide-react";
import { StatusNote } from "../components";
import { event } from "../content/event";
import type {
  ApiError,
  PublicEventStatus,
  RegistrationRequest,
  RegistrationResponse,
} from "./api";
import { sinterklaasRegistration, type RegistrationEvent } from "./evenementen";
import "./registration.css";

export type TurnstileSlotProps = {
  siteKey: string;
  // Verhoog dit getal om de widget opnieuw te laten beginnen (na een serverfout).
  resetSignal: number;
  onToken: (token: string | null) => void;
  onError: (message: string) => void;
};
export type TurnstileRenderer = (props: TurnstileSlotProps) => ReactNode;

export type RegistrationFormProps = {
  // null = nog niet geladen of niet bereikbaar: dan blijft het formulier dicht.
  status: PublicEventStatus | null;
  // Gooit een ApiError (of iets anders bij netwerkfouten).
  submit: (request: RegistrationRequest) => Promise<RegistrationResponse>;
  renderTurnstile: TurnstileRenderer;
  config?: RegistrationEvent;
};

type Child = { key: number; name: string; age: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiError).error === "string" &&
    typeof (value as ApiError).message === "string"
  );
}

function newSubmissionId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function giftCount(n: number) {
  return `${n} ${n === 1 ? "cadeautje" : "cadeautjes"}`;
}

// "2026-11-28" → "28 november 2026" (of "28 november" zonder jaar)
function longDate(isoDate: string, withYear = true) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    ...(withYear && { year: "numeric" }),
  }).format(new Date(`${isoDate}T12:00:00`));
}

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <section
      className="paper-panel registration-panel"
      aria-labelledby="registration-heading"
    >
      <div className="panel-heading">
        <span className="eyebrow">KINDERINSCHRIJVING</span>
        <Gift size={24} aria-hidden="true" />
      </div>
      <h2 id="registration-heading">
        Schrijf je kleine
        <br />
        Sinterklaasfan in
      </h2>
      {children}
    </section>
  );
}

// Exact de toestand van de site zolang de inschrijving niet open is.
function ClosedPanel() {
  return (
    <PanelShell>
      <StatusNote>{event.registration.message}</StatusNote>
      <p className="quiet-copy">
        Dit is een voorbeeld van het toekomstige formulier. Je kunt nog geen
        gegevens invullen of verzenden.
      </p>
      <fieldset
        disabled
        className="registration-fields"
        aria-describedby="registration-unavailable"
      >
        <legend className="visually-hidden">
          Nog niet actief inschrijfformulier
        </legend>
        <label>
          Voornaam van het kind
          <input
            type="text"
            placeholder="Nog niet beschikbaar"
            autoComplete="off"
          />
        </label>
        <label>
          Leeftijd van het kind
          <select defaultValue="">
            <option value="">Nog niet beschikbaar</option>
          </select>
        </label>
        <label>
          E-mailadres ouder of voogd
          <input
            type="email"
            placeholder="Nog niet beschikbaar"
            autoComplete="off"
          />
        </label>
        <button type="button" className="button button-primary" disabled>
          <Gift size={17} aria-hidden="true" />
          Inschrijving nog niet geopend
        </button>
      </fieldset>
      <p className="form-footnote" id="registration-unavailable">
        <ShieldCheck size={16} aria-hidden="true" />
        Er worden nu geen persoonsgegevens verzameld.
      </p>
      <div className="confirmation-explanation">
        <h3>En de bevestiging?</h3>
        <p>
          Een inschrijving is pas geldig na een echte bevestiging. Je kunt hier
          op dit moment geen cadeautje reserveren.
        </p>
      </div>
    </PanelShell>
  );
}

function FullPanel({ config }: { config: RegistrationEvent }) {
  return (
    <PanelShell>
      <StatusNote>
        De inschrijving is volzet. Alle cadeautjes zijn vergeven.
      </StatusNote>
      <p className="registration-lead">
        Er kunnen geen nieuwe {config.participant.plural} meer ingeschreven
        worden. Dank je wel voor je interesse! Vragen? Mail naar{" "}
        <a href={`mailto:${event.organisation.email}`}>
          {event.organisation.email}
        </a>
        .
      </p>
    </PanelShell>
  );
}

function ConfirmationPanel({
  result,
  config,
  onAnother,
}: {
  result: RegistrationResponse;
  config: RegistrationEvent;
  onAnother: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <PanelShell>
      <div className="registration-success" role="status">
        <h3 tabIndex={-1} ref={heading}>
          Gelukt, je inschrijving is ontvangen
        </h3>
        <p className="registration-reference">
          Inschrijvingsnummer <strong>{result.reference}</strong>
        </p>
        <dl className="registration-summary">
          <div>
            <dt>Ouder of voogd</dt>
            <dd>{result.parentName}</dd>
          </div>
          <div>
            <dt>E-mailadres</dt>
            <dd>{result.email}</dd>
          </div>
          {result.address && (
            <div>
              <dt>
                {result.address.coParent
                  ? `Adres in ${config.area?.name ?? "de wijk"} (andere ouder of voogd)`
                  : "Adres"}
              </dt>
              <dd>
                {result.address.street} {result.address.houseNumber}
              </dd>
            </div>
          )}
          <div>
            <dt>
              {result.participants.length === 1
                ? "Ingeschreven " + config.participant.singular
                : "Ingeschreven " + config.participant.plural}
            </dt>
            <dd>
              <ul>
                {result.participants.map((p, i) => (
                  <li key={i}>
                    {p.name}
                    {p.age !== null && ` (${p.age} jaar)`}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
        {result.addressReview && (
          <p className="registration-review">
            Het adres staat niet in de gemeentelijke stratenlijst van{" "}
            {config.area?.name ?? "de wijk"}, of het huisnummer ligt op de grens.
            Je inschrijving is wel ontvangen; de vereniging kijkt het adres nog na
            en neemt contact op als er iets niet klopt.
          </p>
        )}
        <p>
          {result.addressReview
            ? "Je ontvangt de bevestigingsmail zodra het adres is nagekeken, op "
            : "Je ontvangt binnen enkele minuten een bevestigingsmail op "}
          <strong>{result.email}</strong>. Zie je niets? Kijk dan ook in je
          spam. Heb je vragen? Antwoord op die mail of stuur een bericht naar{" "}
          <a href={`mailto:${event.organisation.email}`}>
            {event.organisation.email}
          </a>
          .
        </p>
        <button type="button" className="button button-outline" onClick={onAnother}>
          Nog iemand inschrijven
        </button>
      </div>
    </PanelShell>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span className="field-error" id={id}>
      {message}
    </span>
  );
}

function OpenPanel({
  status,
  config,
  available,
  submit,
  renderTurnstile,
  onDone,
  onBlocked,
  onAvailable,
}: {
  status: PublicEventStatus;
  config: RegistrationEvent;
  available: number;
  submit: RegistrationFormProps["submit"];
  renderTurnstile: TurnstileRenderer;
  onDone: (result: RegistrationResponse) => void;
  onBlocked: (kind: "full" | "closed") => void;
  onAvailable: (n: number) => void;
}) {
  const uid = useId();
  const { participant, area, rules } = config;
  const maxChildren = Math.max(
    1,
    Math.min(participant.maxPerRegistration, available),
  );
  const nextKey = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [submissionId] = useState(newSubmissionId);
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  // true = het adres is dat van de andere ouder of voogd (co-ouderschap); de inschrijver woont elders.
  const [coParent, setCoParent] = useState(false);
  const [children, setChildren] = useState<Child[]>([
    { key: 0, name: "", age: "" },
  ]);
  const [rulesOk, setRulesOk] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [focusSeq, setFocusSeq] = useState(0);

  useEffect(() => {
    if (focusSeq === 0) return;
    const first = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (first) first.focus();
    else alertRef.current?.focus();
  }, [focusSeq]);

  const id = (name: string) => `${uid}-${name}`;
  const errId = (name: string) => `${uid}-${name}-error`;
  const ageOptions: number[] = [];
  if (participant.age)
    for (let n = participant.age.min; n <= participant.age.max; n++)
      ageOptions.push(n);
  const eventDate = longDate(config.date);
  const streetSuggestions = area
    ? [...area.streets, ...Object.keys(area.partialStreets)].sort((a, b) => a.localeCompare(b, "nl"))
    : [];

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!parentName.trim())
      e["parent.name"] = "Vul de naam van de ouder of voogd in.";
    if (!email.trim()) e["parent.email"] = "Vul een e-mailadres in.";
    else if (!emailPattern.test(email.trim()))
      e["parent.email"] = "Dit e-mailadres lijkt niet te kloppen.";
    if (area) {
      if (!street.trim()) e["address.street"] = "Kies of vul de straat in.";
      if (!houseNumber.trim())
        e["address.houseNumber"] = "Vul het huisnummer in.";
    }
    children.forEach((c, i) => {
      if (!c.name.trim())
        e[`participants.${i}.name`] = `Vul de voornaam van het ${participant.singular} in.`;
      if (participant.age && c.age === "")
        e[`participants.${i}.age`] = `Kies de leeftijd van het ${participant.singular}.`;
    });
    if (rules && !rulesOk)
      e["confirmations.rules"] = "Bevestig deze verklaring om in te schrijven.";
    if (!privacyOk)
      e["confirmations.privacy"] =
        "Bevestig dat je de privacyverklaring hebt gelezen.";
    return e;
  }

  function fail(fieldErrors: Record<string, string>, message: string | null) {
    setErrors(fieldErrors);
    setGeneral(message);
    setFocusSeq((n) => n + 1);
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const found = validate();
    if (Object.keys(found).length > 0) {
      fail(found, "Niet alles is ingevuld. Kijk de aangeduide velden na.");
      return;
    }
    if (!token) {
      fail(
        {},
        "De beveiligingscontrole is nog niet klaar. Wacht even en probeer opnieuw.",
      );
      return;
    }
    const request: RegistrationRequest = {
      eventId: config.id,
      submissionId,
      parent: { name: parentName.trim(), email: email.trim() },
      address: area
        ? { street: street.trim(), houseNumber: houseNumber.trim(), coParent }
        : null,
      participants: children.map((c) => ({
        name: c.name.trim(),
        age: participant.age ? Number(c.age) : null,
      })),
      confirmations: { rules: rulesOk, privacy: privacyOk },
      rulesVersion: rules?.version ?? null,
      turnstileToken: token,
      website,
    };
    setBusy(true);
    setErrors({});
    setGeneral(null);
    try {
      const result = await submit(request);
      onDone(result);
    } catch (err) {
      setToken(null);
      setResetSignal((n) => n + 1);
      if (isApiError(err)) {
        if (err.error === "VOLZET") {
          const left = err.available ?? 0;
          if (left <= 0) {
            onBlocked("full");
            return;
          }
          onAvailable(left);
          fail(
            {},
            `Er zijn nog maar ${giftCount(left)} beschikbaar. Pas het aantal ${participant.plural} aan en probeer opnieuw.`,
          );
        } else if (err.error === "GESLOTEN") {
          onBlocked("closed");
          return;
        } else {
          fail(
            err.fields ?? {},
            err.error === "TURNSTILE"
              ? "De beveiligingscontrole is mislukt. Probeer het opnieuw."
              : err.message,
          );
        }
      } else {
        fail(
          {},
          "Verzenden lukt niet. Controleer je verbinding en probeer opnieuw.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function setChild(key: number, patch: Partial<Child>) {
    setChildren((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  const knownKeys = new Set<string>([
    "parent.name",
    "parent.email",
    "address.street",
    "address.houseNumber",
    "confirmations.rules",
    "confirmations.privacy",
  ]);
  children.forEach((_, i) => {
    knownKeys.add(`participants.${i}.name`);
    knownKeys.add(`participants.${i}.age`);
  });
  const otherErrors = Object.entries(errors).filter(([k]) => !knownKeys.has(k));

  const textInput = (
    name: string,
    label: string,
    value: string,
    set: (v: string) => void,
    props: { type?: string; autoComplete?: string; inputMode?: "numeric" | "text" } = {},
  ) => (
    <div className="field">
      <label htmlFor={id(name)}>{label}</label>
      <input
        id={id(name)}
        type={props.type ?? "text"}
        value={value}
        autoComplete={props.autoComplete ?? "off"}
        inputMode={props.inputMode}
        onChange={(e) => set(e.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? errId(name) : undefined}
      />
      <FieldError id={errId(name)} message={errors[name]} />
    </div>
  );

  return (
    <PanelShell>
      <StatusNote tone="blue">
        {available > 0
          ? `Nog ${giftCount(available)} beschikbaar`
          : "De laatste plaatsen zijn bijna weg"}
      </StatusNote>
      <p className="registration-lead">
        Een ouder of voogd schrijft de {participant.plural} in. Elk ingeschreven{" "}
        {participant.singular} krijgt één cadeautje. Na het verzenden krijg je
        een bevestigingsmail met je inschrijvingsnummer.
      </p>
      <form
        className="registration-form"
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        aria-describedby={general ? id("alert") : undefined}
      >
        {general && (
          <div
            className="form-alert"
            role="alert"
            id={id("alert")}
            tabIndex={-1}
            ref={alertRef}
          >
            <p>{general}</p>
            {otherErrors.length > 0 && (
              <ul>
                {otherErrors.map(([k, m]) => (
                  <li key={k}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <fieldset className="form-group">
          <legend>Ouder of voogd</legend>
          {textInput("parent.name", "Naam ouder of voogd", parentName, setParentName, {
            autoComplete: "name",
          })}
          {textInput("parent.email", "E-mailadres ouder of voogd", email, setEmail, {
            type: "email",
            autoComplete: "email",
          })}
        </fieldset>
        {area && (
          <fieldset className="form-group">
            <legend>Adres in {area.name}</legend>
            {/* Minstens één ouder of voogd woont in de wijk; het kind hoeft er niet gedomicilieerd te zijn. Geen extra
                gegevens van de andere ouder: alleen dit adres, met dezelfde controle als altijd. */}
            <fieldset className="choice-group">
              <legend>Wie woont in {area.name}?</legend>
              <div className="check-field">
                <label>
                  <input
                    type="radio"
                    name={id("resident")}
                    checked={!coParent}
                    onChange={() => setCoParent(false)}
                  />
                  <span>Ik, de ouder of voogd die inschrijft</span>
                </label>
              </div>
              <div className="check-field">
                <label>
                  <input
                    type="radio"
                    name={id("resident")}
                    checked={coParent}
                    onChange={() => setCoParent(true)}
                  />
                  <span>
                    De andere ouder of voogd van het kind, bijvoorbeeld bij
                    co-ouderschap of gescheiden ouders
                  </span>
                </label>
              </div>
            </fieldset>
            <div className="field-row">
              <div className="field">
                <label htmlFor={id("address.street")}>Straat</label>
                {/* Vrij veld met de officiële straten als suggestie: een straat buiten de lijst wordt nagekeken, niet geweigerd. */}
                <input
                  id={id("address.street")}
                  type="text"
                  value={street}
                  list={streetSuggestions.length ? id("streets") : undefined}
                  autoComplete="off"
                  onChange={(e) => setStreet(e.target.value)}
                  aria-invalid={errors["address.street"] ? true : undefined}
                  aria-describedby={
                    [errors["address.street"] && errId("address.street"), id("address-hint")]
                      .filter(Boolean)
                      .join(" ")
                  }
                />
                {streetSuggestions.length > 0 && (
                  <datalist id={id("streets")}>
                    {streetSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
                <FieldError id={errId("address.street")} message={errors["address.street"]} />
              </div>
              <div className="field field-narrow">
                {textInput("address.houseNumber", "Huisnummer", houseNumber, setHouseNumber, {
                  autoComplete: "off",
                })}
              </div>
            </div>
            <p className="field-hint" id={id("address-hint")}>
              {coParent &&
                `Vul het adres in ${area.name} van de andere ouder of voogd in. Het kind hoeft daar niet ingeschreven te zijn. `}
              Kies de straat uit de lijst van de gemeente Beerse. Staat ze er niet
              bij, vul ze dan gewoon in: we kijken het adres na.
            </p>
          </fieldset>
        )}
        <div className="form-group">
          <h3 className="group-title">
            {participant.plural.charAt(0).toUpperCase() + participant.plural.slice(1)}
          </h3>
          {participant.age && (
            <p className="field-hint">
              Voor {participant.plural} van {participant.age.min} tot en met{" "}
              {participant.age.max} jaar. Kies de leeftijd die het{" "}
              {participant.singular} heeft op {eventDate}.
            </p>
          )}
          {children.map((c, i) => {
            const nameKey = `participants.${i}.name`;
            const ageKey = `participants.${i}.age`;
            return (
              <fieldset className="child-card" key={c.key}>
                <legend>
                  {participant.singular.charAt(0).toUpperCase() +
                    participant.singular.slice(1)}{" "}
                  {i + 1}
                </legend>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor={id(`c${c.key}-name`)}>{participant.nameLabel}</label>
                    <input
                      id={id(`c${c.key}-name`)}
                      type="text"
                      value={c.name}
                      autoComplete="off"
                      onChange={(e) => setChild(c.key, { name: e.target.value })}
                      aria-invalid={errors[nameKey] ? true : undefined}
                      aria-describedby={errors[nameKey] ? errId(`c${c.key}-name`) : undefined}
                    />
                    <FieldError id={errId(`c${c.key}-name`)} message={errors[nameKey]} />
                  </div>
                  {participant.age && (
                    <div className="field field-narrow">
                      <label htmlFor={id(`c${c.key}-age`)}>
                        Leeftijd op {longDate(config.date, false)}
                      </label>
                      <select
                        id={id(`c${c.key}-age`)}
                        value={c.age}
                        onChange={(e) => setChild(c.key, { age: e.target.value })}
                        aria-invalid={errors[ageKey] ? true : undefined}
                        aria-describedby={errors[ageKey] ? errId(`c${c.key}-age`) : undefined}
                      >
                        <option value="">Kies leeftijd</option>
                        {ageOptions.map((n) => (
                          <option key={n} value={n}>
                            {n} jaar
                          </option>
                        ))}
                      </select>
                      <FieldError id={errId(`c${c.key}-age`)} message={errors[ageKey]} />
                    </div>
                  )}
                </div>
                {children.length > 1 && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() =>
                      setChildren((list) => list.filter((x) => x.key !== c.key))
                    }
                  >
                    <X size={15} aria-hidden="true" />
                    Verwijder {participant.singular} {i + 1}
                  </button>
                )}
              </fieldset>
            );
          })}
          {children.length < maxChildren ? (
            <button
              type="button"
              className="button button-outline add-child"
              onClick={() =>
                setChildren((list) => [
                  ...list,
                  { key: nextKey.current++, name: "", age: "" },
                ])
              }
            >
              <Plus size={17} aria-hidden="true" />
              Nog een {participant.singular} toevoegen
            </button>
          ) : (
            children.length > 1 && (
              <p className="quiet-copy">
                Je kunt maximaal {maxChildren} {participant.plural} in één
                inschrijving zetten.
              </p>
            )
          )}
        </div>
        <fieldset className="form-group checks">
          <legend className="visually-hidden">Bevestigingen</legend>
          {rules && (
            <div className="check-field">
              <label>
                <input
                  type="checkbox"
                  checked={rulesOk}
                  onChange={(e) => setRulesOk(e.target.checked)}
                  aria-invalid={errors["confirmations.rules"] ? true : undefined}
                  aria-describedby={
                    errors["confirmations.rules"] ? errId("confirmations.rules") : undefined
                  }
                />
                {/* Letterlijke tekst van de vereniging; het reglement opent in een nieuw tabblad, zodat het formulier blijft staan. */}
                <span>
                  Ik verklaar dat ik ouder of wettelijke voogd ben, dat de
                  verstrekte gegevens correct zijn en dat ik het{" "}
                  <a href={rules.href} target="_blank" rel="noopener">
                    wedstrijdreglement
                  </a>{" "}
                  heb gelezen en aanvaard.
                </span>
              </label>
              <FieldError
                id={errId("confirmations.rules")}
                message={errors["confirmations.rules"]}
              />
            </div>
          )}
          <div className="check-field">
            <label>
              <input
                type="checkbox"
                checked={privacyOk}
                onChange={(e) => setPrivacyOk(e.target.checked)}
                aria-invalid={errors["confirmations.privacy"] ? true : undefined}
                aria-describedby={
                  errors["confirmations.privacy"]
                    ? errId("confirmations.privacy")
                    : undefined
                }
              />
              <span>
                Ik heb de{" "}
                <a href="#/privacy" target="_blank" rel="noopener">
                  privacyverklaring
                </a>{" "}
                gelezen
              </span>
            </label>
            <FieldError
              id={errId("confirmations.privacy")}
              message={errors["confirmations.privacy"]}
            />
          </div>
        </fieldset>
        <div className="registration-trap" aria-hidden="true">
          <label>
            Website (niet invullen)
            <input
              type="text"
              name="website"
              value={website}
              tabIndex={-1}
              autoComplete="off"
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>
        <div className="turnstile-slot">
          {renderTurnstile({
            siteKey: status.turnstileSiteKey ?? "",
            resetSignal,
            onToken: setToken,
            onError: (message) => {
              setToken(null);
              setGeneral(message);
            },
          })}
        </div>
        <button
          type="submit"
          className="button button-primary submit-button"
          disabled={busy}
          aria-busy={busy}
        >
          <Gift size={17} aria-hidden="true" />
          {busy ? "Bezig met verzenden…" : "Inschrijving verzenden"}
        </button>
      </form>
      <p className="form-footnote">
        <ShieldCheck size={16} aria-hidden="true" />
        We gebruiken je gegevens alleen voor deze inschrijving.
      </p>
    </PanelShell>
  );
}

export function RegistrationForm({
  status,
  submit,
  renderTurnstile,
  config = sinterklaasRegistration,
}: RegistrationFormProps) {
  const [result, setResult] = useState<RegistrationResponse | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [override, setOverride] = useState<"full" | "closed" | null>(null);
  const [availableNow, setAvailableNow] = useState<number | null>(null);

  // Een nieuwe status van de server (bv. na verversen) wint van wat we lokaal afleidden.
  useEffect(() => {
    setOverride(null);
    setAvailableNow(null);
  }, [status]);

  if (result)
    return (
      <ConfirmationPanel
        result={result}
        config={config}
        onAnother={() => {
          setResult(null);
          setFormKey((n) => n + 1);
        }}
      />
    );
  if (!status || override === "closed") return <ClosedPanel />;
  if (status.status === "full" || override === "full")
    return <FullPanel config={config} />;
  if (status.status !== "open" || !status.turnstileSiteKey)
    return <ClosedPanel />;
  return (
    <OpenPanel
      key={formKey}
      status={status}
      config={config}
      available={availableNow ?? status.available}
      submit={submit}
      renderTurnstile={renderTurnstile}
      onDone={setResult}
      onBlocked={setOverride}
      onAvailable={setAvailableNow}
    />
  );
}
