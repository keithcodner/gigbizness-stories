function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildLookupByScene(items = []) {
  return new Map(
    safeArray(items)
      .filter((item) => item && item.scene_id)
      .map((item) => [item.scene_id, item])
  );
}

function normalizeReviewStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "approved") {
    return "approved";
  }
  if (normalized === "rejected") {
    return "rejected";
  }
  return "pending";
}

function buildSceneReviewDecisionTemplate({
  sceneId,
  benchmarkSceneId,
  existingDecision = {}
}) {
  const status = normalizeReviewStatus(existingDecision.status);
  return {
    scene_id: sceneId,
    benchmark_scene_id: benchmarkSceneId || null,
    status,
    reviewer: existingDecision.reviewer || "",
    approved_at: status === "approved" ? (existingDecision.approved_at || null) : null,
    notes: existingDecision.notes || "",
    checklist: {
      identity_readable: existingDecision.checklist?.identity_readable ?? null,
      motion_readable: existingDecision.checklist?.motion_readable ?? null,
      prop_readable: existingDecision.checklist?.prop_readable ?? null,
      benchmark_comparison_passed: existingDecision.checklist?.benchmark_comparison_passed ?? null,
      subtitle_safe_framing: existingDecision.checklist?.subtitle_safe_framing ?? null
    }
  };
}

function collectReviewRequiredSceneIds({
  promotionGate = {},
  sceneSequenceReport = {},
  renderContract = {}
}) {
  const promotionIds = safeArray(promotionGate.scene_decisions)
    .filter((scene) => scene.decision === "review_required")
    .map((scene) => scene.scene_id)
    .filter(Boolean);

  if (promotionIds.length > 0) {
    return Array.from(new Set(promotionIds));
  }

  const sequenceIds = safeArray(sceneSequenceReport.scenes)
    .filter((scene) => scene.promotion_status === "review_before_finish")
    .map((scene) => scene.scene_id)
    .filter(Boolean);
  if (sequenceIds.length > 0) {
    return Array.from(new Set(sequenceIds));
  }

  return Array.from(new Set(
    safeArray(renderContract.scenes)
      .filter((scene) => scene.promotion_status === "review_before_finish")
      .map((scene) => scene.scene_id)
      .filter(Boolean)
  ));
}

function summarizeReviewClearance({
  reviewRequiredSceneIds = [],
  reviewDecisions = {}
}) {
  const decisionLookup = new Map(
    safeArray(reviewDecisions.decisions)
      .filter((decision) => decision && decision.scene_id)
      .map((decision) => [decision.scene_id, decision])
  );
  const approved = [];
  const rejected = [];
  const pending = [];

  for (const sceneId of reviewRequiredSceneIds) {
    const status = normalizeReviewStatus(decisionLookup.get(sceneId)?.status);
    if (status === "approved") {
      approved.push(sceneId);
    } else if (status === "rejected") {
      rejected.push(sceneId);
    } else {
      pending.push(sceneId);
    }
  }

  return {
    total_review_required: reviewRequiredSceneIds.length,
    approved_scene_ids: approved,
    rejected_scene_ids: rejected,
    pending_scene_ids: pending,
    approved_count: approved.length,
    rejected_count: rejected.length,
    pending_count: pending.length
  };
}

