function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildApprovalChecklist(approvalFocus = []) {
  const checklist = [];
  const seen = new Set();
  const mapping = {
    identity_lock: "character identity stays on-model and readable",
    thumbnail_style_match: "frame quality still matches the premium bricktoon benchmark",
    expression_variant_coverage: "expressions stay readable enough for acting or reaction beats",
    prop_continuity: "prop presence and hand contact remain stable",
    hybrid_handoff_readiness: "the shot can still support hybrid finishing without manual rescue"
  };

  for (const focus of approvalFocus) {
    const line = mapping[focus];
    if (line && !seen.has(line)) {
      checklist.push(line);
      seen.add(line);
    }
  }

  if (!seen.has("mouth motion reads clearly on speaking shots")) {
    checklist.push("mouth motion reads clearly on speaking shots");
  }
  if (!seen.has("camera framing stays readable for subtitles and proof beats")) {
    checklist.push("camera framing stays readable for subtitles and proof beats");
  }

  return checklist;
}

function summarizeStillBenchmark(pack = {}) {
  const coverage = pack.coverage || {};
  const shotClassesCovered = Number(coverage.shot_classes_covered || 0);
  const approvedShots = Number(coverage.shots_with_approved_keyframes || 0);
  const approvalFocus = safeArray(pack.benchmark_profile?.approval_focus);
  return {
    ready: shotClassesCovered >= 5 && approvedShots > 0,
    shot_classes_covered: shotClassesCovered,
    approved_shot_count: approvedShots,
    approval_focus: approvalFocus,
    checklist: buildApprovalChecklist(approvalFocus)
  };
}

function buildScenePromotionDecisions({
  sceneSequenceReport = {},
  renderContract = {},
  editorialReport = {}
}) {
  const renderScenes = safeArray(renderContract.scenes);
  const sequenceLookup = new Map(
    safeArray(sceneSequenceReport.scenes).map((scene) => [scene.scene_id, scene])
  );
  const benchmarkSceneId = editorialReport.scene?.scene_id || null;
  const editorialReady = editorialReport.summary?.benchmark_status === "editorial_benchmark_ready";

  return renderScenes.map((scene) => {
    const sequenceScene = sequenceLookup.get(scene.scene_id) || {};
    const fallbackShots = Number(sequenceScene.fallback_shots ?? scene.shot_source_breakdown?.fallback_shots ?? 0);
    const premiumMotionShots = Number(sequenceScene.premium_motion_shots ?? scene.shot_source_breakdown?.premium_motion_shots ?? 0);
    const continuityStatus = sequenceScene.continuity_status || scene.continuity_status || "fragile";
    const promotionStatus = sequenceScene.promotion_status || scene.promotion_status || "hold_for_polish";
    const isBenchmarkScene = benchmarkSceneId === scene.scene_id;
    const benchmarkOverride = isBenchmarkScene && editorialReady;

    let decision = "rework_required";
    const reasons = [];
    const nextActions = [];

    if (benchmarkOverride) {
      decision = "promote_to_hybrid_finish";
      reasons.push("benchmark editorial sequence cleared the Phase 4 scene-quality gate");
      reasons.push(`editorial report marked the scene ${editorialReport.summary?.benchmark_status || "ready"}`);
      nextActions.push("use this scene as the benchmark hybrid-finish candidate");
      nextActions.push("compare future scenes against this benchmark before approving finish");
    } else if (promotionStatus === "ready_for_finish" && continuityStatus !== "fragile" && fallbackShots <= 1) {
      decision = "promote_to_hybrid_finish";
      reasons.push("sequence report already marks the scene ready for finish");
      reasons.push(`fallback pressure is acceptable at ${fallbackShots} fallback shot(s)`);
      nextActions.push("allow this scene to advance to premium finishing");
    } else if (promotionStatus === "review_before_finish") {
      decision = "review_required";
      reasons.push("sequence report still requires human review before finish");
      reasons.push(`continuity is ${continuityStatus}`);
      nextActions.push("review the preview against the benchmark editorial scene");
      nextActions.push("only promote after identity, motion, and prop readability pass review");
    } else {
      reasons.push("scene is still marked hold_for_polish");
      reasons.push(`fallback pressure remains at ${fallbackShots} fallback shot(s)`);
      nextActions.push("rework still quality, motion quality, or both before spending more finish time");
      nextActions.push("do not promote this scene into premium finishing yet");
    }

    return {
      scene_id: scene.scene_id,
      title: scene.title || null,
      is_benchmark_scene: isBenchmarkScene,
      promotion_status: promotionStatus,
      continuity_status: continuityStatus,
      premium_motion_shots: premiumMotionShots,
      fallback_shots: fallbackShots,
      decision,
      reasons,
      next_actions: nextActions
    };
  });
}

