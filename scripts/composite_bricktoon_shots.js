#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("../agents/common");
const { assetTimestamp, loadManifest, readJsonSafe, relativeWorkspacePath, saveManifest, upsertAsset, writeJson } = require("../src/bricktoon/aiQualityPipeline");
const { qualityClassificationForAsset } = require("../src/bricktoon/workflowContracts");
const { classifyShotRole, subtitleSafeModeForShotType } = require("../src/bricktoon/sequencePolish");
const { collectShotIdsFromScenes, filterScenes, hasSceneSelection, mergeScopedRecords, parseSceneIdsArg } = require("../src/bricktoon/sceneSelection");
const { shouldSanitizeReadableText } = require("../src/bricktoon/compositingSanitization");

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

function runCommand(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `${label} failed.`);
  }
}

function sanitizeDocumentReadableText(sourcePath, targetPath) {
  const filter = [
    "drawbox=x=iw*0.10:y=ih*0.50:w=iw*0.80:h=ih*0.30:color=0xf5ecd7ee:t=fill",
    "drawbox=x=iw*0.14:y=ih*0.57:w=iw*0.48:h=ih*0.025:color=0xb9b19fff:t=fill",
    "drawbox=x=iw*0.14:y=ih*0.62:w=iw*0.62:h=ih*0.022:color=0xc8c0aeff:t=fill",
    "drawbox=x=iw*0.14:y=ih*0.67:w=iw*0.38:h=ih*0.022:color=0xc8c0aeff:t=fill",
    "drawbox=x=iw*0.68:y=ih*0.56:w=iw*0.12:h=ih*0.12:color=0xe2d76dff:t=fill",
    "drawbox=x=iw*0.70:y=ih*0.58:w=iw*0.08:h=ih*0.08:color=0x7d7458ff:t=fill",
    "eq=contrast=1.03:saturation=1.02"
  ].join(",");

  runCommand("ffmpeg", [
    "-y",
    "-i",
    sourcePath,
    "-vf",
    filter,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    targetPath
  ], `sanitize document readable text ${path.basename(targetPath)}`);
}

