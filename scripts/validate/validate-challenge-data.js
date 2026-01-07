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

