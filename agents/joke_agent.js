#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  readJson,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const scriptDir = path.join(workspaceDir, "02_script");

  return {
    topicPath: path.join(configDir, "topic.json"),
    scriptPath: path.join(scriptDir, "script_v1.md"),
    outputPath: path.join(scriptDir, "jokes_and_analogies.md")
  };
}

function buildAnalogies(topic) {
  const base = [
    "# Jokes And Analogies",
    "",
    "## Safe analogy options",
    ""
  ];

  if (topic.video_type === "business_crime_story") {
    base.push("- A growing tow bill can work like a meter that keeps running after the ride already ended.");
    base.push("- Once the car is in the lot, the negotiation can feel less like shopping and more like paying a release fee on your own property.");
    base.push("- A vague quote in a high-pressure business can act like bait. The real decision arrives after the customer has fewer options.");
    base.push("");
    base.push("## Humor warning");
    base.push("");
    base.push("- Keep this video mostly on analogies, not jokes.");
    base.push("- Do not joke about victims, money stress, or enforcement cases.");
  } else {
    base.push("- Use a light analogy only when it clarifies the business model.");
    base.push("- Prefer explanation over punchlines.");
  }

  base.push("");
  return `${base.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/joke_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    if (!fs.existsSync(paths.scriptPath)) {
      throw new Error("script_v1.md must exist before running joke_agent.js");
    }

    writeText(paths.outputPath, buildAnalogies(topic));
    console.log(`Analogies generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
