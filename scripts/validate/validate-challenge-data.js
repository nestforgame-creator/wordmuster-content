/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function validateFile(ajv, schemaPath, dataPath) {
  const schema = loadJson(schemaPath);
  const data = loadJson(dataPath);

  const validate = ajv.compile(schema);
  const ok = validate(data);

  if (!ok) {
    console.error(`\n❌ Validation failed: ${dataPath}`);
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(1);
  }

  console.log(`✅ Valid: ${path.basename(dataPath)}`);
}

function normalizeWord(w) {
  return String(w || "").trim().toUpperCase();
}

function splitCsv(csv) {
  return String(csv || "")
    .split(",")
    .map(w => normalizeWord(w))
    .filter(Boolean);
}

function splitRackLetters(rackSeedLetters) {
  return String(rackSeedLetters || "")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
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

function loadLexiconSet(challengeDir) {
  const lex = loadJson(path.join(challengeDir, "lexicon.json"));

  // Support both formats:
  // A) { lexicon: ["WORD", ...] }
  // B) ["WORD", ...]
  const arr = Array.isArray(lex) ? lex : lex.lexicon;

  if (!Array.isArray(arr)) {
    throw new Error("lexicon.json must be an array or { lexicon: [...] }");
  }

  return new Set(arr.map(w => normalizeWord(w)).filter(Boolean));
}

function validateBoardsWords({ challengeDir, lexSet }) {
  const boardsPath = path.join(challengeDir, "challengeBoards.json");
  const boardsJson = loadJson(boardsPath);

  const boards = boardsJson.boards;
  if (!Array.isArray(boards)) {
    console.error("❌ challengeBoards.json must have a top-level { boards: [] } array");
    process.exit(1);
  }

  let issues = 0;

  boards.forEach((b, idx) => {
    const boardId = b.boardId || `board_${idx}`;
    const rackLetters = splitRackLetters(b.rackSeedLetters);
    const rackMap = rackCounts(rackLetters);

    const totalWords = splitCsv(b.totalPossibleWordsCsv);
    const targetWords = splitCsv(b.targetWordsCsv);

    // (1) Count integrity checks
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

    // (3) Target must be subset of totalPossible (recommended sanity rule)
    targetWords.forEach(w => {
      if (!totalSet.has(w)) {
        console.error(`❌ ${boardId}: target word not in totalPossibleWordsCsv: "${w}"`);
        issues++;
      }
    });

    // (4) Validate ALL words (totalPossible + target) are:
    // - length >= 3
    // - in lexicon
    // - rack-feasible
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

  console.log("✅ challengeBoards: lexicon + length≥3 + rack feasibility + count checks passed.");
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const challengeDir = path.join(repoRoot, "data", "challenge");
  const schemaDir = path.join(challengeDir, "_schema");

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // 1) Schema validation first
  validateFile(
    ajv,
    path.join(schemaDir, "lexicon.schema.json"),
    path.join(challengeDir, "lexicon.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "challengeBoards.schema.json"),
    path.join(challengeDir, "challengeBoards.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "challengeSettings.schema.json"),
    path.join(challengeDir, "challengeSettings.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "legacyMap.schema.json"),
    path.join(challengeDir, "legacyMap.json")
  );

  // 2) Word-level validation
  const lexSet = loadLexiconSet(challengeDir);
  validateBoardsWords({ challengeDir, lexSet });

  console.log("\n✅ All Challenge Mode JSON validated successfully.\n");
}

main();
