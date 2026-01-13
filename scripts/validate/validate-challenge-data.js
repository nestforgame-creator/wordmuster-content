/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020"); // draft 2020-12
const addFormats = require("ajv-formats");

function loadJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Invalid JSON: ${p}`);
    throw e;
  }
}

function validateFile(ajv, schemaPath, dataPath) {
  const schema = loadJson(schemaPath);
  const data = loadJson(dataPath);

  const validate = ajv.compile(schema);
  const ok = validate(data);

  if (!ok) {
    console.error(`\n❌ Schema validation failed: ${dataPath}`);
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(1);
  }

  console.log(`✅ Valid: ${path.basename(dataPath)}`);
}

// -----------------------
// Word utilities
// -----------------------
function normalizeWord(w) {
  return String(w || "").trim().toUpperCase();
}

function splitCsv(csv) {
  return String(csv || "")
    .split(",")
    .map(w => normalizeWord(w))
    .filter(Boolean);
}

/**
 * Supports BOTH formats:
 *  - "A B C D E F G H"
 *  - "ABCDEFGH"
 */
function splitRackLetters(rackSeedLetters) {
  const s = String(rackSeedLetters || "").trim().toUpperCase();
  if (!s) return [];

  // If it contains whitespace, treat as tokenized letters
  if (/\s/.test(s)) {
    return s.split(/\s+/).filter(Boolean);
  }

  // Otherwise treat as a continuous string of letters
  return s.split("").filter(Boolean);
}

function rackCounts(letters) {
  const m = new Map();
  letters.forEach(ch => m.set(ch, (m.get(ch) || 0) + 1));
  return m;
}

function canFormWordFromRack(word, rackCountMap) {
  const needed = new Map();
  for (const ch of word) {
    needed.set(ch, (needed.get(ch) || 0) + 1);
  }
  for (const [ch, cnt] of needed.entries()) {
    if ((rackCountMap.get(ch) || 0) < cnt) return false;
  }
  return true;
}

// -----------------------
// Lexicon loader (supports all known formats)
//   A) { words: ["WORD", ...] }  <-- current contract
//   B) { lexicon: ["WORD", ...] } (legacy)
//   C) ["WORD", ...]             (legacy)
// -----------------------
function loadLexiconSet(challengeDir) {
  const lexPath = path.join(challengeDir, "lexicon.json");
  const lex = loadJson(lexPath);

  let arr = null;
  if (Array.isArray(lex)) arr = lex;
  else if (Array.isArray(lex.words)) arr = lex.words;
  else if (Array.isArray(lex.lexicon)) arr = lex.lexicon;

  if (!Array.isArray(arr)) {
    console.error(`❌ lexicon.json unsupported format at: ${lexPath}`);
    console.error(`   Expected: ["WORD"] OR { words:[...] } OR { lexicon:[...] }`);
    process.exit(1);
  }

  const set = new Set(arr.map(w => normalizeWord(w)).filter(Boolean));
  if (set.size === 0) {
    console.error("❌ lexicon.json produced an empty set after normalization.");
    process.exit(1);
  }
  return set;
}

// -----------------------
// Challenge boards word validation
// -----------------------
function getBoardsArray(boardsJson) {
  if (Array.isArray(boardsJson)) return boardsJson;
  if (Array.isArray(boardsJson.boards)) return boardsJson.boards;
  if (Array.isArray(boardsJson.challengeBoards)) return boardsJson.challengeBoards;
  if (Array.isArray(boardsJson.rows)) return boardsJson.rows; // fallback safety
  return null;
}

function validateBoardsWords({ challengeDir, lexSet }) {
  const boardsPath = path.join(challengeDir, "challengeBoards.json");
  const boardsJson = loadJson(boardsPath);

  const boards = getBoardsArray(boardsJson);
  if (!Array.isArray(boards)) {
    console.error("❌ challengeBoards.json must be an array OR contain { boards: [] }");
    console.error(`   Path: ${boardsPath}`);
    process.exit(1);
  }

  // Default rack cap is 8. Override in CI if needed:
  // CHALLENGE_RACK_MAX=9 npm run validate:challenge
  const MAX_RACK = Number(process.env.CHALLENGE_RACK_MAX || 8);

  let issues = 0;

  boards.forEach((b, idx) => {
    const boardId = b.boardId || `board_${idx}`;

    if (!b.rackSeedLetters) {
      console.error(`❌ ${boardId}: missing rackSeedLetters`);
      issues++;
      return;
    }

    const rackLetters = splitRackLetters(b.rackSeedLetters);

    // Rack content validation: only A-Z single letters
    const bad = rackLetters.filter(ch => !/^[A-Z]$/.test(ch));
    if (bad.length > 0) {
      console.error(
        `❌ ${boardId}: rackSeedLetters contains invalid tokens: ${JSON.stringify(bad)} (raw="${b.rackSeedLetters}")`
      );
      issues++;
    }

    // Rack size cap
    if (rackLetters.length > MAX_RACK) {
      console.error(
        `❌ ${boardId}: rack has ${rackLetters.length} letters > max ${MAX_RACK} (raw="${b.rackSeedLetters}")`
      );
      issues++;
    }

    const rackMap = rackCounts(rackLetters);

    const totalWords = splitCsv(b.totalPossibleWordsCsv);
    const targetWords = splitCsv(b.targetWordsCsv);

    // (1) Count integrity checks (only if counts exist)
    if (typeof b.totalPossibleWordsCount === "number" && totalWords.length !== b.totalPossibleWordsCount) {
      console.error(`❌ ${boardId}: totalPossibleWordsCount=${b.totalPossibleWordsCount} but csv has ${totalWords.length}`);
      issues++;
    }
    if (typeof b.targetWordsCount === "number" && targetWords.length !== b.targetWordsCount) {
      console.error(`❌ ${boardId}: targetWordsCount=${b.targetWordsCount} but csv has ${targetWords.length}`);
      issues++;
    }

    // (2) Duplicates
    const totalSet = new Set(totalWords);
    if (totalSet.size !== totalWords.length) {
      console.error(`❌ ${boardId}: totalPossibleWordsCsv contains duplicates`);
      issues++;
    }
    const targetSet = new Set(targetWords);
    if (targetSet.size !== targetWords.length) {
      console.error(`❌ ${boardId}: targetWordsCsv contains duplicates`);
      issues++;
    }

    // (3) Target must be subset of totalPossible (sanity rule)
    targetWords.forEach(w => {
      if (!totalSet.has(w)) {
        console.error(`❌ ${boardId}: target word not in totalPossibleWordsCsv: "${w}"`);
        issues++;
      }
    });

    // (4) Validate ALL words (totalPossible + target):
    // - length >= 3
    // - in lexicon
    // - rack-feasible (frequency-limited)
    const allWords = [...new Set([...totalWords, ...targetWords])];

    allWords.forEach(w => {
      if (w.length < 3) {
        console.error(`❌ ${boardId}: word too short (<3): "${w}"`);
        issues++;
      }
      if (!lexSet.has(w)) {
        console.error(`❌ ${boardId}: word not in lexicon: "${w}"`);
        issues++;
      }
      if (!canFormWordFromRack(w, rackMap)) {
        console.error(`❌ ${boardId}: word not formable from rack "${b.rackSeedLetters}": "${w}"`);
        issues++;
      }
    });
  });

  if (issues > 0) {
    console.error(`\n❌ challengeBoards word validation failed (${issues} issues).`);
    process.exit(1);
  }

  console.log("✅ challengeBoards: lexicon + length≥3 + rack feasibility + count checks + rack cap passed.");
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const challengeDir = path.join(repoRoot, "data", "challenge");
  const schemaDir = path.join(challengeDir, "_schema");

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // 1) Schema validation first
  validateFile(ajv, path.join(schemaDir, "lexicon.schema.json"), path.join(challengeDir, "lexicon.json"));
  validateFile(ajv, path.join(schemaDir, "challengeBoards.schema.json"), path.join(challengeDir, "challengeBoards.json"));
  validateFile(ajv, path.join(schemaDir, "challengeSettings.schema.json"), path.join(challengeDir, "challengeSettings.json"));
  validateFile(ajv, path.join(schemaDir, "legacyMap.schema.json"), path.join(challengeDir, "legacyMap.json"));

  // 2) Word-level validation (boards)
  const lexSet = loadLexiconSet(challengeDir);
  validateBoardsWords({ challengeDir, lexSet });

  console.log("\n✅ All Challenge Mode JSON validated successfully.\n");
}

main();
