# data/ — starter data (read-only)

`raw/` holds the challenge's Schoten KBO sample exactly as downloaded (checksums in `raw/source-metadata.json`). Never edit these files; the importer (`backend/scripts/import_data.py`) reads the GeoJSON (superset of the CSV: adds phone, e-mail, doorhaling fields, NBB URL).

Facts: 1,000 rows = 457 enterprises + 543 establishments · empty = single space `' '` · placeholder dates `1900-01-01` / `9999-12-31` · registry numbers keep leading zeros · Paalstraat has the most rows (35) · only 28 establishments have their parent in the sample.

Source and licence: VKBO (Digitaal Vlaanderen), Modellicentie Gratis Hergebruik v1.0. Attribution: "publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister."
