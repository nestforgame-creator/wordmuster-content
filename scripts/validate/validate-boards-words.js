/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
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

function countLetters(letters) {
  const m = new Map();
  letters.forEach(ch => m.set(ch, (m.get(ch) || 0) + 1));
  return m;
}

function canFormWordFromRack(word, rackCounts) {
  const needed = new Map();
  for (const ch of word) {
    needed.set(ch, (needed.get(ch) || 0) + 1);
  }
  for (const [ch, cnt] of needed.entries()) {
    if ((rackCounts.get(ch) || 0) < cnt) {
      return false;
    }
  }
  return true;
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const challengeDir = path.join(repoRoot, "data", "challenge");

  const lexicon = loadJson(path.join(challengeDir, "lexicon.json"));
  const challengeBoards = loadJson(path.join(challengeDir, "challengeBoards.json"));
  const challengeSettings = loadJson(path.join(challengeDir, "challengeSettings.json"));

  const lexSet = new Set((lexicon.words || []).map(normalizeWord));
  const boards = challengeBoards.boards || [];
  const difficultyBands = challengeSettings.difficultyBands || [];

  const rackSizeByBand = {};
  difficultyBands.forEach(b => {
    rackSizeByBand[b.id] = b.rackLetterCount;
  });

  let issues = 0;

  boards.forEach((board, idx) => {
    const boardId = board.boardId || `board[${idx}]`;
    const rack = splitRackLetters(board.rackSeedLetters);
    const rackMap = countLetters(rack);

    const expectedRackSize = rackSizeByBand[board.difficultyBand];
    if (expectedRackSize && rack.length !== expectedRackSize) {
      console.error(
        `❌ ${boardId}: rack has ${rack.length} letters, expected ${expectedRackSize} for ${board.difficultyBand}`
      );
      issues++;
    }

    const totalWords = splitCsv(board.totalPossibleWordsCsv);
    const targetWords = splitCsv(board.targetWordsCsv);

    if (board.totalPossibleWordsCount !== totalWords.length) {
      console.error(
        `❌ ${boardId}: totalPossibleWordsCount=${board.totalPossibleWordsCount} but CSV has ${totalWords.length}`
      );
      issues++;
    }

    if (board.targetWordsCount !== targetWords.length) {
      console.error(
        `❌ ${boardId}: targetWordsCount=${board.targetWordsCount} but CSV has ${targetWords.length}`
      );
      issues++;
    }

    const totalWordSet = new Set(totalWords);

    targetWords.forEach(w => {
      if (!totalWordSet.has(w)) {
        console.error(`❌ ${boardId}: target word not present in totalPossibleWordsCsv: "${w}"`);
        issues++;
      }
    });

    [...totalWords, ...targetWords].forEach(w => {
      if (w.length < 3) {
        console.error(`❌ ${boardId}: word too short (<3): "${w}"`);
        issues++;
      }
      if (!lexSet.has(w)) {
        console.error(`❌ ${boardId}: word not in lexicon: "${w}"`);
        issues++;
      }
      if (!canFormWordFromRack(w, rackMap)) {
        console.error(`❌ ${boardId}: word not formable from rack "${board.rackSeedLetters}": "${w}"`);
        issues++;
      }
    });
  });

  if (issues > 0) {
    console.error(`\n❌ Challenge board validation failed (${issues} issues).\n`);
    process.exit(1);
  }

  console.log("✅ Challenge board word validation passed.");
}

main();
