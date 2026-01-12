/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020"); // ✅ IMPORTANT: draft 2020-12 support
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

  const storyDir = path.join(repoRoot, "data", "story");
  const storySchemaDir = path.join(storyDir, "_schema");

  const challengeDir = path.join(repoRoot, "data", "challenge");
  const challengeSchemaDir = path.join(challengeDir, "_schema");

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Shared lexicon (Challenge) schema + data
  validateFile(
    ajv,
    path.join(challengeSchemaDir, "lexicon.schema.json"),
    path.join(challengeDir, "lexicon.json")
  );

  // Story schemas + data
  validateFile(ajv, path.join(storySchemaDir, "collections.schema.json"), path.join(storyDir, "collections.json"));
  validateFile(ajv, path.join(storySchemaDir, "stories.schema.json"), path.join(storyDir, "stories.json"));
  validateFile(ajv, path.join(storySchemaDir, "chapters.schema.json"), path.join(storyDir, "chapters.json"));
  validateFile(ajv, path.join(storySchemaDir, "chapterWords.schema.json"), path.join(storyDir, "chapterWords.json"));

  // Optional: storySettings
  const storySettingsPath = path.join(storyDir, "storySettings.json");
  const storySettingsSchemaPath = path.join(storySchemaDir, "storySettings.schema.json");
  if (fs.existsSync(storySettingsPath) && fs.existsSync(storySettingsSchemaPath)) {
    validateFile(ajv, storySettingsSchemaPath, storySettingsPath);
  } else {
    console.log("ℹ️ Skipping storySettings validation (storySettings.json or schema not found).");
  }

  console.log("\n✅ All Story Mode JSON validated successfully.\n");
}

main();
