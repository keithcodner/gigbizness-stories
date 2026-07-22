function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function countShotClasses(shots = []) {
  const counts = {};
  for (const shot of safeArray(shots)) {
    const shotClass = shot.shot_class || "unknown";
    counts[shotClass] = (counts[shotClass] || 0) + 1;
  }
  return counts;
}

function summarizeSocketCoverage(shots = []) {
  const coverage = {
    mouth_socket: 0,
    brow_socket: 0,
    eye_line_anchor: 0,
    front_shoulder_socket: 0,
    rear_shoulder_socket: 0,
    prop_socket_primary: 0
  };

  for (const shot of safeArray(shots)) {
    for (const binding of safeArray(shot.rig_bindings)) {
      const sockets = safeObject(binding.sockets);
      for (const key of Object.keys(coverage)) {
        if (sockets[key]) {
          coverage[key] += 1;
        }
      }
    }
  }

  return coverage;
}

function summarizeProfessionalToolchainInputs({
  exportLockReport = {},
  exportManifest = {},
  hybridContract = {},
  productionReadiness = {},
  toolchainProfileId = null,
  toolchainProfile = {}
}) {
  const shotContracts = safeArray(hybridContract.shot_contracts).length > 0
    ? safeArray(hybridContract.shot_contracts)
    : safeArray(hybridContract.shots);
  const characterContracts = safeArray(hybridContract.character_contracts).length > 0
    ? safeArray(hybridContract.character_contracts)
    : safeArray(hybridContract.characters);
  const capabilityMap = safeObject(toolchainProfile.capability_map);
  const capabilityAreas = Object.keys(capabilityMap);

  let mouthReadyShotCount = 0;
  let blinkGestureReadyShotCount = 0;
  let puppetReadyShotCount = 0;
  let propReadyShotCount = 0;
  let cameraReadyShotCount = 0;
  let compositingReadyShotCount = 0;

  for (const shot of shotContracts) {
    const actorTracks = safeArray(shot.performance_handoff?.actor_tracks);
    const mouthShapes = safeArray(shot.motion_requirements?.mouth_shapes);
    const poseStates = safeArray(shot.motion_requirements?.pose_states);
    const propSockets = safeArray(shot.motion_requirements?.prop_socket_requirements);
    const rigBindings = safeArray(shot.rig_bindings);
    const requiredFiles = safeArray(shot.return_requirements?.required_files);

    if (actorTracks.some((track) => track.mouth_track) || mouthShapes.length > 0) {
      mouthReadyShotCount += 1;
    }
    if (
      actorTracks.some((track) => track.blink_track || track.head_turn_track || Boolean(track.gesture_profile)) ||
      poseStates.some((state) => state.includes("blink") || state.includes("head_turn"))
    ) {
      blinkGestureReadyShotCount += 1;
    }
    if (shot.layer_export?.layer_manifest_file && rigBindings.length > 0) {
      puppetReadyShotCount += 1;
    }
    if (
      actorTracks.some((track) => Boolean(track.prop_track) || safeArray(track.prop_ids).length > 0) ||
      propSockets.length > 0
    ) {
      propReadyShotCount += 1;
    }
    if (shot.performance_handoff?.camera_recipe) {
      cameraReadyShotCount += 1;
    }
    if (requiredFiles.includes("rendered_shot")) {
      compositingReadyShotCount += 1;
    }
  }

  return {
    export_lock_decision: exportLockReport.gate?.decision || null,
    export_artifact_count: Number(exportManifest.artifact_count || 0),
    benchmark_scene_id: exportLockReport.benchmark_guidance?.benchmark_scene_id || null,
    benchmark_only_mode: exportLockReport.external_handoff_guidance?.benchmark_only_mode === true,
    benchmark_default_decision: productionReadiness.decision?.decision || null,
    toolchain_profile_id: toolchainProfileId,
    toolchain_profile_label: toolchainProfile.label || null,
    capability_area_count: capabilityAreas.length,
    shot_contract_count: shotContracts.length,
    character_contract_count: characterContracts.length,
    shot_class_counts: countShotClasses(shotContracts),
    mouth_ready_shot_count: mouthReadyShotCount,
    blink_gesture_ready_shot_count: blinkGestureReadyShotCount,
    puppet_ready_shot_count: puppetReadyShotCount,
    prop_ready_shot_count: propReadyShotCount,
    camera_ready_shot_count: cameraReadyShotCount,
    compositing_ready_shot_count: compositingReadyShotCount,
    socket_coverage: summarizeSocketCoverage(shotContracts)
  };
}

