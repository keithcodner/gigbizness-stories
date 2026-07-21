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
const { collectReferenceImages, referencePromptAddendum } = require("../src/bricktoon/referenceImages");
const { validateGeneratedAsset } = require("../src/bricktoon/validateGeneratedAsset");
const {
  buildExecutionResult,
  buildWorkflowRequest,
  loadVisualGenerationConfig,
  writeExecutionReport,
  writeWorkflowRequest
} = require("../src/bricktoon/workflowContracts");
const {
  buildCharacterLockLines,
  buildShotCompositionLines,
  buildShotNegativePrompt,
  getShotCharacters,
  selectCharacterRefPaths
} = require("../src/bricktoon/shotKeyframeGuidance");
const { readJson } = require("../agents/common");

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
    const visualBible = readJsonSafe(path.join(workspaceDir, "03_cast", "visual_character_bible.json"), {});
    const castPackage = readJson(path.join(workspaceDir, "03_cast", "cast.json"));
    const sceneCards = readJsonSafe(path.join(workspaceDir, "05_scene_cards", "scene_cards.json"), {});
    const productionRoutes = readJsonSafe(path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"), {});
    const manifest = loadManifest(workspaceDir);
    const visualConfig = loadVisualGenerationConfig();

    ensureDir(generatedDir);
    ensureDir(approvedDir);

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const tier = inferQualityTier(shot);
        const count = keyframeCountForTier(tier);
        const route = (productionRoutes.routes || []).find((item) => item.shot_id === shot.shot_id) || {};
        const sceneCard = (sceneCards.scene_cards || []).find((item) => item.scene_id === scene.scene_id) || {};
        const artDirection = readJsonSafe(path.join(artDirectionDir, `${shot.shot_id}.json`), {});
        const compositionGuide = readJsonSafe(path.join(workspaceDir, "07_visuals", "composition_guides", `${shot.shot_id}.json`), {});
        const shotCharacters = getShotCharacters(castPackage, shot);
        const characterRefs = selectCharacterRefPaths(workspaceDir, visualBible, shotCharacters, shot);
        const workspaceReferenceImages = collectReferenceImages(workspaceDir, {
          sceneId: scene.scene_id,
          shotId: shot.shot_id
        });
        const prioritizedReferences = [...characterRefs, ...workspaceReferenceImages];
        const { primaryCharacter, lines: characterLockLines } = buildCharacterLockLines(shotCharacters, shot);
        const compositionLines = buildShotCompositionLines({
          shot,
          sceneCard,
          compositionGuide,
          artDirection,
          tier
        });
        const approvalRecord = {
          shot_id: shot.shot_id,
          scene_id: scene.scene_id,
          quality_tier: tier,
          approved_keyframes: [],
          workflow_template_id: null
        };

        for (let index = 1; index <= count; index += 1) {
          const baseName = `${shot.shot_id}_KF_${String(index).padStart(2, "0")}`;
          const generatedPath = path.join(generatedDir, `${baseName}.png`);
          const approvedPath = path.join(approvedDir, `${baseName}.png`);
          const keyframeVariantLine = count > 1
            ? `Keyframe variant ${index} of ${count}. Keep the same cast identity, wardrobe, and environment continuity while changing only expression, camera emphasis, or micro-pose.`
            : "Single approved still. Lock identity and continuity exactly.";
          const prompt = {
            prompt_text: [
              `Scene ${scene.scene_id} shot ${shot.shot_id}.`,
              `Shot type: ${shot.shot_type}.`,
              `Purpose: ${shot.purpose}.`,
              `Camera movement: ${shot.camera?.movement || "steady_push"}.`,
              primaryCharacter ? `Primary story subject: ${primaryCharacter.name} (${primaryCharacter.character_id}).` : "",
              ...characterLockLines,
              ...compositionLines,
              "Premium editorial bricktoon quality, cinematic lighting, strong depth, stable character identity, believable plastic toy materials.",
              "This must look like polished thumbnail-grade bricktoon art, not a rough draft, low-detail render, or flat placeholder image.",
              "No embedded text or logos. No brand copying. Keep the composition dense and visually finished.",
              keyframeVariantLine,
              referencePromptAddendum(prioritizedReferences)
            ].join(" "),
            negative_prompt_text: buildShotNegativePrompt(shotCharacters, shot)
          };
          const workflowRequest = buildWorkflowRequest({
            workspaceDir,
            kind: "shot_keyframe",
            providerName: process.env.BRICKTOON_IMAGE_PROVIDER || visualConfig.default_image_provider || "comfyui",
            outputFile: relativeWorkspacePath(workspaceDir, generatedPath),
            stage: "asset-generation",
            qualityTier: tier,
            sceneId: scene.scene_id,
            shotId: shot.shot_id,
            promptText: prompt.prompt_text,
            negativePromptText: prompt.negative_prompt_text,
            promptComponents: ["shot_plan", "art_direction", "production_route", "scene_card", "quality_profile"],
            continuitySourceRefs: [
              `03_cast/visual_character_bible.json`,
              `03_cast/cast.json`,
              `07_visuals/production_routes/production_routes.json#${shot.shot_id}`,
              `07_visuals/art_direction/${shot.shot_id}.json`,
              `07_visuals/composition_guides/${shot.shot_id}.json`
            ],
            references: [
              ...prioritizedReferences.map((ref) => ({
                type: ref.type,
                file: ref.relativeFile,
                label: ref.label,
                reference_id: ref.reference_id,
                character_id: ref.character_id || null
              }))
            ],
            productionMode: route.production_mode,
            context: {
              visualQualityProfile: visualBible.style_lock_package ? { production_target: visualBible.style_lock_package, avoid: visualBible.style_lock_package.never_generate } : {},
              referenceImageFiles: prioritizedReferences.map((ref) => ref.relativeFile),
              shotCharacters,
              primaryCharacterId: primaryCharacter?.character_id || null,
              styleGoal: tier === "hero" ? "premium_thumbnail_match" : "premium_editorial_match",
              compositionGuide,
              artDirection
            },
            config: visualConfig,
            selectionReason: tier === "hero"
              ? "Hero-tier shot uses managed hero refinement workflow."
              : "Shot uses managed premium keyframe workflow."
          });
          approvalRecord.workflow_template_id = workflowRequest.workflow_template_id;
          const requestFile = writeWorkflowRequest(workspaceDir, workflowRequest);
          const run = await withImageProvider(`shot keyframe ${baseName}`, async (provider, providerName, providerConfig) => {
            const providerResult = await provider.renderShotKeyframe({
              prompt,
              outputPath: generatedPath,
              width: workflowRequest.output_contract.width,
              height: workflowRequest.output_contract.height,
              qualityTier: tier,
              shotId: shot.shot_id,
              referenceImagePaths: prioritizedReferences.map((ref) => ref.filePath),
              workflowRequest,
              providerConfig: {
                ...providerConfig,
                workflowTemplate: workflowRequest.workflow_template,
                referenceImagePaths: prioritizedReferences.map((ref) => ref.filePath),
                shotType: shot.shot_type,
                referenceDenoise: tier === "hero" ? 0.42 : 0.5
              }
            });
            return {
              providerName,
              providerResult
            };
          });
          const validation = validateGeneratedAsset(generatedPath, {
            width: workflowRequest.output_contract.width,
            height: workflowRequest.output_contract.height
          });
          if (!validation.valid) {
            throw new Error(`Shot keyframe validation failed for ${baseName}: ${validation.reason}`);
          }
          const providerUsed = run.providerName;
          const reportFile = writeExecutionReport(workspaceDir, workflowRequest, buildExecutionResult(workflowRequest, {
            status: "completed",
            promptId: run.providerResult?.promptId || null,
            passResults: run.providerResult?.passResults,
            metrics: run.providerResult?.metrics
          }));
          fs.copyFileSync(generatedPath, approvedPath);

          approvalRecord.approved_keyframes.push({
            keyframe_id: baseName,
            generated_file: relativeWorkspacePath(workspaceDir, generatedPath),
            approved_file: relativeWorkspacePath(workspaceDir, approvedPath),
            workflow_request_file: requestFile,
            provider_report_file: reportFile
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
              workflow: workflowRequest.workflow_template_id
            },
            workflow_request_file: requestFile,
            provider_report_file: reportFile,
            continuity_source_refs: workflowRequest.prompt_contract.continuity_source_refs,
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
              workflow: workflowRequest.workflow_template_id
            },
            workflow_request_file: requestFile,
            provider_report_file: reportFile,
            continuity_source_refs: workflowRequest.prompt_contract.continuity_source_refs,
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