function shouldPreferProceduralShotClip(clipInfo = {}, motionInfo = {}, availableSourceTypes = []) {
  const performanceClass = String(clipInfo.performance_class || "").trim().toLowerCase();
  const mouthSyncMode = String(clipInfo.mouth_sync_mode || "").trim().toLowerCase();
  const secondaryAction = String(clipInfo.secondary_action || "").trim().toLowerCase();
  const executionMode = String(motionInfo.execution_mode || "").trim().toLowerCase();
  const motionRecipe = String(motionInfo.motion_recipe || "").trim().toLowerCase();
  const motionQualityGate = String(motionInfo.motion_quality_gate || "").trim().toLowerCase();
  const availableSet = new Set((availableSourceTypes || []).map((value) => String(value || "").trim().toLowerCase()));
  const hasHigherMotionCandidate = [
    "professional_import_shot",
    "hybrid_editorial_shot",
    "hybrid_proof_shot",
    "stabilized_motion_pass"
  ].some((value) => availableSet.has(value));

  if (executionMode === "fallback_copy") {
    return true;
  }
  if (motionQualityGate === "weak_motion_retry_exhausted") {
    return true;
  }
  if (hasHigherMotionCandidate) {
    return false;
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
  if (["professional_import_shot", "hybrid_editorial_shot"].includes(sourceAssetType)) {
    return "premium_motion";
  }
  if (sourceAssetType === "hybrid_proof_shot") {
    return ["closeup_talking_puppet", "single_character_explainer", "two_character_exchange"].includes(performanceClass)
      ? "premium_motion"
      : "motion_ready";
  }
  if (sourceAssetType === "stabilized_motion_pass") {
    return ["closeup_talking_puppet", "single_character_explainer", "two_character_exchange"].includes(performanceClass)
      ? "premium_motion"
      : "motion_ready";
  }
  if (sourceAssetType === "bricktoon_shot_clip") {
    if (PERFORMANCE_PRIORITY_CLASSES.has(performanceClass)) {
      return "premium_motion";
    }
    return "motion_ready";
  }
  return qualityClassificationForAsset(sourceAssetType);
}

function selectionReasonForSource({ sourceAssetType, prefersProcedural, motionInfo = {} }) {
  if (sourceAssetType === "professional_import_shot") {
    return "professional import motion chosen as highest-priority approved shot";
  }
  if (sourceAssetType === "hybrid_editorial_shot") {
    return "hybrid editorial motion chosen for stronger proof-of-performance coverage";
  }
  if (sourceAssetType === "hybrid_proof_shot") {
    return "hybrid proof motion chosen for visible blink, gesture, and speech beats";
  }
  if (sourceAssetType === "stabilized_motion_pass") {
    return motionInfo.execution_mode === "keyframe_motion_render"
      ? "stabilized keyframe-derived motion chosen over procedural fallback"
      : "stabilized AI motion chosen over procedural fallback";
  }
  if (prefersProcedural) {
    return "procedural performance animation chosen because no stronger motion candidate was available";
  }
  return "procedural fallback chosen";
}

function findShotVariantFile(baseDir, shotId) {
  if (!fs.existsSync(baseDir)) {
    return null;
  }
  const candidates = fs.readdirSync(baseDir)
    .filter((fileName) => fileName.toLowerCase().endsWith(".mp4") && fileName.startsWith(`${shotId}_`))
    .sort();
  if (candidates.length === 0) {
    return null;
  }
  return path.join(baseDir, candidates[0]);
}

function candidatePriorityForSource(sourceAssetType, clipInfo = {}) {
  const performanceClass = String(clipInfo.performance_class || "").trim().toLowerCase();
  const isCharacterPerformance = ["closeup_talking_puppet", "single_character_explainer", "two_character_exchange"].includes(performanceClass);
  const baseMap = {
    professional_import_shot: 100,
    hybrid_editorial_shot: 90,
    hybrid_proof_shot: isCharacterPerformance ? 88 : 82,
    stabilized_motion_pass: isCharacterPerformance ? 76 : 72,
    bricktoon_shot_clip: 30
  };
  return baseMap[sourceAssetType] || 0;
}

function buildSourceCandidates({
  shot,
  clipInfo,
  motionInfo,
  stabilizedPath,
  proceduralPath,
  professionalDir,
  editorialDir,
  hybridProofDir
}) {
  const candidates = [];
  const professionalVariant = findShotVariantFile(professionalDir, shot.shot_id);
  const editorialVariant = findShotVariantFile(editorialDir, shot.shot_id);
  const hybridProofVariant = findShotVariantFile(hybridProofDir, shot.shot_id);

  if (professionalVariant && fs.existsSync(professionalVariant)) {
    candidates.push({
      sourceAssetType: "professional_import_shot",
      path: professionalVariant
    });
  }
  if (editorialVariant && fs.existsSync(editorialVariant)) {
    candidates.push({
      sourceAssetType: "hybrid_editorial_shot",
      path: editorialVariant
    });
  }
  if (hybridProofVariant && fs.existsSync(hybridProofVariant)) {
    candidates.push({
      sourceAssetType: "hybrid_proof_shot",
      path: hybridProofVariant
    });
  }
  if (fs.existsSync(stabilizedPath)) {
    candidates.push({
      sourceAssetType: "stabilized_motion_pass",
      path: stabilizedPath
    });
  }
  if (fs.existsSync(proceduralPath)) {
    candidates.push({
      sourceAssetType: "bricktoon_shot_clip",
      path: proceduralPath
    });
  }

  const availableSourceTypes = candidates.map((candidate) => candidate.sourceAssetType);
  const proceduralPreferred = shouldPreferProceduralShotClip(clipInfo, motionInfo, availableSourceTypes);

  return candidates
    .map((candidate) => ({
      ...candidate,
      priority: candidate.sourceAssetType === "bricktoon_shot_clip" && proceduralPreferred
        ? candidatePriorityForSource(candidate.sourceAssetType, clipInfo) + 60
        : candidatePriorityForSource(candidate.sourceAssetType, clipInfo)
    }))
    .sort((left, right) => right.priority - left.priority);
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
    const professionalDir = path.join(workspaceDir, "08_animation", "professional_imports", "shots");
    const editorialDir = path.join(workspaceDir, "08_animation", "hybrid_editorial");
    const hybridProofDir = path.join(workspaceDir, "08_animation", "hybrid_shots");
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
        const candidates = buildSourceCandidates({
          shot,
          clipInfo,
          motionInfo,
          stabilizedPath,
          proceduralPath,
          professionalDir,
          editorialDir,
          hybridProofDir
        });
        const selectedCandidate = candidates[0] || null;
        const source = selectedCandidate?.path || proceduralPath;
        const sourceAssetType = selectedCandidate?.sourceAssetType || "bricktoon_shot_clip";
        const prefersProcedural = sourceAssetType === "bricktoon_shot_clip";
        if (!fs.existsSync(source)) {
          continue;
        }
        const target = path.join(compositedDir, `${shot.shot_id}.mp4`);
        const textSanitized = shouldSanitizeReadableText(shot, clipInfo);
        if (textSanitized) {
          sanitizeDocumentReadableText(source, target);
        } else {
          fs.copyFileSync(source, target);
        }
        const qualityClassification = qualityClassificationForSelection(sourceAssetType, clipInfo);
        const selectionReason = selectionReasonForSource({ sourceAssetType, prefersProcedural, motionInfo });
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
          motion_source_policy: prefersProcedural ? "procedural_fallback_only" : "prefer_best_available_motion",
          available_source_types: candidates.map((candidate) => candidate.sourceAssetType),
          text_sanitized: textSanitized,
          sanitization_profile: textSanitized ? "document_no_text_overlay_v1" : null,
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
