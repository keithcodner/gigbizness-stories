function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function summarizeProfessionalHeroSceneInputs({
  exportLockReport = {},
  toolchainMapReport = {},
  hybridEditorialReport = {},
  hybridContract = {},
  productionReadiness = {},
  voicePackage = {},
  musicPackage = {}
}) {
  const benchmarkSceneId =
    toolchainMapReport.summary?.benchmark_scene_id ||
    exportLockReport.benchmark_guidance?.benchmark_scene_id ||
    productionReadiness.benchmark_fixture?.benchmark_scene_id ||
    hybridEditorialReport.scene?.scene_id ||
    null;

  const shotContracts = safeArray(hybridContract.shot_contracts).length > 0
    ? safeArray(hybridContract.shot_contracts)
    : safeArray(hybridContract.shots);
  const heroShotContracts = shotContracts.filter((shot) => shot.scene_id === benchmarkSceneId);
  const editorialShots = safeArray(hybridEditorialReport.shots);

  let talkingShotCount = 0;
  let propInteractionShotCount = 0;
  let closeupShotCount = 0;
  let insertShotCount = 0;

  for (const shot of heroShotContracts) {
    if (shot.shot_class === "closeup_face") {
      closeupShotCount += 1;
    }
    if (String(shot.shot_class || "").includes("document")) {
      insertShotCount += 1;
    }

    const actorTracks = safeArray(shot.performance_handoff?.actor_tracks);
    if (actorTracks.some((track) => track.mouth_track)) {
      talkingShotCount += 1;
    }
    if (actorTracks.some((track) => Boolean(track.prop_track) || safeArray(track.prop_ids).length > 0)) {
      propInteractionShotCount += 1;
    }
  }

  return {
    benchmark_scene_id: benchmarkSceneId,
    export_lock_decision: exportLockReport.gate?.decision || null,
    toolchain_map_decision: toolchainMapReport.gate?.decision || null,
    benchmark_only_mode: toolchainMapReport.summary?.benchmark_only_mode === true,
    benchmark_default_decision: productionReadiness.decision?.decision || null,
    scene_shot_contract_count: heroShotContracts.length,
    editorial_shot_count: editorialShots.length,
    premium_motion_shot_count: Number(hybridEditorialReport.summary?.premium_motion_shots || 0),
    fallback_shot_count: Number(hybridEditorialReport.summary?.fallback_shots || 0),
    talking_shot_count: talkingShotCount,
    prop_interaction_shot_count: propInteractionShotCount,
    closeup_shot_count: closeupShotCount,
    insert_shot_count: insertShotCount,
    editorial_pacing: hybridEditorialReport.summary?.editorial_pacing || null,
    continuity_status: hybridEditorialReport.summary?.continuity_status || null,
    benchmark_status: hybridEditorialReport.summary?.benchmark_status || null,
    promotion_status: hybridEditorialReport.summary?.promotion_status || null,
    has_final_sequence: Boolean(hybridEditorialReport.final_sequence_file),
    has_voiceover_clean: Boolean(voicePackage.voiceover_clean),
    has_captions: Boolean(voicePackage.captions),
    has_voice_timing: Boolean(voicePackage.voice_timing),
    has_music_manifest: Boolean(musicPackage.music_manifest)
  };
}

