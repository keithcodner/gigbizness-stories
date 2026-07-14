#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ORCHESTRATOR_PATH = path.join(ROOT, "agents", "orchestrator.js");
const TOPIC_ID = "test_story_template";

function runNode(args, label) {
  const result = spawnSync(process.execPath, [ORCHESTRATOR_PATH, ...args], {
    cwd: ROOT,
    encoding: "utf8"
  });

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
    runNode(["--topic", TOPIC_ID, "--stage", "cast"], "test story cast");
    const validationPath = path.join(ROOT, "workspaces", TOPIC_ID, "03_cast", "cast_validation.json");
    const report = JSON.parse(fs.readFileSync(validationPath, "utf8"));
    if (!report.passed) {
      throw new Error(`Cast validation failed: ${validationPath}`);
    }
    console.log(`Static cast test passed for ${TOPIC_ID}.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
