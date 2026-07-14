#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { buildCharacterMap } = require("../src/bricktoon/normalizeCast");
const { ensureDir, renderShotClip } = require("../src/bricktoon/proceduralSequenceRenderer");

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
      throw new Error("Usage: node scripts/generate_bricktoon_shot_clips.js --workspace <workspace_path>");
    }

    const workspaceDir = args.workspace;
    const workspaceId = path.basename(workspaceDir);
    const shotPlan = readJson(path.join(workspaceDir, "07_shot_plans", "shot_plan.json")).scenes || [];
    const sceneCards = readJson(path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).scene_cards || [];
    const animationPlan = readJson(path.join(workspaceDir, "08_animation", "animation_plan.json")).scenes || [];
    const castPackage = readJson(path.join(workspaceDir, "03_cast", "cast.json"));
    const characterMap = buildCharacterMap(castPackage);
    const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    let manifest = loadManifest(manifestPath, workspaceId);

    const shotDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const posterDir = path.join(workspaceDir, "07_visuals", "generated_images", "shot_posters");
    ensureDir(shotDir);
    ensureDir(posterDir);

    const report = [];
    for (const scene of shotPlan) {
      const sceneCard = sceneCards.find((card) => card.scene_id === scene.scene_id);
      const animationScene = animationPlan.find((entry) => entry.scene_id === scene.scene_id) || { motion_directives: [] };
      const castMembers = (sceneCard?.characters || []).map((id) => characterMap.get(id)).filter(Boolean);

      for (const shot of scene.shots) {
        const clipPath = path.join(shotDir, `${shot.shot_id}.mp4`);
        const posterPath = path.join(posterDir, `${shot.shot_id}.png`);
        const tempDir = path.join(shotDir, `_tmp_${shot.shot_id}`);

        renderShotClip({
          shot,
          sceneCard,
          castMembers,
          motionDirectives: animationScene.motion_directives || [],
          outputPath: clipPath,
          posterPath,
          tempDir
        });

        manifest = upsertAsset(manifest, {
          asset_id: `SHOT_${shot.shot_id}`,
          asset_type: "bricktoon_shot_clip",
          scene_ids: [scene.scene_id],
          shot_ids: [shot.shot_id],
          character_ids: castMembers.map((member) => member.character_id),
          file: `08_animation/shot_clips/${shot.shot_id}.mp4`,
          poster_file: `07_visuals/generated_images/shot_posters/${shot.shot_id}.png`,
          width: 768,
          height: 1344,
          fps: 30,
          status: "approved",
          generator: {
            provider: "procedural",
            workflow: "bricktoon_shot_clip_v1"
          },
          created_at: new Date().toISOString()
        });

        report.push({ shot_id: shot.shot_id, scene_id: scene.scene_id, file: clipPath });
      }
    }

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeText(path.join(shotDir, "shot_clip_report.json"), `${JSON.stringify({ shots: report }, null, 2)}\n`);
    console.log(`Bricktoon shot clips generated for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
