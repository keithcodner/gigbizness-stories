#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { assetTimestamp, loadManifest, readJsonSafe, relativeWorkspacePath, saveManifest, upsertAsset, writeJson } = require("../src/bricktoon/aiQualityPipeline");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/composite_bricktoon_shots.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const baseShotDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const stabilizedDir = path.join(workspaceDir, "08_animation", "stabilized_ai_video");
    const compositedDir = path.join(workspaceDir, "08_animation", "composited_shot_clips");
    const reportsDir = path.join(workspaceDir, "08_animation", "compositing_reports");
    const manifest = loadManifest(workspaceDir);
    const report = { shots: [] };

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const stabilizedPath = path.join(stabilizedDir, `${shot.shot_id}_stabilized.mp4`);
        const fallbackPath = path.join(baseShotDir, `${shot.shot_id}.mp4`);
        const source = fs.existsSync(stabilizedPath) ? stabilizedPath : fallbackPath;
        if (!fs.existsSync(source)) {
          continue;
        }
        const target = path.join(compositedDir, `${shot.shot_id}.mp4`);
        fs.copyFileSync(source, target);
        report.shots.push({
          shot_id: shot.shot_id,
          scene_id: scene.scene_id,
          source: relativeWorkspacePath(workspaceDir, source),
          composited_file: relativeWorkspacePath(workspaceDir, target)
        });
        upsertAsset(manifest, {
          asset_id: `COMP_${shot.shot_id}`,
          asset_type: "composited_shot_clip",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, target),
          status: "approved",
          created_at: assetTimestamp()
        });
      }
    }

    writeJson(path.join(reportsDir, "compositing_report.json"), report);
    saveManifest(workspaceDir, manifest);
    console.log(`Bricktoon shot compositing completed for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
