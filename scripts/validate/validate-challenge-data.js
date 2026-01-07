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

function loadLexiconSet(dataDir) {
  const lex = loadJson(path.join(dataDir, "lexicon.json"));

  // Support both formats:
  // A) { lexicon: ["WORD", ...] }
  // B) ["WORD", ...]
  const arr = Array.isArray(lex) ? lex : lex.lexicon;

  if (!Array.isArray(arr)) {
    console.error("❌ lexicon.json must be an array or { lexicon: [...] }");
    process.exit(1);
  }

  return new Set(arr.map((w) => String(w).trim().toUpperCase()));
}

function validateCsvWords({ fileLabel, rows, csvField, lexSet }) {
  let failCount = 0;

  rows.forEach((row, idx) => {
    const raw = row[csvField] || "";
    const words = String(raw)
      .split(",")
      .map((w) => w.trim().toUpperCase())
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
    console.error(
      `\n❌ ${fileLabel}: lexicon/length validation failed (${failCount} issues).`
    );
    process.exit(1);
  }

  console.log(`✅ ${fileLabel}: lexicon + length≥3 checks passed (${csvField})`);
}

function main() {
  const repoRoot = path.resolve(__dirname, "../../");
  const dataDir = path.join(repoRoot, "data", "challenge");
  const schemaDir = path.join(dataDir, "_schema");

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // 1) AJV schema validation
  validateFile(
    ajv,
    path.join(schemaDir, "lexicon.schema.json"),
    path.join(dataDir, "lexicon.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "challengeBoards.schema.json"),
    path.join(dataDir, "challengeBoards.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "challengeSettings.schema.json"),
    path.join(dataDir, "challengeSettings.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "legacyMap.schema.json"),
    path.join(dataDir, "legacyMap.json")
  );

  // 2) Content validation (lexicon + >=3)
  const lexSet = loadLexiconSet(dataDir);

  const boards = loadJson(path.join(dataDir, "challengeBoards.json"));
  if (!boards || !Array.isArray(boards.boards)) {
    console.error("❌ challengeBoards.json must be { boards: [...] }");
    process.exit(1);
  }

  validateCsvWords({
    fileLabel: "challengeBoards.boards",
    rows: boards.boards,
    csvField: "totalPossibleWordsCsv",
    lexSet,
  });

  validateCsvWords({
    fileLabel: "challengeBoards.boards",
    rows: boards.boards,
    csvField: "targetWordsCsv",
    lexSet,
  });

  console.log("\n✅ All Challenge Mode JSON validated successfully.\n");
}

main();
