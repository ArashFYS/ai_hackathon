-- One row per KBO record (enterprise or establishment). Column names are English;
-- the `raw` column keeps the original VKBO properties JSON for reference.
CREATE TABLE IF NOT EXISTS records (
  nr                     TEXT PRIMARY KEY,          -- Ondernemingsnr (text: leading zeros)
  record_type            TEXT NOT NULL,             -- 'enterprise' | 'establishment'
  parent_nr              TEXT,                      -- Ondernemingsnr_maatsch_zetel (establishments only)
  name                   TEXT,                      -- Maatschappelijke_naam
  trade_name             TEXT,                      -- Commerciele_naam
  short_name             TEXT,                      -- Afgekorte_naam
  search_name            TEXT,                      -- Zoeknaam (upper-cased concat)
  entity_type            TEXT,                      -- Type_onderneming
  legal_form             TEXT,                      -- Rechtsvorm
  legal_status           TEXT,                      -- Rechtstoestand
  registration_date      TEXT,                      -- Datum_inschrijving (YYYY-MM-DD)
  start_date             TEXT,                      -- Startdatum
  cessation_date         TEXT,                      -- Datum_stopzetting
  cessation_reason       TEXT,                      -- Reden_stopzetting
  closing_date           TEXT,                      -- Datum_afsluiting
  exofficio_strike_start TEXT,                      -- Begindat_ambtsh_doorhaling
  exofficio_strike_end   TEXT,                      -- Einddat_ambtsh_doorhaling
  exofficio_strike_reason TEXT,                     -- Reden_ambtsh_doorhaling
  kbo_street             TEXT,
  kbo_housenr            TEXT,
  kbo_box                TEXT,
  kbo_postcode           TEXT,
  kbo_municipality       TEXT,
  kbo_niscode            TEXT,
  address_strike_date    TEXT,                      -- Datum_adresdoorhaling
  address_strike_reason  TEXT,                      -- Reden_adresdoorhaling
  ar_street              TEXT,                      -- Flemish address register match
  ar_housenr             TEXT,
  ar_box                 TEXT,
  ar_postcode            TEXT,
  phone                  TEXT,
  email                  TEXT,
  nace_vat               TEXT,
  nace_vat_desc          TEXT,
  nace_rsz               TEXT,
  nace_rsz_desc          TEXT,
  staff_class            TEXT,                      -- Personeelsklasse
  nbb_url                TEXT,                      -- JAARREK_URL_NBB
  lat                    REAL,
  lng                    REAL,
  source                 TEXT NOT NULL,             -- 'starter-geojson' | 'vkbo-api'
  fetched_at             TEXT NOT NULL,             -- ISO timestamp of retrieval
  raw                    TEXT NOT NULL              -- original properties JSON
);
CREATE INDEX IF NOT EXISTS idx_records_parent ON records(parent_nr);
CREATE INDEX IF NOT EXISTS idx_records_street ON records(kbo_street, kbo_housenr);
CREATE INDEX IF NOT EXISTS idx_records_search ON records(search_name);

-- Officer-logged observations ("Bewijs van activiteit").
CREATE TABLE IF NOT EXISTS evidence (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  record_nr         TEXT NOT NULL REFERENCES records(nr),
  source            TEXT NOT NULL,                  -- google_maps | street_view | website | terreinbezoek | kbo | nbb | andere
  url               TEXT,
  observation       TEXT NOT NULL,                  -- free text: what was seen
  observed_activity TEXT,                           -- activity seen on the ground (compare with NACE)
  conclusion        TEXT NOT NULL,                  -- actief | niet_actief | onduidelijk
  observed_at       TEXT NOT NULL,                  -- YYYY-MM-DD
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_record ON evidence(record_nr);

-- Proposed changes; only status='bevestigd' rows are ever exported ("published").
-- record_nr is NULL for kind='missing_establishment' (a business seen on the street that has no KBO
-- record at that address); those rows carry the observed address/name/source instead.
-- db.apply_schema() migrates an older table (NOT NULL record_nr / missing columns) in place.
CREATE TABLE IF NOT EXISTS proposals (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  record_nr         TEXT REFERENCES records(nr),    -- NULL for missing_establishment
  kind              TEXT NOT NULL,                  -- status_change | address_check | missing_establishment | field_correction
  field             TEXT,
  current_value     TEXT,
  proposed_value    TEXT,
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open',   -- open | bevestigd | afgewezen
  created_at        TEXT NOT NULL,
  decided_at        TEXT,
  address           TEXT,                           -- "Paalstraat 20, 2900 Schoten" (missing_establishment)
  observed_name     TEXT,                           -- name as seen on the street / online
  observed_activity TEXT,                           -- activity seen (free text)
  source            TEXT,                           -- google_maps | street_view | terreinbezoek | website | andere
  source_url        TEXT,
  observed_at       TEXT                            -- YYYY-MM-DD
);
CREATE INDEX IF NOT EXISTS idx_proposals_record ON proposals(record_nr);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Cached NBB Balanscentrale responses, keyed by enterprise number (refreshed after 1 day).
CREATE TABLE IF NOT EXISTS nbb_cache (
  nr         TEXT PRIMARY KEY,
  fetched_at TEXT NOT NULL,
  payload    TEXT NOT NULL
);
