import { useState, type FormEvent } from "react";
import { ChevronDown, Copy, Mail, MapPin, Trash2, Users } from "lucide-react";
import type { AdminParticipant, AdminRegistration } from "../inschrijving/api";
import { api } from "./client";
import { ErrorNote, formatDateTime, MailBadge, useAction } from "./ui";

type Update = (updated: AdminRegistration) => void;
type Remove = (id: number) => void;

// Definitief verwijderen (bv. een proefinschrijving): bevestigen door het inschrijvingsnummer te typen.
function DeleteRegistration({ registration: reg, onDelete }: { registration: AdminRegistration; onDelete: Remove }) {
  const { busy, error, run } = useAction();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const active = reg.participants.filter((p) => p.status === "active").length;

  async function remove(e: FormEvent) {
    e.preventDefault();
    if (typed.trim() !== reg.reference) return;
    const done = await run(() => api.deleteRegistration(reg.id, reg.reference));
    if (done) onDelete(reg.id);
  }

  return (
    <section className="erase" aria-label="Inschrijving verwijderen">
      {confirming ? (
        <form className="erase-confirm" onSubmit={remove}>
          <p>
            Inschrijving <strong>{reg.reference}</strong> van {reg.parentName} wordt definitief verwijderd, samen met{" "}
            {reg.participants.length === 1 ? "het kind" : `de ${reg.participants.length} kinderen`} en de bevestigingsmail
            in de wachtrij. {active > 0 && `${active === 1 ? "Eén cadeautje komt" : `${active} cadeautjes komen`} weer vrij. `}
            De inschrijving verdwijnt ook uit de historiek; het nummer {reg.reference} wordt nooit opnieuw uitgegeven. Een
            mail die het script al opgehaald heeft, kan nog vertrekken. Dit kan niet ongedaan gemaakt worden. Wil je de
            inschrijving alleen ongeldig maken, gebruik dan "Inschrijving annuleren".
          </p>
          <label className="field">
            <span>Typ {reg.reference} om te bevestigen</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={busy} />
          </label>
          <div className="actions">
            <button type="submit" className="btn btn-danger btn-small" disabled={busy || typed.trim() !== reg.reference}>
              Definitief verwijderen
            </button>
            <button
              type="button"
              className="btn btn-small btn-quiet"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
            >
              Annuleren
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-small btn-quiet" onClick={() => setConfirming(true)}>
          <Trash2 size={15} aria-hidden="true" />
          Inschrijving verwijderen
        </button>
      )}
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}

function ParticipantRow({
  participant,
  onUpdate,
}: {
  participant: AdminParticipant;
  onUpdate: Update;
}) {
  const { busy, error, run } = useAction();
  const [name, setName] = useState(participant.name);
  const [age, setAge] = useState(participant.age === null ? "" : String(participant.age));
  const cancelled = participant.status === "cancelled";
  const ageNumber = age.trim() === "" ? null : Number(age);
  const ageValid = ageNumber === null || (Number.isInteger(ageNumber) && ageNumber >= 0);
  const dirty =
    name.trim() !== participant.name ||
    (ageNumber !== participant.age && ageNumber !== null);

  async function patch(body: Parameters<typeof api.patchParticipant>[1]) {
    const updated = await run(() => api.patchParticipant(participant.id, body));
    if (updated) onUpdate(updated);
    return updated;
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!dirty || !ageValid || !name.trim()) return;
    const body: Parameters<typeof api.patchParticipant>[1] = {};
    if (name.trim() !== participant.name) body.name = name.trim();
    if (ageNumber !== null && ageNumber !== participant.age) body.age = ageNumber;
    await patch(body);
  }

  return (
    <li className={`participant${cancelled ? " is-cancelled" : ""}`}>
      <form className="participant-form" onSubmit={save}>
        <label className="field grow">
          <span>Naam</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field narrow">
          <span>Leeftijd</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            disabled={busy}
            aria-invalid={ageValid ? undefined : true}
          />
        </label>
        <button
          type="submit"
          className="btn btn-small"
          disabled={busy || !dirty || !ageValid || !name.trim()}
        >
          Opslaan
        </button>
        <button
          type="button"
          className="btn btn-small btn-quiet"
          disabled={busy}
          onClick={() => patch({ status: cancelled ? "active" : "cancelled" })}
        >
          {cancelled ? "Kind heractiveren" : "Kind annuleren"}
        </button>
      </form>
      <label className="check">
        <input
          type="checkbox"
          checked={participant.pickedUpAt !== null}
          disabled={busy || cancelled}
          onChange={(e) => patch({ pickedUp: e.target.checked })}
        />
        <span>
          Cadeau afgehaald
          {participant.pickedUpAt && (
            <small> ({formatDateTime(participant.pickedUpAt)})</small>
          )}
        </span>
      </label>
      {cancelled && <span className="badge badge-muted">Geannuleerd</span>}
      <ErrorNote>{error}</ErrorNote>
    </li>
  );
}

