#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");

function runScript(scriptName, workspaceDir) {
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
      throw new Error("Usage: node agents/visual_character_bible_agent.js --topic <topic_id> --workspace <workspace_path>");
    }
    runScript("generate_character_bibles.js", args.workspace);
    console.log(`Visual character bible generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
