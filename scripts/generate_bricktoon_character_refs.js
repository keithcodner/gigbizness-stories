#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileCharacterPrompt } = require("../src/bricktoon/compileCharacterPrompt");
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
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    refsDir: path.join(workspaceDir, "07_visuals", "character_refs"),
    promptsDir: path.join(workspaceDir, "07_visuals", "prompts", "characters"),
    tempDir: path.join(workspaceDir, "07_visuals", "_tmp_specs"),
    styleBiblePath: path.join(rootDir, "styles", "bricktoon", "style_bible.md"),
    characterRulesPath: path.join(rootDir, "styles", "bricktoon", "character_prompt_rules.md"),
    negativePromptsPath: path.join(rootDir, "styles", "bricktoon", "negative_prompts.md")
  };
}

function loadManifest(filePath, workspaceId) {
  if (!fs.existsSync(filePath)) {
    return createEmptyManifest(workspaceId);
  }
  return readJson(filePath);
}

function renderVariant(character, variant, outputPath, prompt, paths) {
  provider.renderCharacterReference({
    character,
    prompt,
    outputPath,
    tempDir: paths.tempDir,
    width: 1024,
    height: 1024,
    variant
  });
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_bricktoon_character_refs.js --workspace <workspace_path>");
    }

    const workspaceId = path.basename(args.workspace);
    const paths = getPaths(args.workspace);
    const castPackage = readJson(paths.castPath);
    let manifest = loadManifest(paths.assetManifestPath, workspaceId);

    ensureDir(paths.refsDir);
    ensureDir(paths.promptsDir);
    ensureDir(paths.tempDir);

    for (const character of castPackage.cast || []) {
      const prompt = compileCharacterPrompt(character, {
        styleBiblePath: paths.styleBiblePath,
        characterRulesPath: paths.characterRulesPath,
        negativePromptsPath: paths.negativePromptsPath
      });

      const characterDir = path.join(paths.refsDir, character.character_id);
      const expressionsDir = path.join(characterDir, "expressions");
      ensureDir(characterDir);
      ensureDir(expressionsDir);
      writeText(path.join(paths.promptsDir, `${character.character_id}.txt`), prompt.prompt_text);

      const variants = {
        master: path.join(characterDir, "master.bmp"),
        front: path.join(characterDir, "front.bmp"),
        three_quarter: path.join(characterDir, "three_quarter.bmp"),
        side: path.join(characterDir, "side.bmp"),
        worried: path.join(expressionsDir, "worried.bmp"),
        talking: path.join(expressionsDir, "talking.bmp")
      };

      for (const [variant, outputPath] of Object.entries(variants)) {
        renderVariant(character, variant, outputPath, prompt, paths);
      }

      const masterValidation = validateGeneratedAsset(variants.master, { width: 1024, height: 1024 });
      if (!masterValidation.valid) {
        throw new Error(`Character reference validation failed for ${character.character_id}: ${masterValidation.reason}`);
      }

      manifest = upsertAsset(manifest, {
        asset_id: `CHAR_${character.character_id}_MASTER`,
        asset_type: "character_reference",
        character_ids: [character.character_id],
        file: `07_visuals/character_refs/${character.character_id}/master.bmp`,
        width: masterValidation.width,
        height: masterValidation.height,
        status: "approved",
        generator: {
          provider: "mock",
          workflow: "bricktoon_character_ref_v1",
          seed: character.character_id.length * 1001
        },
        prompt_file: `07_visuals/prompts/characters/${character.character_id}.txt`,
        created_at: new Date().toISOString()
      });
    }

    writeText(paths.assetManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Bricktoon character refs generated for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
