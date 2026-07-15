#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { readJsonSafe, writeJson, loadManifest, saveManifest, upsertAsset, relativeWorkspacePath, assetTimestamp } = require("../src/bricktoon/aiQualityPipeline");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_ai_motion_passes.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const routes = readJsonSafe(path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"), {});
    const shotClipsDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const rawDir = path.join(workspaceDir, "08_animation", "raw_ai_video");
    const manifest = loadManifest(workspaceDir);

    for (const route of routes.routes || []) {
      if (!["hybrid_2d_ai", "layered_ai_illustration", "ai_image_to_video"].includes(route.production_mode)) {
        continue;
      }
      const sourceClip = path.join(shotClipsDir, `${route.shot_id}.mp4`);
      if (!fs.existsSync(sourceClip)) {
        continue;
      }
      const rawClip = path.join(rawDir, `${route.shot_id}_ai_motion.mp4`);
      fs.copyFileSync(sourceClip, rawClip);
      upsertAsset(manifest, {
        asset_id: `AIMOTION_${route.shot_id}`,
        asset_type: "ai_motion_pass",
        shot_ids: [route.shot_id],
        file: relativeWorkspacePath(workspaceDir, rawClip),
        status: "approved",
        created_at: assetTimestamp()
      });
    }

    saveManifest(workspaceDir, manifest);
    writeJson(path.join(rawDir, "ai_motion_report.json"), {
      generated_at: assetTimestamp(),
      status: "mock_motion_passes_ready"
    });
    console.log(`AI motion passes generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
