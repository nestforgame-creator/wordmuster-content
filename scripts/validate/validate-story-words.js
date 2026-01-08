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

function extractBracketWords(chapterTextTemplate) {
  const text = String(chapterTextTemplate || "");
  const matches = [...text.matchAll(/\[([A-Z]+)\]/g)];
  return matches.map(m => normalizeWord(m[1]));
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const storyDir = path.join(repoRoot, "data", "story");
  const challengeDir = path.join(repoRoot, "data", "challenge");

  const chapters = loadJson(path.join(storyDir, "chapters.json"));
  const chapterWords = loadJson(path.join(storyDir, "chapterWords.json"));

  // Shared lexicon (Challenge)
  const lex = loadJson(path.join(challengeDir, "lexicon.json"));
  const lexArr = Array.isArray(lex) ? lex : lex.lexicon;
  if (!Array.isArray(lexArr)) {
    console.error("❌ data/challenge/lexicon.json must be an array or { lexicon: [...] }");
    process.exit(1);
  }
  const lexSet = new Set(lexArr.map(w => normalizeWord(w)));

  // Index chapters by chapterId
  const chapterById = new Map();
  chapters.forEach(ch => chapterById.set(ch.chapterId, ch));

  let issues = 0;

  chapterWords.forEach((row, idx) => {
    const chapterId = row.chapterId;
    const rack = splitRackLetters(row.rackSeedLetters);
    const rackMap = rackCounts(rack);
    const words = splitCsv(row.targetWordsCsv);

    // 1) Must have at least 12 target words
    if (words.length < 12) {
      console.error(`❌ chapterWords[${idx}] (${chapterId}) has <12 words in targetWordsCsv`);
      issues++;
      return;
    }

    // 2) Placeholder rule: exactly 12 bracketed placeholders, and they must match the first 12 words
    const ch = chapterById.get(chapterId);
    if (!ch) {
      console.error(`❌ chapterWords[${idx}] refers to missing chapterId: ${chapterId}`);
      issues++;
      return;
    }

    const bracketWords = extractBracketWords(ch.chapterTextTemplate);
    if (bracketWords.length !== 12) {
      console.error(`❌ chapters (${chapterId}) must contain exactly 12 bracket words, found ${bracketWords.length}`);
      issues++;
    }

    const first12 = words.slice(0, 12);
    for (let i = 0; i < Math.min(12, bracketWords.length); i++) {
      if (bracketWords[i] !== first12[i]) {
        console.error(
          `❌ chapters (${chapterId}) bracket word #${i + 1} "${bracketWords[i]}" != targetWordsCsv word #${i + 1} "${first12[i]}"`
        );
        issues++;
      }
    }

    // 3) Word validity + rack feasibility checks (ALL words: target + bonus)
    words.forEach(w => {
      if (w.length < 3) {
        console.error(`❌ chapterWords[${idx}] (${chapterId}) word too short (<3): "${w}"`);
        issues++;
      }
      if (!lexSet.has(w)) {
        console.error(`❌ chapterWords[${idx}] (${chapterId}) word not in shared lexicon: "${w}"`);
        issues++;
      }
      if (!canFormWordFromRack(w, rackMap)) {
        console.error(`❌ chapterWords[${idx}] (${chapterId}) word not formable from rack "${row.rackSeedLetters}": "${w}"`);
        issues++;
      }
    });
  });

  if (issues > 0) {
    console.error(`\n❌ Story word validation failed (${issues} issues).\n`);
    process.exit(1);
  }

  console.log("✅ Story word validation passed (lexicon + length≥3 + rack feasibility + 12 bracket rule).");
}

main();

