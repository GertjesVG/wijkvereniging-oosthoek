-- Live GPS (server/gps.ts): pauze en de gereden route. Alleen toevoegingen; bestaande kolommen en rijen blijven.
-- paused_since = pauze sinds (NULL = geen pauze); segment_since = begin van het lopende routesegment (start of hervatten);
-- track_error = laatste mislukte routeregistratie (tijdstip en melding), voor het beheer.
ALTER TABLE gps_live ADD COLUMN paused_since TEXT;
ALTER TABLE gps_live ADD COLUMN segment_since TEXT;
ALTER TABLE gps_live ADD COLUMN track_error TEXT;

-- Gereden route: elke ontvangen OwnTracks-positie tijdens een sessie buiten de pauze, onbewerkt bewaard per evenement,
-- sessie (starttijd) en segment. Nooit overschreven: Stop, automatische stop en een nieuwe sessie wissen hier niets.
CREATE TABLE gps_track (
  id INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL,
  session_since TEXT NOT NULL,
  segment_since TEXT NOT NULL,
  fix_at TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  accuracy INTEGER,
  speed REAL,
  course REAL,
  altitude REAL,
  received_at TEXT NOT NULL,
  UNIQUE (session_since, fix_at)
);

-- Start, pauze, hervatten, stop en automatische stop per sessie: zo zijn vertrek, einde en pauzes later terug te vinden.
CREATE TABLE gps_track_log (
  id INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL,
  session_since TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  until TEXT
);
