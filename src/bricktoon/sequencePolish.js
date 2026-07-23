function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function splitNarrationIntoCaptionChunks(text, startSeconds, endSeconds, options = {}) {
  const totalDuration = Math.max(0.5, Number(endSeconds || 0) - Number(startSeconds || 0));
  const sentences = splitSentences(text);
  const sourceChunks = sentences.length > 0 ? sentences : [String(text || "").trim()].filter(Boolean);
  if (sourceChunks.length === 0) {
    return [];
  }

  const maxChunks = clamp(Number(options.maxChunks || 4), 1, 6);
  const minChunkSeconds = Number(options.minChunkSeconds || 1.2);
  const chunks = sourceChunks.slice(0, maxChunks);
  const weights = chunks.map((chunk) => Math.max(1, wordCount(chunk)));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || chunks.length;
  const usableStart = Number(startSeconds || 0) + 0.2;
  const usableEnd = Number(endSeconds || 0) - 0.2;
  const usableDuration = Math.max(minChunkSeconds * chunks.length, usableEnd - usableStart);

  let cursor = usableStart;
  return chunks.map((chunk, index) => {
    const remainingWeight = weights.slice(index).reduce((sum, value) => sum + value, 0) || weights[index];
    const remainingDuration = Math.max(minChunkSeconds, usableEnd - cursor);
    const proportionalDuration = index === chunks.length - 1
      ? remainingDuration
      : Math.max(
        minChunkSeconds,
        (remainingDuration * weights[index]) / remainingWeight
      );
    const nextCursor = index === chunks.length - 1
      ? usableEnd
      : Math.min(usableEnd, cursor + proportionalDuration);
    const chunkStart = cursor;
    const chunkEnd = Math.max(cursor + 0.6, nextCursor);
    cursor = nextCursor;
    return {
      text: chunk,
      start_seconds: Number(chunkStart.toFixed(2)),
      end_seconds: Number(chunkEnd.toFixed(2))
    };
  });
}

function subtitleSafeModeForShotType(shotType) {
  const type = String(shotType || "").toLowerCase();
  if (type.includes("document") || type.includes("top_down")) {
    return "top_safe";
  }
  if (type.includes("closeup")) {
    return "lower_compact";
  }
  if (type.includes("two_shot") || type.includes("over_shoulder")) {
    return "lower_split_safe";
  }
  return "lower_standard";
}

function subtitleSafeRegionForShotTypes(shotTypes = []) {
  const modes = new Set((shotTypes || []).map((shotType) => subtitleSafeModeForShotType(shotType)));
  if (modes.has("top_safe")) {
    return {
      mode: "top_safe",
      x: 0.12,
      y: 0.08,
      width: 0.76,
      height: 0.14
    };
  }
  if (modes.has("lower_compact")) {
    return {
      mode: "lower_compact",
      x: 0.18,
      y: 0.8,
      width: 0.64,
      height: 0.12
    };
  }
  if (modes.has("lower_split_safe")) {
    return {
      mode: "lower_split_safe",
      x: 0.12,
      y: 0.79,
      width: 0.76,
      height: 0.12
    };
  }
  return {
    mode: "lower_standard",
    x: 0.1,
    y: 0.8,
    width: 0.8,
    height: 0.12
  };
}

function classifyShotRole(shot, index, totalShots) {
  const type = String(shot?.shot_type || "").toLowerCase();
  if (index === 0) {
    return "entry";
  }
  if (index === totalShots - 1) {
    return "exit";
  }
  if (type.includes("document") || type.includes("insert")) {
    return "evidence";
  }
  if (type.includes("closeup") || type.includes("reaction")) {
    return "performance";
  }
  return "bridge";
}

