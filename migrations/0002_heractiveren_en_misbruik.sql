-- Heractiveren van een geannuleerde inschrijving zet alleen de kinderen terug die samen met die inschrijving
-- geannuleerd werden, niet wie al apart geannuleerd was.
ALTER TABLE participants ADD COLUMN cancelled_with_registration INTEGER NOT NULL DEFAULT 0;

-- Nieuwe inschrijvingen per internetaansluiting (onomkeerbaar gemaakt), hooguit een dag bewaard: begrenst misbruik.
CREATE TABLE submit_log (
  id INTEGER PRIMARY KEY,
  client_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX submit_log_client ON submit_log (client_key, created_at);
