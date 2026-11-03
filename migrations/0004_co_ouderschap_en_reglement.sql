-- Co-ouderschap: het adres in de wijk is dat van de andere ouder of voogd (1); de inschrijver woont elders.
-- Reglement: welke versie de ouder bij het inschrijven aanvaardde en wanneer (servertijd); leeg bij oudere inschrijvingen.
ALTER TABLE registrations ADD COLUMN co_parent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations ADD COLUMN rules_version TEXT;
ALTER TABLE registrations ADD COLUMN rules_accepted_at TEXT;