function continuityStatusForScene(scene, shotSelections = []) {
  const total = shotSelections.length || (scene?.shots || []).length || 0;
  const fallbackShots = shotSelections.filter((shot) => shot.quality_classification === "fallback").length;
  const premiumShots = shotSelections.filter((shot) => shot.quality_classification === "premium_motion").length;
  const motionReadyShots = shotSelections.filter((shot) => ["premium_motion", "motion_ready"].includes(shot.quality_classification)).length;
  const axisLocked = scene?.continuity?.allow_axis_crossing === false;

  let status = "fragile";
  const premiumThresholdForLocked = total > 0 ? Math.max(1, Math.floor(total / 2)) : 0;
  if (motionReadyShots === total && fallbackShots === 0 && premiumShots >= premiumThresholdForLocked && total > 0) {
    status = "locked";
  } else if (
    total > 0
    && (
      (motionReadyShots === total && fallbackShots === 0)
      || (motionReadyShots >= Math.ceil(total / 2) && fallbackShots <= Math.floor(total / 3))
    )
  ) {
    status = "mixed";
  }

  const notes = [];
  if (axisLocked) {
    notes.push("screen axis locked");
  }
  if (fallbackShots > 0) {
    notes.push(`${fallbackShots} fallback shot${fallbackShots === 1 ? "" : "s"} still in sequence`);
  }
  if (premiumShots > 0) {
    notes.push(`${premiumShots} premium motion shot${premiumShots === 1 ? "" : "s"} available`);
  }
  if (motionReadyShots > premiumShots) {
    const nonPremiumAnimatedShots = motionReadyShots - premiumShots;
    notes.push(`${nonPremiumAnimatedShots} supporting animated shot${nonPremiumAnimatedShots === 1 ? "" : "s"} available`);
  }

  return {
    status,
    fallback_shots: fallbackShots,
    premium_motion_shots: premiumShots,
    notes
  };
}

function pacingClassification(sceneDurationSeconds, shotCount) {
  const average = shotCount > 0 ? sceneDurationSeconds / shotCount : sceneDurationSeconds;
  if (average < 5.5) {
    return "dense";
  }
  if (average > 8.5) {
    return "measured";
  }
  return "balanced";
}

function buildAudioMixStrategy(sceneRecord = {}, sequenceSummary = {}) {
  const emphasisScene = /hook|stakes|pressure|warning|takeaway/i.test(sceneRecord.title || "")
    || sequenceSummary.transition_roles?.includes("performance");
  return {
    voice_gain: 1,
    music_duck_db: emphasisScene ? -18 : -16,
    sfx_level: emphasisScene ? "subtle_punctuation" : "minimal",
    narration_priority: "voice_first",
    pacing_support: emphasisScene ? "accent_reveals_and_reactions" : "steady_bed"
  };
}

function summarizeSceneSequence({ scene, sceneRecord = {}, shotSelections = [] }) {
  const shotTypes = (scene?.shots || []).map((shot) => shot.shot_type);
  const transitionRoles = (scene?.shots || []).map((shot, index) => classifyShotRole(shot, index, (scene?.shots || []).length));
  const continuity = continuityStatusForScene(scene, shotSelections);
  const subtitleSafeRegion = subtitleSafeRegionForShotTypes(shotTypes);
  const sceneDurationSeconds = Number(sceneRecord.duration_seconds || scene?.scene_duration_seconds || 0);
  const shotCount = (scene?.shots || []).length;
  const pacing = pacingClassification(sceneDurationSeconds, shotCount);
  const promotionStatus = continuity.status === "locked"
    ? "ready_for_finish"
    : continuity.status === "mixed"
      ? "review_before_finish"
      : "hold_for_polish";

  return {
    scene_id: scene?.scene_id || sceneRecord.id || null,
    shot_count: shotCount,
    shot_types: shotTypes,
    transition_roles: transitionRoles,
    continuity_status: continuity.status,
    continuity_notes: continuity.notes,
    fallback_shots: continuity.fallback_shots,
    premium_motion_shots: continuity.premium_motion_shots,
    editorial_pacing: pacing,
    subtitle_safe_region: subtitleSafeRegion,
    audio_mix_strategy: buildAudioMixStrategy(sceneRecord, { transition_roles: transitionRoles }),
    promotion_status: promotionStatus
  };
}

module.exports = {
  buildAudioMixStrategy,
  classifyShotRole,
  continuityStatusForScene,
  splitNarrationIntoCaptionChunks,
  subtitleSafeModeForShotType,
  subtitleSafeRegionForShotTypes,
  summarizeSceneSequence
};
