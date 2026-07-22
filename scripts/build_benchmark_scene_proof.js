#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  buildBenchmarkSceneProofMarkdown,
  buildBenchmarkSceneProofPackage
} = require("../src/bricktoon/benchmarkSceneProof");

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
      throw new Error("Usage: node scripts/build_benchmark_scene_proof.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const sceneManifest = readJsonSafe(path.join(workspaceDir, "05_render_plan", "scene_manifest.json"), {});
    const renderPlan = readJsonSafe(path.join(workspaceDir, "05_render_plan", "render_plan.json"), {});
    const promotionGate = readJsonSafe(path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.json"), {});

    const proofPackage = buildBenchmarkSceneProofPackage({
      topicId,
      sceneManifest,
      renderPlan,
      promotionGate
    });

    const renderPlanDir = path.join(workspaceDir, "05_render_plan");
    const qcDir = path.join(workspaceDir, "10_qc");
    fs.writeFileSync(path.join(renderPlanDir, "benchmark_scene_manifest.json"), `${JSON.stringify(proofPackage.manifest, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(renderPlanDir, "benchmark_render_plan.json"), `${JSON.stringify(proofPackage.render_plan, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(qcDir, "benchmark_scene_proof_report.json"), `${JSON.stringify(proofPackage.report, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(qcDir, "benchmark_scene_proof_report.md"), buildBenchmarkSceneProofMarkdown(proofPackage.report), "utf8");

    console.log(`Benchmark scene proof package created for '${topicId}' with ${proofPackage.report.selected_scene_count} scene(s).`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
