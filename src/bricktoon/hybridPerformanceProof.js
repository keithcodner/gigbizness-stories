function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeShotContracts(bundle = {}) {
  if (Array.isArray(bundle.shot_contracts)) {
    return bundle.shot_contracts;
  }
  return [];
}

function isCharacterPerformanceShot(shotContract = {}) {
  return ["puppet_performance_shot", "puppet_dialogue_shot"].includes(shotContract.motion_requirements?.return_type);
}

function proofPriorityForShot(shotContract = {}) {
  const shotClass = String(shotContract.shot_class || "");
  if (shotClass === "closeup_face") {
    return 100;
  }
  if (shotClass === "medium_two_shot") {
    return 90;
  }
  if (shotClass === "medium_single") {
    return 80;
  }
  if (shotClass === "document_insert" || shotClass === "top_down_document" || shotClass === "push_in_document") {
    return 60;
  }
  if (shotClass === "establishing_wide") {
    return 40;
  }
  return 10;
}

function normalizeSelectionOptions(maxShotsOrOptions) {
  if (typeof maxShotsOrOptions === "number") {
    return {
      mode: "sample",
      maxShots: maxShotsOrOptions
    };
  }

  if (maxShotsOrOptions && typeof maxShotsOrOptions === "object") {
    return {
      mode: String(maxShotsOrOptions.mode || "topic_wide"),
      maxShots: Number(maxShotsOrOptions.maxShots || 4)
    };
  }

  return {
    mode: "topic_wide",
    maxShots: 4
  };
}

function isPreferredHybridProofShot(shotContract = {}) {
  return [
    "closeup_face",
    "medium_single",
    "medium_two_shot",
    "document_insert",
    "top_down_document",
    "push_in_document"
  ].includes(String(shotContract.shot_class || ""));
}

function selectHybridProofShots(bundle = {}, maxShotsOrOptions = undefined) {
  const shotContracts = normalizeShotContracts(bundle);
  const options = normalizeSelectionOptions(maxShotsOrOptions);
  const preferredOrder = ["closeup_face", "medium_single", "medium_two_shot", "document_insert", "top_down_document", "push_in_document"];

  if (options.mode === "topic_wide" || options.mode === "full_topic" || options.mode === "all_eligible") {
    const preferredShots = [];
    const fallbackShots = [];

    for (const shot of shotContracts) {
      if (isPreferredHybridProofShot(shot)) {
        preferredShots.push(shot);
      } else {
        fallbackShots.push(shot);
      }
    }

    preferredShots.sort((a, b) => proofPriorityForShot(b) - proofPriorityForShot(a) || String(a.shot_id || "").localeCompare(String(b.shot_id || "")));
    fallbackShots.sort((a, b) => proofPriorityForShot(b) - proofPriorityForShot(a) || String(a.shot_id || "").localeCompare(String(b.shot_id || "")));

    return preferredShots.length > 0 ? preferredShots : fallbackShots;
  }

  const maxShots = Math.max(1, Number(options.maxShots || 4));
  const selected = [];
  const seen = new Set();

  for (const shotClass of preferredOrder) {
    const match = shotContracts.find((shot) => !seen.has(shot.shot_id) && shot.shot_class === shotClass);
    if (match) {
      selected.push(match);
      seen.add(match.shot_id);
    }
    if (selected.length >= maxShots) {
      break;
    }
  }

  if (selected.length < maxShots) {
    for (const shot of shotContracts
      .filter((item) => !seen.has(item.shot_id))
      .sort((a, b) => proofPriorityForShot(b) - proofPriorityForShot(a))) {
      selected.push(shot);
      seen.add(shot.shot_id);
      if (selected.length >= maxShots) {
        break;
      }
    }
  }

  return selected;
}