export function RegistrationDetails({
  registration: reg,
  onUpdate,
  onDelete,
}: {
  registration: AdminRegistration;
  onUpdate: Update;
  onDelete: Remove;
}) {
  const edit = useAction();
  const status = useAction();
  const mail = useAction();
  const add = useAction();
  const review = useAction();
  const [parentName, setParentName] = useState(reg.parentName);
  const [email, setEmail] = useState(reg.email);
  const [street, setStreet] = useState(reg.street ?? "");
  const [houseNumber, setHouseNumber] = useState(reg.houseNumber ?? "");
  const [note, setNote] = useState(reg.note ?? "");
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");

  const changes: Parameters<typeof api.patchRegistration>[1] = {};
  if (parentName.trim() !== reg.parentName) changes.parentName = parentName.trim();
  if (email.trim() !== reg.email) changes.email = email.trim();
  if (street.trim() !== (reg.street ?? "")) changes.street = street.trim();
  if (houseNumber.trim() !== (reg.houseNumber ?? "")) changes.houseNumber = houseNumber.trim();
  if (note.trim() !== (reg.note ?? "")) changes.note = note.trim();
  const dirty = Object.keys(changes).length > 0;
  const cancelled = reg.status === "cancelled";

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    const updated = await edit.run(() => api.patchRegistration(reg.id, changes));
    if (updated) {
      // De server zet een herkende straat in de officiële schrijfwijze.
      setStreet(updated.street ?? "");
      onUpdate(updated);
    }
  }
  async function approveAddress() {
    const updated = await review.run(() => api.patchRegistration(reg.id, { addressApproved: true }));
    if (updated) onUpdate(updated);
  }
  async function toggleStatus() {
    const updated = await status.run(() =>
      api.patchRegistration(reg.id, { status: cancelled ? "active" : "cancelled" }),
    );
    if (updated) onUpdate(updated);
  }
  async function resend() {
    const updated = await mail.run(() => api.resendMail(reg.id));
    if (updated) onUpdate(updated);
  }
  const newAgeNumber = Number(newAge);
  const canAdd =
    newName.trim() !== "" &&
    newAge.trim() !== "" &&
    Number.isInteger(newAgeNumber) &&
    newAgeNumber >= 0;
  async function addChild(e: FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    const updated = await add.run(() =>
      api.addParticipant(reg.id, { name: newName.trim(), age: newAgeNumber }),
    );
    if (updated) {
      setNewName("");
      setNewAge("");
      onUpdate(updated);
    }
  }

  return (
    <div className="details">
      <section aria-label="Gegevens ouder en adres">
        <h4>Ouder en adres</h4>
        {reg.addressReview && (
          <div className="note address-review">
            <p>
              <strong>Adres nakijken.</strong>{" "}
              {reg.addressReview.reason ?? "Gemarkeerd om na te kijken."} Ligt het adres toch in de wijk, keur het dan
              goed; anders kun je het adres verbeteren of de inschrijving annuleren. De bevestigingsmail vertrekt pas
              na goedkeuring of verbetering.
            </p>
            <button type="button" className="btn btn-small" disabled={review.busy} onClick={approveAddress}>
              Adres goedgekeurd
            </button>
            <ErrorNote>{review.error}</ErrorNote>
          </div>
        )}
        {(reg.coParent || reg.rulesAccepted) && (
          <p className="muted">
            {reg.coParent && "Het adres is dat van de andere ouder of voogd in de wijk (co-ouderschap). "}
            {reg.rulesAccepted &&
              `Reglement (versie ${reg.rulesAccepted.version}) aanvaard op ${formatDateTime(reg.rulesAccepted.at)}.`}
          </p>
        )}
        <form className="grid-form" onSubmit={saveDetails}>
          <label className="field">
            <span>Naam ouder</span>
            <input value={parentName} onChange={(e) => setParentName(e.target.value)} disabled={edit.busy} />
          </label>
          <label className="field">
            <span>E-mailadres</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={edit.busy} />
          </label>
          <label className="field">
            <span>Straat</span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} disabled={edit.busy} />
          </label>
          <label className="field">
            <span>Huisnummer</span>
            <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} disabled={edit.busy} />
          </label>
          <label className="field wide">
            <span>Notitie (alleen voor beheer)</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={edit.busy} />
          </label>
          <div className="actions wide">
            <button type="submit" className="btn btn-primary btn-small" disabled={edit.busy || !dirty}>
              Wijzigingen opslaan
            </button>
            <button
              type="button"
              className="btn btn-small btn-quiet"
              disabled={status.busy}
              onClick={toggleStatus}
            >
              {cancelled ? "Inschrijving heractiveren" : "Inschrijving annuleren"}
            </button>
          </div>
          <ErrorNote>{edit.error || status.error}</ErrorNote>
        </form>
      </section>

      <section aria-label="Kinderen">
        <h4>Kinderen</h4>
        <ul className="participants">
          {reg.participants.map((p) => (
            <ParticipantRow key={p.id} participant={p} onUpdate={onUpdate} />
          ))}
        </ul>
        <form className="participant-form add-form" onSubmit={addChild}>
          <label className="field grow">
            <span>Nieuw kind: naam</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} disabled={add.busy} />
          </label>
          <label className="field narrow">
            <span>Leeftijd</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              disabled={add.busy}
            />
          </label>
          <button type="submit" className="btn btn-small" disabled={add.busy || !canAdd}>
            Kind toevoegen
          </button>
        </form>
        <ErrorNote>{add.error}</ErrorNote>
      </section>

      <section aria-label="Bevestigingsmail">
        <h4>Bevestigingsmail</h4>
        {reg.mail ? (
          <dl className="mail-info">
            <div>
              <dt>Status</dt>
              <dd>
                <MailBadge status={reg.mail.status} />
              </dd>
            </div>
            <div>
              <dt>Pogingen</dt>
              <dd>{reg.mail.attempts}</dd>
            </div>
            <div>
              <dt>Verstuurd</dt>
              <dd>{formatDateTime(reg.mail.sentAt)}</dd>
            </div>
            {reg.mail.lastError && (
              <div className="wide">
                <dt>Laatste fout</dt>
                <dd>{reg.mail.lastError}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="muted">Voor deze inschrijving is geen mail ingepland.</p>
        )}
        <button type="button" className="btn btn-small" disabled={mail.busy} onClick={resend}>
          <Mail size={15} aria-hidden="true" />
          Bevestiging opnieuw sturen
        </button>
        <ErrorNote>{mail.error}</ErrorNote>
      </section>

      <DeleteRegistration registration={reg} onDelete={onDelete} />
    </div>
  );
}