function evaluateProfessionalHeroScene(summary = {}) {
  const blockers = [];
  const warnings = [];

  if (summary.export_lock_decision !== "export_locked") {
    blockers.push("professional export lock is not complete for the hero scene");
  }
  if (summary.toolchain_map_decision !== "toolchain_map_locked") {
    blockers.push("professional toolchain map is not locked for the hero scene");
  }
  if (!summary.benchmark_scene_id) {
    blockers.push("benchmark scene selection is missing");
  }
  if (summary.scene_shot_contract_count === 0) {
    blockers.push("no benchmark-scene shot contracts are available");
  }
  if (!summary.has_final_sequence) {
    blockers.push("no hero-scene sequence proof is available");
  }
  if (summary.premium_motion_shot_count === 0) {
    blockers.push("hero scene has no premium-motion shot proof");
  }
  if (!summary.has_voiceover_clean || !summary.has_captions || !summary.has_voice_timing) {
    blockers.push("hero scene audio or timing handoff is incomplete");
  }
  if (summary.talking_shot_count === 0) {
    blockers.push("hero scene does not include a talking-shot proof path");
  }
  if (summary.prop_interaction_shot_count === 0) {
    blockers.push("hero scene does not include prop-interaction proof");
  }
  if (summary.closeup_shot_count === 0) {
    blockers.push("hero scene lacks a closeup face shot");
  }
  if (summary.insert_shot_count === 0) {
    blockers.push("hero scene lacks an insert/document emphasis shot");
  }
  if (summary.fallback_shot_count > 0) {
    blockers.push("hero scene still contains fallback shots");
  }
  if (summary.benchmark_status !== "editorial_benchmark_ready") {
    blockers.push("hero scene benchmark proof is not editorial-benchmark ready");
  }

  if (summary.benchmark_only_mode) {
    warnings.push("benchmark governance still keeps this route in benchmark-only mode rather than full default approval");
  }
  if (!summary.has_music_manifest) {
    warnings.push("music handoff is still manual or unselected for the hero scene");
  }
  if (summary.promotion_status && summary.promotion_status !== "ready_for_finish") {
    warnings.push(`hero scene promotion status is '${summary.promotion_status}' rather than ready_for_finish`);
  }
  if (summary.benchmark_default_decision && summary.benchmark_default_decision !== "approve_option2_as_default") {
    warnings.push(`benchmark governance currently records '${summary.benchmark_default_decision}' rather than full default approval`);
  }

  return {
    decision: blockers.length === 0 ? "hero_scene_build_locked" : "incomplete_hero_scene_build",
    blockers,
    warnings
  };
}

function buildHeroShotChecklist(editorialShot = {}, shotContract = {}) {
  const shotClass = editorialShot.shot_class || shotContract.shot_class || "unknown";
  const checks = [];

  if (shotClass === "closeup_face") {
    checks.push("speech readability holds through the full line");
    checks.push("blink and face-acting read intentionally");
    checks.push("camera push supports the performance instead of distracting from it");
  } else if (shotClass === "medium_single" || shotClass === "medium_two_shot") {
    checks.push("gesture timing supports the narration beat");
    checks.push("prop contact feels anchored to the hand socket");
    checks.push("screen direction remains stable through pose changes");
  } else if (shotClass.includes("document")) {
    checks.push("insert remains readable without pausing the narrative flow");
    checks.push("camera emphasis lands on the correct evidence beat");
    checks.push("document overlays remain subtitle-safe");
  } else if (shotClass === "establishing_wide") {
    checks.push("scene geography reads immediately");
    checks.push("camera move adds pressure without flattening depth");
    checks.push("hero-scene entry frame matches the benchmark tone");
  } else {
    checks.push("shot reads clearly against the benchmark scene intent");
  }

  return checks;
}

