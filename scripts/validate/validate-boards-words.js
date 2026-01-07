/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseCsv(csv) {
  return csv.split(",").map(s => s.trim()).filter(Boolean);
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const dataDir = path.join(repoRoot, "data", "challenge");

  const lexicon = loadJson(path.join(dataDir, "lexicon.json"));
  const boards = loadJson(path.join(dataDir, "challengeBoards.json"));

  // lexicon.json can be either: { words:[...] } or a raw array [...]
  const wordsArray = Array.isArray(lexicon) ? lexicon : (lexicon.words || []);
  const lexSet = new Set(wordsArray.map(w => String(w).trim().toUpperCase()));

  if (lexSet.size === 0) {
    console.error("❌ Lexicon set is empty. Check lexicon.json structure.");
    process.exit(1);
  }

  const errors = [];

  for (const b of boards.boards) {
    const allWords = [
      ...parseCsv(b.totalPossibleWordsCsv),
      ...parseCsv(b.targetWordsCsv)
    ];

    for (const w of allWords) {
      const word = String(w).trim().toUpperCase();

      if (word.length < 3) {
        errors.push({ boardId: b.boardId, issue: "WORD_TOO_SHORT", word });
        continue;
      }

      if (!lexSet.has(word)) {
        errors.push({ boardId: b.boardId, issue: "NOT_IN_LEXICON", word });
      }
    }
  }

  if (errors.length) {
    console.error(`\n❌ Board word validation failed. Issues: ${errors.length}`);
    console.error(JSON.stringify(errors.slice(0, 50), null, 2));
    console.error("\n(showing first 50 only)");
    process.exit(1);
  }

  console.log("✅ All board words are in lexicon and length >= 3.");
}

main();

