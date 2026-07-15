#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileScenePrompt } = require("../src/bricktoon/compileScenePrompt");
const { validateGeneratedAsset } = require("../src/bricktoon/validateGeneratedAsset");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { buildCharacterMap } = require("../src/bricktoon/normalizeCast");
const { withImageProvider } = require("../src/bricktoon/providers");
const {
  buildExecutionResult,
  buildWorkflowRequest,
  loadVisualGenerationConfig,
  writeExecutionReport,
  writeWorkflowRequest
} = require("../src/bricktoon/workflowContracts");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getPaths(workspaceDir) {
  const rootDir = path.resolve(__dirname, "..");
  return {
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    generatedImagesDir: path.join(workspaceDir, "07_visuals", "generated_images"),
    rejectedAssetsDir: path.join(workspaceDir, "07_visuals", "rejected_assets"),
    promptScenesDir: path.join(workspaceDir, "07_visuals", "prompts", "scenes"),
    tempDir: path.join(workspaceDir, "07_visuals", "_tmp_specs"),
    visualBiblePath: path.join(workspaceDir, "03_cast", "visual_character_bible.json"),
    styleBiblePath: path.join(rootDir, "styles", "bricktoon", "style_bible.md"),
    environmentRulesPath: path.join(rootDir, "styles", "bricktoon", "environment_prompt_rules.md"),
    cameraRulesPath: path.join(rootDir, "styles", "bricktoon", "camera_rules.md"),
    negativePromptsPath: path.join(rootDir, "styles", "bricktoon", "negative_prompts.md")
  };
}

function loadManifest(filePath, workspaceId) {
  if (!fs.existsSync(filePath)) {
    return createEmptyManifest(workspaceId);
  }
  return readJson(filePath);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_bricktoon_scene_images.js --workspace <workspace_path> [--dry-run]");
    }

    const workspaceId = path.basename(args.workspace);
    const paths = getPaths(args.workspace);
    const castPackage = readJson(paths.castPath);
    const sceneCards = readJson(paths.sceneCardsPath).scene_cards || [];
    const visualBible = fs.existsSync(paths.visualBiblePath) ? readJson(paths.visualBiblePath) : {};
    const castMap = buildCharacterMap(castPackage);
    let manifest = loadManifest(paths.assetManifestPath, workspaceId);
    const visualConfig = loadVisualGenerationConfig();

    ensureDir(paths.generatedImagesDir);
    ensureDir(paths.rejectedAssetsDir);
    ensureDir(paths.promptScenesDir);
    ensureDir(paths.tempDir);

    for (const sceneCard of sceneCards) {
      if ((sceneCard.visual_type || "bricktoon_scene") !== "bricktoon_scene") {
        continue;
      }

      const prompt = compileScenePrompt(sceneCard, castMap, {
        styleBiblePath: paths.styleBiblePath,
        environmentRulesPath: paths.environmentRulesPath,
        cameraRulesPath: paths.cameraRulesPath,
        negativePromptsPath: paths.negativePromptsPath
      });
      writeText(path.join(paths.promptScenesDir, `${sceneCard.scene_id}.txt`), prompt.prompt_text);

      if (args["dry-run"]) {
        continue;
      }

      const outputPath = path.join(paths.generatedImagesDir, `${sceneCard.scene_id}_main.png`);
      const workflowRequest = buildWorkflowRequest({
        workspaceDir: args.workspace,
        kind: "scene_still",
        providerName: process.env.BRICKTOON_IMAGE_PROVIDER || visualConfig.default_image_provider || "comfyui",
        outputFile: path.relative(args.workspace, outputPath).replaceAll("\\", "/"),
        stage: "bricktoon-scenes",
        qualityTier: "standard",
        sceneId: sceneCard.scene_id,
        promptText: prompt.prompt_text,
        negativePromptText: prompt.negative_prompt_text,
        promptComponents: ["scene_card", "cast_map", "style_bible", "camera_rules", "environment_rules"],
        continuitySourceRefs: [
          "03_cast/visual_character_bible.json",
          `05_scene_cards/scene_cards.json#${sceneCard.scene_id}`
        ],
        references: (sceneCard.characters || []).map((characterId) => ({
          type: "character_reference",
          asset_id: `CHAR_${characterId}_MASTER`
        })),
        context: {
          visualQualityProfile: visualBible.style_lock_package ? { production_target: visualBible.style_lock_package, avoid: visualBible.style_lock_package.never_generate } : {}
        },
        config: visualConfig,
        selectionReason: "Managed composition-driven scene still workflow."
      });
      const requestFile = writeWorkflowRequest(args.workspace, workflowRequest);
      const run = await withImageProvider(`scene image ${sceneCard.scene_id}`, async (provider, providerName, providerConfig) => {
        const providerResult = await provider.renderSceneImage({
          sceneCard,
          prompt,
          outputPath,
          tempDir: paths.tempDir,
          width: workflowRequest.output_contract.width,
          height: workflowRequest.output_contract.height,
          workflowRequest,
          providerConfig: {
            ...providerConfig,
            workflowTemplate: workflowRequest.workflow_template
          }
        });
        return {
          providerName,
          providerResult
        };
      });
      const providerUsed = run.providerName;
      const reportFile = writeExecutionReport(args.workspace, workflowRequest, buildExecutionResult(workflowRequest, {
        status: "completed",
        promptId: run.providerResult?.promptId || null,
        passResults: run.providerResult?.passResults,
        metrics: run.providerResult?.metrics
      }));

      const validation = validateGeneratedAsset(outputPath, {
        width: workflowRequest.output_contract.width,
        height: workflowRequest.output_contract.height
      });
      if (!validation.valid) {
        throw new Error(`Scene asset validation failed for ${sceneCard.scene_id}: ${validation.reason}`);
      }

      const characterRefs = (sceneCard.characters || []).map((characterId) => `CHAR_${characterId}_MASTER`);
      manifest = upsertAsset(manifest, {
        asset_id: `ASSET_${sceneCard.scene_id}_MAIN`,
        asset_type: "bricktoon_scene",
        scene_ids: [sceneCard.scene_id],
        character_ids: sceneCard.characters || [],
        file: `07_visuals/generated_images/${sceneCard.scene_id}_main.png`,
        width: validation.width,
        height: validation.height,
        status: "approved",
        generator: {
          provider: providerUsed,
          workflow: workflowRequest.workflow_template_id,
          seed: sceneCard.scene_id.length * 2003
        },
        character_reference_assets: characterRefs,
        prompt_file: `07_visuals/prompts/scenes/${sceneCard.scene_id}.txt`,
        workflow_request_files: [requestFile],
        provider_report_files: [reportFile],
        continuity_source_refs: workflowRequest.prompt_contract.continuity_source_refs,
        created_at: new Date().toISOString()
      });
    }

    if (!args["dry-run"]) {
      writeText(paths.assetManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }

    console.log(`Bricktoon scene images ${args["dry-run"] ? "planned" : "generated"} for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
