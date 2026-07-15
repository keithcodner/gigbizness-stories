#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");

function run(scriptName, workspaceDir) {
  const scriptPath = path.join(path.resolve(__dirname, ".."), "scripts", scriptName);
  const result = spawnSync("node", [scriptPath, "--workspace", workspaceDir], { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`${scriptName} failed`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/ai_video_motion_agent.js --topic <topic_id> --workspace <workspace_path>");
    }
    run("generate_ai_motion_passes.js", args.workspace);
    run("stabilize_ai_motion.js", args.workspace);
    console.log(`AI video motion passes prepared for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
