#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { assetTimestamp, loadManifest, readJsonSafe, relativeWorkspacePath, saveManifest, upsertAsset, writeJson } = require("../src/bricktoon/aiQualityPipeline");
const { qualityClassificationForAsset } = require("../src/bricktoon/workflowContracts");
const { classifyShotRole, subtitleSafeModeForShotType } = require("../src/bricktoon/sequencePolish");
const { collectShotIdsFromScenes, filterScenes, hasSceneSelection, mergeScopedRecords, parseSceneIdsArg } = require("../src/bricktoon/sceneSelection");

const PERFORMANCE_PRIORITY_CLASSES = new Set([
  "closeup_talking_puppet",
  "single_character_explainer",
  "two_character_exchange",
  "staged_cutout_tableau",
  "hybrid_speaking_proof"
]);

const INSERT_MOTION_CLASSES = new Set([
  "document_insert_motion",
  "hybrid_insert_proof"
]);

function shouldPreferProceduralShotClip(clipInfo = {}, motionInfo = {}) {
  const performanceClass = String(clipInfo.performance_class || "").trim().toLowerCase();
  const mouthSyncMode = String(clipInfo.mouth_sync_mode || "").trim().toLowerCase();
  const secondaryAction = String(clipInfo.secondary_action || "").trim().toLowerCase();
  const executionMode = String(motionInfo.execution_mode || "").trim().toLowerCase();
  const motionRecipe = String(motionInfo.motion_recipe || "").trim().toLowerCase();

  if (executionMode === "fallback_copy") {
    return true;
  }
  if (PERFORMANCE_PRIORITY_CLASSES.has(performanceClass) || INSERT_MOTION_CLASSES.has(performanceClass)) {
    return true;
  }
  if (["talk_cycles", "viseme_emphasis"].includes(mouthSyncMode)) {
    return true;
  }
  if (["counter_change", "document_reveal"].includes(secondaryAction)) {
    return true;
  }
  if (["talking_character", "typing_action_insert", "reaction_emphasis", "pressure_reveal"].includes(motionRecipe)) {
    return true;
  }
  return false;
}

function qualityClassificationForSelection(sourceAssetType, clipInfo = {}) {
  const performanceClass = String(clipInfo.performance_class || "").trim().toLowerCase();
  if (sourceAssetType === "bricktoon_shot_clip") {
    if (PERFORMANCE_PRIORITY_CLASSES.has(performanceClass)) {
      return "premium_motion";
    }
    return "motion_ready";
  }
  return qualityClassificationForAsset(sourceAssetType);
}

function selectionReasonForSource({ prefersProcedural, usedStabilized, motionInfo = {} }) {
  if (usedStabilized) {
    return motionInfo.execution_mode === "keyframe_motion_render"
      ? "stabilized keyframe-derived motion chosen"
      : "stabilized AI motion chosen";
  }
  if (prefersProcedural) {
    return "procedural performance animation chosen over still-derived drift";
  }
  return "procedural fallback chosen";
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/composite_bricktoon_shots.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const selectedSceneIds = parseSceneIdsArg(args["scene-ids"]);
    const scenes = filterScenes(shotPlan.scenes || [], selectedSceneIds);
    const selectedShotIds = hasSceneSelection(selectedSceneIds) ? collectShotIdsFromScenes(scenes) : [];
    const baseShotDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const stabilizedDir = path.join(workspaceDir, "08_animation", "stabilized_ai_video");
    const compositedDir = path.join(workspaceDir, "08_animation", "composited_shot_clips");
    const reportsDir = path.join(workspaceDir, "08_animation", "compositing_reports");
    const manifest = loadManifest(workspaceDir);
    const motionReport = readJsonSafe(path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json"), {});
    const shotClipReport = readJsonSafe(path.join(workspaceDir, "08_animation", "shot_clips", "shot_clip_report.json"), {});
    const existingReport = readJsonSafe(path.join(reportsDir, "compositing_report.json"), {});
    const report = { shots: [] };
    const motionLookup = new Map((motionReport.shots || []).map((shot) => [shot.shot_id, shot]));
    const clipLookup = new Map((shotClipReport.shots || []).map((entry) => [entry.shot_id, entry]));

    for (const scene of scenes) {
      for (const [shotIndex, shot] of (scene.shots || []).entries()) {
        const stabilizedPath = path.join(stabilizedDir, `${shot.shot_id}_stabilized.mp4`);
        const proceduralPath = path.join(baseShotDir, `${shot.shot_id}.mp4`);
        const motionInfo = motionLookup.get(shot.shot_id) || {};
        const clipInfo = clipLookup.get(shot.shot_id) || {};
        const stabilizedExists = fs.existsSync(stabilizedPath);
        const proceduralExists = fs.existsSync(proceduralPath);
        const prefersProcedural = proceduralExists && shouldPreferProceduralShotClip(clipInfo, motionInfo);
        const source = stabilizedExists && !prefersProcedural ? stabilizedPath : proceduralPath;
        const sourceAssetType = stabilizedExists && !prefersProcedural ? "stabilized_motion_pass" : "bricktoon_shot_clip";
        if (!fs.existsSync(source)) {
          continue;
        }
        const target = path.join(compositedDir, `${shot.shot_id}.mp4`);
        fs.copyFileSync(source, target);
        const qualityClassification = qualityClassificationForSelection(sourceAssetType, clipInfo);
        const selectionReason = selectionReasonForSource({
          prefersProcedural,
          usedStabilized: sourceAssetType === "stabilized_motion_pass",
          motionInfo
        });
        const sequenceRole = classifyShotRole(shot, shotIndex, (scene.shots || []).length);
        report.shots.push({
          shot_id: shot.shot_id,
          scene_id: scene.scene_id,
          shot_type: shot.shot_type,
          sequence_role: sequenceRole,
          winning_source_type: sourceAssetType,
          selection_reason: selectionReason,
          quality_classification: qualityClassification,
          camera_angle_profile: clipInfo.camera_angle_profile || null,
          focus_target: clipInfo.focus_target || null,
          performance_class: clipInfo.performance_class || null,
          subtitle_safe_mode: subtitleSafeModeForShotType(shot.shot_type),
          motion_source_policy: prefersProcedural ? "prefer_procedural_animation" : "prefer_stabilized_motion",
          source: relativeWorkspacePath(workspaceDir, source),
          composited_file: relativeWorkspacePath(workspaceDir, target)
        });
        upsertAsset(manifest, {
          asset_id: `COMP_${shot.shot_id}`,
          asset_type: "composited_shot_clip",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, target),
          status: "approved",
          selection_reason: selectionReason,
          quality_classification: qualityClassification,
          created_at: assetTimestamp()
        });
      }
    }

    report.shots = mergeScopedRecords(existingReport.shots || [], report.shots, {
      idField: "shot_id",
      scopedIds: selectedShotIds
    });
    writeJson(path.join(reportsDir, "compositing_report.json"), report);
    saveManifest(workspaceDir, manifest);
    console.log(`Bricktoon shot compositing completed for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
