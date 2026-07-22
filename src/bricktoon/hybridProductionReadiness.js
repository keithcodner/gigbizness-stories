function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeBenchmarkFixture({
  topicId,
  stillBenchmarkPack = {},
  editorialReport = {},
  promotionGate = {},
  referenceManifest = {}
}) {
  const selectedReferences = safeArray(referenceManifest.selected_references);
  const gate = promotionGate.gate || {};
  const benchmarkScene = promotionGate.benchmark_editorial_scene || {};
  const stillCoverage = stillBenchmarkPack.coverage || {};
  const stillBenchmarkReady = Boolean(
    stillCoverage.shot_classes_covered >= 5
    && stillCoverage.shots_with_approved_keyframes > 0
  );
  const editorialBenchmarkReady = editorialReport.summary?.benchmark_status === "editorial_benchmark_ready";
  const benchmarkPromotionReady = Boolean(gate.selected_scene_ready);
  const fixtureLocked = Boolean(
    topicId
    && benchmarkScene.scene_id
    && selectedReferences.length > 0
    && stillBenchmarkReady
    && editorialBenchmarkReady
    && benchmarkPromotionReady
  );

  const governanceNotes = [];
  if (fixtureLocked) {
    governanceNotes.push("benchmark fixture is locked to a concrete topic, scene, and reference set");
  } else {
    governanceNotes.push("benchmark fixture is not fully locked yet");
  }
  if (selectedReferences.length === 0) {
    governanceNotes.push("no explicit reference images are selected in the workspace manifest");
  }

  return {
    topic_id: topicId,
    benchmark_scene_id: benchmarkScene.scene_id || editorialReport.scene?.scene_id || null,
    benchmark_scene_title: benchmarkScene.title || editorialReport.scene?.scene_title || null,
    selected_reference_count: selectedReferences.length,
    selected_reference_files: selectedReferences,
    still_benchmark_ready: stillBenchmarkReady,
    editorial_benchmark_ready: editorialBenchmarkReady,
    benchmark_promotion_ready: benchmarkPromotionReady,
    fixture_locked: fixtureLocked,
    governance_notes: governanceNotes
  };
}

function summarizeAssetCatalog({
  referenceManifest = {},
  libraryIndex = {}
}) {
  const selectedReferences = safeArray(referenceManifest.selected_references);
  const selectedCategories = safeArray(referenceManifest.selected_asset_categories);
  const libraryReferenceImageCount = Number(libraryIndex.reference_image_count || 0);
  const generalAssetCategoryCount = Number(libraryIndex.general_asset_category_count || 0);
  const generalAssetImageCount = Number(libraryIndex.general_asset_image_count || 0);

  let sufficiencyDecision = "usable";
  if (selectedReferences.length === 0 || libraryReferenceImageCount === 0 || generalAssetCategoryCount === 0) {
    sufficiencyDecision = "insufficient";
  } else if (generalAssetImageCount === 0 || selectedCategories.length === 0) {
    sufficiencyDecision = "structural_only";
  }

  const warnings = [];
  if (selectedCategories.length === 0) {
    warnings.push("workspace has not selected any reusable general-asset categories yet");
  }
  if (generalAssetImageCount === 0) {
    warnings.push("shared general-asset catalog structure exists, but it is still unpopulated with actual images");
  }

  return {
    workspace_selected_reference_count: selectedReferences.length,
    workspace_selected_category_count: selectedCategories.length,
    library_reference_image_count: libraryReferenceImageCount,
    general_asset_category_count: generalAssetCategoryCount,
    general_asset_image_count: generalAssetImageCount,
    sufficiency_decision: sufficiencyDecision,
    warnings
  };
}

function summarizeOvernightTrial({
  reliabilityReport = {},
  overnightState = {}
}) {
  if (!overnightState || Object.keys(overnightState).length === 0) {
    return {
      status: "not_recorded",
      summary: "no overnight trial state has been recorded yet"
    };
  }

  const completedSteps = safeArray(overnightState.completed_steps);
  const lastDecision = overnightState.last_reliability_decision || reliabilityReport.gate?.decision || null;
  const finished = Boolean(overnightState.completed_at);
  const overnightStatus = overnightState.status || (finished ? "completed" : "partial");

  if (finished && ["ready_for_overnight_finish", "ready_for_final_export"].includes(lastDecision || "")) {
    return {
      status: "passed",
      summary: "overnight state exists and the last recorded reliability decision cleared finishing",
      overnight_status: overnightStatus
    };
  }

  if (overnightStatus === "blocked") {
    return {
      status: "partial",
      summary: `overnight state is blocked with ${completedSteps.length} completed step(s) and reliability decision '${lastDecision || "n/a"}'`,
      overnight_status: overnightStatus
    };
  }

  if (overnightStatus === "failed") {
    return {
      status: "partial",
      summary: `overnight state failed after ${completedSteps.length} completed step(s)`,
      overnight_status: overnightStatus
    };
  }

  return {
    status: "partial",
    summary: `overnight state exists with ${completedSteps.length} completed step(s), but production clearance was not recorded`,
    overnight_status: overnightStatus
  };
}

