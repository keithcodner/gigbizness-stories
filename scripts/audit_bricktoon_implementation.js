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

    console.log("BRICKTOON IMPLEMENTATION AUDIT");
    console.log("");

    let failures = 0;
    if (fs.existsSync(castPath) && (readJson(castPath).cast || []).length > 0) pass("cast schema");
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
    if (fs.existsSync(refsDir) && fs.readdirSync(refsDir).length > 0) pass("character references");
    else {
      fail("character references", "missing");
      failures += 1;
    }
    if (fs.existsSync(generatedImagesDir) && fs.readdirSync(generatedImagesDir).length > 0) pass("scene images");
    else {
      fail("scene images", "missing");
      failures += 1;
    }

    if (fs.existsSync(assetManifestPath)) {
      const manifest = readJson(assetManifestPath);
      const approvedSceneAssets = (manifest.assets || []).filter((asset) => asset.status === "approved" && asset.asset_type === "bricktoon_scene");
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
    else fail("render report", "not generated yet");

    console.log("");
    console.log(`STATUS: ${failures === 0 ? "PASS" : "INCOMPLETE"}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
