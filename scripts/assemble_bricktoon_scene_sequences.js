#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { concatClips, ensureDir } = require("../src/bricktoon/proceduralSequenceRenderer");
const { summarizeSceneSequence } = require("../src/bricktoon/sequencePolish");

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
      throw new Error("Usage: node scripts/assemble_bricktoon_scene_sequences.js --workspace <workspace_path>");
    }

    const workspaceDir = args.workspace;
    const workspaceId = path.basename(workspaceDir);
    const shotPlan = readJson(path.join(workspaceDir, "07_shot_plans", "shot_plan.json")).scenes || [];
    const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    let manifest = loadManifest(manifestPath, workspaceId);
    const sequenceDir = path.join(workspaceDir, "08_animation", "scene_sequences");
    const compositedShotDir = path.join(workspaceDir, "08_animation", "composited_shot_clips");
    const proceduralShotDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const compositingReport = readJson(path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"));
    const sceneManifest = readJson(path.join(workspaceDir, "05_render_plan", "scene_manifest.json"));
    const shotSelections = new Map((compositingReport.shots || []).map((shot) => [shot.shot_id, shot]));
    ensureDir(sequenceDir);
    const reports = [];

    for (const scene of shotPlan) {
      const sceneSelectionRows = scene.shots.map((shot) => shotSelections.get(shot.shot_id)).filter(Boolean);
      const sceneRecord = (sceneManifest.scenes || []).find((entry) => entry.id === scene.scene_id) || {};
      const sequenceSummary = summarizeSceneSequence({
        scene,
        sceneRecord,
        shotSelections: sceneSelectionRows
      });
      const files = scene.shots.map((shot) => {
        const compositedPath = path.join(compositedShotDir, `${shot.shot_id}.mp4`);
        if (fs.existsSync(compositedPath)) {
          return compositedPath;
        }
        return path.join(proceduralShotDir, `${shot.shot_id}.mp4`);
      }).filter((file) => fs.existsSync(file));
      if (files.length === 0) {
        continue;
      }
      const outputPath = path.join(sequenceDir, `${scene.scene_id}_sequence.mp4`);
      concatClips(files, outputPath);

      const workflow = files.some((file) => file.includes("composited_shot_clips"))
        ? "bricktoon_composited_scene_sequence_v1"
        : "bricktoon_scene_sequence_v1";
      const primaryAssetType = workflow === "bricktoon_composited_scene_sequence_v1"
        ? "bricktoon_composited_shot_sequence"
        : "bricktoon_scene_sequence";

      manifest = upsertAsset(manifest, {
        asset_id: `SEQ_${scene.scene_id}_MAIN`,
        asset_type: primaryAssetType,
        scene_ids: [scene.scene_id],
        shot_ids: scene.shots.map((shot) => shot.shot_id),
        file: `08_animation/scene_sequences/${scene.scene_id}_sequence.mp4`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow
        },
        selection_reason: workflow === "bricktoon_composited_scene_sequence_v1"
          ? `AI or hybrid composited shots available for sequence assembly; continuity ${sequenceSummary.continuity_status}.`
          : `Procedural shot clips used because no composited shots were available; continuity ${sequenceSummary.continuity_status}.`,
        quality_classification: workflow === "bricktoon_composited_scene_sequence_v1"
          ? (sequenceSummary.continuity_status === "locked" ? "premium_motion" : "motion_ready")
          : "motion_ready",
        created_at: new Date().toISOString()
      });

      manifest = upsertAsset(manifest, {
        asset_id: `SEQCOMPAT_${scene.scene_id}_MAIN`,
        asset_type: "bricktoon_scene_sequence",
        scene_ids: [scene.scene_id],
        shot_ids: scene.shots.map((shot) => shot.shot_id),
        file: `08_animation/scene_sequences/${scene.scene_id}_sequence.mp4`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow
        },
        created_at: new Date().toISOString()
      });

      manifest = upsertAsset(manifest, {
        asset_id: `CLIP_${scene.scene_id}_MAIN`,
        asset_type: "bricktoon_animated_clip",
        scene_ids: [scene.scene_id],
        file: `08_animation/scene_sequences/${scene.scene_id}_sequence.mp4`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "bricktoon_clip_wrapper_v2"
        },
        created_at: new Date().toISOString()
      });

      reports.push({
        scene_id: scene.scene_id,
        shots: scene.shots.length,
        file: outputPath,
        continuity_status: sequenceSummary.continuity_status,
        continuity_notes: sequenceSummary.continuity_notes,
        fallback_shots: sequenceSummary.fallback_shots,
        premium_motion_shots: sequenceSummary.premium_motion_shots,
        editorial_pacing: sequenceSummary.editorial_pacing,
        subtitle_safe_region: sequenceSummary.subtitle_safe_region,
        audio_mix_strategy: sequenceSummary.audio_mix_strategy,
        promotion_status: sequenceSummary.promotion_status,
        transition_roles: sequenceSummary.transition_roles
      });
    }

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeText(path.join(sequenceDir, "scene_sequence_report.json"), `${JSON.stringify({ scenes: reports }, null, 2)}\n`);
    console.log(`Bricktoon scene sequences assembled for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