function buildCapabilityMappings({ summary = {}, toolchainProfile = {} }) {
  const capabilityMap = safeObject(toolchainProfile.capability_map);

  const mappingRules = {
    mouth_sync: {
      readinessCount: summary.mouth_ready_shot_count || 0,
      repoInputs: [
        "03_voice/voiceover_clean.wav",
        "03_voice/captions.srt",
        "03_voice/voice_timing.json",
        "08_animation/hybrid_contract/shots/*.json",
        "rig_bindings[].sockets.mouth_socket",
        "motion_requirements.mouth_shapes"
      ],
      operatingRule: "Bind the clean voiceover plus timing windows to the exported mouth-socket and mouth-shape contract before editorial composite."
    },
    blink_and_gesture_systems: {
      readinessCount: summary.blink_gesture_ready_shot_count || 0,
      repoInputs: [
        "08_animation/hybrid_contract/shots/*.json",
        "actor_tracks[].blink_track",
        "actor_tracks[].head_turn_track",
        "actor_tracks[].gesture_profile",
        "motion_requirements.pose_states"
      ],
      operatingRule: "Treat blink, gesture, and head-turn behavior as shot-performance data that must be preserved from the hybrid contract."
    },
    puppet_setup: {
      readinessCount: summary.puppet_ready_shot_count || 0,
      repoInputs: [
        "07_visuals/character_refs/*/hybrid_identity_package.json",
        "07_visuals/shot_layers/*/layer_manifest.json",
        "07_visuals/character_rigs/*/rig.json",
        "rig_bindings[].sockets"
      ],
      operatingRule: "Build professional puppets from the locked still identity packages, layer manifests, and rig sockets instead of reinterpreting characters from prompts."
    },
    prop_interaction: {
      readinessCount: summary.prop_ready_shot_count || 0,
      repoInputs: [
        "03_cast/prop_assignments.json",
        "actor_tracks[].prop_track",
        "motion_requirements.prop_socket_requirements",
        "rig_bindings[].sockets.prop_socket_primary"
      ],
      operatingRule: "Use prop sockets plus actor prop tracks as the authoritative attachment and reveal contract for hand-to-prop shots."
    },
    shot_compositing: {
      readinessCount: summary.compositing_ready_shot_count || 0,
      repoInputs: [
        "07_visuals/composition_guides/*.json",
        "07_visuals/art_direction/*.json",
        "return_requirements.required_files",
        "10_qc/hybrid_production_readiness_report.json"
      ],
      operatingRule: "Composite final acting shots against the exported composition guides, art direction, and benchmark governance rather than freeform scene assembly."
    },
    camera_control: {
      readinessCount: summary.camera_ready_shot_count || 0,
      repoInputs: [
        "performance_handoff.camera_recipe",
        "07_visuals/composition_guides/*.json",
        "07_shot_plans/shot_plan.json"
      ],
      operatingRule: "Translate the repo camera recipe directly into keyframed pushes, parallax, reframes, and inserts in the pro-tool stage."
    }
  };

  return Object.entries(capabilityMap).map(([capabilityId, capability]) => {
    const rule = mappingRules[capabilityId] || {
      readinessCount: 0,
      repoInputs: [],
      operatingRule: "No repo-side operating rule has been mapped yet."
    };
    return {
      capability_id: capabilityId,
      readiness_status: rule.readinessCount > 0 ? "mapped" : "missing_repo_coverage",
      mapped_shot_count: rule.readinessCount,
      primary_tool: capability.primary_tool || null,
      secondary_tool: capability.secondary_tool || null,
      workflow_summary: capability.workflow_summary || null,
      repo_inputs: rule.repoInputs,
      operating_rule: rule.operatingRule
    };
  });
}

