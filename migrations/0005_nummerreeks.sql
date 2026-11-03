-- Uitgegeven nummerreeks per evenement: het eerstvolgende volgnummer. Een definitief verwijderde inschrijving
-- (beheer, "Inschrijving verwijderen") schuift dit nummer door, zodat een nummer nooit opnieuw uitgegeven wordt
-- (het Apps Script onthoudt verstuurde mails per nummer). Begint na het hoogste nummer dat nu bestaat.
ALTER TABLE events ADD COLUMN next_seq INTEGER NOT NULL DEFAULT 1;
UPDATE events SET next_seq = (SELECT COALESCE(MAX(r.seq), 0) + 1 FROM registrations r WHERE r.event_id = events.id);
