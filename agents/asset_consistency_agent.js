#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/asset_consistency_agent.js --topic <topic_id> --workspace <workspace_path>");
    }
    const scriptPath = path.join(path.resolve(__dirname, ".."), "scripts", "validate_generated_assets.js");
    const commandArgs = [scriptPath, "--workspace", args.workspace];
    if (args["scene-ids"]) {
      commandArgs.push("--scene-ids", args["scene-ids"]);
    }
    const result = spawnSync("node", commandArgs, { encoding: "utf8" });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    if (result.status !== 0) {
      throw new Error("validate_generated_assets.js failed");
    }
    console.log(`Asset consistency validation generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
