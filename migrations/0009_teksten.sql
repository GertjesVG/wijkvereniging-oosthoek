-- Teksten van de website die de beheerder zelf aanpast (/beheer/, "Teksten van de website"; zie server/teksten.ts).
-- Eén rij per aangepaste tekst. value NULL = de oorspronkelijke tekst uit de code (src/content/teksten.ts);
-- previous = de tekst vóór de laatste wijziging (NULL = de oorspronkelijke), voor "Vorige versie terugzetten".
-- Zonder rij toont de website de oorspronkelijke tekst. Deze migratie voegt alleen deze nieuwe, lege tabel toe:
-- evenementen, inschrijvingen, kinderen, mails en GPS blijven ongemoeid.
-- Publiceren: eerst deze migratie op de productiedatabase, daarna de code. Omgekeerd kan ook: zonder tabel toont de
-- website de oorspronkelijke teksten en meldt het beheer dat de tekstopslag nog niet ingesteld is.
CREATE TABLE site_texts (
  key TEXT PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 80),
  value TEXT CHECK (value IS NULL OR length(value) BETWEEN 1 AND 2000),
  previous TEXT,
  updated_at TEXT NOT NULL
);