function buildShotClassPlaybook({ summary = {}, toolchainProfile = {} }) {
  const shotClassCounts = safeObject(summary.shot_class_counts);
  const capabilityMap = safeObject(toolchainProfile.capability_map);
  const puppetTool = toolchainProfile.puppet_tool || null;
  const speechTool = toolchainProfile.speech_tool || null;
  const compositingTool = toolchainProfile.compositing_tool || null;
  const cameraTool = toolchainProfile.camera_tool || null;

  const rules = {
    closeup_face: {
      primary_tool: puppetTool,
      secondary_tool: speechTool,
      camera_tool: cameraTool,
      repo_inputs: ["mouth_socket", "mouth_shapes", "camera_recipe", "actor_tracks"],
      usage: "Use for hero speaking shots where lip sync, face acting, blink timing, and light camera movement carry the scene."
    },
    medium_single: {
      primary_tool: puppetTool,
      secondary_tool: compositingTool,
      camera_tool: cameraTool,
      repo_inputs: ["rig sockets", "gesture profiles", "prop tracks", "camera_recipe"],
      usage: "Use for single-character explainers, reveals, and pressure-building beats that need torso gestures and prop support."
    },
    medium_two_shot: {
      primary_tool: puppetTool,
      secondary_tool: compositingTool,
      camera_tool: cameraTool,
      repo_inputs: ["visible_character_ids", "actor_tracks", "camera_recipe", "prop tracks"],
      usage: "Use for dialogue or confrontation staging where timing between characters must stay readable."
    },
    establishing_wide: {
      primary_tool: compositingTool,
      secondary_tool: puppetTool,
      camera_tool: cameraTool,
      repo_inputs: ["composition guides", "art direction", "camera_recipe"],
      usage: "Use for scene-opening geography and atmosphere, with lighter puppet demands and stronger editorial camera polish."
    },
    document_insert: {
      primary_tool: compositingTool,
      secondary_tool: cameraTool,
      camera_tool: cameraTool,
      repo_inputs: ["composition guides", "art direction", "timing_windows"],
      usage: "Use for evidence graphics, document emphasis, and readable callout timing."
    },
    top_down_document: {
      primary_tool: compositingTool,
      secondary_tool: cameraTool,
      camera_tool: cameraTool,
      repo_inputs: ["composition guides", "timing_windows", "focus_target"],
      usage: "Use for overhead evidence boards, invoices, and timeline inserts that need controlled motion and readability."
    },
    push_in_document: {
      primary_tool: compositingTool,
      secondary_tool: cameraTool,
      camera_tool: cameraTool,
      repo_inputs: ["camera_recipe", "timing_windows", "art direction"],
      usage: "Use for dramatic document pushes where repo timing and camera intent should stay intact."
    }
  };

  return Object.entries(shotClassCounts).map(([shotClass, shotCount]) => {
    const rule = rules[shotClass] || {
      primary_tool: puppetTool,
      secondary_tool: compositingTool,
      camera_tool: cameraTool,
      repo_inputs: ["shot contract"],
      usage: "Use the exported shot contract as the source of truth for this shot class."
    };
    return {
      shot_class: shotClass,
      shot_count: shotCount,
      primary_tool: rule.primary_tool,
      secondary_tool: rule.secondary_tool,
      camera_tool: rule.camera_tool,
      repo_inputs: rule.repo_inputs,
      usage: rule.usage,
      quality_focus: capabilityMap.mouth_sync?.primary_tool && shotClass === "closeup_face"
        ? "speech readability and face acting"
        : shotClass.includes("document")
          ? "readability, timing, and camera emphasis"
          : "performance readability and editorial framing"
    };
  });
}