function emphasisActionForShot(shotContract = {}, actorTrack = {}, actorIndex = 0) {
  const shotClass = String(shotContract.shot_class || "");
  const baseDuration = Number(shotContract.timing_handoff?.duration_seconds || 4);
  const start = 0;
  const emphasisStart = Number(shotContract.timing_handoff?.timing_windows?.emphasis_start || baseDuration * 0.32);
  const emphasisEnd = Number(shotContract.timing_handoff?.timing_windows?.emphasis_end || baseDuration * 0.72);
  const end = baseDuration;

  const isPrimarySpeaker = actorTrack.mouth_track || actorIndex === 0;
  if (shotClass === "closeup_face" && isPrimarySpeaker) {
    return [
      { action: "talk_calm", start, end: emphasisStart, intensity: 0.62 },
      { action: "talk_emphasis", start: emphasisStart, end: emphasisEnd, intensity: 0.88 },
      { action: "blink", start: Math.max(emphasisEnd, end * 0.78), end, intensity: 0.5 }
    ];
  }
  if (shotClass === "medium_two_shot" && isPrimarySpeaker) {
    return [
      { action: "talk_calm", start, end: emphasisStart, intensity: 0.58 },
      { action: "gesture_open", start: emphasisStart, end: emphasisEnd, intensity: 0.72 },
      { action: "blink", start: Math.max(emphasisEnd, end * 0.8), end, intensity: 0.45 }
    ];
  }
  if (shotClass === "medium_single" && isPrimarySpeaker) {
    return [
      { action: "talk_calm", start, end: emphasisStart, intensity: 0.6 },
      { action: "gesture_point", start: emphasisStart, end: emphasisEnd, intensity: 0.78 },
      { action: "blink", start: Math.max(emphasisEnd, end * 0.8), end, intensity: 0.45 }
    ];
  }
  if (shotClass === "medium_two_shot") {
    return [
      { action: "idle_basic", start, end: emphasisStart, intensity: 0.32 },
      { action: "double_take", start: emphasisStart, end: emphasisEnd, intensity: 0.46 },
      { action: "blink", start: Math.max(emphasisEnd, end * 0.8), end, intensity: 0.4 }
    ];
  }
  if (["document_insert", "top_down_document", "push_in_document"].includes(shotClass)) {
    return [
      { action: "hand_over_document", start: emphasisStart * 0.75, end: emphasisEnd, intensity: 0.66 }
    ];
  }
  return actorTrack.actions || [
    { action: "idle_basic", start: 0, end: baseDuration, intensity: 0.35 }
  ];
}

function buildHybridProofPerformance(shotContract = {}) {
  const durationSeconds = Number(shotContract.timing_handoff?.duration_seconds || 4);
  const cameraRecipe = shotContract.performance_handoff?.camera_recipe || {};
  const actorTracks = Array.isArray(shotContract.performance_handoff?.actor_tracks)
    ? shotContract.performance_handoff.actor_tracks
    : [];
  const performanceClass = String(shotContract.performance_handoff?.performance_class || "");
  const isDialogue = shotContract.motion_requirements?.return_type === "puppet_dialogue_shot";
  const isCloseup = shotContract.shot_class === "closeup_face";
  const isInsert = ["document_insert", "top_down_document", "push_in_document"].includes(shotContract.shot_class);
  const visibleCharacterLimit = isInsert
    ? 0
    : (isCloseup ? 1 : clamp(Number(shotContract.performance_handoff?.visible_character_limit || actorTracks.length || 1), 1, isDialogue ? 2 : 3));

  const performances = actorTracks.map((track, index) => {
    const isPrimarySpeaker = !isInsert && (Boolean(track.mouth_track) || index === 0);
    return {
      actor_id: track.actor_id || null,
      character_id: track.character_id || null,
      screen_position: track.screen_position || (index === 0 ? "center" : index === 1 ? "left" : "right"),
      gesture_profile: track.gesture_profile || (isDialogue ? "dialogue_exchange" : "host_explainer"),
      prop_ids: Array.isArray(track.prop_ids) ? track.prop_ids : [],
      prop_track: track.prop_track || {},
      actions: emphasisActionForShot(shotContract, track, index),
      mouth_track: isPrimarySpeaker,
      blink_track: true,
      head_turn_track: isCharacterPerformanceShot(shotContract)
    };
  });

  return {
    proof_profile: "option2_phase3_minimum_viable_character_performance",
    duration_seconds: durationSeconds,
    performance_class: performanceClass || (isInsert ? "hybrid_insert_proof" : isDialogue ? "hybrid_dialogue_proof" : "hybrid_speaking_proof"),
    visible_character_limit: visibleCharacterLimit,
    camera_recipe: {
      ...cameraRecipe,
      movement: cameraRecipe.movement || (isCloseup ? "steady_push" : "steady_push"),
      easing: cameraRecipe.easing || "ease_in_out",
      start_scale: Number(cameraRecipe.start_scale || 1),
      end_scale: Number(cameraRecipe.end_scale || (isCloseup ? 1.12 : 1.07)),
      angle_profile: cameraRecipe.angle_profile || (isCloseup ? "closeup_eye_level" : isDialogue ? "dialogue_two_shot" : "medium_explainer"),
      focus_target: cameraRecipe.focus_target || (isCloseup ? "speaker_face" : isDialogue ? "exchange" : "speaker_torso")
    },
    timing_windows: shotContract.timing_handoff?.timing_windows || {},
    mouth_sync_mode: isInsert ? "limited" : isDialogue ? "talk_cycles" : "viseme_emphasis",
    blink_profile: "cinematic_readable",
    head_motion_profile: "readable_turns",
    performances,
    secondary_action: shotContract.performance_handoff?.secondary_action || (isDialogue ? "prop_reveal" : "ambient_hold"),
    narration_hint: shotContract.timing_handoff?.narration_hint || null,
    proof_checks: isInsert
      ? [
        "document or proof area stays dominant",
        "camera emphasis remains readable",
        "prop or document behavior stays attached to timing"
      ]
      : [
        "visible mouth animation on speaking subject",
        "at least one readable blink or reaction beat",
        "clear head or gesture change during emphasis window",
        "prop or document behavior stays attached to timing"
      ]
  };
}

