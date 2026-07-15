const { resolveSceneAsset } = require("./resolveSceneAsset");
const { qualityClassificationForAsset } = require("../bricktoon/workflowContracts");

function buildCaptionChunks(sceneCard, startSeconds, endSeconds) {
  return [
    {
      text: sceneCard.caption_text || "",
      start_seconds: Number((startSeconds + 0.25).toFixed(2)),
      end_seconds: Number(Math.max(startSeconds + 0.5, endSeconds - 0.2).toFixed(2))
    }
  ];
}

function compileRenderContract(input) {
  const {
    workspaceId,
    renderMode,
    profile,
    sceneCards,
    sceneManifest,
    assetManifest
  } = input;

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
        caption_chunks: buildCaptionChunks(sceneCard || {}, scene.start, scene.end),
        camera_motion: scene.motion_style || sceneCard?.camera?.movement || "steady_documentary",
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
