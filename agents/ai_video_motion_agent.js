#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");

function run(scriptName, workspaceDir, sceneIds = null) {
  const scriptPath = path.join(path.resolve(__dirname, ".."), "scripts", scriptName);
  const commandArgs = [scriptPath, "--workspace", workspaceDir];
  if (sceneIds) {
    commandArgs.push("--scene-ids", sceneIds);
  }
  const result = spawnSync("node", commandArgs, { encoding: "utf8" });
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
    run("generate_ai_motion_passes.js", args.workspace, args["scene-ids"] || null);
    run("stabilize_ai_motion.js", args.workspace, args["scene-ids"] || null);
    console.log(`AI video motion passes prepared for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
