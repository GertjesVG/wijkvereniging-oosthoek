-- Live GPS van de huifkar (server/gps.ts): precies één rij, geen historiek.
-- public_since/public_until = publieke sessie, door het beheer gestart, met automatische stop; NULL = uit.
-- lat/lon/accuracy/fix_at = laatste positie, alleen tijdens een sessie; Stop en de automatische stop maken ze leeg.
-- seen_* = laatste contact met de telefoon (voor de verbindingscontrole in het beheer), zonder coördinaten.
CREATE TABLE gps_live (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  public_since TEXT,
  public_until TEXT,
  lat REAL,
  lon REAL,
  accuracy INTEGER,
  fix_at TEXT,
  seen_at TEXT,
  seen_fix_at TEXT,
  seen_accuracy INTEGER,
  battery INTEGER,
  charging INTEGER,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO gps_live (id) VALUES (1);
