function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
}

function buildRenderSceneLookup(renderContract = {}) {
  return new Map(
    safeArray(renderContract.scenes).map((scene) => [scene.scene_id, scene])
  );
}

function buildSequenceSceneLookup(sceneSequenceReport = {}) {
  return new Map(
    safeArray(sceneSequenceReport.scenes).map((scene) => [scene.scene_id, scene])
  );
}

function recoveryBucketForScene(sceneDecision = {}, renderScene = {}) {
  if (renderScene.selected_asset_type === "professional_hero_scene_sequence") {
    return "benchmark_locked";
  }
  if (sceneDecision.decision === "review_required") {
    return "manual_review";
  }
  if (sceneDecision.decision === "rework_required" && Number(sceneDecision.fallback_shots || 0) >= 3) {
    return "heavy_rework";
  }
  if (sceneDecision.decision === "rework_required") {
    return "light_rework";
  }
  if (sceneDecision.decision === "promote_to_hybrid_finish") {
    return "promoted";
  }
  return "observe";
}

function bucketOrder(bucket) {
  switch (bucket) {
    case "manual_review":
      return 1;
    case "light_rework":
      return 2;
    case "heavy_rework":
      return 3;
    case "benchmark_locked":
      return 4;
    case "promoted":
      return 5;
    default:
      return 6;
  }
}

function bucketLabel(bucket) {
  switch (bucket) {
    case "manual_review":
      return "Manual Review";
    case "light_rework":
      return "Light Rework";
    case "heavy_rework":
      return "Heavy Rework";
    case "benchmark_locked":
      return "Benchmark Locked";
    case "promoted":
      return "Promoted";
    default:
      return "Observe";
  }
}

function recommendedStageChain(bucket) {
  switch (bucket) {
    case "manual_review":
      return [
        "bricktoon-preview",
        "hybrid-promotion-gate",
        "bricktoon-reliability"
      ];
    case "light_rework":
    case "heavy_rework":
      return [
        "asset-generation",
        "ai-video-motion-passes",
        "shot-compositing",
        "scene-assembly",
        "hybrid-promotion-gate",
        "bricktoon-reliability"
      ];
    case "benchmark_locked":
      return [
        "benchmark-scene-proof"
      ];
    default:
      return [
        "bricktoon-reliability"
      ];
  }
}

function recommendedCommands(topicId, bucket) {
  const stageChain = recommendedStageChain(bucket);
  if (bucket === "light_rework" || bucket === "heavy_rework") {
    return [
      `node agents/orchestrator.js --topic ${topicId} --stage bricktoon-scene-recovery --bucket ${bucket} --runtime-profile gtx1080_premium_preview`
    ];
  }
  return stageChain.map((stage) => {
    switch (stage) {
      case "bricktoon-preview":
        return `node agents/orchestrator.js --topic ${topicId} --stage bricktoon-scene-review`;
      case "hybrid-promotion-gate":
        return `node agents/orchestrator.js --topic ${topicId} --stage hybrid-promotion-gate --runtime-profile gtx1080_premium_preview`;
      case "bricktoon-reliability":
        return `node agents/orchestrator.js --topic ${topicId} --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview`;
      case "benchmark-scene-proof":
        return `node agents/orchestrator.js --topic ${topicId} --stage benchmark-scene-proof --runtime-profile gtx1080_benchmark_scene_proof`;
      default:
        return `node agents/orchestrator.js --topic ${topicId} --stage ${stage}`;
    }
  });
}

function buildSceneFocus(sceneDecision = {}, renderScene = {}, sequenceScene = {}) {
  const focus = [];
  const fallbackShots = Number(sceneDecision.fallback_shots ?? sequenceScene.fallback_shots ?? 0);
  const continuityStatus = sceneDecision.continuity_status || sequenceScene.continuity_status || renderScene.continuity_status || "fragile";
  const quality = renderScene.asset_quality_classification || null;

  if (sceneDecision.decision === "review_required") {
    focus.push("clear the manual review checkpoint against the benchmark scene");
  }
  if (sceneDecision.promotion_status === "hold_for_polish") {
    focus.push("clear hold_for_polish status");
  }
  if (continuityStatus === "fragile") {
    focus.push("improve continuity from fragile to mixed or locked");
  } else if (continuityStatus === "mixed") {
    focus.push("tighten continuity from mixed to locked if possible");
  }
  if (fallbackShots > 0) {
    focus.push(`replace at least ${fallbackShots >= 3 ? 2 : 1} fallback shot(s) with premium motion`);
  }
  if (quality && quality !== "premium_motion") {
    focus.push(`upgrade selected asset quality from ${quality} to premium_motion`);
  }
  if (renderScene.selected_asset_type === "professional_hero_scene_sequence") {
    focus.length = 0;
    focus.push("no rework required for benchmark proof path");
  }

  return focus;
}

