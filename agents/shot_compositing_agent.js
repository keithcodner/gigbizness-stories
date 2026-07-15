#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/shot_compositing_agent.js --topic <topic_id> --workspace <workspace_path>");
    }
    const scriptPath = path.join(path.resolve(__dirname, ".."), "scripts", "composite_bricktoon_shots.js");
    const result = spawnSync("node", [scriptPath, "--workspace", args.workspace], { encoding: "utf8" });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    if (result.status !== 0) {
      throw new Error("composite_bricktoon_shots.js failed");
    }
    console.log(`Shot compositing completed for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
