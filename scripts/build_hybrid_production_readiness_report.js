#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  buildHybridProductionReadinessMarkdown,
  buildHybridProductionReadinessReport
} = require("../src/bricktoon/hybridProductionReadiness");

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
      throw new Error("Usage: node scripts/build_hybrid_production_readiness_report.js --workspace <workspace_path>");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);

    const report = buildHybridProductionReadinessReport({
      topicId,
      stillBenchmarkPack: readJsonSafe(path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.json"), {}),
      editorialReport: readJsonSafe(path.join(workspaceDir, "08_animation", "hybrid_editorial", "hybrid_editorial_sequence_report.json"), {}),
      promotionGate: readJsonSafe(path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.json"), {}),
      reliabilityReport: readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json"), {}),
      machineProfile: readJsonSafe(path.join(rootDir, "config", "machine_profile.json"), {}),
      referenceManifest: readJsonSafe(path.join(workspaceDir, "04_assets", "reference_manifest.json"), {}),
      libraryIndex: readJsonSafe(path.join(rootDir, "library", "library_catalog_index.json"), {}),
      overnightState: readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_overnight_state.json"), {})
    });

    const reportDir = path.join(workspaceDir, "10_qc");
    const jsonPath = path.join(reportDir, "hybrid_production_readiness_report.json");
    const mdPath = path.join(reportDir, "hybrid_production_readiness_report.md");
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(mdPath, buildHybridProductionReadinessMarkdown(report), "utf8");

    console.log(`Hybrid production readiness report created for '${topicId}' with decision '${report.decision.decision}'.`);
    console.log(`Default path recommendation: ${report.default_path_recommendation}.`);
    if (report.decision.blockers.length > 0) {
      console.log(`Blockers: ${report.decision.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
