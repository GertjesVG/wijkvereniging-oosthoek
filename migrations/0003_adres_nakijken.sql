-- Adres niet zeker in de wijk volgens de gemeentelijke stratenlijst: de inschrijving wordt aanvaard, maar de beheerder
-- kijkt ze na (1). "Adres goedgekeurd" in het beheer zet ze op 0; een gecorrigeerd adres wordt opnieuw beoordeeld.
ALTER TABLE registrations ADD COLUMN address_review INTEGER NOT NULL DEFAULT 0;
