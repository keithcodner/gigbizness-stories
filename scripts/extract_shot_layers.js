#!/usr/bin/env node

const path = require("path");
const {
  assetTimestamp,
  createPlaceholderPng,
  ensureDir,
  loadManifest,
  readJsonSafe,
  relativeWorkspacePath,
  saveManifest,
  upsertAsset,
  writeJson
} = require("../src/bricktoon/aiQualityPipeline");
const { parseArgs } = require("../agents/common");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/extract_shot_layers.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const layersRoot = path.join(workspaceDir, "07_visuals", "shot_layers");
    const cleanPlatesRoot = path.join(workspaceDir, "07_visuals", "clean_plates");
    const approvedDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const manifest = loadManifest(workspaceDir);

    ensureDir(layersRoot);
    ensureDir(cleanPlatesRoot);

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const layerDir = path.join(layersRoot, shot.shot_id);
        ensureDir(layerDir);
        const approvedKeyframes = (path.resolve(approvedDir) && require("fs").existsSync(approvedDir))
          ? require("fs").readdirSync(approvedDir).filter((fileName) => fileName.startsWith(`${shot.shot_id}_KF_`))
          : [];
        const layerFiles = [
          "background_far.png",
          "background_middle.png",
          "character_foreground.png",
          "face_region.png",
          "arm_hand_region.png",
          "prop_main.png",
          "fx_overlay.png",
          "foreground_frame.png",
          "lighting_overlay.png"
        ];
        for (const fileName of layerFiles) {
          createPlaceholderPng(path.join(layerDir, fileName), {
            width: 1920,
            height: 1080,
            color: fileName.includes("background") ? "0x334155" : "0x0f172a",
            boxes: [{ x: 280, y: 180, w: 760, h: 700, color: "0xf8fafc@0.9" }]
          });
        }

        const cleanPlatePath = path.join(cleanPlatesRoot, `${shot.shot_id}_background.png`);
        createPlaceholderPng(cleanPlatePath, {
          width: 1920,
          height: 1080,
          color: "0x475569",
          boxes: []
        });

        writeJson(path.join(layerDir, "layer_manifest.json"), {
          shot_id: shot.shot_id,
          source_keyframes: approvedKeyframes,
          motion_ready_regions: [
            "character_foreground",
            "face_region",
            "arm_hand_region",
            "prop_main",
            "fx_overlay"
          ],
          clean_plate: relativeWorkspacePath(workspaceDir, cleanPlatePath),
          layers: layerFiles
        });

        upsertAsset(manifest, {
          asset_id: `LAYERS_${shot.shot_id}`,
          asset_type: "shot_layer",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, path.join(layerDir, "layer_manifest.json")),
          status: "approved",
          created_at: assetTimestamp()
        });
        upsertAsset(manifest, {
          asset_id: `PLATE_${shot.shot_id}`,
          asset_type: "clean_plate",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, cleanPlatePath),
          status: "approved",
          created_at: assetTimestamp()
        });
      }
    }

    saveManifest(workspaceDir, manifest);
    console.log(`Shot layers extracted for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
