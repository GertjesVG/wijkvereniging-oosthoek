-- Bezoekersteller (/beheer/, "Bezoekersstatistieken"; zie server/bezoek.ts en src/bezoek/).
-- Eén rij per dag (Belgische tijd) en per pagina, met alleen twee aantallen: paginaweergaven en bezoeken.
-- Geen IP-adres, cookie, browsergegevens of ander kenmerk van een bezoeker: uit deze tabel is niemand te herkennen.
-- Deze migratie voegt alleen deze nieuwe, lege tabel toe: evenementen, inschrijvingen, kinderen, mails, GPS en teksten
-- blijven ongemoeid.
-- Publiceren: eerst deze migratie op de productiedatabase, daarna de code. Omgekeerd kan ook: zonder tabel telt de website
-- niets (bezoekers merken daar niets van) en meldt het beheer dat de bezoekersteller nog niet ingesteld is.
CREATE TABLE visit_days (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  page TEXT NOT NULL CHECK (length(page) BETWEEN 1 AND 60),
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  visits INTEGER NOT NULL DEFAULT 0 CHECK (visits >= 0),
  PRIMARY KEY (day, page)
);
