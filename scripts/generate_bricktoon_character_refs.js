#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileCharacterPrompt } = require("../src/bricktoon/compileCharacterPrompt");
const { validateGeneratedAsset } = require("../src/bricktoon/validateGeneratedAsset");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { getCastMembers, getCharacterBlueprint, getCharacterId } = require("../src/bricktoon/normalizeCast");
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
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    refsDir: path.join(workspaceDir, "07_visuals", "character_refs"),
    promptsDir: path.join(workspaceDir, "07_visuals", "prompts", "characters"),
    tempDir: path.join(workspaceDir, "07_visuals", "_tmp_specs"),
    visualBiblePath: path.join(workspaceDir, "03_cast", "visual_character_bible.json"),
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

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_bricktoon_character_refs.js --workspace <workspace_path>");
    }

    const workspaceId = path.basename(args.workspace);
    const paths = getPaths(args.workspace);
    const castPackage = readJson(paths.castPath);
    const visualBible = fs.existsSync(paths.visualBiblePath) ? readJson(paths.visualBiblePath) : {};
    let manifest = loadManifest(paths.assetManifestPath, workspaceId);
    const visualConfig = loadVisualGenerationConfig();

    ensureDir(paths.refsDir);
    ensureDir(paths.promptsDir);
    ensureDir(paths.tempDir);

    for (const member of getCastMembers(castPackage)) {
      const character = {
        ...getCharacterBlueprint(member),
        role: member.role || getCharacterBlueprint(member).archetype_id,
        name: member.name || getCharacterBlueprint(member).name,
        character_id: getCharacterId(member)
      };
      if (!character.character_id) {
        continue;
      }

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
        master: path.join(characterDir, "master.png"),
        front: path.join(characterDir, "front.png"),
        three_quarter: path.join(characterDir, "three_quarter.png"),
        side: path.join(characterDir, "side.png"),
        worried: path.join(expressionsDir, "worried.png"),
        talking: path.join(expressionsDir, "talking.png")
      };

      let providerUsed = process.env.BRICKTOON_IMAGE_PROVIDER || visualConfig.default_image_provider || "comfyui";
      const executionReports = [];
      for (const [variant, outputPath] of Object.entries(variants)) {
        const workflowRequest = buildWorkflowRequest({
          workspaceDir: args.workspace,
          kind: "character_reference",
          providerName: providerUsed,
          outputFile: path.relative(args.workspace, outputPath).replaceAll("\\", "/"),
          stage: "bricktoon-characters",
          qualityTier: variant === "master" ? "hero" : "standard",
          variant,
          characterId: character.character_id,
          promptText: prompt.prompt_text,
          negativePromptText: prompt.negative_prompt_text,
          promptComponents: ["character_blueprint", "style_bible", "character_rules", "negative_prompts"],
          continuitySourceRefs: [`03_cast/visual_character_bible.json#${character.character_id}`],
          references: [{
            type: "visual_character_bible",
            file: "03_cast/visual_character_bible.json"
          }],
          context: {
            visualQualityProfile: visualBible.style_lock_package ? { production_target: visualBible.style_lock_package, avoid: visualBible.style_lock_package.never_generate } : {}
          },
          config: visualConfig,
          selectionReason: variant === "master"
            ? "Managed character identity workflow for canonical master reference."
            : `Managed character variant workflow for ${variant}.`
        });
        const requestFile = writeWorkflowRequest(args.workspace, workflowRequest);
        const run = await withImageProvider(`character reference ${character.character_id}/${variant}`, async (provider, providerName, providerConfig) => {
          const providerResult = await provider.renderCharacterReference({
            character,
            prompt,
            outputPath,
            tempDir: paths.tempDir,
            width: workflowRequest.output_contract.width,
            height: workflowRequest.output_contract.height,
            variant,
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
        providerUsed = run.providerName;
        const executionResult = buildExecutionResult(workflowRequest, {
          status: "completed",
          promptId: run.providerResult?.promptId || null,
          passResults: run.providerResult?.passResults,
          metrics: run.providerResult?.metrics,
          warnings: [providerUsed === "mock" ? "Generated via fallback provider." : null].filter(Boolean)
        });
        const reportFile = writeExecutionReport(args.workspace, workflowRequest, executionResult);
        executionReports.push({
          variant,
          request_file: requestFile,
          report_file: reportFile
        });
      }

      const masterValidation = validateGeneratedAsset(variants.master, { width: 1024, height: 1024 });
      if (!masterValidation.valid) {
        throw new Error(`Character reference validation failed for ${character.character_id}: ${masterValidation.reason}`);
      }

      manifest = upsertAsset(manifest, {
        asset_id: `CHAR_${character.character_id}_MASTER`,
        asset_type: "character_reference",
        character_ids: [character.character_id],
        file: `07_visuals/character_refs/${character.character_id}/master.png`,
        width: masterValidation.width,
        height: masterValidation.height,
        status: "approved",
        generator: {
          provider: providerUsed,
          workflow: "character_ref_v1",
          seed: character.character_id.length * 1001
        },
        prompt_file: `07_visuals/prompts/characters/${character.character_id}.txt`,
        workflow_request_files: executionReports.map((item) => item.request_file),
        provider_report_files: executionReports.map((item) => item.report_file),
        continuity_source_refs: [`03_cast/visual_character_bible.json#${character.character_id}`],
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