function runtimeTierRecommendation(runtimeProfile = {}, gate = {}, sceneDecisions = []) {
  if (gate.topic_wide_ready) {
    return runtimeProfile.profile_id || "gtx1080_overnight_finish_draft";
  }
  if (sceneDecisions.some((scene) => scene.decision === "promote_to_hybrid_finish")) {
    return "gtx1080_premium_preview";
  }
  return "gtx1080_preview";
}

function evaluateHybridPromotionGate({
  stillBenchmark = {},
  previewReport = {},
  editorialReport = {},
  visualReadiness = {},
  runtimeProfile = {},
  sceneDecisions = []
}) {
  const blockers = [];
  const warnings = [];
  const promotedScenes = sceneDecisions.filter((scene) => scene.decision === "promote_to_hybrid_finish");
  const reviewScenes = sceneDecisions.filter((scene) => scene.decision === "review_required");
  const reworkScenes = sceneDecisions.filter((scene) => scene.decision === "rework_required");
  const previewExists = Boolean(previewReport.output_file);
  const stillBenchmarkReady = Boolean(stillBenchmark.ready);
  const editorialReady = editorialReport.summary?.benchmark_status === "editorial_benchmark_ready";
  const unresolvedHighPriority = Number(visualReadiness.unresolved_high_priority_count || 0);
  const unresolvedAllowance = Number(runtimeProfile.max_unresolved_high_priority || 0);

  if (!previewExists) {
    blockers.push("visual preview is missing");
  }
  if (!stillBenchmarkReady) {
    blockers.push("still benchmark pack is not ready enough to support approval");
  }
  if (!editorialReady) {
    blockers.push("benchmark editorial scene has not cleared the sequence-quality gate");
  }
  if (unresolvedHighPriority > unresolvedAllowance) {
    blockers.push(`unresolved high-priority assets exceed preview-gate allowance (${unresolvedHighPriority} > ${unresolvedAllowance})`);
  }
  if (promotedScenes.length === 0) {
    blockers.push("no scenes cleared the promotion gate");
  }

  if (reviewScenes.length > 0) {
    warnings.push(`${reviewScenes.length} scene(s) still require human review before promotion`);
  }
  if (reworkScenes.length > 0) {
    warnings.push(`${reworkScenes.length} scene(s) still require rework before topic-wide promotion`);
  }

  const selectedSceneReady = promotedScenes.length > 0 && previewExists && stillBenchmarkReady && editorialReady;
  const topicWideReady = selectedSceneReady && reviewScenes.length === 0 && reworkScenes.length === 0 && unresolvedHighPriority <= unresolvedAllowance;

  let decision = "blocked_for_rework";
  if (topicWideReady) {
    decision = "approved_for_topic_promotion";
  } else if (selectedSceneReady) {
    decision = "approved_for_selected_scene_promotion";
  } else if (reviewScenes.length > 0) {
    decision = "review_required_before_promotion";
  }

  return {
    decision,
    preview_exists: previewExists,
    still_benchmark_ready: stillBenchmarkReady,
    editorial_benchmark_ready: editorialReady,
    selected_scene_ready: selectedSceneReady,
    topic_wide_ready: topicWideReady,
    promoted_scene_count: promotedScenes.length,
    review_scene_count: reviewScenes.length,
    rework_scene_count: reworkScenes.length,
    unresolved_high_priority_count: unresolvedHighPriority,
    blockers,
    warnings,
    runtime_tier_recommendation: runtimeTierRecommendation(runtimeProfile, { topic_wide_ready: topicWideReady }, sceneDecisions)
  };
}

