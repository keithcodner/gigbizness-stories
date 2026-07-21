#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { assetTimestamp, loadManifest, readJsonSafe, relativeWorkspacePath, saveManifest, upsertAsset, writeJson } = require("../src/bricktoon/aiQualityPipeline");
const { qualityClassificationForAsset } = require("../src/bricktoon/workflowContracts");
const { classifyShotRole, subtitleSafeModeForShotType } = require("../src/bricktoon/sequencePolish");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/composite_bricktoon_shots.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const baseShotDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const stabilizedDir = path.join(workspaceDir, "08_animation", "stabilized_ai_video");
    const compositedDir = path.join(workspaceDir, "08_animation", "composited_shot_clips");
    const reportsDir = path.join(workspaceDir, "08_animation", "compositing_reports");
    const manifest = loadManifest(workspaceDir);
    const motionReport = readJsonSafe(path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json"), {});
    const shotClipReport = readJsonSafe(path.join(workspaceDir, "08_animation", "shot_clips", "shot_clip_report.json"), {});
    const report = { shots: [] };
    const motionLookup = new Map((motionReport.shots || []).map((shot) => [shot.shot_id, shot]));
    const clipLookup = new Map((shotClipReport.shots || []).map((entry) => [entry.shot_id, entry]));

    for (const scene of shotPlan.scenes || []) {
      for (const [shotIndex, shot] of (scene.shots || []).entries()) {
        const stabilizedPath = path.join(stabilizedDir, `${shot.shot_id}_stabilized.mp4`);
        const fallbackPath = path.join(baseShotDir, `${shot.shot_id}.mp4`);
        const source = fs.existsSync(stabilizedPath) ? stabilizedPath : fallbackPath;
        const sourceAssetType = fs.existsSync(stabilizedPath) ? "stabilized_motion_pass" : "bricktoon_shot_clip";
        const motionInfo = motionLookup.get(shot.shot_id) || {};
        const clipInfo = clipLookup.get(shot.shot_id) || {};
        if (!fs.existsSync(source)) {
          continue;
        }
        const target = path.join(compositedDir, `${shot.shot_id}.mp4`);
        fs.copyFileSync(source, target);
        const qualityClassification = qualityClassificationForAsset(sourceAssetType);
        const selectionReason = fs.existsSync(stabilizedPath)
          ? (motionInfo.execution_mode === "keyframe_motion_render"
            ? "stabilized keyframe-derived motion chosen"
            : "stabilized AI motion chosen")
          : "procedural fallback chosen";
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

    writeJson(path.join(reportsDir, "compositing_report.json"), report);
    saveManifest(workspaceDir, manifest);
    console.log(`Bricktoon shot compositing completed for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
