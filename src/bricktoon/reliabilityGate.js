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

function summarizeSequenceHealth(sceneSequenceReport = {}) {
  const scenes = Array.isArray(sceneSequenceReport.scenes) ? sceneSequenceReport.scenes : [];
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
  promotionGate = {}
}) {
  const sequenceHealth = summarizeSequenceHealth(sceneSequenceReport);
  const renderScenes = Array.isArray(renderContract.scenes) ? renderContract.scenes.length : 0;
  const promotionGateState = promotionGate.gate || {};
  return {
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
  finalApprovalText
}) {
  const readiness = summarizeReadinessInputs({
    machineProfile,
    runtimeProfile,
    visualPreviewExists,
    sceneSequenceReport,
    renderContract,
    finalApprovalText,
    visualReadiness,
    promotionGate
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

module.exports = {
  buildReliabilityMarkdown,
  buildReliabilityReport,
  evaluateReliabilityGate,
  loadRuntimeProfiles,
  resolveRuntimeProfile,
  summarizeReadinessInputs,
  summarizeSequenceHealth
};