function buildOperatingModel({ exportManifest = {}, summary = {}, toolchainProfile = {} }) {
  return [
    {
      step: 1,
      name: "Import locked upstream package",
      owner: "repo -> pro toolchain",
      inputs: [
        "11_external_handoff/professional_export_lock/latest_export_lock_report.json",
        "11_external_handoff/professional_export_lock/latest_export_manifest.json"
      ],
      outcome: `Open the governed export package from '${exportManifest.export_id || "latest export"}' and keep benchmark scene '${summary.benchmark_scene_id || "n/a"}' as the quality anchor.`
    },
    {
      step: 2,
      name: "Build production puppets from repo packages",
      owner: toolchainProfile.puppet_tool || "professional puppet tool",
      inputs: [
        "07_visuals/character_refs/*/hybrid_identity_package.json",
        "07_visuals/shot_layers/*/layer_manifest.json",
        "07_visuals/character_rigs/*/rig.json"
      ],
      outcome: "Create reusable puppet setups that preserve repo identity locks, sockets, pose expectations, and continuity anchors."
    },
    {
      step: 3,
      name: "Bind speech, blink, gesture, and prop behavior",
      owner: toolchainProfile.speech_tool || toolchainProfile.puppet_tool || "professional speech/puppet layer",
      inputs: [
        "03_voice/voiceover_clean.wav",
        "03_voice/captions.srt",
        "03_voice/voice_timing.json",
        "08_animation/hybrid_contract/shots/*.json"
      ],
      outcome: "Use timing windows, mouth shapes, actor tracks, and prop tracks as the authoritative acting contract for speaking and reveal shots."
    },
    {
      step: 4,
      name: "Animate by shot class",
      owner: toolchainProfile.puppet_tool || "professional animation tool",
      inputs: [
        "performance_handoff.camera_recipe",
        "performance_handoff.actor_tracks",
        "motion_requirements",
        "07_visuals/composition_guides/*.json"
      ],
      outcome: "Handle closeups, medium singles, two-shots, and document inserts according to the shot-class playbook instead of ad hoc motion choices."
    },
    {
      step: 5,
      name: "Composite and camera-polish",
      owner: toolchainProfile.compositing_tool || "professional compositing tool",
      inputs: [
        "07_visuals/art_direction/*.json",
        "return_requirements",
        "benchmark guidance"
      ],
      outcome: "Apply overlays, inserts, subtitle-safe framing, and camera polish while holding to the benchmark scene intent."
    },
    {
      step: 6,
      name: "Return benchmark-safe deliverables to the repo",
      owner: "pro toolchain -> repo",
      inputs: [
        "rendered_shot",
        "alpha_or_matte_if_supported",
        "handoff_report metadata"
      ],
      outcome: "Return renders plus toolchain metadata so repo manifests, QC, and benchmark comparison can continue without ambiguity."
    }
  ];
}

function evaluateProfessionalToolchainMap(summary = {}, toolchainProfile = {}) {
  const blockers = [];
  const warnings = [];
  const capabilityAreas = Object.keys(safeObject(toolchainProfile.capability_map));

  if (summary.export_lock_decision !== "export_locked") {
    blockers.push("professional export lock is not complete");
  }
  if (!summary.toolchain_profile_id || !toolchainProfile.label) {
    blockers.push("professional toolchain profile is missing or unresolved");
  }
  if (capabilityAreas.length < 6) {
    blockers.push("toolchain profile does not map the full milestone capability set");
  }
  if (summary.shot_contract_count === 0 || summary.character_contract_count === 0) {
    blockers.push("hybrid contract package is missing the shot or character handoff layer");
  }
  if (summary.mouth_ready_shot_count === 0) {
    blockers.push("no speaking-shot mouth-sync coverage is available for the professional toolchain");
  }
  if (summary.puppet_ready_shot_count === 0) {
    blockers.push("no puppet-ready shot package is available for the professional toolchain");
  }
  if (summary.camera_ready_shot_count === 0) {
    blockers.push("camera recipes are missing from the professional handoff");
  }
  if (summary.compositing_ready_shot_count === 0) {
    blockers.push("professional return requirements do not yet guarantee composited shot outputs");
  }

  if (summary.benchmark_only_mode) {
    warnings.push("benchmark governance still keeps this route in benchmark-only mode rather than full default approval");
  }
  if (summary.prop_ready_shot_count === 0) {
    warnings.push("no prop-interaction-ready shots are currently mapped");
  }
  if ((summary.socket_coverage?.mouth_socket || 0) === 0) {
    warnings.push("mouth-socket coverage is thin, which weakens lip-sync confidence");
  }
  if ((summary.socket_coverage?.prop_socket_primary || 0) === 0) {
    warnings.push("prop-socket coverage is thin, which weakens dependable hand-to-prop contact");
  }
  if (summary.benchmark_default_decision && summary.benchmark_default_decision !== "approve_option2_as_default") {
    warnings.push(`benchmark governance currently records '${summary.benchmark_default_decision}' rather than full default approval`);
  }

  return {
    decision: blockers.length === 0 ? "toolchain_map_locked" : "incomplete_toolchain_map",
    blockers,
    warnings
  };
}

