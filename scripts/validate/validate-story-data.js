/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020"); // ✅ draft 2020-12 support
const addFormats = require("ajv-formats");

function loadJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  // Better error message than "Unexpected end"
  if (!raw || !raw.trim()) {
    throw new Error(`File is empty (blank JSON): ${p}`);
  }
  return JSON.parse(raw);
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

  // 0) Validate shared lexicon FIRST (Challenge)
  validateFile(
    ajv,
    path.join(challengeSchemaDir, "lexicon.schema.json"),
    path.join(challengeDir, "lexicon.json")
  );

  // 1) Validate Story Mode JSON files (ONLY if schema file exists and is not blank)
  const pairs = [
    ["collections.schema.json", "collections.json"],
    ["stories.schema.json", "stories.json"],
    ["chapters.schema.json", "chapters.json"],
    ["chapterWords.schema.json", "chapterWords.json"],
  ];

  for (const [schemaName, dataName] of pairs) {
    const schemaPath = path.join(storySchemaDir, schemaName);
    const dataPath = path.join(storyDir, dataName);

    if (!fs.existsSync(schemaPath)) {
      console.log(`ℹ️ Skipping ${dataName} (missing schema: ${schemaName})`);
      continue;
    }
    validateFile(ajv, schemaPath, dataPath);
  }

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
