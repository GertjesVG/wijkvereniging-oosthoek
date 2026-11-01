-- Inschrijvingen voor evenementen van VZW Wijkvereniging Oosthoek (Cloudflare D1).
-- Open/dicht, capaciteit en "één cadeautje per kind" dwingt de database af, ook bij gelijktijdige inschrijvingen:
-- elke wijziging is één D1-batch (= één transactie). De guard-tabellen laten die batch mislukken via hun CHECK,
-- waarna D1 alles terugdraait. Evenementrijen maakt de server aan uit src/inschrijving/evenementen.ts.

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  personal_data_erased_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE registrations (
  id INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events (id),
  -- UUID uit het formulier: dezelfde inzending opnieuw verzenden maakt geen tweede inschrijving.
  submission_id TEXT NOT NULL UNIQUE,
  seq INTEGER NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  street TEXT,
  house_number TEXT,
  address_key TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  suspected_duplicate INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (event_id, seq)
);
CREATE INDEX registrations_event ON registrations (event_id, status);

CREATE TABLE participants (
  id INTEGER PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES registrations (id),
  event_id TEXT NOT NULL REFERENCES events (id),
  name TEXT NOT NULL,
  age INTEGER,
  -- Genormaliseerde naam + gezinsadres (of e-mail): per evenement maar één actief record per kind.
  child_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  picked_up_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX participants_one_per_child ON participants (event_id, child_key) WHERE status = 'active';
CREATE INDEX participants_registration ON participants (registration_id);

-- Eén bevestigingsmail per inschrijving; "generation" stijgt bij handmatig opnieuw versturen.
CREATE TABLE mail_outbox (
  id INTEGER PRIMARY KEY,
  registration_id INTEGER NOT NULL UNIQUE REFERENCES registrations (id),
  generation INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  lease_until TEXT,
  last_error TEXT,
  sent_at TEXT
);
CREATE INDEX mail_outbox_due ON mail_outbox (status, next_attempt_at);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY,
  client_key TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX login_attempts_time ON login_attempts (attempted_at);

CREATE TABLE guard_open (id INTEGER PRIMARY KEY, ok INTEGER, CONSTRAINT gesloten CHECK (ok IS 1));
CREATE TABLE guard_capacity (id INTEGER PRIMARY KEY, ok INTEGER, CONSTRAINT volzet CHECK (ok IS 1));
