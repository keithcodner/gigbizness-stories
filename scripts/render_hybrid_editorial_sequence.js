#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const { assetTimestamp } = require("../src/bricktoon/aiQualityPipeline");
const { concatClips, ensureDir, renderShotClip } = require("../src/bricktoon/proceduralSequenceRenderer");
const {
  buildHybridEditorialMarkdown,
  buildHybridEditorialPerformance,
  selectHybridEditorialScene,
  summarizeHybridEditorialSequence
} = require("../src/bricktoon/hybridEditorialProof");

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
      throw new Error("Usage: node scripts/render_hybrid_editorial_sequence.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const workspaceId = path.basename(workspaceDir);
    const shotPlanScenes = readJson(path.join(workspaceDir, "07_shot_plans", "shot_plan.json")).scenes || [];
    const sceneCards = readJson(path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).scene_cards || [];
    const sceneManifest = readJson(path.join(workspaceDir, "05_render_plan", "scene_manifest.json")).scenes || [];
    const castPackage = readJson(path.join(workspaceDir, "03_cast", "cast.json"));
    const castMembersById = new Map(
      getCastMembers(castPackage)
        .filter((member) => member?.cast_member_id)
        .map((member) => [member.cast_member_id, member])
    );
    const hybridContract = readJson(path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"));
    const compositingReport = readJson(path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"));
    const sceneSequenceReport = readJson(path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"));
    const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    let manifest = loadManifest(manifestPath, workspaceId);

    const editorialDir = path.join(workspaceDir, "08_animation", "hybrid_editorial");
    const posterDir = path.join(workspaceDir, "07_visuals", "generated_images", "shot_posters");
    ensureDir(editorialDir);
    ensureDir(posterDir);

    const sceneSelection = selectHybridEditorialScene(hybridContract, {
      compositingReport,
      sceneSequenceReport
    });
    if (!sceneSelection) {
      throw new Error("No benchmark scene could be selected for the hybrid editorial proof.");
    }

    const scene = shotPlanScenes.find((entry) => entry.scene_id === sceneSelection.scene_id);
    const sceneCard = sceneCards.find((entry) => entry.scene_id === sceneSelection.scene_id) || {};
    const sceneRecord = sceneManifest.find((entry) => entry.id === sceneSelection.scene_id) || {};
    if (!scene) {
      throw new Error(`Unable to find shot-plan data for benchmark scene ${sceneSelection.scene_id}`);
    }

    const shotContractMap = new Map((sceneSelection.shots || []).map((shot) => [shot.shot_id, shot]));
    const shotReports = [];
    const clipFiles = [];

    for (const [shotIndex, shot] of (scene.shots || []).entries()) {
      const shotContract = shotContractMap.get(shot.shot_id);
      if (!shotContract) {
        continue;
      }
      const castMembers = (shot.cast_member_ids || []).map((id) => castMembersById.get(id)).filter(Boolean);
      const editorialPerformance = buildHybridEditorialPerformance(shotContract, {
        shotIndex,
        totalShots: scene.shots.length
      });
      const clipFileName = `${shot.shot_id}_hybrid_editorial.mp4`;
      const clipPath = path.join(editorialDir, clipFileName);
      const posterPath = path.join(posterDir, `${shot.shot_id}_hybrid_editorial.png`);
      const tempDir = path.join(editorialDir, `_tmp_${shot.shot_id}_hybrid_editorial`);

      renderShotClip({
        shot,
        sceneCard,
        castMembers,
        motionDirectives: editorialPerformance.motion_directives,
        shotPerformance: editorialPerformance,
        outputPath: clipPath,
        posterPath,
        tempDir
      });

      clipFiles.push(clipPath);
      manifest = upsertAsset(manifest, {
        asset_id: `HYBRID_EDITORIAL_${shot.shot_id}`,
        asset_type: "hybrid_editorial_shot",
        scene_ids: [sceneSelection.scene_id],
        shot_ids: [shot.shot_id],
        character_ids: castMembers.map((member) => member.character_id),
        file: `08_animation/hybrid_editorial/${clipFileName}`,
        poster_file: `07_visuals/generated_images/shot_posters/${shot.shot_id}_hybrid_editorial.png`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "hybrid_editorial_sequence_v1"
        },
        performance_class: editorialPerformance.performance_class,
        quality_classification: "premium_motion",
        created_at: assetTimestamp()
      });

      shotReports.push({
        shot_id: shot.shot_id,
        shot_class: shotContract.shot_class,
        editorial_role: editorialPerformance.editorial_role,
        proof_clip_file: `08_animation/hybrid_editorial/${clipFileName}`,
        poster_file: `07_visuals/generated_images/shot_posters/${shot.shot_id}_hybrid_editorial.png`,
        motion_directives: editorialPerformance.motion_directives.map((item) => item.type),
        camera_recipe: editorialPerformance.camera_recipe,
        quality_classification: "premium_motion",
        stage_warnings: shotContract.stage_warnings || []
      });
    }

    if (clipFiles.length === 0) {
      throw new Error(`No editorial clips were rendered for benchmark scene ${sceneSelection.scene_id}.`);
    }

    const sequencePath = path.join(editorialDir, `${sceneSelection.scene_id}_hybrid_editorial_sequence.mp4`);
    concatClips(clipFiles, sequencePath);

    const summary = summarizeHybridEditorialSequence({
      sceneSelection,
      shotReports,
      sceneRecord
    });

    const report = {
      generated_at: assetTimestamp(),
      proof_profile: "option2_phase4_shot_language_editorial_quality",
      source_contract_file: "08_animation/hybrid_contract/hybrid_animation_contract.json",
      scene: {
        scene_id: sceneSelection.scene_id,
        scene_title: sceneRecord.title || sceneCard.title || null,
        selection_score: sceneSelection.score,
        selection_reasons: sceneSelection.reasons || []
      },
      summary,
      shots: shotReports,
      final_sequence_file: `08_animation/hybrid_editorial/${sceneSelection.scene_id}_hybrid_editorial_sequence.mp4`,
      next_phase: "Option 2 Phase 5: Preview Gate And Promotion Rules"
    };

    const reportJsonPath = path.join(editorialDir, "hybrid_editorial_sequence_report.json");
    const reportMdPath = path.join(editorialDir, "hybrid_editorial_sequence_report.md");
    writeText(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    writeText(reportMdPath, buildHybridEditorialMarkdown(report));

    manifest = upsertAsset(manifest, {
      asset_id: "HYBRID_EDITORIAL_SEQUENCE",
      asset_type: "hybrid_editorial_sequence",
      scene_ids: [sceneSelection.scene_id],
      file: `08_animation/hybrid_editorial/${sceneSelection.scene_id}_hybrid_editorial_sequence.mp4`,
      status: "approved",
      quality_tier: "hero",
      quality_classification: "premium_motion",
      created_at: assetTimestamp(),
      related_files: [
        "08_animation/hybrid_editorial/hybrid_editorial_sequence_report.json",
        "08_animation/hybrid_editorial/hybrid_editorial_sequence_report.md",
        ...shotReports.map((shot) => shot.proof_clip_file)
      ]
    });

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Hybrid editorial sequence rendered for '${workspaceId}' using scene '${sceneSelection.scene_id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