function buildHybridPromotionGateReport({
  topicId,
  runtimeProfile = {},
  stillBenchmarkPack = {},
  previewReport = {},
  editorialReport = {},
  sceneSequenceReport = {},
  renderContract = {},
  visualReadiness = {}
}) {
  const stillBenchmark = summarizeStillBenchmark(stillBenchmarkPack);
  const sceneDecisions = buildScenePromotionDecisions({
    sceneSequenceReport,
    renderContract,
    editorialReport
  });
  const gate = evaluateHybridPromotionGate({
    stillBenchmark,
    previewReport,
    editorialReport,
    visualReadiness,
    runtimeProfile,
    sceneDecisions
  });

  return {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    runtime_profile: {
      profile_id: runtimeProfile.profile_id || null,
      label: runtimeProfile.label || null,
      intended_flow: runtimeProfile.intended_flow || null
    },
    still_benchmark: stillBenchmark,
    preview: {
      output_file: previewReport.output_file || null,
      scene_count: safeArray(previewReport.scenes).length,
      frame_count: Number(previewReport.frame_count || 0),
      voiceover_used: Boolean(previewReport.voiceover_used),
      music_used: Boolean(previewReport.music_used)
    },
    benchmark_editorial_scene: {
      scene_id: editorialReport.scene?.scene_id || null,
      title: editorialReport.scene?.scene_title || null,
      benchmark_status: editorialReport.summary?.benchmark_status || null,
      promotion_status: editorialReport.summary?.promotion_status || null,
      continuity_status: editorialReport.summary?.continuity_status || null
    },
    gate,
    scene_decisions: sceneDecisions,
    human_checkpoint: {
      checklist: stillBenchmark.checklist,
      approval_language: gate.decision === "approved_for_topic_promotion"
        ? "The topic is approved to advance toward premium finishing."
        : gate.decision === "approved_for_selected_scene_promotion"
          ? "Only the benchmark-approved scene should advance; the full topic is not yet promoted."
          : "Do not advance the topic to premium finishing yet.",
      review_focus: [
        "weak hands or unreadable contact zones",
        "weak mouth motion on speaking beats",
        "prop drift or missing proof emphasis",
        "identity drift against the benchmark still pack"
      ]
    }
  };
}

function buildHybridPromotionMarkdown(report = {}) {
  const lines = [
    "# Hybrid Promotion Gate Report",
    "",
    `- Topic: ${report.topic_id}`,
    `- Generated: ${report.created_at}`,
    `- Runtime profile: ${report.runtime_profile.profile_id || "n/a"}`,
    `- Decision: ${report.gate?.decision || "n/a"}`,
    `- Selected-scene ready: ${report.gate?.selected_scene_ready ? "yes" : "no"}`,
    `- Topic-wide ready: ${report.gate?.topic_wide_ready ? "yes" : "no"}`,
    `- Runtime recommendation: ${report.gate?.runtime_tier_recommendation || "n/a"}`,
    "",
    "## Benchmark Scene",
    "",
    `- Scene: ${report.benchmark_editorial_scene?.scene_id || "n/a"}`,
    `- Title: ${report.benchmark_editorial_scene?.title || "n/a"}`,
    `- Benchmark status: ${report.benchmark_editorial_scene?.benchmark_status || "n/a"}`,
    `- Promotion status: ${report.benchmark_editorial_scene?.promotion_status || "n/a"}`,
    `- Continuity status: ${report.benchmark_editorial_scene?.continuity_status || "n/a"}`,
    "",
    "## Human Checkpoint",
    ""
  ];

  for (const item of safeArray(report.human_checkpoint?.checklist)) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push(`Approval language: ${report.human_checkpoint?.approval_language || "n/a"}`);
  lines.push("");
  lines.push("## Scene Decisions");
  lines.push("");

  for (const scene of safeArray(report.scene_decisions)) {
    lines.push(`### ${scene.scene_id}`);
    lines.push("");
    lines.push(`- Decision: ${scene.decision}`);
    lines.push(`- Promotion status: ${scene.promotion_status}`);
    lines.push(`- Continuity: ${scene.continuity_status}`);
    lines.push(`- Premium motion shots: ${scene.premium_motion_shots}`);
    lines.push(`- Fallback shots: ${scene.fallback_shots}`);
    lines.push(`- Benchmark scene: ${scene.is_benchmark_scene ? "yes" : "no"}`);
    lines.push("");
  }

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
  buildHybridPromotionGateReport,
  buildHybridPromotionMarkdown,
  buildScenePromotionDecisions,
  evaluateHybridPromotionGate,
  summarizeStillBenchmark
};
