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

- `rackSeedLetters` **must be space-separated uppercase letters**
- Example (valid): E T R A O S N- Invalid formats:
- `ETRAOSN`
- `E,T,R,A,O,S,N`
- `E T R A O S N -`

### Runtime handling (game code responsibility)
The game runtime **must**:
1. Remove spaces from `rackSeedLetters`
2. Normalize to uppercase
3. Enforce **letter frequency limits**
 - A letter may be used only as many times as it appears in the rack
 - Words requiring repeated letters are valid **only if** the rack contains that letter multiple times
 - (Exception: repetition rules explicitly enabled in `challengeSettings.json` for certain difficulty/timer combinations)

---

## Update Workflow (Required)

All Challenge Mode data updates **must follow this sequence** to ensure traceability and compatibility:

1. Update `lexicon.json`
2. Bump `lexiconVersion`
3. Regenerate `challengeBoards.json`
4. Bump `dataVersion`
5. Set `sourceLexiconVersion` in:
 - `challengeBoards.json`
 - `challengeSettings.json`
6. Validate all JSON files against schemas in `_schema/`
7. Commit **all changes together** as **one atomic release**

Partial commits are not allowed.

---

## Stability Rule

Schemas and field names are **frozen** once consumed by the game runtime.

Future changes must follow **one** of these rules:
- Add **new optional fields only** (never breaking changes), or
- Create a **new `dataVersion`** and regenerate dependent datasets

Breaking changes to existing fields or schemas are **not permitted**.
