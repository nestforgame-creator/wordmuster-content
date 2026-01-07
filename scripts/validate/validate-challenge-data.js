/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
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

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const dataDir = path.join(repoRoot, "data", "challenge");
  const schemaDir = path.join(dataDir, "_schema");

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Validate: lexicon, boards, settings, legacy map
  validateFile(ajv,
    path.join(schemaDir, "lexicon.schema.json"),
    path.join(dataDir, "lexicon.json")
  );

  validateFile(ajv,
    path.join(schemaDir, "challengeBoards.schema.json"),
    path.join(dataDir, "challengeBoards.json")
  );

  validateFile(ajv,
    path.join(schemaDir, "challengeSettings.schema.json"),
    path.join(dataDir, "challengeSettings.json")
  );

  validateFile(ajv,
    path.join(schemaDir, "legacyMap.schema.json"),
    path.join(dataDir, "legacyMap.json")
  );

  console.log("\n✅ All Challenge Mode JSON validated successfully.\n");
}

main();
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