function evaluateHybridProductionReadiness({
  benchmarkFixture = {},
  promotionGate = {},
  reliabilityReport = {},
  machineProfile = {},
  assetCatalog = {},
  overnightTrial = {}
}) {
  const blockers = [];
  const warnings = [];
  const gate = promotionGate.gate || {};
  const reliabilityGate = reliabilityReport.gate || {};

  if (!benchmarkFixture.fixture_locked) {
    blockers.push("benchmark fixture is not locked yet");
  }
  if (!benchmarkFixture.benchmark_promotion_ready) {
    blockers.push("benchmark scene has not cleared the promotion gate");
  }
  if (reliabilityGate.decision && !["ready_for_overnight_finish", "ready_for_final_export"].includes(reliabilityGate.decision)) {
    blockers.push("premium reliability gate still blocks full-topic finishing");
    for (const blocker of safeArray(reliabilityGate.blockers)) {
      warnings.push(`reliability detail: ${blocker}`);
    }
  }
  if (assetCatalog.sufficiency_decision === "insufficient") {
    blockers.push("shared asset/reference catalog is not sufficient for governed repeated production use");
  } else if (assetCatalog.sufficiency_decision === "structural_only") {
    warnings.push("shared asset/reference catalog is structurally present but still thin for repeated production use");
  }
  if (overnightTrial.status === "not_recorded") {
    warnings.push("no overnight production trial has been recorded yet");
  } else if (overnightTrial.status === "partial") {
    warnings.push("overnight production trial exists but does not yet prove dependable finish clearance");
  }
  if (machineProfile.gpu?.model !== "NVIDIA GeForce GTX 1080") {
    warnings.push("current machine profile differs from the benchmark GTX 1080 target");
  }

  let decision = "not_ready_for_default";
  if (
    blockers.length === 0
    && gate.topic_wide_ready
    && ["ready_for_overnight_finish", "ready_for_final_export"].includes(reliabilityGate.decision || "")
    && overnightTrial.status === "passed"
  ) {
    decision = "approve_option2_as_default";
  } else if (benchmarkFixture.fixture_locked && benchmarkFixture.benchmark_promotion_ready) {
    decision = "keep_option2_in_benchmark_mode";
  }

  return {
    decision,
    blockers,
    warnings,
    option2_default_approved: decision === "approve_option2_as_default",
    benchmark_only_approved: decision === "keep_option2_in_benchmark_mode"
  };
}

function buildHybridProductionReadinessReport({
  topicId,
  stillBenchmarkPack = {},
  editorialReport = {},
  promotionGate = {},
  reliabilityReport = {},
  machineProfile = {},
  referenceManifest = {},
  libraryIndex = {},
  overnightState = {}
}) {
  const benchmarkFixture = summarizeBenchmarkFixture({
    topicId,
    stillBenchmarkPack,
    editorialReport,
    promotionGate,
    referenceManifest
  });
  const assetCatalog = summarizeAssetCatalog({
    referenceManifest,
    libraryIndex
  });
  const overnightTrial = summarizeOvernightTrial({
    reliabilityReport,
    overnightState
  });
  const decision = evaluateHybridProductionReadiness({
    benchmarkFixture,
    promotionGate,
    reliabilityReport,
    machineProfile,
    assetCatalog,
    overnightTrial
  });

  let defaultPathRecommendation = "hold_option2_as_benchmark_only";
  if (decision.option2_default_approved) {
    defaultPathRecommendation = "make_option2_the_default_milestone_path";
  } else if (!benchmarkFixture.fixture_locked) {
    defaultPathRecommendation = "do_not_promote_option2_until_fixture_lock_is_restored";
  }

  const nextActions = [];
  if (decision.option2_default_approved) {
    nextActions.push("promote Option 2 as the default premium milestone path");
    nextActions.push("preserve the current benchmark fixture as the ongoing acceptance target");
  } else {
    nextActions.push("keep Option 2 in benchmark-only mode until the full topic clears premium reliability");
    nextActions.push("reduce fallback-heavy scenes before trusting full overnight finishing");
  }
  if (assetCatalog.sufficiency_decision !== "usable") {
    nextActions.push("populate the shared asset catalog with actual categorized image matter, not only folder structure");
  }
  if (overnightTrial.status !== "passed") {
    nextActions.push("record a governed overnight trial after the topic-wide reliability blockers are resolved");
  }

  return {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    benchmark_fixture: benchmarkFixture,
    asset_catalog: assetCatalog,
    overnight_trial: overnightTrial,
    machine_profile: {
      gpu_model: machineProfile.gpu?.model || null,
      vram_gb: machineProfile.gpu?.vram_gb || null,
      target_resolution: machineProfile.target_resolution || null,
      overnight_mode: Boolean(machineProfile.overnight_mode)
    },
    promotion_gate_summary: {
      decision: promotionGate.gate?.decision || null,
      topic_wide_ready: Boolean(promotionGate.gate?.topic_wide_ready),
      selected_scene_ready: Boolean(promotionGate.gate?.selected_scene_ready),
      promoted_scene_count: Number(promotionGate.gate?.promoted_scene_count || 0),
      review_scene_count: Number(promotionGate.gate?.review_scene_count || 0),
      rework_scene_count: Number(promotionGate.gate?.rework_scene_count || 0)
    },
    reliability_summary: {
      decision: reliabilityReport.gate?.decision || null,
      fallback_ratio: Number(reliabilityReport.readiness?.fallback_ratio || 0),
      fragile_scene_ratio: Number(reliabilityReport.readiness?.fragile_scene_ratio || 0),
      review_scenes: Number(reliabilityReport.readiness?.review_scenes || 0),
      hold_scenes: Number(reliabilityReport.readiness?.hold_scenes || 0)
    },
    decision,
    default_path_recommendation: defaultPathRecommendation,
    next_actions: nextActions
  };
}

