Purpose:
  Challenge Mode data contract for WordMuster.

Files:
  challengeSettings.json – global rules (difficulty, timers, scoring modes, hints)
  challengeBoards.json – the 20 boards per level (racks + possible words + targets)
  lexicon.json – allowed word list used for generation and validation
  _schema/*.schema.json – JSON Schemas used to validate the above
  Required header fields (all JSONs)
  dataVersion (string) – version of this dataset release
  generatedOn (ISO date-time) – when generated
  sourceLexiconVersion (string) – ties boards/settings to the lexicon version used

Rack formatting rule:
  Must be "A B C D ..." (space-separated), uppercase

Scoring modes supported
  Mode A: foundWords / totalPossibleWordsCount (default)
  Mode B: foundWords / targetWordsCount (optional toggle)

Update workflow:
  Update lexicon → bump lexiconVersion
  Regenerate boards → bump dataVersion and set sourceLexiconVersion to lexiconVersion
  Validate JSON against schemas

Commit as one release