function buildSceneReviewPacket({
  topicId,
  promotionGate = {},
  sceneSequenceReport = {},
  renderContract = {},
  benchmarkReliabilityReport = {},
  reviewDecisions = {}
}) {
  const reviewSceneIds = collectReviewRequiredSceneIds({
    promotionGate,
    sceneSequenceReport,
    renderContract
  });
  const sequenceLookup = buildLookupByScene(sceneSequenceReport.scenes);
  const renderLookup = buildLookupByScene(renderContract.scenes);
  const promotionLookup = buildLookupByScene(promotionGate.scene_decisions);
  const benchmarkSceneId = promotionGate.benchmark_editorial_scene?.scene_id || null;
  const clearance = summarizeReviewClearance({
    reviewRequiredSceneIds: reviewSceneIds,
    reviewDecisions
  });

  const existingDecisionLookup = new Map(
    safeArray(reviewDecisions.decisions)
      .filter((decision) => decision && decision.scene_id)
      .map((decision) => [decision.scene_id, decision])
  );

  const decisions = reviewSceneIds.map((sceneId) => buildSceneReviewDecisionTemplate({
    sceneId,
    benchmarkSceneId,
    existingDecision: existingDecisionLookup.get(sceneId) || {}
  }));

  const reviewScenes = reviewSceneIds.map((sceneId) => {
    const sequenceScene = sequenceLookup.get(sceneId) || {};
    const renderScene = renderLookup.get(sceneId) || {};
    const promotionScene = promotionLookup.get(sceneId) || {};
    const decision = decisions.find((item) => item.scene_id === sceneId) || buildSceneReviewDecisionTemplate({ sceneId, benchmarkSceneId });
    return {
      scene_id: sceneId,
      title: renderScene.title || promotionScene.title || null,
      current_review_status: decision.status,
      continuity_status: promotionScene.continuity_status || sequenceScene.continuity_status || renderScene.continuity_status || "mixed",
      fallback_shots: Number(promotionScene.fallback_shots ?? sequenceScene.fallback_shots ?? renderScene.shot_source_breakdown?.fallback_shots ?? 0),
      premium_motion_shots: Number(promotionScene.premium_motion_shots ?? sequenceScene.premium_motion_shots ?? renderScene.shot_source_breakdown?.premium_motion_shots ?? 0),
      selected_asset_type: renderScene.selected_asset_type || null,
      selected_asset_file: renderScene.selected_asset_file || null,
      reasons: safeArray(promotionScene.reasons),
      next_actions: safeArray(promotionScene.next_actions),
      benchmark_scene_id: benchmarkSceneId,
      benchmark_scene_ready: Boolean(benchmarkReliabilityReport.readiness?.benchmark_scene_ready),
      benchmark_scene_proof_decision: benchmarkReliabilityReport.gate?.decision || null,
      checklist: {
        identity_readable: decision.checklist.identity_readable,
        motion_readable: decision.checklist.motion_readable,
        prop_readable: decision.checklist.prop_readable,
        benchmark_comparison_passed: decision.checklist.benchmark_comparison_passed,
        subtitle_safe_framing: decision.checklist.subtitle_safe_framing
      },
      reviewer: decision.reviewer,
      approved_at: decision.approved_at,
      notes: decision.notes,
      recommended_commands: [
        `node agents/orchestrator.js --topic ${topicId} --stage bricktoon-preview`,
        `node agents/orchestrator.js --topic ${topicId} --stage hybrid-promotion-gate --runtime-profile gtx1080_premium_preview`,
        `node agents/orchestrator.js --topic ${topicId} --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview`
      ]
    };
  });

  return {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    benchmark_scene: {
      scene_id: benchmarkSceneId,
      title: promotionGate.benchmark_editorial_scene?.title || null,
      benchmark_ready: Boolean(benchmarkReliabilityReport.readiness?.benchmark_scene_ready),
      proof_decision: benchmarkReliabilityReport.gate?.decision || null
    },
    review_clearance: clearance,
    checklist_reference: safeArray(promotionGate.human_checkpoint?.checklist),
    review_focus: safeArray(promotionGate.human_checkpoint?.review_focus),
    decisions,
    review_scenes: reviewScenes
  };
}

function buildSceneReviewMarkdown(report = {}) {
  const lines = [
    "# Bricktoon Scene Review Packet",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Benchmark scene: ${report.benchmark_scene?.scene_id || "n/a"}`,
    `- Benchmark ready: ${report.benchmark_scene?.benchmark_ready ? "yes" : "no"}`,
    `- Benchmark proof decision: ${report.benchmark_scene?.proof_decision || "n/a"}`,
    "",
    "## Review Summary",
    "",
    `- Total review scenes: ${report.review_clearance?.total_review_required ?? 0}`,
    `- Approved: ${report.review_clearance?.approved_count ?? 0}`,
    `- Rejected: ${report.review_clearance?.rejected_count ?? 0}`,
    `- Pending: ${report.review_clearance?.pending_count ?? 0}`,
    "",
    "## Shared Checklist",
    ""
  ];

  for (const item of safeArray(report.checklist_reference)) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Scene Review Queue");
  lines.push("");

  for (const scene of safeArray(report.review_scenes)) {
    lines.push(`### ${scene.scene_id}`);
    lines.push("");
    lines.push(`- Current review status: ${scene.current_review_status}`);
    lines.push(`- Continuity: ${scene.continuity_status}`);
    lines.push(`- Fallback shots: ${scene.fallback_shots}`);
    lines.push(`- Premium motion shots: ${scene.premium_motion_shots}`);
    lines.push(`- Selected asset type: ${scene.selected_asset_type || "n/a"}`);
    lines.push(`- Selected asset file: ${scene.selected_asset_file || "n/a"}`);
    lines.push("- Checklist:");
    lines.push(`  - identity_readable: ${scene.checklist.identity_readable}`);
    lines.push(`  - motion_readable: ${scene.checklist.motion_readable}`);
    lines.push(`  - prop_readable: ${scene.checklist.prop_readable}`);
    lines.push(`  - benchmark_comparison_passed: ${scene.checklist.benchmark_comparison_passed}`);
    lines.push(`  - subtitle_safe_framing: ${scene.checklist.subtitle_safe_framing}`);
    if (safeArray(scene.reasons).length > 0) {
      lines.push("- Reasons:");
      for (const reason of scene.reasons) {
        lines.push(`  - ${reason}`);
      }
    }
    if (safeArray(scene.next_actions).length > 0) {
      lines.push("- Next actions:");
      for (const item of scene.next_actions) {
        lines.push(`  - ${item}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildSceneReviewDecisionTemplate,
  buildSceneReviewMarkdown,
  buildSceneReviewPacket,
  collectReviewRequiredSceneIds,
  summarizeReviewClearance
};
