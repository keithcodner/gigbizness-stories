#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { loadRuntimeProfiles, resolveRuntimeProfile } = require("../src/bricktoon/reliabilityGate");
const { buildHybridPromotionGateReport, buildHybridPromotionMarkdown } = require("../src/bricktoon/hybridPromotionGate");

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
      throw new Error("Usage: node scripts/build_hybrid_promotion_gate.js --workspace <workspace_path> [--runtime-profile <profile_id>]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const runtimeProfiles = loadRuntimeProfiles(rootDir);
    const runtimeProfile = resolveRuntimeProfile(runtimeProfiles, args["runtime-profile"] || "gtx1080_premium_preview");

    const report = buildHybridPromotionGateReport({
      topicId,
      runtimeProfile,
      stillBenchmarkPack: readJsonSafe(path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.json"), {}),
      previewReport: readJsonSafe(path.join(workspaceDir, "06_renders", "previews", "visual_preview_report.json"), {}),
      editorialReport: readJsonSafe(path.join(workspaceDir, "08_animation", "hybrid_editorial", "hybrid_editorial_sequence_report.json"), {}),
      sceneSequenceReport: readJsonSafe(path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"), {}),
      renderContract: readJsonSafe(path.join(workspaceDir, "09_edit_plan", "render_contract.json"), {}),
      visualReadiness: readJsonSafe(path.join(workspaceDir, "04_assets", "visual_readiness.json"), {})
    });

    const reportDir = path.join(workspaceDir, "10_qc");
    fs.writeFileSync(path.join(reportDir, "hybrid_promotion_gate_report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(reportDir, "hybrid_promotion_gate_report.md"), buildHybridPromotionMarkdown(report), "utf8");

    console.log(`Hybrid promotion gate created for '${topicId}' with decision '${report.gate.decision}'.`);
    console.log(`Promoted scenes: ${report.gate.promoted_scene_count}; review scenes: ${report.gate.review_scene_count}; rework scenes: ${report.gate.rework_scene_count}.`);
    if (report.gate.blockers.length > 0) {
      console.log(`Blockers: ${report.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
