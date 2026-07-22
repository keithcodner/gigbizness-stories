#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { loadRuntimeProfiles, resolveRuntimeProfile } = require("../src/bricktoon/reliabilityGate");
const {
  buildReliabilityRecoveryMarkdown,
  buildReliabilityRecoveryPlan
} = require("../src/bricktoon/reliabilityRecoveryPlan");

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

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_bricktoon_recovery_plan.js --workspace <workspace_path> [--runtime-profile <profile_id>]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const runtimeProfiles = loadRuntimeProfiles(rootDir);
    const runtimeProfile = resolveRuntimeProfile(runtimeProfiles, args["runtime-profile"]);
    const reliabilityReport = readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json"), {});

    const report = buildReliabilityRecoveryPlan({
      topicId,
      runtimeProfile,
      reliabilityReport,
      promotionGate: readJsonSafe(path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.json"), {}),
      sceneSequenceReport: readJsonSafe(path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"), {}),
      renderContract: readJsonSafe(path.join(workspaceDir, "09_edit_plan", "render_contract.json"), {})
    });

    const reportDir = path.join(workspaceDir, "10_qc");
    const jsonPath = path.join(reportDir, "bricktoon_recovery_plan.json");
    const mdPath = path.join(reportDir, "bricktoon_recovery_plan.md");
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(mdPath, buildReliabilityRecoveryMarkdown(report), "utf8");

    console.log(`Bricktoon recovery plan created for '${topicId}' with ${report.scene_queue.length} queued scene decision(s).`);
    const topScene = report.scene_queue[0];
    if (topScene) {
      console.log(`Top queue item: ${topScene.scene_id} (${topScene.bucket_label})`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
