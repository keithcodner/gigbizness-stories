#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileRenderContract } = require("../src/render/compileRenderContract");

function getPaths(workspaceDir) {
  return {
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    sceneManifestPath: path.join(workspaceDir, "05_render_plan", "scene_manifest.json"),
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    shotPlanPath: path.join(workspaceDir, "07_shot_plans", "shot_plan.json"),
    compositingReportPath: path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"),
    sceneSequenceReportPath: path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"),
    renderContractPath: path.join(workspaceDir, "09_edit_plan", "render_contract.json")
  };
}

function profileToContractDimensions(profileName) {
  if (profileName === "draft") {
    return { width: 1280, height: 720, fps: 30 };
  }
  if (profileName === "youtube_1080p") {
    return { width: 1920, height: 1080, fps: 30 };
  }
  return { width: 1280, height: 720, fps: 30 };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/compile_render_contract.js --workspace <workspace_path> [--mode strict_visuals]");
    }

    const paths = getPaths(args.workspace);
    const sceneCards = readJson(paths.sceneCardsPath).scene_cards || [];
    const sceneManifest = readJson(paths.sceneManifestPath);
    const assetManifest = readJson(paths.assetManifestPath);
    const shotPlan = readJson(paths.shotPlanPath);
    const compositingReport = readJson(paths.compositingReportPath);
    const sceneSequenceReport = readJson(paths.sceneSequenceReportPath);
    const profile = profileToContractDimensions(args.profile || "draft");
    const contract = compileRenderContract({
      workspaceId: path.basename(args.workspace),
      renderMode: args.mode || "development",
      profile,
      sceneCards,
      sceneManifest,
      assetManifest,
      shotPlan,
      compositingReport,
      sceneSequenceReport
    });

    writeText(paths.renderContractPath, `${JSON.stringify(contract, null, 2)}\n`);
    console.log(`Render contract compiled for '${path.basename(args.workspace)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
