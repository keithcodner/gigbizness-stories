const path = require("path");

function inferShotClass(shot = {}, approval = {}) {
  return approval.shot_class || String(shot.shot_type || "unknown").toLowerCase();
}

function layerRequirementsForShotClass(shotClass) {
  const map = {
    closeup_face: ["character_foreground", "face_region", "arm_hand_region", "lighting_overlay"],
    medium_single: ["character_foreground", "face_region", "arm_hand_region", "prop_main"],
    medium_two_shot: ["character_foreground", "face_region", "arm_hand_region", "prop_main"],
    establishing_wide: ["background_far", "background_middle", "character_foreground", "lighting_overlay"],
    top_down_document: ["prop_main", "arm_hand_region", "foreground_frame"],
    document_insert: ["prop_main", "arm_hand_region", "foreground_frame"],
    push_in_document: ["prop_main", "foreground_frame", "lighting_overlay"]
  };
  return map[shotClass] || ["character_foreground", "face_region", "arm_hand_region", "prop_main"];
}

function motionRequirementsForShotClass(shotClass) {
  const map = {
    closeup_face: {
      mouth_shapes: ["neutral", "talking", "emphatic"],
      pose_states: ["head_turn_left", "head_turn_right", "blink_closed"],
      return_type: "puppet_performance_shot"
    },
    medium_single: {
      mouth_shapes: ["neutral", "talking"],
      pose_states: ["gesture_point", "gesture_open", "gesture_hold_prop"],
      return_type: "puppet_performance_shot"
    },
    medium_two_shot: {
      mouth_shapes: ["neutral", "talking"],
      pose_states: ["gesture_open", "gesture_hold_prop"],
      return_type: "puppet_dialogue_shot"
    },
    establishing_wide: {
      mouth_shapes: [],
      pose_states: ["idle_hold", "ambient_reaction"],
      return_type: "hybrid_staged_shot"
    },
    top_down_document: {
      mouth_shapes: [],
      pose_states: ["document_reveal", "prop_contact_hold"],
      return_type: "hybrid_insert_shot"
    },
    document_insert: {
      mouth_shapes: [],
      pose_states: ["document_reveal", "prop_contact_hold"],
      return_type: "hybrid_insert_shot"
    },
    push_in_document: {
      mouth_shapes: [],
      pose_states: ["document_reveal"],
      return_type: "hybrid_insert_shot"
    }
  };
  return map[shotClass] || {
    mouth_shapes: ["neutral"],
    pose_states: ["idle_hold"],
    return_type: "hybrid_shot"
  };
}

function fallbackDisciplineForRoute(route = {}, shotClass) {
  if (route.production_mode === "hybrid_2d_ai" || ["closeup_face", "medium_single", "medium_two_shot"].includes(shotClass)) {
    return {
      silent_fallback_allowed: false,
      repo_fallback_allowed: false,
      block_if_missing: [
        "approved_keyframe",
        "layer_manifest",
        "character_rig",
        "timing_handoff"
      ]
    };
  }

  return {
    silent_fallback_allowed: false,
    repo_fallback_allowed: true,
    block_if_missing: [
      "approved_keyframe",
      "timing_handoff"
    ]
  };
}

function returnRequirementsForShotClass(shotClass) {
  const base = {
    required_files: [
      "rendered_shot",
      "alpha_or_matte_if_supported",
      "handoff_report"
    ],
    required_metadata: [
      "toolchain_name",
      "toolchain_version",
      "operator_notes",
      "timing_confirmation",
      "fallback_used"
    ]
  };

  if (["closeup_face", "medium_single", "medium_two_shot"].includes(shotClass)) {
    return {
      ...base,
      performance_checks: [
        "speech readability",
        "blink timing present",
        "gesture or pose change present",
        "identity lock preserved"
      ]
    };
  }

  return {
    ...base,
    performance_checks: [
      "camera and prop timing preserved",
      "insert readability preserved",
      "identity lock preserved where visible"
    ]
  };
}

function buildHybridCharacterContract({ character, rig, identityPackage }) {
  return {
    character_id: character.character_id,
    cast_member_id: character.cast_member_id || null,
    benchmark_profile: "option2_phase2_hybrid_animation_contract",
    identity_package_file: identityPackage ? identityPackage.package_file : null,
    continuity_anchors: character.continuity_anchors || [],
    hybrid_handoff_contract: character.hybrid_handoff_contract || {},
    rig_file: rig ? rig.file : null,
    rig_type: rig?.data?.rig_type || null,
    motion_states: rig?.data?.motion_states || {},
    sockets: rig?.data?.sockets || {},
    source_reference_assets: rig?.data?.source_reference_assets || {},
    return_requirements: {
      preserve_identity_locks: true,
      preserve_costume_and_palette: true,
      preserve_named_prop_relationships: true
    }
  };
}