function summarizeHybridProofSelection(selectedShots = []) {
  return {
    total_selected_shots: selectedShots.length,
    closeup_count: selectedShots.filter((shot) => shot.shot_class === "closeup_face").length,
    dialogue_count: selectedShots.filter((shot) => shot.shot_class === "medium_two_shot").length,
    speaking_single_count: selectedShots.filter((shot) => shot.shot_class === "medium_single").length,
    insert_count: selectedShots.filter((shot) => ["document_insert", "top_down_document", "push_in_document"].includes(shot.shot_class)).length
  };
}

function buildHybridProofMarkdown(report = {}) {
  const lines = [
    "# Hybrid Performance Proof",
    "",
    `- Generated: ${report.generated_at}`,
    `- Proof profile: ${report.proof_profile}`,
    `- Selection mode: ${report.selection_mode || "topic_wide"}`,
    `- Selected shots: ${report.summary.total_selected_shots}`,
    `- Closeups: ${report.summary.closeup_count}`,
    `- Dialogue shots: ${report.summary.dialogue_count}`,
    `- Speaking singles: ${report.summary.speaking_single_count}`,
    `- Insert shots: ${report.summary.insert_count}`,
    "",
    "## Purpose",
    "",
    "This package is the Option 2 Phase 3 controlled proof that hybrid character-performance shots visibly animate rather than behaving like moving stills.",
    "",
    "## Selected Shots",
    ""
  ];

  for (const shot of report.shots || []) {
    lines.push(`### ${shot.shot_id}`);
    lines.push("");
    lines.push(`- Scene: ${shot.scene_id}`);
    lines.push(`- Shot class: ${shot.shot_class}`);
    lines.push(`- Source contract: ${shot.contract_file}`);
    lines.push(`- Proof clip: ${shot.proof_clip_file}`);
    lines.push(`- Mouth mode: ${shot.mouth_sync_mode}`);
    lines.push(`- Visible characters: ${shot.visible_character_limit}`);
    lines.push(`- Stage warnings: ${shot.stage_warnings.length > 0 ? shot.stage_warnings.join(", ") : "none"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildHybridProofMarkdown,
  buildHybridProofPerformance,
  selectHybridProofShots,
  summarizeHybridProofSelection
};
