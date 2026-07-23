#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("./common");
const {
  buildOvernightRunMarkdown,
  buildOvernightRunReport,
  loadRuntimeProfiles,
  resolveRuntimeProfile
} = require("../src/bricktoon/reliabilityGate");
const { resolveOvernightPreviewMode } = require("../src/bricktoon/overnightPreviewReadiness");

const ROOT = path.resolve(__dirname, "..");
const STEP_SEQUENCE = ["bricktoon-preview", "bricktoon-reliability", "bricktoon-finish"];

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

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
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

function appendStepHistory(state, step, status, detail = null) {
  if (!Array.isArray(state.step_history)) {
    state.step_history = [];
  }
  state.step_history.push({
    step,
    status,
    detail,
    recorded_at: new Date().toISOString()
  });
}

function writeOvernightArtifacts({ workspaceDir, topicId, runtimeProfile, state, statePath = null }) {
  const reportPath = path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json");
  const reliabilityReport = readJsonSafe(reportPath, {});
  const overnightReport = buildOvernightRunReport({
    topicId,
    runtimeProfile,
    machineProfile: readJsonSafe(path.join(ROOT, "config", "machine_profile.json"), {}),
    reliabilityReport,
    overnightState: state
  });
  const jsonPath = path.join(workspaceDir, "10_qc", "bricktoon_overnight_report.json");
  const mdPath = path.join(workspaceDir, "10_qc", "bricktoon_overnight_report.md");
  state.last_report_path = jsonPath;
  if (statePath) {
    writeJson(statePath, state);
  }
  writeJson(jsonPath, overnightReport);
  writeText(mdPath, buildOvernightRunMarkdown(overnightReport));
}

function getOvernightPreviewPaths(workspaceDir) {
  return {
    previewPath: path.join(workspaceDir, "06_renders", "previews", "visual_preview.mp4"),
    previewReportPath: path.join(workspaceDir, "06_renders", "previews", "visual_preview_report.json"),
    approvedKeyframesDir: path.join(workspaceDir, "07_visuals", "approved_keyframes"),
    voicePath: path.join(workspaceDir, "03_voice", "voiceover_clean.wav"),
    musicManifestPath: path.join(workspaceDir, "04_assets", "music", "music_manifest.csv")
  };
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
      step_history: [],
      blocked: false,
      status: "running",
      current_step: null,
      last_decision: null,
      last_reliability_decision: null,
      last_error: null,
      blocked_reason: null,
      run_count: 0,
      resume_count: 0
    };

    nextState.runtime_profile_id = runtimeProfile.profile_id;
    nextState.updated_at = new Date().toISOString();
    nextState.status = "running";
    nextState.blocked = false;
    nextState.blocked_reason = null;
    nextState.last_error = null;
    nextState.current_step = null;
    nextState.run_count = Number(nextState.run_count || 0) + (args.resume && state ? 0 : 1);
    nextState.resume_count = Number(nextState.resume_count || 0) + (args.resume ? 1 : 0);
    writeJson(statePath, nextState);
    writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });

    if (args.resume && nextState.completed_at) {
      nextState.status = "completed";
      nextState.updated_at = new Date().toISOString();
      writeJson(statePath, nextState);
      writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });
      console.log(`Bricktoon overnight run for '${args.topic}' is already complete. Review ${path.join(workspaceDir, "10_qc", "bricktoon_overnight_report.md")}`);
      return;
    }

    for (const step of STEP_SEQUENCE) {
      if (nextState.completed_steps.includes(step)) {
        continue;
      }

      nextState.current_step = step;
      nextState.updated_at = new Date().toISOString();
      appendStepHistory(nextState, step, "started");
      writeJson(statePath, nextState);
      writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });

      try {
        if (step === "bricktoon-preview") {
          const previewMode = resolveOvernightPreviewMode(getOvernightPreviewPaths(workspaceDir));
          if (previewMode === "skip_existing_preview") {
            appendStepHistory(nextState, step, "skipped", "fresh preview artifacts already exist");
          } else if (previewMode === "rebuild_visual_preview") {
            runOrchestrator(["--topic", args.topic, "--stage", "visual-preview"]);
          } else {
            runOrchestrator(["--topic", args.topic, "--stage", "bricktoon-preview"]);
          }
        } else if (step === "bricktoon-reliability") {
          runOrchestrator(["--topic", args.topic, "--stage", "bricktoon-reliability", "--runtime-profile", runtimeProfile.profile_id]);
          const report = readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json"), {});
          nextState.last_decision = report.gate?.decision || null;
          nextState.last_reliability_decision = report.gate?.decision || null;
          if (report.gate?.decision !== "ready_for_overnight_finish" && report.gate?.decision !== "ready_for_final_export") {
            nextState.blocked = true;
            nextState.status = "blocked";
            nextState.blocked_reason = report.gate?.blockers || ["bricktoon reliability gate blocked the overnight run"];
            nextState.updated_at = new Date().toISOString();
            appendStepHistory(nextState, step, "blocked", nextState.blocked_reason);
            writeJson(statePath, nextState);
            writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });
            console.log(`Bricktoon overnight run blocked for '${args.topic}'. Review ${path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.md")}`);
            return;
          }
        } else if (step === "bricktoon-finish") {
          runOrchestrator(["--topic", args.topic, "--stage", "bricktoon-finish", "--profile", runtimeProfile.render_profile, "--runtime-profile", runtimeProfile.profile_id]);
        }

        nextState.completed_steps.push(step);
        nextState.updated_at = new Date().toISOString();
        appendStepHistory(nextState, step, "completed");
        writeJson(statePath, nextState);
        writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });
      } catch (error) {
        nextState.status = "failed";
        nextState.blocked = false;
        nextState.last_error = error.message;
        nextState.updated_at = new Date().toISOString();
        appendStepHistory(nextState, step, "failed", error.message);
        writeJson(statePath, nextState);
        writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });
        throw error;
      }
    }

    nextState.completed_at = new Date().toISOString();
    nextState.blocked = false;
    nextState.status = "completed";
    nextState.current_step = null;
    nextState.updated_at = new Date().toISOString();
    writeJson(statePath, nextState);
    writeOvernightArtifacts({ workspaceDir, topicId: args.topic, runtimeProfile, state: nextState, statePath });
    console.log(`Bricktoon overnight run completed for '${args.topic}' using '${runtimeProfile.profile_id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
