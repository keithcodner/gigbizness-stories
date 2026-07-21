function toLower(value) {
  return String(value || "").toLowerCase();
}

function roundTwo(value) {
  return Number(Number(value || 0).toFixed(2));
}

function inferPerformanceClass(shot) {
  const type = toLower(shot?.shot_type);
  if (type.includes("closeup")) {
    return "closeup_talking_puppet";
  }
  if (type.includes("medium_single")) {
    return "single_character_explainer";
  }
  if (type.includes("medium_two")) {
    return "two_character_exchange";
  }
  if (type.includes("document") || type.includes("top_down")) {
    return "document_insert_motion";
  }
  if (type.includes("wide") || type.includes("establishing")) {
    return "staged_cutout_tableau";
  }
  return "editorial_cutout_default";
}

function visibleCharacterLimitForShot(shot) {
  const type = toLower(shot?.shot_type);
  if (type.includes("closeup") || type.includes("medium_single")) {
    return 1;
  }
  if (type.includes("medium_two")) {
    return 2;
  }
  if (type.includes("document") || type.includes("top_down")) {
    return 0;
  }
  return Math.max(1, (shot?.cast_member_ids || []).length || 1);
}

function mouthSyncModeForShot(shot) {
  const type = toLower(shot?.shot_type);
  if (type.includes("closeup")) {
    return "viseme_emphasis";
  }
  if (type.includes("medium")) {
    return "talk_cycles";
  }
  return "limited";
}

function gestureProfileForMember(member, shot) {
  const intent = toLower(member?.action_intent);
  const role = toLower(member?.role);
  const shotType = toLower(shot?.shot_type);
  if (intent.includes("moustache")) {
    return "villain_showmanship";
  }
  if (intent.includes("folder reveal")) {
    return "prop_reveal";
  }
  if (intent.includes("phone")) {
    return "phone_hold_react";
  }
  if (intent.includes("point")) {
    return "explain_point";
  }
  if (role.includes("narrator") && /closeup|medium/.test(shotType)) {
    return "host_explainer";
  }
  return "idle_support";
}

function secondaryActionForShot(shot, card) {
  const text = `${shot?.purpose || ""} ${card?.narration || ""}`.toLowerCase();
  if (/invoice|bill|fee|quote|amount|price/.test(text)) {
    return "counter_change";
  }
  if (/hack|cyber|breach|data|server/.test(text)) {
    return "typing_loop";
  }
  if (/truck|door|close|slam/.test(text)) {
    return "impact_hit";
  }
  if (/proof|folder|document|evidence/.test(text)) {
    return "document_reveal";
  }
  return "ambient_hold";
}