function buildHybridProductionReadinessMarkdown(report = {}) {
  const lines = [
    "# Hybrid Production Readiness Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Decision: ${report.decision?.decision || "n/a"}`,
    `- Default path recommendation: ${report.default_path_recommendation || "n/a"}`,
    "",
    "## Benchmark Fixture",
    "",
    `- Fixture locked: ${report.benchmark_fixture?.fixture_locked ? "yes" : "no"}`,
    `- Benchmark scene: ${report.benchmark_fixture?.benchmark_scene_id || "n/a"}`,
    `- Still benchmark ready: ${report.benchmark_fixture?.still_benchmark_ready ? "yes" : "no"}`,
    `- Editorial benchmark ready: ${report.benchmark_fixture?.editorial_benchmark_ready ? "yes" : "no"}`,
    `- Promotion ready: ${report.benchmark_fixture?.benchmark_promotion_ready ? "yes" : "no"}`,
    `- Selected references: ${report.benchmark_fixture?.selected_reference_count ?? 0}`,
    "",
    "## Production Decision",
    ""
  ];

  for (const blocker of safeArray(report.decision?.blockers)) {
    lines.push(`- Blocker: ${blocker}`);
  }
  if (safeArray(report.decision?.blockers).length === 0) {
    lines.push("- Blocker: none");
  }
  for (const warning of safeArray(report.decision?.warnings)) {
    lines.push(`- Warning: ${warning}`);
  }
  if (safeArray(report.decision?.warnings).length === 0) {
    lines.push("- Warning: none");
  }

  lines.push("");
  lines.push("## Reliability Summary");
  lines.push("");
  lines.push(`- Reliability decision: ${report.reliability_summary?.decision || "n/a"}`);
  lines.push(`- Fallback ratio: ${report.reliability_summary?.fallback_ratio ?? 0}`);
  lines.push(`- Fragile scene ratio: ${report.reliability_summary?.fragile_scene_ratio ?? 0}`);
  lines.push(`- Review scenes: ${report.reliability_summary?.review_scenes ?? 0}`);
  lines.push(`- Hold scenes: ${report.reliability_summary?.hold_scenes ?? 0}`);
  lines.push("");
  lines.push("## Asset Catalog");
  lines.push("");
  lines.push(`- Catalog sufficiency: ${report.asset_catalog?.sufficiency_decision || "n/a"}`);
  lines.push(`- Library reference images: ${report.asset_catalog?.library_reference_image_count ?? 0}`);
  lines.push(`- General asset categories: ${report.asset_catalog?.general_asset_category_count ?? 0}`);
  lines.push(`- General asset images: ${report.asset_catalog?.general_asset_image_count ?? 0}`);
  lines.push("");
  lines.push("## Next Actions");
  lines.push("");
  for (const action of safeArray(report.next_actions)) {
    lines.push(`- ${action}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildHybridProductionReadinessMarkdown,
  buildHybridProductionReadinessReport,
  evaluateHybridProductionReadiness,
  summarizeAssetCatalog,
  summarizeBenchmarkFixture,
  summarizeOvernightTrial
};
