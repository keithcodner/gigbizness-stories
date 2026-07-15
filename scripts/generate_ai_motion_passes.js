#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { readJsonSafe, writeJson, loadManifest, saveManifest, upsertAsset, relativeWorkspacePath, assetTimestamp } = require("../src/bricktoon/aiQualityPipeline");
const { inferMotionRecipe } = require("../src/bricktoon/workflowContracts");

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
    const approvedKeyframesDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const shotPerformances = readJsonSafe(path.join(workspaceDir, "08_animation", "shot_performances.json"), {});
    const manifest = loadManifest(workspaceDir);
    const report = {
      generated_at: assetTimestamp(),
      status: "motion_passes_ready",
      shots: []
    };

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
      const performance = (shotPerformances.shots || []).find((shot) => shot.shot_id === route.shot_id) || {};
      const motionRecipe = inferMotionRecipe(route, performance);
      const approvedKeyframes = fs.existsSync(approvedKeyframesDir)
        ? fs.readdirSync(approvedKeyframesDir).filter((fileName) => fileName.startsWith(`${route.shot_id}_KF_`))
        : [];
      upsertAsset(manifest, {
        asset_id: `AIMOTION_${route.shot_id}`,
        asset_type: "ai_motion_pass",
        shot_ids: [route.shot_id],
        file: relativeWorkspacePath(workspaceDir, rawClip),
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "motion_pass_source_v1"
        },
        motion_recipe: motionRecipe,
        created_at: assetTimestamp()
      });
      report.shots.push({
        shot_id: route.shot_id,
        production_mode: route.production_mode,
        source_clip: relativeWorkspacePath(workspaceDir, sourceClip),
        source_keyframes: approvedKeyframes,
        motion_recipe: motionRecipe,
        motion_controls: {
          motion_intensity: route.quality_tier === "hero" ? "high" : "medium",
          camera_movement: route.camera_motion || "steady_push",
          facial_motion: route.quality_tier === "utility" ? "limited" : "enabled",
          hand_prop_motion: route.precision_requirements?.preserve_hands ? "careful" : "minimal"
        },
        execution_mode: "compatibility_fallback_copy"
      });
    }

    saveManifest(workspaceDir, manifest);
    writeJson(path.join(rawDir, "ai_motion_report.json"), report);
    console.log(`AI motion passes generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
