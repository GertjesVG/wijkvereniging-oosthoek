-- Het maximum aantal kinderen wordt optioneel (Gert, 3 november 2026): de vroegere 150 was een schatting, geen
-- deelnamevoorwaarde. capacity_limited = 0: geen maximum, inschrijven kan zolang het evenement open is (capacity telt
-- dan niet mee). capacity_limited = 1: hoogstens capacity actieve kinderen; guard_capacity bewaakt dat in dezelfde batch
-- als de inschrijving, dus ook bij gelijktijdige inschrijvingen. Instellen of weer wissen gebeurt in het beheer.
-- Bestaande evenementen krijgen 0 (geen maximum meer). Deze migratie voegt alleen een kolom toe: inschrijvingen,
-- kinderen, nummers, mails en reglementakkoorden blijven ongemoeid.
-- Publiceren: eerst deze migratie op de productiedatabase, pas daarna de code (die leest de nieuwe kolom).
ALTER TABLE events ADD COLUMN capacity_limited INTEGER NOT NULL DEFAULT 0 CHECK (capacity_limited IN (0, 1));
