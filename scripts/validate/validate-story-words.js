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

  const chaptersFile = loadJson(path.join(storyDir, "chapters.json"));
  const chapterWordsFile = loadJson(path.join(storyDir, "chapterWords.json"));
  const storySettings = loadJson(path.join(storyDir, "storySettings.json"));

  const chapters = chaptersFile.chapters || [];
  const chapterWords = chapterWordsFile.chapterWords || [];

  const lex = loadJson(path.join(challengeDir, "lexicon.json"));
  const lexArr = Array.isArray(lex.words) ? lex.words : [];
  if (!Array.isArray(lexArr)) {
    console.error("❌ data/challenge/lexicon.json must contain a words array");
    process.exit(1);
  }
  const lexSet = new Set(lexArr.map(w => normalizeWord(w)));

  const minWordLength = storySettings.rules?.minWordLength ?? 3;
  const defaultTargetWordsBase = storySettings.defaults?.targetWordsBase ?? 10;

  const chapterById = new Map();
  chapters.forEach(ch => chapterById.set(ch.chapterId, ch));

  let issues = 0;

  chapterWords.forEach((row, idx) => {
    const chapterId = row.chapterId;
    const chapter = chapterById.get(chapterId);

    if (!chapter) {
      console.error(`❌ chapterWords[${idx}] references missing chapterId: ${chapterId}`);
      issues++;
      return;
    }

    const rack = splitRackLetters(row.rackSeedLetters);
    const rackMap = rackCounts(rack);
    const words = splitCsv(row.targetWordsCsv);

    if (rack.length === 0) {
      console.error(`❌ chapterWords[${idx}] (${chapterId}) has empty rackSeedLetters`);
      issues++;
    }

    if (words.length === 0) {
      console.error(`❌ chapterWords[${idx}] (${chapterId}) has empty targetWordsCsv`);
      issues++;
      return;
    }

    const targetWordsBase = chapter.targetWordsBase || defaultTargetWordsBase;
    if (words.length < targetWordsBase) {
      console.error(
        `❌ chapterWords[${idx}] (${chapterId}) has ${words.length} words, expected at least ${targetWordsBase}`
      );
      issues++;
    }

    const bracketWords = extractBracketWords(chapter.chapterTextTemplate);
    if (bracketWords.length !== targetWordsBase) {
      console.error(
        `❌ chapters (${chapterId}) must contain exactly ${targetWordsBase} bracket words, found ${bracketWords.length}`
      );
      issues++;
    }

    const firstTargetWords = words.slice(0, targetWordsBase);
    for (let i = 0; i < Math.min(targetWordsBase, bracketWords.length, firstTargetWords.length); i++) {
      if (bracketWords[i] !== firstTargetWords[i]) {
        console.error(
          `❌ chapters (${chapterId}) bracket word #${i + 1} "${bracketWords[i]}" != targetWordsCsv word #${i + 1} "${firstTargetWords[i]}"`
        );
        issues++;
      }
    }

    words.forEach(w => {
      if (w.length < minWordLength) {
        console.error(`❌ chapterWords[${idx}] (${chapterId}) word too short (<${minWordLength}): "${w}"`);
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

  console.log("✅ Story word validation passed (wrapper + placeholders + lexicon + rack feasibility).");
}

main();
