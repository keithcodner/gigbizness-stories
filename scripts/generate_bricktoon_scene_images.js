#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileScenePrompt } = require("../src/bricktoon/compileScenePrompt");
const { validateGeneratedAsset } = require("../src/bricktoon/validateGeneratedAsset");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const provider = require("../src/bricktoon/providers/mockImageProvider");

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

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_bricktoon_scene_images.js --workspace <workspace_path> [--dry-run]");
    }

    const workspaceId = path.basename(args.workspace);
    const paths = getPaths(args.workspace);
    const castPackage = readJson(paths.castPath);
    const sceneCards = readJson(paths.sceneCardsPath).scene_cards || [];
    const castMap = new Map((castPackage.cast || []).map((character) => [character.character_id, character]));
    let manifest = loadManifest(paths.assetManifestPath, workspaceId);

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

      const outputPath = path.join(paths.generatedImagesDir, `${sceneCard.scene_id}_main.bmp`);
      provider.renderSceneImage({
        sceneCard,
        prompt,
        outputPath,
        tempDir: paths.tempDir,
        width: 768,
        height: 1344
      });

      const validation = validateGeneratedAsset(outputPath, { width: 768, height: 1344 });
      if (!validation.valid) {
        throw new Error(`Scene asset validation failed for ${sceneCard.scene_id}: ${validation.reason}`);
      }

      const characterRefs = (sceneCard.characters || []).map((characterId) => `CHAR_${characterId}_MASTER`);
      manifest = upsertAsset(manifest, {
        asset_id: `ASSET_${sceneCard.scene_id}_MAIN`,
        asset_type: "bricktoon_scene",
        scene_ids: [sceneCard.scene_id],
        character_ids: sceneCard.characters || [],
        file: `07_visuals/generated_images/${sceneCard.scene_id}_main.bmp`,
        width: validation.width,
        height: validation.height,
        status: "approved",
        generator: {
          provider: "mock",
          workflow: "bricktoon_scene_v1",
          seed: sceneCard.scene_id.length * 2003
        },
        character_reference_assets: characterRefs,
        prompt_file: `07_visuals/prompts/scenes/${sceneCard.scene_id}.txt`,
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
