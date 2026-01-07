function loadLexiconSet(dataDir) {
  const lex = loadJson(path.join(dataDir, "lexicon.json"));

  // Support both formats:
  // A) { lexicon: ["WORD", ...] }
  // B) ["WORD", ...]
  const arr = Array.isArray(lex) ? lex : lex.lexicon;

  if (!Array.isArray(arr)) {
    throw new Error("lexicon.json must be an array or { lexicon: [...] }");
  }

  return new Set(arr.map(w => String(w).trim().toUpperCase()));
}

function validateCsvWords({ fileLabel, rows, csvField, lexSet }) {
  let failCount = 0;

  rows.forEach((row, idx) => {
    const raw = row[csvField] || "";
    const words = String(raw)
      .split(",")
      .map(w => w.trim().toUpperCase())
      .filter(Boolean);

    words.forEach((w) => {
      if (w.length < 3) {
        console.error(`❌ ${fileLabel}[${idx}] word too short (<3): "${w}"`);
        failCount++;
      }
      if (!lexSet.has(w)) {
        console.error(`❌ ${fileLabel}[${idx}] word not in lexicon: "${w}"`);
        failCount++;
      }
    });
  });

  if (failCount > 0) {
    console.error(`\n❌ ${fileLabel}: lexicon/length validation failed (${failCount} issues).`);
    process.exit(1);
  }

  console.log(`✅ ${fileLabel}: lexicon + length≥3 checks passed (${csvField})`);
}

