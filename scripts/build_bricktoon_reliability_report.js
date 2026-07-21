#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { buildReliabilityMarkdown, buildReliabilityReport, loadRuntimeProfiles, resolveRuntimeProfile } = require("../src/bricktoon/reliabilityGate");

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
      throw new Error("Usage: node scripts/build_bricktoon_reliability_report.js --workspace <workspace_path> [--runtime-profile <profile_id>]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const runtimeProfiles = loadRuntimeProfiles(rootDir);
    const runtimeProfile = resolveRuntimeProfile(runtimeProfiles, args["runtime-profile"]);

    const report = buildReliabilityReport({
      topicId,
      runtimeProfile,
      machineProfile: readJsonSafe(path.join(rootDir, "config", "machine_profile.json"), {}),
      sceneSequenceReport: readJsonSafe(path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"), {}),
      renderContract: readJsonSafe(path.join(workspaceDir, "09_edit_plan", "render_contract.json"), {}),
      visualReadiness: readJsonSafe(path.join(workspaceDir, "04_assets", "visual_readiness.json"), {}),
      visualPreviewExists: fs.existsSync(path.join(workspaceDir, "06_renders", "previews", "visual_preview.mp4")),
      finalApprovalText: fs.existsSync(path.join(workspaceDir, "10_qc", "final_approval.md"))
        ? fs.readFileSync(path.join(workspaceDir, "10_qc", "final_approval.md"), "utf8")
        : ""
    });

    const reportDir = path.join(workspaceDir, "10_qc");
    const jsonPath = path.join(reportDir, "bricktoon_reliability_report.json");
    const mdPath = path.join(reportDir, "bricktoon_reliability_report.md");
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(mdPath, buildReliabilityMarkdown(report), "utf8");

    console.log(`Bricktoon reliability report created for '${topicId}' with decision '${report.gate.decision}'.`);
    if (report.gate.blockers.length > 0) {
      console.log(`Blockers: ${report.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
