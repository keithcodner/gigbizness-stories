#!/usr/bin/env node

const path = require("path");
const {
  assetTimestamp,
  createPlaceholderPng,
  ensureDir,
  inferQualityTier,
  loadManifest,
  readJsonSafe,
  relativeWorkspacePath,
  saveManifest,
  upsertAsset,
  writeJson
} = require("../src/bricktoon/aiQualityPipeline");
const { parseArgs } = require("../agents/common");

function keyframeCountForTier(tier) {
  if (tier === "hero") {
    return 2;
  }
  if (tier === "utility") {
    return 1;
  }
  return 1;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_shot_keyframes.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const artDirectionDir = path.join(workspaceDir, "07_visuals", "art_direction");
    const generatedDir = path.join(workspaceDir, "07_visuals", "generated_keyframes");
    const approvedDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const manifest = loadManifest(workspaceDir);

    ensureDir(generatedDir);
    ensureDir(approvedDir);

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const tier = inferQualityTier(shot);
        const count = keyframeCountForTier(tier);
        const approvalRecord = {
          shot_id: shot.shot_id,
          scene_id: scene.scene_id,
          quality_tier: tier,
          approved_keyframes: []
        };

        for (let index = 1; index <= count; index += 1) {
          const baseName = `${shot.shot_id}_KF_${String(index).padStart(2, "0")}`;
          const generatedPath = path.join(generatedDir, `${baseName}.png`);
          const approvedPath = path.join(approvedDir, `${baseName}.png`);
          createPlaceholderPng(generatedPath, {
            width: 1920,
            height: 1080,
            color: tier === "hero" ? "0x111827" : "0x1f2937",
            boxes: tier === "hero"
              ? [
                { x: 380, y: 160, w: 720, h: 760, color: "0xf59e0b@0.9" },
                { x: 1180, y: 260, w: 280, h: 360, color: "0x38bdf8@0.85" }
              ]
              : [
                { x: 260, y: 190, w: 540, h: 660, color: "0xf59e0b@0.9" },
                { x: 900, y: 220, w: 420, h: 560, color: "0x38bdf8@0.85" }
              ]
          });
          createPlaceholderPng(approvedPath, {
            width: 1920,
            height: 1080,
            color: tier === "hero" ? "0x172554" : "0x0f172a",
            boxes: [
              { x: 320, y: 140, w: 600, h: 760, color: "0xf8fafc@0.92" },
              { x: 1040, y: 220, w: 520, h: 620, color: "0xf59e0b@0.88" }
            ]
          });

          approvalRecord.approved_keyframes.push({
            keyframe_id: baseName,
            generated_file: relativeWorkspacePath(workspaceDir, generatedPath),
            approved_file: relativeWorkspacePath(workspaceDir, approvedPath)
          });

          upsertAsset(manifest, {
            asset_id: `GEN_${baseName}`,
            asset_type: "generated_keyframe",
            shot_ids: [shot.shot_id],
            scene_ids: [scene.scene_id],
            file: relativeWorkspacePath(workspaceDir, generatedPath),
            status: "generated",
            quality_tier: tier,
            created_at: assetTimestamp()
          });
          upsertAsset(manifest, {
            asset_id: `APP_${baseName}`,
            asset_type: "approved_keyframe",
            shot_ids: [shot.shot_id],
            scene_ids: [scene.scene_id],
            file: relativeWorkspacePath(workspaceDir, approvedPath),
            status: "approved",
            quality_tier: tier,
            created_at: assetTimestamp()
          });
        }

        writeJson(path.join(artDirectionDir, `${shot.shot_id}_approval.json`), approvalRecord);
      }
    }

    saveManifest(workspaceDir, manifest);
    console.log(`Shot keyframes generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
