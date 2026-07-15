#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson } = require("../agents/common");

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label, reason) {
  console.log(`FAIL  ${label}${reason ? `: ${reason}` : ""}`);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/audit_bricktoon_implementation.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const sceneCardsPath = path.join(workspaceDir, "05_scene_cards", "scene_cards.json");
    const castPath = path.join(workspaceDir, "03_cast", "cast.json");
    const assetManifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    const renderContractPath = path.join(workspaceDir, "09_edit_plan", "render_contract.json");
    const renderReportPath = path.join(workspaceDir, "10_renders", "render_report.json");
    const visualCharacterBiblePath = path.join(workspaceDir, "03_cast", "visual_character_bible.json");
    const productionRoutesPath = path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json");
    const consistencySummaryPath = path.join(workspaceDir, "07_visuals", "consistency_reports", "consistency_summary.md");
    const compositedShotDir = path.join(workspaceDir, "08_animation", "composited_shot_clips");
    const workflowRequestsDir = path.join(workspaceDir, "07_visuals", "workflow_requests");
    const generationReportsDir = path.join(workspaceDir, "07_visuals", "generation_reports");
    const aiMotionReportPath = path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json");
    const stabilizationReportPath = path.join(workspaceDir, "08_animation", "stabilized_ai_video", "stabilization_report.json");

    console.log("BRICKTOON IMPLEMENTATION AUDIT");
    console.log("");

    let failures = 0;
    const castPackage = fs.existsSync(castPath) ? readJson(castPath) : null;
    const castMembers = castPackage?.cast_members || castPackage?.cast?.cast_members || castPackage?.cast || [];
    if (fs.existsSync(castPath) && castMembers.length > 0) pass("cast schema");
    else {
      fail("cast schema", "missing or empty cast");
      failures += 1;
    }

    const sceneCards = fs.existsSync(sceneCardsPath) ? readJson(sceneCardsPath).scene_cards || [] : [];
    if (sceneCards.length > 0) pass("scene card schema");
    else {
      fail("scene card schema", "missing or empty scene cards");
      failures += 1;
    }

    const refsDir = path.join(workspaceDir, "07_visuals", "character_refs");
    const generatedImagesDir = path.join(workspaceDir, "07_visuals", "generated_images");
    const sceneSequenceDir = path.join(workspaceDir, "08_animation", "scene_sequences");
    const characterBiblesDir = path.join(workspaceDir, "07_visuals", "character_bibles");
    if (fs.existsSync(refsDir) && fs.readdirSync(refsDir).length > 0) pass("character references");
    else {
      fail("character references", "missing");
      failures += 1;
    }
    if (fs.existsSync(visualCharacterBiblePath) && readJson(visualCharacterBiblePath).characters?.length > 0 && fs.existsSync(characterBiblesDir) && fs.readdirSync(characterBiblesDir).length > 0) {
      pass("visual character bible");
    } else {
      fail("visual character bible", "missing");
      failures += 1;
    }
    if (fs.existsSync(generatedImagesDir) && fs.readdirSync(generatedImagesDir).length > 0) pass("scene images");
    else {
      fail("scene images", "missing");
      failures += 1;
    }
    if (fs.existsSync(productionRoutesPath) && readJson(productionRoutesPath).routes?.length > 0) pass("production routes");
    else {
      fail("production routes", "missing");
      failures += 1;
    }
    if (fs.existsSync(workflowRequestsDir)) pass("workflow requests");
    else {
      fail("workflow requests", "not generated yet");
      failures += 1;
    }
    if (fs.existsSync(generationReportsDir)) pass("generation reports");
    else {
      fail("generation reports", "not generated yet");
      failures += 1;
    }
    if (fs.existsSync(consistencySummaryPath)) pass("consistency summary");
    else {
      fail("consistency summary", "not generated yet");
      failures += 1;
    }
    if (fs.existsSync(aiMotionReportPath)) pass("ai motion report");
    else {
      fail("ai motion report", "not generated yet");
      failures += 1;
    }
    if (fs.existsSync(stabilizationReportPath)) pass("stabilization report");
    else {
      fail("stabilization report", "not generated yet");
      failures += 1;
    }
    if (fs.existsSync(compositedShotDir) && fs.readdirSync(compositedShotDir).some((entry) => entry.endsWith(".mp4"))) pass("composited shot clips");
    else {
      fail("composited shot clips", "not generated yet");
      failures += 1;
    }
    if (fs.existsSync(sceneSequenceDir) && fs.readdirSync(sceneSequenceDir).some((entry) => entry.endsWith(".mp4"))) pass("scene sequences");
    else {
      fail("scene sequences", "not generated yet");
      failures += 1;
    }

    if (fs.existsSync(assetManifestPath)) {
      const manifest = readJson(assetManifestPath);
      const approvedSceneAssets = (manifest.assets || []).filter((asset) =>
        asset.status === "approved" &&
        ["bricktoon_composited_shot_sequence", "bricktoon_scene_sequence", "bricktoon_animated_clip", "bricktoon_scene"].includes(asset.asset_type)
      );
      if (approvedSceneAssets.length >= sceneCards.filter((scene) => (scene.visual_type || "bricktoon_scene") === "bricktoon_scene").length) {
        pass("asset_manifest coverage");
      } else {
        fail("asset_manifest coverage", "not enough approved scene assets");
        failures += 1;
      }
    } else {
      fail("asset_manifest coverage", "asset_manifest.json missing");
      failures += 1;
    }

    if (fs.existsSync(renderContractPath)) pass("render contract");
    else {
      fail("render contract", "missing");
      failures += 1;
    }

    if (fs.existsSync(renderReportPath)) pass("render report");
    else {
      fail("render report", "not generated yet");
      failures += 1;
    }

    console.log("");
    console.log(`STATUS: ${failures === 0 ? "PASS" : "INCOMPLETE"}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
