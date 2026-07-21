#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");
const { loadRuntimeProfiles, resolveRuntimeProfile } = require("../src/bricktoon/reliabilityGate");

const ROOT = path.resolve(__dirname, "..");

function readJsonSafe(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function runOrchestrator(args) {
  const orchestratorPath = path.join(ROOT, "agents", "orchestrator.js");
  const result = spawnSync(process.execPath, [orchestratorPath, ...args], {
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
    throw new Error(`orchestrator failed for args: ${args.join(" ")}`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/bricktoon_overnight_agent.js --topic <topic_id> --workspace <workspace_path> [--runtime-profile <profile_id>] [--resume]");
    }

    const workspaceDir = path.resolve(args.workspace);
    const runtimeProfiles = loadRuntimeProfiles(ROOT);
    const runtimeProfile = resolveRuntimeProfile(runtimeProfiles, args["runtime-profile"] || "gtx1080_overnight_finish_draft");
    const statePath = path.join(workspaceDir, "10_qc", "bricktoon_overnight_state.json");
    const state = args.resume
      ? readJsonSafe(statePath, null)
      : null;

    const nextState = state || {
      topic_id: args.topic,
      runtime_profile_id: runtimeProfile.profile_id,
      started_at: new Date().toISOString(),
      completed_steps: [],
      blocked: false,
      last_decision: null
    };

    const stepSequence = ["bricktoon-preview", "bricktoon-reliability", "bricktoon-finish"];
    for (const step of stepSequence) {
      if (nextState.completed_steps.includes(step)) {
        continue;
      }

      if (step === "bricktoon-preview") {
        runOrchestrator(["--topic", args.topic, "--stage", "bricktoon-preview"]);
      } else if (step === "bricktoon-reliability") {
        runOrchestrator(["--topic", args.topic, "--stage", "bricktoon-reliability", "--runtime-profile", runtimeProfile.profile_id]);
        const report = readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json"), {});
        nextState.last_decision = report.gate?.decision || null;
        if (report.gate?.decision !== "ready_for_overnight_finish" && report.gate?.decision !== "ready_for_final_export") {
          nextState.blocked = true;
          nextState.blocked_reason = report.gate?.blockers || ["bricktoon reliability gate blocked the overnight run"];
          writeJson(statePath, nextState);
          console.log(`Bricktoon overnight run blocked for '${args.topic}'. Review ${path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.md")}`);
          return;
        }
      } else if (step === "bricktoon-finish") {
        runOrchestrator(["--topic", args.topic, "--stage", "bricktoon-finish", "--profile", runtimeProfile.render_profile, "--runtime-profile", runtimeProfile.profile_id]);
      }

      nextState.completed_steps.push(step);
      writeJson(statePath, nextState);
    }

    nextState.completed_at = new Date().toISOString();
    nextState.blocked = false;
    writeJson(statePath, nextState);
    console.log(`Bricktoon overnight run completed for '${args.topic}' using '${runtimeProfile.profile_id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
