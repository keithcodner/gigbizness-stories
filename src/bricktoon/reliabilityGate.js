const fs = require("fs");
const path = require("path");

function safeReadJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function loadRuntimeProfiles(rootDir) {
  const configPath = path.join(rootDir, "config", "bricktoon_runtime_profiles.json");
  return safeReadJson(configPath, { default_profile: "gtx1080_preview", profiles: {} });
}

function resolveRuntimeProfile(config, profileId) {
  const selectedId = profileId || config.default_profile;
  const profile = config.profiles?.[selectedId];
  if (!profile) {
    throw new Error(`Unknown bricktoon runtime profile: ${selectedId}`);
  }
  return {
    profile_id: selectedId,
    ...profile
  };
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPromotedSceneIds(promotionGate = {}) {
  const promoted = safeArray(promotionGate.scene_decisions)
    .filter((scene) => scene.decision === "promote_to_hybrid_finish")
    .map((scene) => scene.scene_id)
    .filter(Boolean);
  if (promoted.length > 0) {
    return promoted;
  }

  const benchmarkSceneId = promotionGate.benchmark_editorial_scene?.scene_id || null;
  return benchmarkSceneId ? [benchmarkSceneId] : [];
}

function normalizeScopedSceneRecord(sequenceScene = {}, renderScene = {}) {
  const renderAssetType = renderScene.selected_asset_type || null;
  const renderQuality = renderScene.asset_quality_classification || null;
  const sequencePremium = Number(sequenceScene.premium_motion_shots ?? renderScene.shot_source_breakdown?.premium_motion_shots ?? 0);
  const sequenceFallback = Number(sequenceScene.fallback_shots ?? renderScene.shot_source_breakdown?.fallback_shots ?? 0);
  const totalShots = Math.max(sequencePremium + sequenceFallback, 1);

  if (renderAssetType === "professional_hero_scene_sequence" || (renderAssetType === "professional_hero_scene_sequence" && renderQuality === "premium_motion")) {
    return {
      scene_id: renderScene.scene_id || sequenceScene.scene_id || null,
      continuity_status: "locked",
      promotion_status: "ready_for_finish",
      premium_motion_shots: totalShots,
      fallback_shots: 0,
      continuity_notes: [
        "benchmark imported professional scene selected in render contract",
        `${totalShots} premium motion shot(s) represented by approved benchmark sequence`
      ]
    };
  }

  return {
    scene_id: renderScene.scene_id || sequenceScene.scene_id || null,
    continuity_status: sequenceScene.continuity_status || renderScene.continuity_status || "fragile",
    promotion_status: sequenceScene.promotion_status || renderScene.promotion_status || "hold_for_polish",
    premium_motion_shots: sequencePremium,
    fallback_shots: sequenceFallback,
    continuity_notes: safeArray(sequenceScene.continuity_notes)
  };
}

function buildScopedSceneRecords({
  sceneSequenceReport = {},
  renderContract = {},
  promotionGate = {},
  scope = "topic"
}) {
  const sequenceLookup = new Map(
    safeArray(sceneSequenceReport.scenes).map((scene) => [scene.scene_id, scene])
  );
  const renderLookup = new Map(
    safeArray(renderContract.scenes).map((scene) => [scene.scene_id, scene])
  );

  let sceneIds = Array.from(new Set([
    ...sequenceLookup.keys(),
    ...renderLookup.keys()
  ]));
  if (scope === "benchmark_selected") {
    sceneIds = getPromotedSceneIds(promotionGate);
  }

  return sceneIds.map((sceneId) => normalizeScopedSceneRecord(
    sequenceLookup.get(sceneId) || { scene_id: sceneId },
    renderLookup.get(sceneId) || { scene_id: sceneId }
  ));
}

function summarizeSequenceHealth(scenes = []) {
  const totalScenes = scenes.length;
  const fragileScenes = scenes.filter((scene) => scene.continuity_status === "fragile").length;
  const reviewScenes = scenes.filter((scene) => scene.promotion_status === "review_before_finish").length;
  const holdScenes = scenes.filter((scene) => scene.promotion_status === "hold_for_polish").length;
  const premiumMotionShots = scenes.reduce((sum, scene) => sum + Number(scene.premium_motion_shots || 0), 0);
  const fallbackShots = scenes.reduce((sum, scene) => sum + Number(scene.fallback_shots || 0), 0);
  return {
    total_scenes: totalScenes,
    fragile_scenes: fragileScenes,
    review_scenes: reviewScenes,
    hold_scenes: holdScenes,
    premium_motion_shots: premiumMotionShots,
    fallback_shots: fallbackShots,
    fallback_ratio: ratio(fallbackShots, premiumMotionShots + fallbackShots),
    fragile_scene_ratio: ratio(fragileScenes, totalScenes)
  };
}

function summarizeReadinessInputs({
  machineProfile = {},
  runtimeProfile = {},
  visualPreviewExists = false,
  sceneSequenceReport = {},
  renderContract = {},
  finalApprovalText = "",
  visualReadiness = {},
  promotionGate = {},
  scope = "topic"
}) {
  const scopedScenes = buildScopedSceneRecords({
    sceneSequenceReport,
    renderContract,
    promotionGate,
    scope
  });
  const scopedSceneIds = scopedScenes.map((scene) => scene.scene_id).filter(Boolean);
  const sequenceHealth = summarizeSequenceHealth(scopedScenes);
  const renderScenes = scope === "benchmark_selected"
    ? safeArray(renderContract.scenes).filter((scene) => scopedSceneIds.includes(scene.scene_id)).length
    : safeArray(renderContract.scenes).length;
  const promotionGateState = promotionGate.gate || {};
  return {
    scope,
    scoped_scene_ids: scopedSceneIds,
    machine_target: runtimeProfile.machine_target || null,
    machine_gpu: machineProfile.gpu?.model || null,
    preview_exists: visualPreviewExists,
    sequence_reports_ready: sequenceHealth.total_scenes > 0,
    render_contract_ready: renderScenes > 0,
    promotion_gate_ready: ["approved_for_topic_promotion", "approved_for_selected_scene_promotion"].includes(promotionGateState.decision || ""),
    benchmark_scene_ready: Boolean(promotionGateState.selected_scene_ready),
    promoted_scene_count: Number(promotionGateState.promoted_scene_count || 0),
    qc_approved: String(finalApprovalText || "").startsWith("APPROVED"),
    unresolved_high_priority_count: Number(visualReadiness.unresolved_high_priority_count || 0),
    total_scenes: sequenceHealth.total_scenes,
    fragile_scenes: sequenceHealth.fragile_scenes,
    review_scenes: sequenceHealth.review_scenes,
    hold_scenes: sequenceHealth.hold_scenes,
    premium_motion_shots: sequenceHealth.premium_motion_shots,
    fallback_shots: sequenceHealth.fallback_shots,
    fallback_ratio: Number(sequenceHealth.fallback_ratio.toFixed(3)),
    fragile_scene_ratio: Number(sequenceHealth.fragile_scene_ratio.toFixed(3))
  };
}

function evaluateReliabilityGate(runtimeProfile, readiness) {
  const blockers = [];
  const warnings = [];

  if (runtimeProfile.require_preview && !readiness.preview_exists) {
    blockers.push("visual preview is missing");
  }
  if (runtimeProfile.require_sequence_reports && !readiness.sequence_reports_ready) {
    blockers.push("scene sequence report is missing or empty");
  }
  if (runtimeProfile.require_render_contract && !readiness.render_contract_ready) {
    blockers.push("render contract is missing or empty");
  }
  if (runtimeProfile.require_promotion_gate && !readiness.promotion_gate_ready) {
    blockers.push("hybrid promotion gate has not approved the topic or benchmark scene");
  }
  if (runtimeProfile.require_qc_approval && !readiness.qc_approved) {
    blockers.push("QC final approval is missing");
  }
  if (readiness.hold_scenes > 0) {
    blockers.push(`${readiness.hold_scenes} scene(s) are still marked hold_for_polish`);
  }
  if (readiness.unresolved_high_priority_count > Number(runtimeProfile.max_unresolved_high_priority || 0)) {
    blockers.push(`unresolved high-priority assets exceed profile allowance (${readiness.unresolved_high_priority_count} > ${runtimeProfile.max_unresolved_high_priority})`);
  }
  if (readiness.fallback_ratio > Number(runtimeProfile.max_fallback_ratio || 1)) {
    blockers.push(`fallback ratio exceeds profile allowance (${readiness.fallback_ratio} > ${runtimeProfile.max_fallback_ratio})`);
  }
  if (readiness.fragile_scene_ratio > Number(runtimeProfile.max_fragile_scene_ratio || 1)) {
    blockers.push(`fragile scene ratio exceeds profile allowance (${readiness.fragile_scene_ratio} > ${runtimeProfile.max_fragile_scene_ratio})`);
  }

  if (readiness.review_scenes > 0) {
    const reviewMessage = `${readiness.review_scenes} scene(s) still require human review before finish`;
    if (runtimeProfile.allow_review_required_finish) {
      warnings.push(reviewMessage);
    } else {
      blockers.push(reviewMessage);
    }
  }
  if (readiness.benchmark_scene_ready && !readiness.promotion_gate_ready) {
    warnings.push("benchmark scene is ready, but the full promotion gate still blocks topic-wide finishing");
  }

  let decision = "blocked";
  if (blockers.length === 0) {
    decision = runtimeProfile.require_qc_approval
      ? "ready_for_final_export"
      : "ready_for_overnight_finish";
  } else if (
    blockers.length === 1
    && blockers[0].includes("human review")
    && runtimeProfile.intended_flow !== "overnight_finish"
  ) {
    decision = "review_required";
  }

  return { decision, blockers, warnings };
}

function buildReliabilityReport({
  topicId,
  runtimeProfile,
  machineProfile,
  sceneSequenceReport,
  renderContract,
  promotionGate,
  visualReadiness,
  visualPreviewExists,
  finalApprovalText,
  scope = "topic"
}) {
  const readiness = summarizeReadinessInputs({
    machineProfile,
    runtimeProfile,
    visualPreviewExists,
    sceneSequenceReport,
    renderContract,
    finalApprovalText,
    visualReadiness,
    promotionGate,
    scope
  });
  const gate = evaluateReliabilityGate(runtimeProfile, readiness);

  return {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    runtime_profile: runtimeProfile,
    machine_profile: {
      gpu_model: machineProfile.gpu?.model || null,
      vram_gb: machineProfile.gpu?.vram_gb || null,
      preferred_encoding: machineProfile.gpu?.preferred_encoding || null,
      overnight_mode: Boolean(machineProfile.overnight_mode)
    },
    readiness,
    gate
  };
}

function summarizeOvernightState(overnightState = {}, reliabilityReport = {}) {
  if (!overnightState || Object.keys(overnightState).length === 0) {
    return {
      status: "not_started",
      completed_step_count: 0,
      last_reliability_decision: reliabilityReport.gate?.decision || null,
      resumable: false,
      summary: "no overnight run state has been recorded yet"
    };
  }

  const completedSteps = safeArray(overnightState.completed_steps);
  const stepHistory = safeArray(overnightState.step_history);
  const failedSteps = stepHistory.filter((entry) => entry.status === "failed").length;
  const blockedSteps = stepHistory.filter((entry) => entry.status === "blocked").length;
  const resumedCount = Number(overnightState.resume_count || 0);
  const runCount = Number(overnightState.run_count || 0);
  const currentStep = overnightState.current_step || null;
  const status = overnightState.status || (overnightState.completed_at ? "completed" : "partial");
  const lastDecision = overnightState.last_reliability_decision || reliabilityReport.gate?.decision || null;
  const resumable = ["blocked", "failed", "running", "partial"].includes(status);

  let summary = `overnight state exists with ${completedSteps.length} completed step(s)`;
  if (status === "completed") {
    summary = `overnight run completed after ${runCount || 1} run(s) and ${resumedCount} resume attempt(s)`;
  } else if (status === "blocked") {
    summary = `overnight run blocked at ${currentStep || "unknown_step"} with ${completedSteps.length} completed step(s)`;
  } else if (status === "failed") {
    summary = `overnight run failed at ${currentStep || "unknown_step"} with ${failedSteps} failed step event(s) recorded`;
  } else if (status === "running") {
    summary = `overnight run is currently at ${currentStep || "unknown_step"}`;
  }

  return {
    status,
    completed_step_count: completedSteps.length,
    completed_steps: completedSteps,
    current_step: currentStep,
    blocked: Boolean(overnightState.blocked),
    blocked_reason: overnightState.blocked_reason || null,
    last_error: overnightState.last_error || null,
    last_reliability_decision: lastDecision,
    run_count: runCount,
    resume_count: resumedCount,
    failed_step_events: failedSteps,
    blocked_step_events: blockedSteps,
    step_history_count: stepHistory.length,
    resumable,
    summary
  };
}

function buildOvernightRunReport({
  topicId,
  runtimeProfile,
  machineProfile = {},
  reliabilityReport = {},
  overnightState = {}
}) {
  return {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    runtime_profile: runtimeProfile,
    machine_profile: {
      gpu_model: machineProfile.gpu?.model || null,
      vram_gb: machineProfile.gpu?.vram_gb || null,
      preferred_encoding: machineProfile.gpu?.preferred_encoding || null,
      overnight_mode: Boolean(machineProfile.overnight_mode)
    },
    overnight_state: summarizeOvernightState(overnightState, reliabilityReport),
    reliability_gate: {
      decision: reliabilityReport.gate?.decision || null,
      blocker_count: safeArray(reliabilityReport.gate?.blockers).length,
      warning_count: safeArray(reliabilityReport.gate?.warnings).length,
      blockers: safeArray(reliabilityReport.gate?.blockers),
      warnings: safeArray(reliabilityReport.gate?.warnings)
    }
  };
}

function buildReliabilityMarkdown(report) {
  const lines = [
    "# Bricktoon Reliability Report",
    "",
    `- Topic: ${report.topic_id}`,
    `- Profile: ${report.runtime_profile.profile_id}`,
    `- Decision: ${report.gate.decision}`,
    `- Generated: ${report.created_at}`,
    "",
    "## Readiness",
    "",
    `- Scope: ${report.readiness.scope || "topic"}`,
    `- Scoped scenes: ${safeArray(report.readiness.scoped_scene_ids).join(", ") || "all"}`,
    `- Preview exists: ${report.readiness.preview_exists ? "yes" : "no"}`,
    `- Sequence reports ready: ${report.readiness.sequence_reports_ready ? "yes" : "no"}`,
    `- Render contract ready: ${report.readiness.render_contract_ready ? "yes" : "no"}`,
    `- Promotion gate ready: ${report.readiness.promotion_gate_ready ? "yes" : "no"}`,
    `- Benchmark scene ready: ${report.readiness.benchmark_scene_ready ? "yes" : "no"}`,
    `- Promoted scenes: ${report.readiness.promoted_scene_count}`,
    `- QC approved: ${report.readiness.qc_approved ? "yes" : "no"}`,
    `- Unresolved high-priority assets: ${report.readiness.unresolved_high_priority_count}`,
    `- Fallback ratio: ${report.readiness.fallback_ratio}`,
    `- Fragile scene ratio: ${report.readiness.fragile_scene_ratio}`,
    `- Review scenes: ${report.readiness.review_scenes}`,
    `- Hold scenes: ${report.readiness.hold_scenes}`,
    "",
    "## Blockers",
    ""
  ];

  if (report.gate.blockers.length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of report.gate.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  lines.push("## Warnings");
  lines.push("");

  if (report.gate.warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of report.gate.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push("");
  lines.push("## GTX 1080 Runtime Policy");
  lines.push("");
  lines.push(`- Max parallel motion jobs: ${report.runtime_profile.runtime_policy?.max_parallel_motion_jobs ?? "n/a"}`);
  lines.push(`- Max parallel keyframe jobs: ${report.runtime_profile.runtime_policy?.max_parallel_keyframe_jobs ?? "n/a"}`);
  lines.push(`- Recommended window: ${report.runtime_profile.runtime_policy?.recommended_window ?? "n/a"}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildOvernightRunMarkdown(report = {}) {
  const lines = [
    "# Bricktoon Overnight Run Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Profile: ${report.runtime_profile?.profile_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Overnight status: ${report.overnight_state?.status || "n/a"}`,
    `- Last reliability decision: ${report.overnight_state?.last_reliability_decision || "n/a"}`,
    "",
    "## State",
    "",
    `- Summary: ${report.overnight_state?.summary || "n/a"}`,
    `- Completed steps: ${report.overnight_state?.completed_step_count ?? 0}`,
    `- Current step: ${report.overnight_state?.current_step || "n/a"}`,
    `- Blocked: ${report.overnight_state?.blocked ? "yes" : "no"}`,
    `- Resumable: ${report.overnight_state?.resumable ? "yes" : "no"}`,
    `- Run count: ${report.overnight_state?.run_count ?? 0}`,
    `- Resume count: ${report.overnight_state?.resume_count ?? 0}`,
    `- Failed step events: ${report.overnight_state?.failed_step_events ?? 0}`,
    `- Blocked step events: ${report.overnight_state?.blocked_step_events ?? 0}`,
    "",
    "## Reliability Gate Snapshot",
    "",
    `- Decision: ${report.reliability_gate?.decision || "n/a"}`,
    `- Blocker count: ${report.reliability_gate?.blocker_count ?? 0}`,
    `- Warning count: ${report.reliability_gate?.warning_count ?? 0}`,
    ""
  ];

  lines.push("## Blockers");
  lines.push("");
  if (safeArray(report.reliability_gate?.blockers).length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of report.reliability_gate.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  lines.push("## Warnings");
  lines.push("");
  if (safeArray(report.reliability_gate?.warnings).length === 0) {
    lines.push("- None");
  } else {
    for (const warning of report.reliability_gate.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildOvernightRunMarkdown,
  buildOvernightRunReport,
  buildReliabilityMarkdown,
  buildReliabilityReport,
  summarizeOvernightState,
  evaluateReliabilityGate,
  loadRuntimeProfiles,
  resolveRuntimeProfile,
  summarizeReadinessInputs,
  summarizeSequenceHealth
};