function cameraRecipeForShot(shot = {}, card = {}) {
  const type = toLower(shot.shot_type);
  const movement = shot.camera?.movement || "steady_push";
  const easing = shot.camera?.easing || "ease_in_out";
  const base = {
    movement,
    easing,
    start_scale: shot.camera?.start_scale || 1,
    end_scale: shot.camera?.end_scale || 1.06,
    angle_profile: "documentary_eye_level",
    focus_target: "speaker",
    parallax_strength: 0.32,
    overshoot: 0.015,
    horizon_bias: 0,
    anchor_bias_x: 0,
    anchor_bias_y: 0
  };

  if (type.includes("closeup")) {
    return {
      ...base,
      angle_profile: "closeup_eye_level",
      focus_target: "speaker_face",
      parallax_strength: 0.18,
      overshoot: 0.03,
      anchor_bias_y: -0.02
    };
  }
  if (type.includes("medium_two")) {
    return {
      ...base,
      angle_profile: "dialogue_two_shot",
      focus_target: "exchange",
      parallax_strength: 0.26,
      overshoot: 0.02
    };
  }
  if (type.includes("medium_single")) {
    return {
      ...base,
      angle_profile: "medium_explainer",
      focus_target: "speaker_torso",
      parallax_strength: 0.24,
      overshoot: 0.02
    };
  }
  if (type.includes("top_down")) {
    return {
      ...base,
      angle_profile: "top_down_insert",
      focus_target: "document",
      parallax_strength: 0.08,
      overshoot: 0.01,
      horizon_bias: -0.2,
      anchor_bias_y: -0.08
    };
  }
  if (type.includes("push_in_document") || type.includes("document_insert")) {
    return {
      ...base,
      angle_profile: "document_push_in",
      focus_target: "document",
      parallax_strength: 0.1,
      overshoot: 0.028,
      anchor_bias_y: -0.04
    };
  }
  if (type.includes("villain")) {
    return {
      ...base,
      angle_profile: "villain_low_angle",
      focus_target: "villain_face",
      parallax_strength: 0.2,
      overshoot: 0.025,
      horizon_bias: 0.06
    };
  }
  if (type.includes("reaction")) {
    return {
      ...base,
      angle_profile: "reaction_punch_in",
      focus_target: "reaction_face",
      parallax_strength: 0.2,
      overshoot: 0.022,
      anchor_bias_x: 0.01
    };
  }
  if (type.includes("establishing") || type.includes("wide")) {
    return {
      ...base,
      angle_profile: "wide_establish",
      focus_target: card?.camera?.focus === "character reaction" ? "ensemble" : "environment",
      parallax_strength: 0.38,
      overshoot: 0.012
    };
  }
  return base;
}

function timingWindowsForShot(shot = {}) {
  const duration = Math.max(0.6, Number((shot.end || 0) - (shot.start || 0)) || 0.6);
  return {
    setup_end: roundTwo(duration * 0.22),
    emphasis_start: roundTwo(duration * 0.34),
    emphasis_end: roundTwo(duration * 0.74),
    release_start: roundTwo(duration * 0.86)
  };
}

function propTrackForMember(member = {}, shot = {}) {
  const intent = toLower(member.action_intent);
  const propIds = Array.isArray(member.prop_ids) ? member.prop_ids : [];
  const primaryPropId = propIds[0] || null;
  const shotType = toLower(shot.shot_type);
  const defaultTrack = {
    prop_id: primaryPropId,
    carry_side: "right",
    interaction: primaryPropId ? "supporting_hold" : "none",
    reveal_window: /document|closeup|medium/.test(shotType) ? "emphasis" : "steady",
    contact_style: primaryPropId ? "attached" : "none"
  };

  if (intent.includes("folder reveal")) {
    return {
      prop_id: primaryPropId || "PROP_EVIDENCE_FOLDER",
      carry_side: "right",
      interaction: "folder_reveal",
      reveal_window: "emphasis",
      contact_style: "present_to_camera"
    };
  }
  if (intent.includes("phone")) {
    return {
      prop_id: propIds.includes("PROP_PHONE") ? "PROP_PHONE" : primaryPropId,
      carry_side: "right",
      interaction: "phone_check",
      reveal_window: "steady",
      contact_style: "handheld_readable"
    };
  }
  if (intent.includes("moustache")) {
    return {
      prop_id: propIds.includes("PROP_CONTRACT") ? "PROP_CONTRACT" : primaryPropId,
      carry_side: "right",
      interaction: "villain_contract_present",
      reveal_window: "emphasis",
      contact_style: "taunting_present"
    };
  }
  if (intent.includes("point")) {
    return {
      ...defaultTrack,
      interaction: primaryPropId ? "host_point_with_support_prop" : "point_only",
      carry_side: primaryPropId ? "right" : "none",
      reveal_window: "steady",
      contact_style: primaryPropId ? "supporting_hand" : "none"
    };
  }
  return defaultTrack;
}

module.exports = {
  cameraRecipeForShot,
  gestureProfileForMember,
  inferPerformanceClass,
  mouthSyncModeForShot,
  propTrackForMember,
  secondaryActionForShot,
  timingWindowsForShot,
  visibleCharacterLimitForShot
};
