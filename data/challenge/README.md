# Challenge Mode Data Contract

This directory defines the complete, versioned data contract for **Challenge Mode** in WordMuster.
All files here are treated as **immutable inputs** by the game runtime.

---

## Files

### `lexicon.json`
Authoritative dictionary for Challenge Mode.

- Uppercase English words only
- Used for:
  - Rack feasibility validation
  - Word legitimacy checks
  - Board generation
- Updated independently and versioned

---

### `challengeBoards.json`
Precomputed playable boards.

Each board defines:
- Difficulty band
- Timer
- Letter rack
- All possible words derivable from the rack
- Target subset used for scoring

Boards are **static** and selected randomly at runtime.

---

### `challengeSettings.json`
Global Challenge Mode configuration.

Defines:
- Difficulty bands (letter count, repetition rules)
- Supported timers
- Scoring modes
- Hint types and coin costs
- Star / completion thresholds

---

### `_schema/*.schema.json`
JSON Schemas used to validate all Challenge Mode datasets.

Schemas enforce:
- Required headers
- Field formats
- Enum safety
- Structural consistency

---

## Required Header Fields (All JSON Files)

Every Challenge Mode data file **must include**:

- `generatedOn`  
  ISO-8601 UTC timestamp of generation

- `dataVersion`  
  Version of this dataset release (e.g. `1.0.0`)

- `sourceLexiconVersion`  
  Links boards/settings to the exact lexicon build used

These fields enable traceability, rollback, and safe regeneration.

---

## Gameplay Selection Logic (Runtime)

At runtime, the game must:

1. Load `challengeSettings.json`
2. Load `lexicon.json`
3. Load `challengeBoards.json`
4. When a round starts:
   - Filter boards by:
     - `difficultyBand`
     - `timerSeconds`
   - Select **one random board**

Scoring logic uses:
- `totalPossibleWordsCsv`  
  → Completion Mode A: `Found / Total Possible`
- `targetWordsCsv`  
  → Completion Mode B: `Found / Target`

---

## Rack Format Rules

- `rackSeedLetters` are **space-separated uppercase letters**  
  Example:
