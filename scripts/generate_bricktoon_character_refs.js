#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileCharacterPrompt } = require("../src/bricktoon/compileCharacterPrompt");
const { validateGeneratedAsset } = require("../src/bricktoon/validateGeneratedAsset");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { getCastMembers, getCharacterBlueprint, getCharacterId } = require("../src/bricktoon/normalizeCast");
const { withImageProvider } = require("../src/bricktoon/providers");
const { collectReferenceImages, referencePromptAddendum } = require("../src/bricktoon/referenceImages");
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

function variantInstructions(variant, character) {
  const propName = Array.isArray(character.prop_ids) && character.prop_ids.length > 0
    ? character.prop_ids[0]
    : "signature prop";
  const map = {
    master: "Create the canonical benchmark identity frame. Highest continuity lock. Neutral but expressive face. Clean mouth, eyes, eyebrows, and both arm silhouettes for later puppet prep.",
    front: "Front-facing clean reference. Symmetrical face readability. Mouth, brow, and eye shapes must be easy to separate for animation.",
    three_quarter: "Three-quarter hero reference. Preserve exact identity and head volume. Keep one clear readable gesture arm.",
    side: "Profile-safe continuity reference. Preserve nose, brow, hat or hair silhouette, and mouth position for turn consistency.",
    worried: "Readable worried reaction face. Keep the mouth area unobstructed and maintain the same identity anchors.",
    talking: "Speaking-shot variant. Mouth area must be clean, readable, and animation-safe for later talk-cycle or viseme replacement.",
    emphatic: "Emphatic explainer pose. Keep one readable gesture arm and clear face readability at the same time.",
    blink_closed: "Blink-safe expression variant. Closed-eye state only; preserve the exact head, brow, and mouth position.",
    gesture_point: "Pointing or presenting pose. Keep the active pointing arm fully readable from shoulder to hand if possible.",
    hold_prop: `Prop-ready pose. Character is believably holding ${propName} with readable hand-to-prop contact and clear prop separation from the background.`
  };
  return map[variant] || "Maintain exact identity lock and animation-safe readability.";
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
      const referenceImages = collectReferenceImages(args.workspace, {
        characterId: character.character_id
      });
      const promptText = [
        prompt.prompt_text,
        referencePromptAddendum(referenceImages)
      ].filter(Boolean).join(" ");

      const characterDir = path.join(paths.refsDir, character.character_id);
      const expressionsDir = path.join(characterDir, "expressions");
      ensureDir(characterDir);
      ensureDir(expressionsDir);
      writeText(path.join(paths.promptsDir, `${character.character_id}.txt`), promptText);

      const variants = {
        master: path.join(characterDir, "master.png"),
        front: path.join(characterDir, "front.png"),
        three_quarter: path.join(characterDir, "three_quarter.png"),
        side: path.join(characterDir, "side.png"),
        worried: path.join(expressionsDir, "worried.png"),
        talking: path.join(expressionsDir, "talking.png"),
        emphatic: path.join(expressionsDir, "emphatic.png"),
        blink_closed: path.join(expressionsDir, "blink_closed.png"),
        gesture_point: path.join(expressionsDir, "gesture_point.png"),
        hold_prop: path.join(expressionsDir, "hold_prop.png")
      };
      const variantManifest = {
        character_id: character.character_id,
        benchmark_profiles: [
          "option1_phase1_animation_ready_art_lock",
          "option2_phase1_repo_side_still_identity_lock"
        ],
        variants: Object.keys(variants).map((variant) => ({
          variant,
          purpose: variantInstructions(variant, character)
        }))
      };
      writeText(path.join(characterDir, "variant_manifest.json"), `${JSON.stringify(variantManifest, null, 2)}\n`);

      let providerUsed = process.env.BRICKTOON_IMAGE_PROVIDER || visualConfig.default_image_provider || "comfyui";
      const executionReports = [];
      for (const [variant, outputPath] of Object.entries(variants)) {
        const variantPromptText = `${promptText} ${variantInstructions(variant, character)}`;
        const workflowRequest = buildWorkflowRequest({
          workspaceDir: args.workspace,
          kind: "character_reference",
          providerName: providerUsed,
          outputFile: path.relative(args.workspace, outputPath).replaceAll("\\", "/"),
          stage: "bricktoon-characters",
          qualityTier: variant === "master" ? "hero" : "standard",
          variant,
          characterId: character.character_id,
          promptText: variantPromptText,
          negativePromptText: prompt.negative_prompt_text,
          promptComponents: ["character_blueprint", "style_bible", "character_rules", "negative_prompts"],
          continuitySourceRefs: [`03_cast/visual_character_bible.json#${character.character_id}`],
          references: [{
            type: "visual_character_bible",
            file: "03_cast/visual_character_bible.json"
          }, ...referenceImages.map((ref) => ({
            type: ref.type,
            file: ref.relativeFile,
            label: ref.label,
            reference_id: ref.reference_id
          }))],
          context: {
            visualQualityProfile: visualBible.style_lock_package ? { production_target: visualBible.style_lock_package, avoid: visualBible.style_lock_package.never_generate } : {},
            referenceImageFiles: referenceImages.map((ref) => ref.relativeFile),
            benchmarkProfile: "option2_phase1_repo_side_still_identity_lock",
            variantPurpose: variantInstructions(variant, character)
          },
          benchmarkProfileId: "option2_phase1_repo_side_still_identity_lock",
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
            referenceImagePaths: referenceImages.map((ref) => ref.filePath),
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
        const variantValidation = validateGeneratedAsset(outputPath, {
          width: workflowRequest.output_contract.width,
          height: workflowRequest.output_contract.height
        });
        if (!variantValidation.valid) {
          throw new Error(`Character reference validation failed for ${character.character_id}/${variant}: ${variantValidation.reason}`);
        }
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
      const hybridIdentityPackage = {
        character_id: character.character_id,
        benchmark_profile: "option2_phase1_repo_side_still_identity_lock",
        continuity_source_refs: [`03_cast/visual_character_bible.json#${character.character_id}`],
        master_reference: `07_visuals/character_refs/${character.character_id}/master.png`,
        turnaround_refs: [
          `07_visuals/character_refs/${character.character_id}/front.png`,
          `07_visuals/character_refs/${character.character_id}/three_quarter.png`,
          `07_visuals/character_refs/${character.character_id}/side.png`
        ],
        expression_refs: [
          `07_visuals/character_refs/${character.character_id}/expressions/talking.png`,
          `07_visuals/character_refs/${character.character_id}/expressions/worried.png`,
          `07_visuals/character_refs/${character.character_id}/expressions/emphatic.png`,
          `07_visuals/character_refs/${character.character_id}/expressions/blink_closed.png`
        ],
        gesture_refs: [
          `07_visuals/character_refs/${character.character_id}/expressions/gesture_point.png`,
          `07_visuals/character_refs/${character.character_id}/expressions/hold_prop.png`
        ],
        prop_continuity: {
          prop_ids: Array.isArray(character.prop_ids) ? character.prop_ids : [],
          hold_prop_variant: `07_visuals/character_refs/${character.character_id}/expressions/hold_prop.png`
        },
        hybrid_handoff_targets: [
          "mouth",
          "eyes",
          "eyebrows",
          "gesture_arm",
          "prop_contact_zone"
        ],
        workflow_request_files: executionReports.map((item) => item.request_file),
        provider_report_files: executionReports.map((item) => item.report_file)
      };
      writeText(
        path.join(characterDir, "hybrid_identity_package.json"),
        `${JSON.stringify(hybridIdentityPackage, null, 2)}\n`
      );

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
        variant_manifest_file: `07_visuals/character_refs/${character.character_id}/variant_manifest.json`,
        hybrid_identity_package_file: `07_visuals/character_refs/${character.character_id}/hybrid_identity_package.json`,
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
