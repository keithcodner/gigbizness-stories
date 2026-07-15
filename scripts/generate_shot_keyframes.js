#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assetTimestamp,
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
const { withImageProvider } = require("../src/bricktoon/providers");

function keyframeCountForTier(tier) {
  if (tier === "hero") {
    return 2;
  }
  if (tier === "utility") {
    return 1;
  }
  return 1;
}

async function main() {
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
          const prompt = {
            prompt_text: [
              `Scene ${scene.scene_id} shot ${shot.shot_id}.`,
              `Shot type: ${shot.shot_type}.`,
              `Purpose: ${shot.purpose}.`,
              `Camera movement: ${shot.camera?.movement || "steady_push"}.`,
              "Premium editorial bricktoon quality, cinematic lighting, strong depth, stable character identity.",
              "No embedded text or logos."
            ].join(" ")
          };
          const providerUsed = await withImageProvider(`shot keyframe ${baseName}`, async (provider, providerName, providerConfig) => {
            await provider.renderShotKeyframe({
              prompt,
              outputPath: generatedPath,
              width: 1920,
              height: 1080,
              qualityTier: tier,
              shotId: shot.shot_id,
              providerConfig
            });
            return providerName;
          });
          fs.copyFileSync(generatedPath, approvedPath);

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
            generator: {
              provider: providerUsed,
              workflow: "bricktoon_shot_keyframe_v1"
            },
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
            generator: {
              provider: providerUsed,
              workflow: "bricktoon_shot_keyframe_v1"
            },
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