function buildProfessionalToolchainMapReport({
  topicId,
  mapId,
  toolchainProfileId,
  toolchainProfile = {},
  exportLockReport = {},
  exportManifest = {},
  hybridContract = {},
  productionReadiness = {}
}) {
  const summary = summarizeProfessionalToolchainInputs({
    exportLockReport,
    exportManifest,
    hybridContract,
    productionReadiness,
    toolchainProfileId,
    toolchainProfile
  });
  const gate = evaluateProfessionalToolchainMap(summary, toolchainProfile);

  return {
    topic_id: topicId,
    map_id: mapId,
    created_at: new Date().toISOString(),
    toolchain_profile: {
      profile_id: toolchainProfileId,
      label: toolchainProfile.label || null,
      puppet_tool: toolchainProfile.puppet_tool || null,
      speech_tool: toolchainProfile.speech_tool || null,
      compositing_tool: toolchainProfile.compositing_tool || null,
      camera_tool: toolchainProfile.camera_tool || null,
      best_for: safeArray(toolchainProfile.best_for)
    },
    source_export: {
      export_id: exportManifest.export_id || null,
      export_dir: exportManifest.export_dir || null,
      artifact_count: Number(exportManifest.artifact_count || 0)
    },
    summary,
    capability_mappings: buildCapabilityMappings({ summary, toolchainProfile }),
    shot_class_playbook: buildShotClassPlaybook({ summary, toolchainProfile }),
    operating_model: buildOperatingModel({ exportManifest, summary, toolchainProfile }),
    gate
  };
}

function buildProfessionalToolchainMapMarkdown(report = {}) {
  const lines = [
    "# Professional Toolchain Map Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Map id: ${report.map_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Decision: ${report.gate?.decision || "n/a"}`,
    `- Profile: ${report.toolchain_profile?.label || "n/a"}`,
    "",
    "## Summary",
    "",
    `- Export decision: ${report.summary?.export_lock_decision || "n/a"}`,
    `- Export artifacts: ${report.summary?.export_artifact_count ?? 0}`,
    `- Benchmark scene: ${report.summary?.benchmark_scene_id || "n/a"}`,
    `- Shot contracts: ${report.summary?.shot_contract_count ?? 0}`,
    `- Character contracts: ${report.summary?.character_contract_count ?? 0}`,
    `- Mouth-ready shots: ${report.summary?.mouth_ready_shot_count ?? 0}`,
    `- Puppet-ready shots: ${report.summary?.puppet_ready_shot_count ?? 0}`,
    `- Camera-ready shots: ${report.summary?.camera_ready_shot_count ?? 0}`,
    `- Prop-ready shots: ${report.summary?.prop_ready_shot_count ?? 0}`,
    "",
    "## Capability Mapping",
    ""
  ];

  for (const mapping of safeArray(report.capability_mappings)) {
    lines.push(`- ${mapping.capability_id}: ${mapping.primary_tool || "n/a"} -> ${mapping.readiness_status} (${mapping.mapped_shot_count} mapped shot(s))`);
  }

  lines.push("");
  lines.push("## Shot-Class Playbook");
  lines.push("");

  for (const shotClass of safeArray(report.shot_class_playbook)) {
    lines.push(`- ${shotClass.shot_class}: ${shotClass.primary_tool || "n/a"} (${shotClass.shot_count} shot(s))`);
  }

  lines.push("");
  lines.push("## Operating Model");
  lines.push("");

  for (const step of safeArray(report.operating_model)) {
    lines.push(`- Step ${step.step}: ${step.name} -> ${step.outcome}`);
  }

  lines.push("");
  lines.push("## Blockers");
  lines.push("");

  if (safeArray(report.gate?.blockers).length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of report.gate.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  lines.push("## Warnings");
  lines.push("");

  if (safeArray(report.gate?.warnings).length === 0) {
    lines.push("- None");
  } else {
    for (const warning of report.gate.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildProfessionalToolchainMapMarkdown,
  buildProfessionalToolchainMapReport,
  evaluateProfessionalToolchainMap,
  summarizeProfessionalToolchainInputs
};
