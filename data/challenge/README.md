Challenge Mode Data Contract

This directory contains the versioned data contract for Challenge Mode in WordMuster.

All JSON files here are treated as immutable runtime inputs and validated through the schemas located in _schema/.

These datasets define the dictionary, challenge boards, scoring configuration, and progression map used by the game.

Files
lexicon.json

Canonical lexicon for challenge and shared word validation.

Schema structure:

{
  "lexiconVersion": "string",
  "generatedOn": "ISO timestamp",
  "language": "EN",
  "words": []
}

Rules:

English words only

Uppercase words only

Minimum length = 3 letters

Characters allowed: A–Z only

Words must be unique

The lexicon is used for:

rack feasibility validation

board generation

runtime word legitimacy checks

challengeBoards.json

Precomputed challenge boards.

Schema structure:

{
  "dataVersion": "string",
  "generatedOn": "ISO timestamp",
  "sourceLexiconVersion": "string",
  "boards": []
}

Each board defines:

boardId

difficultyBand

timerSeconds

rackSeedLetters

totalPossibleWordsCount

targetWordsCount

totalPossibleWordsCsv

targetWordsCsv

isActive

Each board represents a fully precomputed rack.

The runtime selects boards randomly filtered by difficulty and timer.

challengeSettings.json

Global challenge configuration.

Defines:

difficulty bands

rack letter counts

timer options

scoring rules

star thresholds

hint rules

Schema structure:

{
  "dataVersion": "",
  "generatedOn": "",
  "sourceLexiconVersion": "",
  "language": "EN",
  "difficultyBands": [],
  "timers": [],
  "scoring": {},
  "hints": {}
}
legacyMap.json

Progression map for challenge legacy mode.

Defines:

node path / letter progression

optional sublevels

unlock rules

map rendering metadata

background / letter / UI assets

Nodes correspond to letter milestones in the legacy progression system.

_schema/*.schema.json

JSON Schemas used to validate the above datasets.

Schemas enforce:

required headers

field formats

enums and allowed values

structural consistency

All validation is executed automatically in GitHub Actions CI.

Required metadata fields

All challenge JSON files should include version metadata where applicable:

dataVersion

generatedOn

sourceLexiconVersion

These fields enable:

traceability

deterministic regeneration

rollback safety

Lexicon metadata

lexicon.json uses:

lexiconVersion

generatedOn

language

Core gameplay rules
Rack format

rackSeedLetters must be:

uppercase

space-separated

one character per token

Valid example:

A B C D E F G

Invalid examples:

ABCDEFG
A,B,C,D,E,F,G
A  B C D E F
Runtime handling

The game runtime must:

Remove spaces from the rack

Normalize letters to uppercase

Enforce letter frequency limits

Example:

Rack

E T R A O S N

Valid word

STONE

Invalid word

TENT

because the rack only contains one T.

Letter reuse rules may vary depending on difficulty band and timer configuration defined in challengeSettings.json.

Difficulty rack sizes

Challenge mode uses:

Difficulty	Rack Letters
EASY	7
MEDIUM	8
HARD	10
PRO	12

Higher difficulty levels may allow:

larger racks

letter reuse

higher score multipliers

Timers

Supported timers:

30
60
90

These values are defined in challengeSettings.json.

Scoring modes

Two completion calculations are supported.

Mode A
Found Words / Total Possible Words
Mode B
Found Words / Target Words

Both rely on the CSV fields defined in challengeBoards.json.

Star thresholds
Stars	Completion %
⭐	≥ 50%
⭐⭐	≥ 75%
⭐⭐⭐	≥ 90%

Fractions round down.

Example:

1.8 stars → 1 star
Coins system
Base coins per star
Difficulty	Coins
Easy	2
Medium	4
Hard	6
Professional	8
Difficulty multipliers
Difficulty	Multiplier
Easy	1.0
Medium	1.2
Hard	1.5
Pro	1.8
Timer multipliers
Timer	Multiplier
60s	1.0
90s	0.9
Bonuses
Bonus	Value
Beat Benchmark	+5
No Hint Clear	+3
First Clear	+5
Perfect Clear	+5
Coin formula
coins = floor(
 (stars * coinsPerStar[difficulty] + bonuses)
 * difficultyMultiplier
 * timerMultiplier
)
Hints

Hints cost coins and affect bonuses.

Hint types
Hint	Cost	Limit
Reveal Letter	5	3
Reveal Word	12	1

Using any hint removes the No-Hint bonus.

Reseed rack

Players can regenerate the rack if stuck.

Cost: 5 coins
Effect: new rack for the same node

This does not unlock nodes or bypass progression rules.

Rewarded ads

Players may earn coins through rewarded ads.

Daily limits:

Base tickets: 2

+1 ticket per hint used

Maximum 10 tickets per day

Reward per ad:

+15 coins

Daily reset time:

08:00 local time
Progression rules
Node unlock

To enter Node N:

Clear Node N-1 with ≥ 1 star

Skipping nodes is not allowed.

Gate system

Every 5 nodes the player must accumulate minimum 3-star clears.

Gate	Required 3★
5	2
10	5
15	9
20	14
25	20
30	27
35	35
40	44
45	54
50	65
Benchmark indicator

A grey progress bar may display a benchmark score for the rack.

This represents a strong expected performance target and is not a live opponent.

Validation

All datasets are validated automatically in CI.

Run locally or via GitHub Actions:

npm run validate:challenge

Validation checks:

JSON schema compliance

lexicon format

board word validity

rack feasibility

scoring integrity

Update workflow

All challenge data updates must follow this order:

Update lexicon.json

Bump lexiconVersion

Regenerate challengeBoards.json

Bump dataVersion

Update sourceLexiconVersion

Validate schemas

Commit all datasets together

Partial commits are not allowed.

Stability rule

Schemas and field names are frozen once used by the runtime.

Future updates must follow one of these rules:

Add optional fields only, or

Release a new versioned dataset

Breaking existing fields is not permitted.

Implementation note

This repository defines data contracts only.

Game runtime code must implement:

rack validation

lexicon membership checks

scoring calculations

unlock rules

economy logic

Schemas guarantee data structure.
Game code guarantees game behaviour.