function buildSceneRecoveryQueue({
  topicId,
  promotionGate = {},
  sceneSequenceReport = {},
  renderContract = {}
}) {
  const renderLookup = buildRenderSceneLookup(renderContract);
  const sequenceLookup = buildSequenceSceneLookup(sceneSequenceReport);

  return safeArray(promotionGate.scene_decisions)
    .map((sceneDecision) => {
      const renderScene = renderLookup.get(sceneDecision.scene_id) || {};
      const sequenceScene = sequenceLookup.get(sceneDecision.scene_id) || {};
      const bucket = recoveryBucketForScene(sceneDecision, renderScene);
      const fallbackShots = Number(sceneDecision.fallback_shots ?? sequenceScene.fallback_shots ?? 0);
      const premiumMotionShots = Number(sceneDecision.premium_motion_shots ?? sequenceScene.premium_motion_shots ?? 0);
      const continuityStatus = sceneDecision.continuity_status || sequenceScene.continuity_status || renderScene.continuity_status || "fragile";
      const score = bucketOrder(bucket) * 100
        + (bucket === "manual_review" ? fallbackShots : 0)
        + (bucket === "light_rework" ? fallbackShots : 0)
        + (bucket === "heavy_rework" ? Math.max(0, 5 - fallbackShots) : 0);

      return {
        scene_id: sceneDecision.scene_id,
        title: sceneDecision.title || renderScene.title || null,
        bucket,
        bucket_label: bucketLabel(bucket),
        recovery_priority: bucketOrder(bucket),
        score,
        decision: sceneDecision.decision || "observe",
        promotion_status: sceneDecision.promotion_status || renderScene.promotion_status || null,
        continuity_status: continuityStatus,
        fallback_shots: fallbackShots,
        premium_motion_shots: premiumMotionShots,
        selected_asset_type: renderScene.selected_asset_type || null,
        selected_asset_file: renderScene.selected_asset_file || null,
        reasons: safeArray(sceneDecision.reasons),
        focus: buildSceneFocus(sceneDecision, renderScene, sequenceScene),
        recommended_stage_chain: recommendedStageChain(bucket),
        recommended_commands: recommendedCommands(topicId, bucket)
      };
    })
    .sort((left, right) => left.score - right.score || left.scene_id.localeCompare(right.scene_id));
}

function buildRecoveryTargets(reliabilityReport = {}, runtimeProfile = {}) {
  const readiness = reliabilityReport.readiness || {};
  const totalScenes = Number(readiness.total_scenes || 0);
  const totalShots = Number(readiness.premium_motion_shots || 0) + Number(readiness.fallback_shots || 0);
  const maxFragileScenes = Math.floor(Number(runtimeProfile.max_fragile_scene_ratio || 1) * totalScenes);
  const maxFallbackShots = Math.floor(Number(runtimeProfile.max_fallback_ratio || 1) * totalShots);
  const maxUnresolved = Number(runtimeProfile.max_unresolved_high_priority || 0);
  const unresolvedHighPriority = Number(readiness.unresolved_high_priority_count || 0);

  return {
    review_scenes_to_clear: Number(readiness.review_scenes || 0),
    hold_scenes_to_clear: Number(readiness.hold_scenes || 0),
    fragile_scenes_to_recover: Math.max(0, Number(readiness.fragile_scenes || 0) - maxFragileScenes),
    fallback_shots_over_target: Math.max(0, Number(readiness.fallback_shots || 0) - maxFallbackShots),
    unresolved_high_priority_buffer: maxUnresolved - unresolvedHighPriority,
    fallback_ratio: Number(readiness.fallback_ratio || 0),
    fallback_ratio_target: Number(runtimeProfile.max_fallback_ratio || 1),
    fragile_scene_ratio: Number(readiness.fragile_scene_ratio || 0),
    fragile_scene_ratio_target: Number(runtimeProfile.max_fragile_scene_ratio || 1)
  };
}

function summarizeBuckets(sceneQueue = []) {
  const byBucket = new Map();
  for (const scene of sceneQueue) {
    if (!byBucket.has(scene.bucket)) {
      byBucket.set(scene.bucket, []);
    }
    byBucket.get(scene.bucket).push(scene);
  }

  return Array.from(byBucket.entries())
    .sort((left, right) => bucketOrder(left[0]) - bucketOrder(right[0]))
    .map(([bucket, scenes]) => ({
      bucket,
      bucket_label: bucketLabel(bucket),
      scene_count: scenes.length,
      scene_ids: scenes.map((scene) => scene.scene_id),
      recommended_stage_chain: recommendedStageChain(bucket)
    }));
}

