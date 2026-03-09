/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020");
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

  validateFile(
    ajv,
    path.join(challengeSchemaDir, "lexicon.schema.json"),
    path.join(challengeDir, "lexicon.json")
  );

  validateFile(
    ajv,
    path.join(storySchemaDir, "collections.schema.json"),
    path.join(storyDir, "collections.json")
  );

  validateFile(
    ajv,
    path.join(storySchemaDir, "stories.schema.json"),
    path.join(storyDir, "stories.json")
  );

  validateFile(
    ajv,
    path.join(storySchemaDir, "chapters.schema.json"),
    path.join(storyDir, "chapters.json")
  );

  validateFile(
    ajv,
    path.join(storySchemaDir, "chapterWords.schema.json"),
    path.join(storyDir, "chapterWords.json")
  );

  validateFile(
    ajv,
    path.join(storySchemaDir, "storySettings.schema.json"),
    path.join(storyDir, "storySettings.json")
  );

  const collections = loadJson(path.join(storyDir, "collections.json")).collections || [];
  const stories = loadJson(path.join(storyDir, "stories.json")).stories || [];
  const chapters = loadJson(path.join(storyDir, "chapters.json")).chapters || [];
  const chapterWords = loadJson(path.join(storyDir, "chapterWords.json")).chapterWords || [];

  const collectionSet = new Set(collections.map(c => c.collectionCode));
  const storyMap = new Map(stories.map(s => [s.storyId, s]));
  const chapterSet = new Set(chapters.map(ch => ch.chapterId));

  let issues = 0;

  stories.forEach(story => {
    if (!collectionSet.has(story.collectionCode)) {
      console.error(`❌ story ${story.storyId} references unknown collectionCode "${story.collectionCode}"`);
      issues++;
    }
  });

  chapters.forEach(chapter => {
    const story = storyMap.get(chapter.storyId);
    if (!story) {
      console.error(`❌ chapter ${chapter.chapterId} references unknown storyId "${chapter.storyId}"`);
      issues++;
      return;
    }

    if (chapter.collectionCode !== story.collectionCode) {
      console.error(
        `❌ chapter ${chapter.chapterId} collectionCode "${chapter.collectionCode}" does not match story ${chapter.storyId} collectionCode "${story.collectionCode}"`
      );
      issues++;
    }
  });

  chapterWords.forEach(row => {
    if (!chapterSet.has(row.chapterId)) {
      console.error(`❌ chapterWords references unknown chapterId "${row.chapterId}"`);
      issues++;
    }
  });

  if (issues > 0) {
    console.error(`\n❌ Story relational validation failed (${issues} issues).\n`);
    process.exit(1);
  }

  console.log("\n✅ All Story Mode JSON validated successfully.\n");
}

main();
