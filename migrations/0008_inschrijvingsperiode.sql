-- Inschrijvingsperiode per evenement (Gert, 4 november 2026), instelbaar in het beheer. Momenten in UTC, in de vorm van
-- toISOString, zodat tekstvergelijking klopt. Begin inbegrepen, einde niet. Sinterklaas 2026: van 10 november 00:00 tot
-- 28 november 00:00, Belgische tijd (UTC+1 in november).
-- Geen periode betekent dicht. Deze migratie voegt alleen twee kolommen en een trigger toe en vult de periode van Sinterklaas in.
-- Inschrijvingen, kinderen, nummers, mails en reglementakkoorden blijven ongemoeid.
-- De trigger dwingt de periode in de database af, dus ook voor oudere publicaties die nog op hun eigen adres draaien.
-- Hij kijkt alleen naar nieuwe inschrijvingen: bestaande rijen en "kind toevoegen" in het beheer vallen erbuiten.
-- Het woord "gesloten" in de melding vertaalt elke codeversie al naar antwoord 423.
-- Publiceren: eerst deze migratie op de productiedatabase, meteen daarna de code. Vanaf de migratie weigert de database
-- nieuwe inschrijvingen buiten de periode, ook als de pagina nog even het oude formulier toont.
ALTER TABLE events ADD COLUMN registration_opens_at TEXT;
ALTER TABLE events ADD COLUMN registration_closes_at TEXT;

UPDATE events
SET registration_opens_at = '2026-11-09T23:00:00.000Z', registration_closes_at = '2026-11-27T23:00:00.000Z'
WHERE id = 'sinterklaas-2026';

CREATE TRIGGER registrations_within_period
BEFORE INSERT ON registrations
WHEN NOT EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = NEW.event_id
    AND NEW.created_at >= e.registration_opens_at
    AND NEW.created_at < e.registration_closes_at
)
BEGIN
  SELECT RAISE(ABORT, 'gesloten: buiten de inschrijvingsperiode');
END;