export function RegistrationItem({
  registration: reg,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  registration: AdminRegistration;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: Update;
  onDelete: Remove;
}) {
  const active = reg.participants.filter((p) => p.status === "active");
  const pickedUp = active.filter((p) => p.pickedUpAt !== null).length;
  const panelId = `reg-${reg.id}`;
  return (
    <li className={`registration${reg.status === "cancelled" ? " is-cancelled" : ""}`}>
      <button
        type="button"
        className="registration-head"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="reg-ref">{reg.reference}</span>
        <span className="reg-main">
          <strong>{reg.parentName}</strong>
          <span className="muted">
            {reg.participants.map((p) => p.name).join(", ") || "Geen kinderen"}
          </span>
        </span>
        <span className="reg-meta">
          <span className="muted">{formatDateTime(reg.createdAt)}</span>
          <span className="badges">
            {reg.status === "cancelled" && <span className="badge badge-muted">Geannuleerd</span>}
            {reg.suspectedDuplicate && (
              <span className="badge badge-warn">
                <Copy size={12} aria-hidden="true" /> Mogelijk dubbel
              </span>
            )}
            {reg.addressReview && (
              <span className="badge badge-warn">
                <MapPin size={12} aria-hidden="true" /> Adres nakijken
              </span>
            )}
            {reg.coParent && (
              <span className="badge badge-muted">
                <Users size={12} aria-hidden="true" /> Co-ouderschap
              </span>
            )}
            {active.length > 0 && (
              <span className={`badge ${pickedUp === active.length ? "badge-ok" : "badge-muted"}`}>
                Afgehaald {pickedUp}/{active.length}
              </span>
            )}
            <MailBadge status={reg.mail?.status ?? null} />
          </span>
        </span>
        <ChevronDown className="chevron" size={18} aria-hidden="true" />
      </button>
      {expanded && (
        <div id={panelId}>
          <RegistrationDetails registration={reg} onUpdate={onUpdate} onDelete={onDelete} />
        </div>
      )}
    </li>
  );
}
