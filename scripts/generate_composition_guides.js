#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assetTimestamp,
  boxesForShot,
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
      throw new Error("Usage: node scripts/generate_composition_guides.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlanPath = path.join(workspaceDir, "07_shot_plans", "shot_plan.json");
    const routesPath = path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json");
    const guideDir = path.join(workspaceDir, "07_visuals", "composition_guides");
    const manifest = loadManifest(workspaceDir);
    const shotPlan = readJsonSafe(shotPlanPath, {});
    const routes = readJsonSafe(routesPath, {});

    ensureDir(guideDir);
    const routeMap = new Map((routes.routes || []).map((route) => [route.shot_id, route]));

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const guideJsonPath = path.join(guideDir, `${shot.shot_id}.json`);
        const guidePngPath = path.join(guideDir, `${shot.shot_id}.png`);
        const maskPngPath = path.join(guideDir, `${shot.shot_id}_mask.png`);
        const boxes = boxesForShot(shot);
        const guide = {
          shot_id: shot.shot_id,
          scene_id: scene.scene_id,
          production_mode: routeMap.get(shot.shot_id)?.production_mode || "layered_procedural_2d",
          focus_point: { x: 0.5, y: 0.42 },
          horizon: 0.58,
          safe_areas: {
            title_safe: { left: 0.08, right: 0.92, top: 0.08, bottom: 0.92 }
          },
          depth_labels: ["foreground", "character_plane", "background"],
          boxes: boxes.map((box, index) => ({
            id: `${shot.shot_id}_BOX_${index + 1}`,
            x: box.x,
            y: box.y,
            width: box.w,
            height: box.h
          }))
        };

        writeJson(guideJsonPath, guide);
        createPlaceholderPng(guidePngPath, { width: 1280, height: 720, color: "0x0f172a", boxes, grid: true });
        createPlaceholderPng(maskPngPath, {
          width: 1280,
          height: 720,
          color: "black",
          boxes: boxes.map((box) => ({ ...box, color: "white@1.0", thickness: "fill" }))
        });

        upsertAsset(manifest, {
          asset_id: `GUIDE_${shot.shot_id}`,
          asset_type: "composition_guide",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, guidePngPath),
          metadata_file: relativeWorkspacePath(workspaceDir, guideJsonPath),
          status: "approved",
          created_at: assetTimestamp()
        });
      }
    }

    saveManifest(workspaceDir, manifest);
    console.log(`Composition guides generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
