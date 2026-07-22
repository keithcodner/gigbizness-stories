#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const {
  assetTimestamp,
  ensureDir,
  loadManifest,
  readJsonSafe,
  relativeWorkspacePath,
  saveManifest,
  upsertAsset,
  writeJson,
  writeMarkdown
} = require("../src/bricktoon/aiQualityPipeline");
const {
  buildHybridCharacterContract,
  buildHybridShotContract,
  buildHybridContractMarkdown,
  summarizeHybridContract
} = require("../src/bricktoon/hybridAnimationContract");

function fileExistsWithContent(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function buildCastLookup(castPackage) {
  const members = getCastMembers(castPackage);
  return {
    members,
    byCharacterId: new Map(
      members
        .filter((member) => member?.character_id)
        .map((member) => [member.character_id, member])
    ),
    byCastMemberId: new Map(
      members
        .filter((member) => member?.cast_member_id)
        .map((member) => [member.cast_member_id, member])
    )
  };
}

function readShotApproval(workspaceDir, shotId) {
  return readJsonSafe(path.join(workspaceDir, "07_visuals", "art_direction", `${shotId}_approval.json`), {});
}

function readLayerManifest(workspaceDir, shotId) {
  const manifestPath = path.join(workspaceDir, "07_visuals", "shot_layers", shotId, "layer_manifest.json");
  const data = readJsonSafe(manifestPath, null);
  if (!data) {
    return null;
  }
  return {
    file: relativeWorkspacePath(workspaceDir, manifestPath),
    clean_plate: data.clean_plate || null,
    data
  };
}

function readRig(workspaceDir, characterId) {
  const rigPath = path.join(workspaceDir, "07_visuals", "character_rigs", characterId, "rig.json");
  const data = readJsonSafe(rigPath, null);
  if (!data) {
    return null;
  }
  return {
    file: relativeWorkspacePath(workspaceDir, rigPath),
    data
  };
}

function readIdentityPackage(workspaceDir, characterId) {
  const packagePath = path.join(workspaceDir, "07_visuals", "character_refs", characterId, "hybrid_identity_package.json");
  if (!fs.existsSync(packagePath)) {
    return null;
  }
  return {
    package_file: relativeWorkspacePath(workspaceDir, packagePath),
    data: readJsonSafe(packagePath, {})
  };
}

function listShotStageWarnings(shotContract) {
  const warnings = [];
  if (!shotContract.layer_export.layer_manifest_file) {
    warnings.push("missing_layer_manifest");
  }
  if (!shotContract.timing_handoff.voiceover_file) {
    warnings.push("missing_voiceover_file");
  }
  if (!shotContract.timing_handoff.captions_file) {
    warnings.push("missing_captions_file");
  }
  if (shotContract.rig_bindings.length === 0) {
    warnings.push("missing_rig_bindings");
  }
  if (
    ["closeup_face", "medium_single", "medium_two_shot"].includes(shotContract.shot_class) &&
    shotContract.production_mode !== "hybrid_2d_ai"
  ) {
    warnings.push("route_mismatch_character_performance_should_use_hybrid_motion");
  }
  return warnings;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_hybrid_animation_contract.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const visualBible = readJsonSafe(path.join(workspaceDir, "03_cast", "visual_character_bible.json"), {});
    const castPackage = readJsonSafe(path.join(workspaceDir, "03_cast", "cast.json"), {});
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const productionRoutes = readJsonSafe(path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"), {});
    const shotPerformances = readJsonSafe(path.join(workspaceDir, "08_animation", "shot_performances.json"), {});
    const benchmarkPack = readJsonSafe(path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.json"), {});
    const manifest = loadManifest(workspaceDir);

    const outputRoot = path.join(workspaceDir, "08_animation", "hybrid_contract");
    const characterDir = path.join(outputRoot, "characters");
    const shotDir = path.join(outputRoot, "shots");
    ensureDir(characterDir);
    ensureDir(shotDir);

    const castLookup = buildCastLookup(castPackage);
    const routeByShotId = new Map((productionRoutes.routes || []).map((route) => [route.shot_id, route]));
    const performanceByShotId = new Map((shotPerformances.shots || []).map((entry) => [entry.shot_id, entry]));
    const voiceoverPath = path.join(workspaceDir, "03_voice", "voiceover_clean.wav");
    const captionsPath = path.join(workspaceDir, "03_voice", "captions.srt");
    const voiceoverFile = fileExistsWithContent(voiceoverPath) ? relativeWorkspacePath(workspaceDir, voiceoverPath) : null;
    const captionsFile = fileExistsWithContent(captionsPath) ? relativeWorkspacePath(workspaceDir, captionsPath) : null;

    const characterContracts = (visualBible.characters || []).map((character) => {
      const castMember = castLookup.byCharacterId.get(character.character_id) || null;
      const enrichedCharacter = {
        ...character,
        cast_member_id: castMember?.cast_member_id || null,
        role: castMember?.role || null,
        name: castMember?.name || character.character_id
      };
      const contract = buildHybridCharacterContract({
        character: enrichedCharacter,
        rig: readRig(workspaceDir, character.character_id),
        identityPackage: readIdentityPackage(workspaceDir, character.character_id)
      });
      const outputPath = path.join(characterDir, `${character.character_id}.json`);
      writeJson(outputPath, contract);
      return {
        ...contract,
        file: relativeWorkspacePath(workspaceDir, outputPath)
      };
    });

    const shotContracts = [];
    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const approval = readShotApproval(workspaceDir, shot.shot_id);
        const route = routeByShotId.get(shot.shot_id) || {};
        const performance = performanceByShotId.get(shot.shot_id) || null;
        const contract = buildHybridShotContract({
          scene,
          shot,
          route,
          approval,
          layerManifest: readLayerManifest(workspaceDir, shot.shot_id),
          performance,
          characterContracts,
          voiceoverFile,
          captionsFile
        });

        const outputPath = path.join(shotDir, `${shot.shot_id}.json`);
        const outputData = {
          ...contract,
          benchmark_pack_file: benchmarkPack?.coverage ? "07_visuals/benchmark_pack/hybrid_still_benchmark_pack.json" : null,
          stage_warnings: listShotStageWarnings(contract)
        };
        writeJson(outputPath, outputData);
        shotContracts.push({
          ...outputData,
          file: relativeWorkspacePath(workspaceDir, outputPath)
        });
      }
    }

    const summary = {
      ...summarizeHybridContract(shotContracts),
      character_packages: characterContracts.length,
      benchmark_shot_classes: benchmarkPack?.coverage?.shot_classes_covered || 0,
      missing_voiceover_handoff: voiceoverFile ? 0 : shotContracts.length,
      missing_caption_handoff: captionsFile ? 0 : shotContracts.length
    };

    const bundle = {
      topic_id: topicId,
      generated_at: assetTimestamp(),
      benchmark_profile: "option2_phase2_hybrid_animation_contract",
      benchmark_pack_file: benchmarkPack?.coverage ? "07_visuals/benchmark_pack/hybrid_still_benchmark_pack.json" : null,
      source_files: {
        visual_character_bible: "03_cast/visual_character_bible.json",
        cast_package: "03_cast/cast.json",
        shot_plan: "07_shot_plans/shot_plan.json",
        production_routes: "07_visuals/production_routes/production_routes.json",
        shot_performances: "08_animation/shot_performances.json",
        voiceover_file: voiceoverFile,
        captions_file: captionsFile
      },
      summary,
      characters: characterContracts.map((item) => ({
        character_id: item.character_id,
        cast_member_id: item.cast_member_id || null,
        contract_file: item.file
      })),
      shots: shotContracts.map((item) => ({
        shot_id: item.shot_id,
        scene_id: item.scene_id,
        shot_class: item.shot_class,
        production_mode: item.production_mode,
        contract_file: item.file,
        block_if_missing: item.fallback_discipline.block_if_missing
      }))
    };

    const bundleJsonPath = path.join(outputRoot, "hybrid_animation_contract.json");
    const bundleMdPath = path.join(outputRoot, "hybrid_animation_contract.md");
    writeJson(bundleJsonPath, {
      ...bundle,
      character_contracts: characterContracts,
      shot_contracts: shotContracts
    });
    writeMarkdown(bundleMdPath, buildHybridContractMarkdown({
      generated_at: bundle.generated_at,
      benchmark_profile: bundle.benchmark_profile,
      summary,
      shots: shotContracts
    }));

    upsertAsset(manifest, {
      asset_id: "HYBRID_ANIMATION_CONTRACT",
      asset_type: "hybrid_animation_contract",
      file: relativeWorkspacePath(workspaceDir, bundleJsonPath),
      status: "approved",
      quality_tier: "hero",
      created_at: assetTimestamp(),
      related_files: [
        relativeWorkspacePath(workspaceDir, bundleMdPath),
        ...characterContracts.map((item) => item.file),
        ...shotContracts.map((item) => item.file)
      ]
    });
    saveManifest(workspaceDir, manifest);

    console.log(`Hybrid animation contract created for '${topicId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
