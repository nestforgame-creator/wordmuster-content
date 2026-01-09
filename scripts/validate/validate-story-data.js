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
  const dataDir = path.join(repoRoot, "data", "story");
  const schemaDir = path.join(dataDir, "_schema");

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Validate Story Mode JSON files against schemas
  validateFile(
    ajv,
    path.join(schemaDir, "lexicon.schema.json"),
    path.join(dataDir, "lexicon.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "collections.schema.json"),
    path.join(dataDir, "collections.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "stories.schema.json"),
    path.join(dataDir, "stories.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "chapters.schema.json"),
    path.join(dataDir, "chapters.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "chapterWords.schema.json"),
    path.join(dataDir, "chapterWords.json")
  );

  validateFile(
    ajv,
    path.join(schemaDir, "storySettings.schema.json"),
    path.join(dataDir, "storySettings.json")
  );

  console.log("\n✅ All Story Mode JSON validated successfully.\n");
}

main();
