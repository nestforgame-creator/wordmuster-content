# Challenge Mode Data Contract

This directory contains the versioned data contract for Challenge Mode in WordMuster.

## Files

### `lexicon.json`
Canonical lexicon for challenge and shared word validation.

Rules:
- English only
- Uppercase words only
- Minimum length = 3 letters

### `challengeBoards.json`
Precomputed challenge boards.

Each board defines:
- difficulty band
- timer
- rack seed letters
- total possible words derivable from the rack
- target subset used for scoring

### `challengeSettings.json`
Global challenge configuration.

Defines:
- difficulty bands
- rack letter counts
- timer options
- scoring rules
- stars thresholds
- hint rules

### `legacyMap.json`
Progression map for challenge legacy mode.

Defines:
- node path / letter progression
- sublevels
- unlock rules
- map rendering metadata
- background / letter / UI assets

### `_schema/*.schema.json`
JSON Schemas used to validate the above datasets.

---

## Required metadata fields

All challenge JSON files should include version metadata where applicable:

- `dataVersion`
- `generatedOn`
- `sourceLexiconVersion`

Lexicon itself uses:
- `lexiconVersion`
- `generatedOn`
- `language`

---

## Core gameplay rules

### Rack format
`rackSeedLetters` must be:
- uppercase
- space-separated
- one character per token

Valid example:
```txt
A B C D E F G