function buildProfessionalHeroSceneReport({
  topicId,
  buildId,
  exportLockReport = {},
  toolchainMapReport = {},
  hybridEditorialReport = {},
  hybridContract = {},
  productionReadiness = {},
  voicePackage = {},
  musicPackage = {}
}) {
  const summary = summarizeProfessionalHeroSceneInputs({
    exportLockReport,
    toolchainMapReport,
    hybridEditorialReport,
    hybridContract,
    productionReadiness,
    voicePackage,
    musicPackage
  });
  const gate = evaluateProfessionalHeroScene(summary);
  const benchmarkSceneId = summary.benchmark_scene_id;
  const shotContracts = safeArray(hybridContract.shot_contracts).length > 0
    ? safeArray(hybridContract.shot_contracts)
    : safeArray(hybridContract.shots);
  const contractByShotId = Object.fromEntries(
    shotContracts
      .filter((shot) => shot.scene_id === benchmarkSceneId)
      .map((shot) => [shot.shot_id, shot])
  );

  return {
    topic_id: topicId,
    build_id: buildId,
    created_at: new Date().toISOString(),
    benchmark_scene: {
      scene_id: benchmarkSceneId,
      scene_title:
        hybridEditorialReport.scene?.scene_title ||
        exportLockReport.benchmark_guidance?.benchmark_scene_title ||
        productionReadiness.benchmark_fixture?.benchmark_scene_title ||
        null
    },
    summary,
    hero_sequence: {
      final_sequence_file: hybridEditorialReport.final_sequence_file || null,
      audio_mix_strategy: safeObject(hybridEditorialReport.summary?.audio_mix_strategy),
      subtitle_safe_region: safeObject(hybridEditorialReport.summary?.subtitle_safe_region)
    },
    shot_builds: safeArray(hybridEditorialReport.shots).map((shot) => {
      const contract = contractByShotId[shot.shot_id] || {};
      return {
        shot_id: shot.shot_id,
        shot_class: shot.shot_class,
        editorial_role: shot.editorial_role || null,
        proof_clip_file: shot.proof_clip_file || null,
        poster_file: shot.poster_file || null,
        camera_recipe: safeObject(shot.camera_recipe),
        motion_directives: safeArray(shot.motion_directives),
        prop_tracks: safeArray(contract.performance_handoff?.actor_tracks)
          .map((track) => track.prop_track)
          .filter(Boolean),
        acceptance_checks: buildHeroShotChecklist(shot, contract)
      };
    }),
    build_steps: [
      "Lock the benchmark scene and keep the governed export package as the upstream source of truth.",
      "Build or update professional puppets only for the benchmark scene cast and props.",
      "Animate the speaking and performance shots first, then complete insert and evidence shots.",
      "Composite the benchmark scene with subtitle-safe framing, overlays, and editorial camera polish.",
      "Compare the returned hero scene against the benchmark checklist before promoting it deeper into the repo."
    ],
    acceptance_checklist: [
      "closeup speech reads clearly with mouth movement",
      "prop interaction feels intentional rather than implied",
      "document inserts remain readable at playback speed",
      "scene pacing stays balanced from entry to exit",
      "voiceover and scene timing feel editorially synchronized",
      "the full benchmark scene reads as animated performance rather than a slideshow"
    ],
    gate
  };
}

function buildProfessionalHeroSceneMarkdown(report = {}) {
  const lines = [
    "# Professional Hero Scene Build Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Build id: ${report.build_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Decision: ${report.gate?.decision || "n/a"}`,
    `- Benchmark scene: ${report.benchmark_scene?.scene_id || "n/a"} ${report.benchmark_scene?.scene_title ? `- ${report.benchmark_scene.scene_title}` : ""}`,
    "",
    "## Summary",
    "",
    `- Shot contracts in scene: ${report.summary?.scene_shot_contract_count ?? 0}`,
    `- Editorial proof shots: ${report.summary?.editorial_shot_count ?? 0}`,
    `- Premium-motion shots: ${report.summary?.premium_motion_shot_count ?? 0}`,
    `- Talking shots: ${report.summary?.talking_shot_count ?? 0}`,
    `- Prop-interaction shots: ${report.summary?.prop_interaction_shot_count ?? 0}`,
    `- Closeup shots: ${report.summary?.closeup_shot_count ?? 0}`,
    `- Insert shots: ${report.summary?.insert_shot_count ?? 0}`,
    `- Benchmark status: ${report.summary?.benchmark_status || "n/a"}`,
    `- Promotion status: ${report.summary?.promotion_status || "n/a"}`,
    "",
    "## Build Steps",
    ""
  ];

  for (const step of safeArray(report.build_steps)) {
    lines.push(`- ${step}`);
  }

  lines.push("");
  lines.push("## Acceptance Checklist");
  lines.push("");

  for (const item of safeArray(report.acceptance_checklist)) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Hero Shots");
  lines.push("");

  for (const shot of safeArray(report.shot_builds)) {
    lines.push(`- ${shot.shot_id}: ${shot.shot_class} / ${shot.editorial_role || "n/a"}`);
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
  buildProfessionalHeroSceneMarkdown,
  buildProfessionalHeroSceneReport,
  evaluateProfessionalHeroScene,
  summarizeProfessionalHeroSceneInputs
};