function buildHybridShotContract({
  scene,
  shot,
  route,
  approval,
  layerManifest,
  performance,
  characterContracts,
  voiceoverFile,
  captionsFile
}) {
  const shotClass = inferShotClass(shot, approval);
  const motionRequirements = motionRequirementsForShotClass(shotClass);
  const visibleCharacters = (performance?.performances || [])
    .map((item) => item.actor_id || item.character_id || item.cast_member_id)
    .filter(Boolean);

  return {
    shot_id: shot.shot_id,
    scene_id: scene.scene_id,
    benchmark_profile: "option2_phase2_hybrid_animation_contract",
    shot_class: shotClass,
    production_mode: route.production_mode || null,
    quality_tier: route.quality_tier || approval.quality_tier || null,
    source_stills: Array.isArray(approval.approved_keyframes) ? approval.approved_keyframes : [],
    layer_export: {
      layer_manifest_file: layerManifest?.file || null,
      clean_plate_file: layerManifest?.clean_plate || null,
      required_regions: layerRequirementsForShotClass(shotClass),
      extraction_status: layerManifest?.data?.extraction_status || null
    },
    rig_bindings: characterContracts
      .filter((item) => shot.cast_member_ids?.includes(item.cast_member_id) || shot.cast_member_ids?.includes(item.character_id))
      .map((item) => ({
        character_id: item.character_id,
        rig_file: item.rig_file,
        identity_package_file: item.identity_package_file,
        sockets: item.sockets
      })),
    motion_requirements: {
      mouth_shapes: motionRequirements.mouth_shapes,
      pose_states: motionRequirements.pose_states,
      prop_socket_requirements: ["prop_socket_primary"],
      return_type: motionRequirements.return_type
    },
    timing_handoff: {
      shot_start_seconds: shot.start,
      shot_end_seconds: shot.end,
      duration_seconds: Number((shot.end - shot.start).toFixed(2)),
      timing_windows: performance?.timing_windows || {},
      voiceover_file: voiceoverFile || null,
      captions_file: captionsFile || null,
      narration_hint: performance?.narration_hint || null
    },
    performance_handoff: {
      performance_class: performance?.performance_class || null,
      visible_character_limit: performance?.visible_character_limit ?? null,
      visible_character_ids: visibleCharacters,
      camera_recipe: performance?.camera_recipe || null,
      secondary_action: performance?.secondary_action || null,
      actor_tracks: performance?.performances || []
    },
    fallback_discipline: fallbackDisciplineForRoute(route, shotClass),
    evidence_requirements: {
      still_lock_evidence: Array.isArray(approval.approved_keyframes) && approval.approved_keyframes.length > 0,
      layer_evidence: Boolean(layerManifest?.file),
      rig_evidence: characterContracts.length > 0,
      timing_evidence: Boolean(performance)
    },
    return_requirements: returnRequirementsForShotClass(shotClass)
  };
}

function summarizeHybridContract(shotContracts = []) {
  const summary = {
    total_shots: shotContracts.length,
    hybrid_character_shots: 0,
    insert_shots: 0,
    blocked_if_missing_layers: 0,
    blocked_if_missing_rigs: 0
  };

  for (const contract of shotContracts) {
    if (["closeup_face", "medium_single", "medium_two_shot"].includes(contract.shot_class)) {
      summary.hybrid_character_shots += 1;
    }
    if (["top_down_document", "document_insert", "push_in_document"].includes(contract.shot_class)) {
      summary.insert_shots += 1;
    }
    if (contract.fallback_discipline.block_if_missing.includes("layer_manifest")) {
      summary.blocked_if_missing_layers += 1;
    }
    if (contract.fallback_discipline.block_if_missing.includes("character_rig")) {
      summary.blocked_if_missing_rigs += 1;
    }
  }

  return summary;
}

function buildHybridContractMarkdown(contract) {
  const lines = [
    "# Hybrid Animation Contract",
    "",
    `- Generated: ${contract.generated_at}`,
    `- Benchmark profile: ${contract.benchmark_profile}`,
    `- Character packages: ${contract.summary.character_packages}`,
    `- Shot packages: ${contract.summary.total_shots}`,
    `- Hybrid character shots: ${contract.summary.hybrid_character_shots}`,
    `- Insert shots: ${contract.summary.insert_shots}`,
    "",
    "## Purpose",
    "",
    "This package defines the exact repo-to-external-animation handoff for the hybrid bricktoon path.",
    "",
    "## Required Return Contract",
    "",
    "- return rendered shot files",
    "- preserve timing and shot duration",
    "- preserve identity lock and prop continuity",
    "- report any fallback or missing capabilities explicitly",
    "",
    "## Shot Packages",
    ""
  ];

  for (const shot of contract.shots) {
    lines.push(`### ${shot.shot_id}`);
    lines.push("");
    lines.push(`- Shot class: ${shot.shot_class}`);
    lines.push(`- Production mode: ${shot.production_mode || "n/a"}`);
    lines.push(`- Layer manifest: ${shot.layer_export.layer_manifest_file || "missing"}`);
    lines.push(`- Clean plate: ${shot.layer_export.clean_plate_file || "missing"}`);
    lines.push(`- Rig bindings: ${shot.rig_bindings.length}`);
    lines.push(`- Return type: ${shot.motion_requirements.return_type}`);
    lines.push(`- Block if missing: ${shot.fallback_discipline.block_if_missing.join(", ")}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildHybridCharacterContract,
  buildHybridShotContract,
  buildHybridContractMarkdown,
  summarizeHybridContract
};
