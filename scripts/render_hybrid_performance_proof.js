#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const { assetTimestamp } = require("../src/bricktoon/aiQualityPipeline");
const { concatClips, ensureDir, renderShotClip } = require("../src/bricktoon/proceduralSequenceRenderer");
const {
  buildHybridProofMarkdown,
  buildHybridProofPerformance,
  selectHybridProofShots,
  summarizeHybridProofSelection
} = require("../src/bricktoon/hybridPerformanceProof");

function loadManifest(filePath, workspaceId) {
  if (!require("fs").existsSync(filePath)) {
    return createEmptyManifest(workspaceId);
  }
  return readJson(filePath);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/render_hybrid_performance_proof.js --workspace <workspace_path> [--selection-mode sample|topic_wide] [--max-shots <n>]");
    }

    const workspaceDir = path.resolve(args.workspace);
    const workspaceId = path.basename(workspaceDir);
    const shotPlanScenes = readJson(path.join(workspaceDir, "07_shot_plans", "shot_plan.json")).scenes || [];
    const sceneCards = readJson(path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).scene_cards || [];
    const castPackage = readJson(path.join(workspaceDir, "03_cast", "cast.json"));
    const castMembersById = new Map(
      getCastMembers(castPackage)
        .filter((member) => member?.cast_member_id)
        .map((member) => [member.cast_member_id, member])
    );
    const hybridContract = readJson(path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"));
    const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    let manifest = loadManifest(manifestPath, workspaceId);

    const hybridShotsDir = path.join(workspaceDir, "08_animation", "hybrid_shots");
    const reportDir = hybridShotsDir;
    const posterDir = path.join(workspaceDir, "07_visuals", "generated_images", "shot_posters");
    ensureDir(hybridShotsDir);
    ensureDir(reportDir);
    ensureDir(posterDir);

    const selectionMode = String(args["selection-mode"] || args.mode || "topic_wide");
    const maxShots = Number(args["max-shots"] || 4);
    const selectedShots = selectHybridProofShots(hybridContract, { mode: selectionMode, maxShots });
    if (selectedShots.length === 0) {
      throw new Error("No hybrid proof shots could be selected from the hybrid animation contract.");
    }

    const shotReports = [];
    const clipFiles = [];
    for (const shotContract of selectedShots) {
      const scene = shotPlanScenes.find((entry) => entry.scene_id === shotContract.scene_id);
      const shot = scene?.shots?.find((entry) => entry.shot_id === shotContract.shot_id);
      if (!scene || !shot) {
        throw new Error(`Unable to find shot-plan data for ${shotContract.shot_id}`);
      }
      const sceneCard = sceneCards.find((entry) => entry.scene_id === shotContract.scene_id) || {};
      const castMembers = (shot.cast_member_ids || []).map((id) => castMembersById.get(id)).filter(Boolean);
      const proofPerformance = buildHybridProofPerformance(shotContract);
      const clipFileName = `${shot.shot_id}_hybrid_proof.mp4`;
      const clipPath = path.join(hybridShotsDir, clipFileName);
      const posterPath = path.join(posterDir, `${shot.shot_id}_hybrid_proof.png`);
      const tempDir = path.join(hybridShotsDir, `_tmp_${shot.shot_id}_hybrid_proof`);

      renderShotClip({
        shot,
        sceneCard,
        castMembers,
        motionDirectives: [
          { type: "blink_pass" },
          { type: "talk_emphasis" },
          { type: "idle_drift" }
        ],
        shotPerformance: proofPerformance,
        outputPath: clipPath,
        posterPath,
        tempDir
      });

      clipFiles.push(clipPath);
      manifest = upsertAsset(manifest, {
        asset_id: `HYBRID_PROOF_${shot.shot_id}`,
        asset_type: "hybrid_proof_shot",
        scene_ids: [shotContract.scene_id],
        shot_ids: [shot.shot_id],
        character_ids: castMembers.map((member) => member.character_id),
        file: `08_animation/hybrid_shots/${clipFileName}`,
        poster_file: `07_visuals/generated_images/shot_posters/${shot.shot_id}_hybrid_proof.png`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "hybrid_performance_proof_v1"
        },
        performance_class: proofPerformance.performance_class,
        created_at: assetTimestamp()
      });

      shotReports.push({
        shot_id: shot.shot_id,
        scene_id: shotContract.scene_id,
        shot_class: shotContract.shot_class,
        contract_file: `08_animation/hybrid_contract/shots/${shot.shot_id}.json`,
        proof_clip_file: `08_animation/hybrid_shots/${clipFileName}`,
        poster_file: `07_visuals/generated_images/shot_posters/${shot.shot_id}_hybrid_proof.png`,
        mouth_sync_mode: proofPerformance.mouth_sync_mode,
        visible_character_limit: proofPerformance.visible_character_limit,
        stage_warnings: shotContract.stage_warnings || [],
        proof_checks: proofPerformance.proof_checks || []
      });
    }

    const sequencePath = path.join(hybridShotsDir, "hybrid_performance_proof_sequence.mp4");
    concatClips(clipFiles, sequencePath);

    const report = {
      generated_at: assetTimestamp(),
      proof_profile: selectionMode === "sample"
        ? "option2_phase3_minimum_viable_character_performance_sample"
        : "option2_phase3_topic_wide_character_performance",
      selection_mode: selectionMode,
      source_contract_file: "08_animation/hybrid_contract/hybrid_animation_contract.json",
      summary: summarizeHybridProofSelection(selectedShots),
      shots: shotReports,
      final_sequence_file: "08_animation/hybrid_shots/hybrid_performance_proof_sequence.mp4"
    };

    const reportJsonPath = path.join(reportDir, "hybrid_performance_proof_report.json");
    const reportMdPath = path.join(reportDir, "hybrid_performance_proof_report.md");
    writeText(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    writeText(reportMdPath, buildHybridProofMarkdown(report));

    manifest = upsertAsset(manifest, {
      asset_id: "HYBRID_PERFORMANCE_PROOF_SEQUENCE",
      asset_type: "hybrid_performance_proof",
      file: "08_animation/hybrid_shots/hybrid_performance_proof_sequence.mp4",
      status: "approved",
      quality_tier: "hero",
      created_at: assetTimestamp(),
      related_files: [
        "08_animation/hybrid_shots/hybrid_performance_proof_report.json",
        "08_animation/hybrid_shots/hybrid_performance_proof_report.md",
        ...shotReports.map((shot) => shot.proof_clip_file)
      ]
    });

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Hybrid performance proof rendered for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
