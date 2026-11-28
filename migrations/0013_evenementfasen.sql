-- Sinterklaasbeheer: evenementjaren en automatische evenementfasen (src/evenement/fase.ts, server/evenement.ts).
-- Alleen toevoegingen; bestaande tabellen en rijen (inschrijvingen, GPS, teksten) blijven ongewijzigd.
-- Tijdstippen in Belgische tijd ("2026-11-28T20:00"); de server rekent ze om met de tijdzone Europe/Brussels.

-- Eén rij per evenementjaar. status "concept" = in voorbereiding en onzichtbaar; "gepland" = gepubliceerd: de website
-- opent automatisch op season_open en maakt plaats voor de bedankpagina op closing (als de live GPS niet meer loopt).
CREATE TABLE event_years (
  year INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT,
  season_open TEXT NOT NULL,
  closing TEXT,
  prep_from TEXT,
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept', 'gepland')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Handmatige bediening: precies één rij. override = "site" of "bedankt", geldig tot override_until (NULL = tot opheffen).
CREATE TABLE event_control (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auto INTEGER NOT NULL DEFAULT 1,
  override TEXT CHECK (override IN ('site', 'bedankt')),
  override_at TEXT,
  override_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Logboek van de handelingen in het Sinterklaasbeheer (afsluiten, heropenen, planning, jaren).
CREATE TABLE event_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);

-- Sinterklaas in Oosthoek 2026 (opdracht Gert, 28 november 2026): seizoen sinds 1 oktober, afsluiting op de dag van de
-- stoet om 20.00 uur. 2027: concept met de seizoensopening op 1 oktober 2027; de datum van de stoet volgt in het beheer.
INSERT INTO event_years (year, title, event_date, season_open, closing, prep_from, status) VALUES
  (2026, 'Sinterklaas in Oosthoek 2026', '2026-11-28', '2026-10-01T00:00', '2026-11-28T20:00', '2026-09-01T00:00', 'gepland'),
  (2027, 'Sinterklaas in Oosthoek 2027', NULL, '2027-10-01T00:00', NULL, '2027-09-01T00:00', 'concept');
INSERT INTO event_control (id, auto) VALUES (1, 1);
