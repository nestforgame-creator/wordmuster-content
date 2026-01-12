# Story Mode Data Contract (WordMuster)

This directory defines the complete, versioned data contract for **Story Mode** in WordMuster.
All files here are treated as **immutable inputs** by the runtime.

> Story Mode shares the same lexicon as Challenge Mode:
> `data/challenge/lexicon.json`
> Story does not maintain its own lexicon file.

---

## Files

### `collections.json`
Defines story collections (e.g., AESOP).

### `stories.json`
Defines stories under collections (title, moral, ordering, activation).

### `chapters.json`
Defines the chapters of each story, including the chapter text template and star thresholds.

### `chapterWords.json`
Defines the playable rack + target word list for each chapter.

### `storySettings.json` (recommended)
Global Story Mode settings (timers, star thresholds policy, rack letter counts by difficulty, etc.)

### `_schema/*.schema.json`
JSON Schema validation for Story Mode datasets.

---

## Required Header Fields (All Story JSON Files)

Every Story Mode data file must include:

- `dataVersion`  
  Version of this dataset release (e.g., `1.0.0`)

- `generatedOn`  
  ISO-8601 UTC timestamp of generation

- `sourceLexiconVersion`  
  Links Story content to the exact lexicon build used (same lexicon as Challenge Mode)

- `language`  
  Must be `"EN"`

These fields enable traceability, rollback, and safe regeneration.

---

## Core Gameplay Rules (Enforced by Validators)

### 1) Target words and placeholders
- Each `chapterTextTemplate` must contain **exactly 12 bracketed placeholders**: `[WORD]`
- In `chapterWords.json`, `targetWordsCsv` must contain:
  - **first 12 words = TARGET words (used for stars)**
  - additional **bonus words = optional (6–8 recommended)**

### 2) Word validity
- All words must be:
  - UPPERCASE
  - length **≥ 3**
  - present in the shared lexicon (`data/challenge/lexicon.json`)

### 3) Rack feasibility (frequency-limited)
- Every word in `targetWordsCsv` must be constructible from `rackSeedLetters`
- A letter may be used only as many times as it appears in the rack
- If a word requires repeated letters, the rack must include that letter multiple times

### 4) Rack format
- `rackSeedLetters` must be **space-separated uppercase letters**
  - Valid: `S T E A D Y W`
  - Invalid: `STEADYW`, `S,T,E,A,D,Y,W`

### 5) Star calculation
- Stars are calculated based on **Found / Target (first 12 words)**

---

## Validation & Workflow

Validation is run via GitHub Actions and locally:

- Challenge: `npm run validate:challenge`
- Story: `npm run validate:story`
- All: `npm run validate:all`

All updates must be committed as **atomic releases**:
- Update story files + schemas + validators together
- Partial commits are not allowed

---

