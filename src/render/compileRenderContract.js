const { resolveSceneAsset } = require("./resolveSceneAsset");
const { qualityClassificationForAsset } = require("../bricktoon/workflowContracts");
const { splitNarrationIntoCaptionChunks, summarizeSceneSequence } = require("../bricktoon/sequencePolish");

function buildCaptionChunks(sceneCard, sceneRecord, startSeconds, endSeconds) {
  const captionText = String(sceneCard.caption_text || "").trim();
  const narrationText = String(sceneRecord.narration_excerpt || sceneCard.narration || "").trim();
  const captionWordCount = captionText.split(/\s+/).filter(Boolean).length;
  const sourceText = captionWordCount >= 9 ? captionText : (narrationText || captionText);
  return splitNarrationIntoCaptionChunks(sourceText, startSeconds, endSeconds, { maxChunks: 4, minChunkSeconds: 1.4 });
}

function compileRenderContract(input) {
  const {
    workspaceId,
    renderMode,
    profile,
    sceneCards,
    sceneManifest,
    assetManifest,
    shotPlan = {},
    compositingReport = {},
    sceneSequenceReport = {}
  } = input;

  const shotPlanLookup = new Map((shotPlan.scenes || []).map((scene) => [scene.scene_id, scene]));
  const sceneSequenceLookup = new Map((sceneSequenceReport.scenes || []).map((scene) => [scene.scene_id, scene]));
  const compositingByScene = new Map();
  for (const shot of (compositingReport.shots || [])) {
    const list = compositingByScene.get(shot.scene_id) || [];
    list.push(shot);
    compositingByScene.set(shot.scene_id, list);
  }

  return {
    workspace_id: workspaceId,
    script_id: "script_v2_human_review",
    render_mode: renderMode,
    resolution: {
      width: profile.width,
      height: profile.height
    },
    fps: profile.fps,
    expected_duration_seconds: sceneManifest.duration_seconds || 0,
    duration_tolerance_seconds: 0.35,
    scenes: (sceneManifest.scenes || []).map((scene) => {
      const sceneCard = (sceneCards || []).find((card) => card.scene_id === scene.id);
      const sceneShotPlan = shotPlanLookup.get(scene.id) || { scene_id: scene.id, shots: [] };
      const sceneShotSelections = compositingByScene.get(scene.id) || [];
      const sequenceReport = sceneSequenceLookup.get(scene.id);
      const sequenceSummary = sequenceReport || summarizeSceneSequence({
        scene: sceneShotPlan,
        sceneRecord: scene,
        shotSelections: sceneShotSelections
      });
      const resolved = resolveSceneAsset(sceneCard || { scene_id: scene.id }, assetManifest, { render_mode: renderMode });
      return {
        scene_id: scene.id,
        beat_ids: sceneCard ? [sceneCard.beat_id] : [],
        start_seconds: scene.start,
        end_seconds: scene.end,
        required_visual_type: sceneCard?.visual_type || "bricktoon_scene",
        allowed_fallback_types: sceneCard?.allowed_fallback_types || [],
        required_characters: sceneCard?.characters || [],
        required_asset_ids: resolved.asset?.asset_id ? [resolved.asset.asset_id] : [],
        selected_asset_type: resolved.asset?.asset_type || "text_card",
        asset_selection_reason: resolved.asset?.selection_reason || (resolved.fallback_used ? "fallback asset selected" : "primary approved asset selected"),
        asset_quality_classification: resolved.asset?.quality_classification || qualityClassificationForAsset(resolved.asset?.asset_type),
        selected_asset_file: resolved.asset?.file || null,
        caption_chunks: buildCaptionChunks(sceneCard || {}, scene, scene.start, scene.end),
        subtitle_safe_region: sequenceSummary.subtitle_safe_region,
        camera_motion: scene.motion_style || sceneCard?.camera?.movement || "steady_documentary",
        continuity_status: sequenceSummary.continuity_status,
        continuity_notes: sequenceSummary.continuity_notes,
        editorial_pacing: sequenceSummary.editorial_pacing,
        transition_roles: sequenceSummary.transition_roles,
        audio_mix_strategy: sequenceSummary.audio_mix_strategy,
        shot_source_breakdown: {
          premium_motion_shots: sequenceSummary.premium_motion_shots,
          fallback_shots: sequenceSummary.fallback_shots
        },
        promotion_status: sequenceSummary.promotion_status,
        evidence_frame_seconds: [
          Number((scene.start + Math.min(1.5, Math.max(0.5, scene.duration_seconds / 3))).toFixed(2)),
          Number((scene.end - Math.min(0.7, Math.max(0.4, scene.duration_seconds / 4))).toFixed(2))
        ]
      };
    })
  };
}

module.exports = {
  compileRenderContract
};
