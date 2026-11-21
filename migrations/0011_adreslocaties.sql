-- Kaartlocaties van de unieke woonadressen van ingeschreven kinderen (beheer → "Kinderen op kaart", server/locaties.ts).
-- Eén rij per evenement en genormaliseerd adres (straat|huisnummer|bus): zo wordt een adres maar één keer opgezocht bij de
-- geolocatiedienst van Digitaal Vlaanderen. Alleen het adres en de gevonden plaats, nooit namen. status:
--   gevonden      = exact dit adres in het Adressenregister, positie van het gebouw of door de beheerder van het register;
--   onzeker       = exact adres, maar de positie is geschat (geïnterpoleerd) of ligt buiten de wijk;
--   niet_gevonden = geen exact adres gevonden (lat/lon leeg; er wordt nooit een plaats verzonnen);
--   handmatig     = door een beheerder op de kaart aangeduid.
-- Wordt samen met de andere persoonsgegevens gewist (server/wissen.ts).
CREATE TABLE address_locations (
  event_id TEXT NOT NULL REFERENCES events (id),
  address_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('gevonden', 'onzeker', 'niet_gevonden', 'handmatig')),
  lat REAL,
  lon REAL,
  -- Soort positie volgens de dienst (LocationType), bv. basisregisters_huisnummer_afgeleidVanObject.
  precision TEXT,
  -- Het adres zoals de dienst het teruggaf, of de reden waarom het niet betrouwbaar is.
  matched TEXT,
  detail TEXT,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (event_id, address_key),
  CHECK ((status = 'niet_gevonden') = (lat IS NULL)),
  CHECK ((lat IS NULL) = (lon IS NULL))
);
