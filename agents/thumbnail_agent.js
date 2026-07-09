#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  readJson,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const thumbnailDir = path.join(workspaceDir, "08_thumbnail");
  const scriptsDir = path.join(path.resolve(__dirname, ".."), "scripts");

  return {
    topicPath: path.join(configDir, "topic.json"),
    promptPath: path.join(thumbnailDir, "thumbnail_prompt.txt"),
    conceptsPath: path.join(thumbnailDir, "thumbnail_concepts.md"),
    thumbnail1Path: path.join(thumbnailDir, "thumbnail_01.png"),
    thumbnail2Path: path.join(thumbnailDir, "thumbnail_02.png"),
    finalThumbnailPath: path.join(thumbnailDir, "final_thumbnail.jpg"),
    renderScriptPath: path.join(scriptsDir, "create_thumbnail.py")
  };
}

function buildPrompt(topic) {
  return [
    `Create a serious documentary-style YouTube thumbnail for "${topic.working_title}".`,
    "Use one tow truck, one invoice or fee sheet, and one short warning phrase.",
    "Mood: tense, credible, not sensational horror.",
    "Text should be 3-5 words, high contrast, and readable on mobile.",
    "Do not imply a criminal conviction or fake court result."
  ].join("\n");
}

function buildConcepts(topic) {
  const lines = [
    "# Thumbnail Concepts",
    "",
    `Topic: ${topic.working_title}`,
    "",
    "## Concept 1",
    "",
    "- Visual: Tow truck angled toward the viewer, invoice in the foreground.",
    '- Text: "TOWED & TRAPPED"',
    "- Why it works: Directly pairs object and conflict.",
    "",
    "## Concept 2",
    "",
    "- Visual: Impound gate, fee total card, warning stripe accent.",
    '- Text: "THE REAL BILL"',
    "- Why it works: Emphasizes the money reveal instead of vague danger.",
    "",
    "## Concept 3",
    "",
    "- Visual: Car silhouette, receipt stack, map pin icon.",
    '- Text: "WHO HAS LEVERAGE?"',
    "- Why it works: Hooks curiosity without overstating allegations.",
    "",
    "## Pick guidance",
    "",
    "- Favor simple object + conflict layouts over crowded collage thumbnails.",
    "- Avoid police tape, courtroom cosplay, or fake legal certainty."
  ];
  return `${lines.join("\n")}\n`;
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/thumbnail_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);

    writeText(paths.promptPath, `${buildPrompt(topic)}\n`);
    writeText(paths.conceptsPath, buildConcepts(topic));

    runCommand("python", [
      paths.renderScriptPath,
      "--title",
      topic.working_title,
      "--text1",
      "TOWED & TRAPPED",
      "--text2",
      "THE REAL BILL",
      "--output1",
      paths.thumbnail1Path,
      "--output2",
      paths.thumbnail2Path,
      "--final-output",
      paths.finalThumbnailPath
    ], "create_thumbnail.py");

    console.log(`Thumbnail package generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
