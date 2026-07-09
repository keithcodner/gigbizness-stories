#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  const rootDir = path.resolve(__dirname, "..");
  const briefDir = path.join(workspaceDir, "00_brief");
  const configDir = path.join(workspaceDir, "00_config");

  return {
    topicPath: path.join(configDir, "topic.json"),
    formatRecipePath: path.join(briefDir, "format_recipe.json"),
    formatBriefPath: path.join(briefDir, "format_brief.md"),
    styleGuidePath: path.join(briefDir, "style_guide.md"),
    formatsDir: path.join(rootDir, "formats"),
    styleBiblePath: path.join(rootDir, "styles", "bricktoon", "style_bible.md")
  };
}

function chooseFormatId(topic) {
  if (topic.format_id) {
    return topic.format_id;
  }
  if (topic.video_type === "business_crime_story") {
    return "bleak_explainer_bricktoon";
  }
  return "bleak_explainer_bricktoon";
}

function buildBrief(topic, recipe) {
  const lines = [
    "# Format Brief",
    "",
    `- Topic: ${topic.working_title}`,
    `- Topic ID: ${topic.id}`,
    `- Format: ${recipe.display_name}`,
    `- Style: ${recipe.visual_rules?.style_id || "bricktoon"}`,
    `- Tone: ${recipe.tone?.voice || topic.tone}`,
    `- Hook pressure target: by second ${recipe.hook_rules?.must_create_tension_by_second || 3}`,
    "",
    "## Format Intent",
    "",
    `${recipe.description}`,
    "",
    "## Best For",
    ""
  ];

  for (const item of recipe.best_for || []) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Channel Rule");
  lines.push("");
  lines.push("- Use cartoons for dramatization.");
  lines.push("- Use official source cards for proof.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/format_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const formatId = chooseFormatId(topic);
    const recipePath = path.join(paths.formatsDir, `${formatId}.json`);
    if (!fs.existsSync(recipePath)) {
      throw new Error(`Format recipe not found: ${recipePath}`);
    }

    const recipe = readJson(recipePath);
    const styleBible = fs.readFileSync(paths.styleBiblePath, "utf8");

    writeText(paths.formatRecipePath, `${JSON.stringify(recipe, null, 2)}\n`);
    writeText(paths.formatBriefPath, buildBrief(topic, recipe));
    writeText(paths.styleGuidePath, styleBible);

    console.log(`Format package generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
