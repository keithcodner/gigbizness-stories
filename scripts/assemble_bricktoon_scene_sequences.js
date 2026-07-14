#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { concatClips, ensureDir } = require("../src/bricktoon/proceduralSequenceRenderer");

function loadManifest(filePath, workspaceId) {
  if (!fs.existsSync(filePath)) {
    return createEmptyManifest(workspaceId);
  }
  return readJson(filePath);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/assemble_bricktoon_scene_sequences.js --workspace <workspace_path>");
    }

    const workspaceDir = args.workspace;
    const workspaceId = path.basename(workspaceDir);
    const shotPlan = readJson(path.join(workspaceDir, "07_shot_plans", "shot_plan.json")).scenes || [];
    const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    let manifest = loadManifest(manifestPath, workspaceId);
    const sequenceDir = path.join(workspaceDir, "08_animation", "scene_sequences");
    ensureDir(sequenceDir);
    const reports = [];

    for (const scene of shotPlan) {
      const files = scene.shots.map((shot) => path.join(workspaceDir, "08_animation", "shot_clips", `${shot.shot_id}.mp4`)).filter((file) => fs.existsSync(file));
      if (files.length === 0) {
        continue;
      }
      const outputPath = path.join(sequenceDir, `${scene.scene_id}_sequence.mp4`);
      concatClips(files, outputPath);

      manifest = upsertAsset(manifest, {
        asset_id: `SEQ_${scene.scene_id}_MAIN`,
        asset_type: "bricktoon_scene_sequence",
        scene_ids: [scene.scene_id],
        shot_ids: scene.shots.map((shot) => shot.shot_id),
        file: `08_animation/scene_sequences/${scene.scene_id}_sequence.mp4`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "bricktoon_scene_sequence_v1"
        },
        created_at: new Date().toISOString()
      });

      manifest = upsertAsset(manifest, {
        asset_id: `CLIP_${scene.scene_id}_MAIN`,
        asset_type: "bricktoon_animated_clip",
        scene_ids: [scene.scene_id],
        file: `08_animation/scene_sequences/${scene.scene_id}_sequence.mp4`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "bricktoon_clip_wrapper_v2"
        },
        created_at: new Date().toISOString()
      });

      reports.push({ scene_id: scene.scene_id, shots: scene.shots.length, file: outputPath });
    }

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeText(path.join(sequenceDir, "scene_sequence_report.json"), `${JSON.stringify({ scenes: reports }, null, 2)}\n`);
    console.log(`Bricktoon scene sequences assembled for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
