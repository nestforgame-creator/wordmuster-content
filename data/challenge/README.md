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
- Example (valid): `E T R A O S N`
- Invalid examples:
  - `ETRAOSN` (no spaces)
  - `E,T,R,A,O,S,N` (commas)
  - `E  T R A O S N` (double spaces)
  - `E T R A O S N-` (extra trailing character)

### Runtime handling (game code responsibility)
The game runtime **must**:
1. Remove spaces from `rackSeedLetters`
2. Normalize to uppercase
3. Enforce **letter frequency limits**
   - A letter may be used only as many times as it appears in the rack
   - Words requiring repeated letters are valid **only if** the rack contains that letter multiple times
   - Exception: repetition rules explicitly enabled in `challengeSettings.json` for specific difficulty/timer combinations


Note: The dataset guarantees rack feasibility. Runtime logic enforces letter frequency limits and repetition rules as defined in challengeSettings.json.

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


## WordMuster – Challenge Mode Rules (v1.1)

1) Star Thresholds
Stars	Completion % (F / T)
⭐	≥ 50%
⭐⭐	≥ 75%
⭐⭐⭐	≥ 90%

Fractions round down (e.g., 1.8★ → 1★).

Hints do not reduce stars; they only affect bonuses.

2) Coins – Base, Multipliers, Bonuses
2.1 Base coins per star (by difficulty)
Difficulty	Coins per ★
Easy	2
Medium	4
Hard	6
Professional	8
2.2 Multipliers
Factor	Options	Multiplier
Difficulty	Easy / Medium / Hard / Pro	1.0 / 1.2 / 1.5 / 1.8
Timer	60s / 90s	1.0 / 0.9
2.3 Bonuses
Bonus	Value
Beat Benchmark	+5
No-Hint Clear	+3
First-Clear (this node)	+5
Perfect-Clear (all target words)	+5
2.4 Final coins formula
coins = floor( (stars * coinsPerStar[difficulty] + sum(bonuses))
               * diffMult[difficulty]
               * timerMult[timer] )

3) Hints, Costs & Limits
3.1 Per-round limits & costs
Hint Type	Cost (coins)	Per-Round Limit	Notes
Reveal Letter	5	3	Removes No-Hint bonus
Reveal Word (optional)	12	1	Removes No-Hint bonus

Using any hint removes the No-Hint +3 bonus for that round.

3.2 Reseed Rack (unstick tool)
Action	Cost	Effect
Re-seed current node rack	5 coins	New rack for same node; does not unlock/bypass the node
4) Rewarded Ads → Coins (tickets tied to hint usage)
4.1 Daily ad tickets
Item	Rule
Base tickets per day	2
Tickets gained per hint used (same day)	+1 each
Daily max tickets	10
Reset time	08:00 local

Each ticket allows one rewarded ad view.

Ad reward: +15 coins per completed ad.

Tracking: hintsUsedToday, adsWatchedToday
→ availableTickets = min(2 + hintsUsedToday, 10) - adsWatchedToday.

5) Progression & Gates (Legacy/Quest Map)
5.1 Node unlock rule
To Enter Node N	Requirement
Progression	Clear Node N−1 with ≥ 1★
Skips	Not allowed for unlock (practice preview OK, no stars/coins)
5.2 Gate checks (every 5 nodes)
Gate At Node…	Required Cumulative 3★ (to proceed past prior block)
5	2
10	5
15	9
20	14
25	20
30	27
35	35
40	44
45	54
50 (final)	65

These gates ensure sustained 3★ attempts over time and prevent skimming.

6) Timers (Legacy/Quest)
Mode	Options	Default
Challenge (Legacy/Quest)	60s, 90s	60s
Timer multiplier	60s = 1.0, 90s = 0.9	—
7) Benchmark Bar (Clarity)
Label	Meaning
You	Player progress bar
Benchmark	A strong target score for this rack (not a live opponent)

Tip shown at round start:
“The grey bar shows a strong benchmark for this round. Try to beat it.”

8) Example Calculations

Medium, 60s, 74% (1★), No hints

Base = 1 × 4 = 4

Bonuses = +3 (No-Hint) +5 (First-Clear) = 8

Mult = 1.2 × 1.0

Coins = floor((4+8)×1.2) = 14

Hard, 60s, 90% (3★), No hints, Beat benchmark

Base = 3 × 6 = 18

Bonuses = +3 (No-Hint) +5 (First-Clear) +5 (Beat) = 13

Mult = 1.5 × 1.0

Coins = floor((18+13)×1.5) = 46

Pro, 90s, 75% (2★), 2 hints

Base = 2 × 8 = 16

Bonuses = 0 (No-Hint lost)

Mult = 1.8 × 0.9 = 1.62

Coins = floor(16×1.62) = 25

Daily ad tickets now available = base 2 + hintsUsedToday (≥2), capped at 10

9) Implementation Keys
Key	Value / Notes
Stars function	50 / 75 / 90 thresholds (round down)
No-Hint bonus	+3 only if 0 hints used
Ad tickets	2 base + hintsUsedToday; max 10/day; reset 08:00
Reseed rack	5 coins; same node; no unlock
Node unlock	Must clear previous node with ≥1★
Gate checks	See table above (cumulative 3★ required)
Timer multipliers	60s = 1.0, 90s = 0.9
Benchmark text	Show infoTag on round start