function buildReliabilityRecoveryPlan({
  topicId,
  runtimeProfile = {},
  reliabilityReport = {},
  promotionGate = {},
  sceneSequenceReport = {},
  renderContract = {}
}) {
  const sceneQueue = buildSceneRecoveryQueue({
    topicId,
    promotionGate,
    sceneSequenceReport,
    renderContract
  });
  const recoveryTargets = buildRecoveryTargets(reliabilityReport, runtimeProfile);

  return {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    runtime_profile: {
      profile_id: runtimeProfile.profile_id || null,
      label: runtimeProfile.label || null,
      intended_flow: runtimeProfile.intended_flow || null
    },
    reliability_gate: {
      decision: reliabilityReport.gate?.decision || null,
      blockers: safeArray(reliabilityReport.gate?.blockers),
      warnings: safeArray(reliabilityReport.gate?.warnings)
    },
    recovery_targets: recoveryTargets,
    recovery_buckets: summarizeBuckets(sceneQueue),
    scene_queue: sceneQueue,
    next_phase_summary: {
      benchmark_scene_ready: Boolean(reliabilityReport.readiness?.benchmark_scene_ready),
      benchmark_scene_id: promotionGate.benchmark_editorial_scene?.scene_id || null,
      benchmark_proof_command: `node agents/orchestrator.js --topic ${topicId} --stage benchmark-scene-proof --runtime-profile gtx1080_benchmark_scene_proof`,
      full_topic_ready: reliabilityReport.gate?.decision === "ready_for_overnight_finish"
        || reliabilityReport.gate?.decision === "ready_for_final_export"
    }
  };
}

function buildReliabilityRecoveryMarkdown(report = {}) {
  const lines = [
    "# Bricktoon Reliability Recovery Plan",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Runtime profile: ${report.runtime_profile?.profile_id || "n/a"}`,
    `- Reliability decision: ${report.reliability_gate?.decision || "n/a"}`,
    "",
    "## Recovery Targets",
    "",
    `- Review scenes to clear: ${report.recovery_targets?.review_scenes_to_clear ?? 0}`,
    `- Hold scenes to clear: ${report.recovery_targets?.hold_scenes_to_clear ?? 0}`,
    `- Fragile scenes to recover: ${report.recovery_targets?.fragile_scenes_to_recover ?? 0}`,
    `- Fallback shots over target: ${report.recovery_targets?.fallback_shots_over_target ?? 0}`,
    `- Unresolved high-priority buffer: ${report.recovery_targets?.unresolved_high_priority_buffer ?? 0}`,
    `- Fallback ratio: ${report.recovery_targets?.fallback_ratio ?? 0} / target ${report.recovery_targets?.fallback_ratio_target ?? 0}`,
    `- Fragile scene ratio: ${report.recovery_targets?.fragile_scene_ratio ?? 0} / target ${report.recovery_targets?.fragile_scene_ratio_target ?? 0}`,
    "",
    "## Recovery Buckets",
    ""
  ];

  for (const bucket of safeArray(report.recovery_buckets)) {
    lines.push(`- ${bucket.bucket_label}: ${bucket.scene_ids.join(", ") || "none"}`);
  }

  lines.push("");
  lines.push("## Scene Queue");
  lines.push("");

  for (const scene of safeArray(report.scene_queue)) {
    lines.push(`### ${scene.scene_id} - ${scene.bucket_label}`);
    lines.push("");
    lines.push(`- Decision: ${scene.decision}`);
    lines.push(`- Promotion status: ${scene.promotion_status || "n/a"}`);
    lines.push(`- Continuity: ${scene.continuity_status || "n/a"}`);
    lines.push(`- Fallback shots: ${scene.fallback_shots}`);
    lines.push(`- Premium motion shots: ${scene.premium_motion_shots}`);
    lines.push(`- Selected asset type: ${scene.selected_asset_type || "n/a"}`);
    if (scene.focus.length > 0) {
      lines.push("- Focus:");
      for (const item of scene.focus) {
        lines.push(`  - ${item}`);
      }
    }
    if (scene.recommended_commands.length > 0) {
      lines.push("- Suggested commands:");
      for (const command of scene.recommended_commands) {
        lines.push(`  - \`${command}\``);
      }
    }
    lines.push("");
  }

  lines.push("## Reliability Blockers");
  lines.push("");
  if (safeArray(report.reliability_gate?.blockers).length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of report.reliability_gate.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  lines.push("## Benchmark Proof");
  lines.push("");
  lines.push(`- Benchmark scene ready: ${report.next_phase_summary?.benchmark_scene_ready ? "yes" : "no"}`);
  lines.push(`- Benchmark scene id: ${report.next_phase_summary?.benchmark_scene_id || "n/a"}`);
  lines.push(`- Benchmark proof command: \`${report.next_phase_summary?.benchmark_proof_command || "n/a"}\``);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildReliabilityRecoveryMarkdown,
  buildReliabilityRecoveryPlan,
  buildSceneRecoveryQueue,
  buildRecoveryTargets,
  recoveryBucketForScene
};
