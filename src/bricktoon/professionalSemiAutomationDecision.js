function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildAutomationBuckets({ toolchainMapReport = {}, reintegrationReport = {}, productionReadiness = {}, reliabilityReport = {} }) {
  const standardizedNow = [
    "repo-side export lock package generation",
    "professional toolchain-map generation",
    "benchmark hero-scene package generation",
    "professional benchmark asset reintegration",
    "benchmark-scene asset-manifest registration",
    "benchmark-scene render-contract preference",
    "qc-facing reintegration reporting"
  ];

  const operatorAssisted = [
    "character puppet authoring inside the pro toolchain",
    "speech and mouth-shape polish on talking shots",
    "blink, gesture, and acting polish on hero shots",
    "camera polish and editorial composite tuning",
    "music selection and subjective pacing review",
    "benchmark acceptance review before broader rollout"
  ];

  const notReadyForAutomation = [
    "full-topic overnight professional finishing",
    "topic-wide professional import promotion without benchmark review",
    "shared asset-catalog scaling for repeated production topics",
    "portable multi-machine proof for the professional route"
  ];

  if (productionReadiness.asset_catalog?.sufficiency_decision === "structural_only") {
    notReadyForAutomation.push("category-driven reusable asset sourcing at scale");
  }
  if (reliabilityReport.gate?.decision === "blocked") {
    notReadyForAutomation.push("automatic preview-to-finish promotion for the whole topic");
  }
  if (reintegrationReport.summary?.benchmark_only_mode === true) {
    notReadyForAutomation.push("default production use beyond the benchmark scene");
  }

  return {
    standardized_now: standardizedNow,
    operator_assisted: operatorAssisted,
    not_ready_for_automation: [...new Set(notReadyForAutomation)]
  };
}

function summarizeProfessionalSemiAutomationInputs({
  toolchainMapReport = {},
  reintegrationReport = {},
  productionReadiness = {},
  reliabilityReport = {}
}) {
  const automationBuckets = buildAutomationBuckets({
    toolchainMapReport,
    reintegrationReport,
    productionReadiness,
    reliabilityReport
  });

  const benchmarkOnlyMode = reintegrationReport.summary?.benchmark_only_mode === true;
  const reliabilityBlocked = reliabilityReport.gate?.decision === "blocked";
  const assetCatalogStructuralOnly = productionReadiness.asset_catalog?.sufficiency_decision === "structural_only";
  const overnightProven = productionReadiness.overnight_trial?.status === "passed";

  let routeClassification = "permanent_solution_candidate";
  if (benchmarkOnlyMode && reliabilityBlocked) {
    routeClassification = "benchmark_route_only";
  } else if (benchmarkOnlyMode || assetCatalogStructuralOnly || !overnightProven) {
    routeClassification = "temporary_accelerator";
  }

  return {
    toolchain_map_decision: toolchainMapReport.gate?.decision || null,
    reintegration_decision: reintegrationReport.gate?.decision || null,
    benchmark_scene_id: reintegrationReport.summary?.benchmark_scene_id || toolchainMapReport.summary?.benchmark_scene_id || null,
    benchmark_only_mode: benchmarkOnlyMode,
    reliability_decision: reliabilityReport.gate?.decision || null,
    reliability_blocker_count: safeArray(reliabilityReport.gate?.blockers).length,
    fallback_ratio: Number(reliabilityReport.readiness?.fallback_ratio || 0),
    fragile_scene_ratio: Number(reliabilityReport.readiness?.fragile_scene_ratio || 0),
    review_scene_count: Number(reliabilityReport.readiness?.review_scenes || 0),
    hold_scene_count: Number(reliabilityReport.readiness?.hold_scenes || 0),
    asset_catalog_sufficiency: productionReadiness.asset_catalog?.sufficiency_decision || null,
    selected_category_count: Number(productionReadiness.asset_catalog?.workspace_selected_category_count || 0),
    general_asset_image_count: Number(productionReadiness.asset_catalog?.general_asset_image_count || 0),
    overnight_status: productionReadiness.overnight_trial?.status || null,
    benchmark_default_decision: productionReadiness.decision?.decision || reintegrationReport.summary?.benchmark_default_decision || null,
    benchmark_status: reintegrationReport.summary?.benchmark_status || null,
    imported_scene_asset_present: Boolean(reintegrationReport.summary?.imported_scene_asset_present),
    imported_shot_asset_count: Number(reintegrationReport.summary?.imported_shot_asset_count || 0),
    route_classification: routeClassification,
    automation_buckets: automationBuckets
  };
}

function evaluateProfessionalSemiAutomation(summary = {}) {
  const blockers = [];
  const warnings = [];

  if (summary.toolchain_map_decision !== "toolchain_map_locked") {
    blockers.push("professional toolchain map is not locked");
  }
  if (summary.reintegration_decision !== "professional_reintegration_locked") {
    blockers.push("professional reintegration is not locked");
  }
  if (!summary.benchmark_scene_id) {
    blockers.push("benchmark scene id is missing");
  }
  if (!summary.imported_scene_asset_present) {
    blockers.push("imported benchmark scene asset is missing");
  }
  if (summary.benchmark_status !== "editorial_benchmark_ready") {
    blockers.push("benchmark scene is not marked editorial-benchmark ready");
  }
  if (!summary.route_classification) {
    blockers.push("route classification could not be determined");
  }

  if (summary.route_classification === "benchmark_route_only") {
    warnings.push("current decision classifies Option 3 as a benchmark route rather than a default production path");
  }
  if (summary.reliability_decision === "blocked") {
    warnings.push("full-topic reliability is still blocked, so preview-to-finish trust is not ready for scale");
  }
  if (summary.asset_catalog_sufficiency === "structural_only") {
    warnings.push("shared asset catalog is still structural only, which keeps scale costs and operator burden high");
  }
  if (summary.overnight_status !== "passed") {
    warnings.push("no governed overnight proof has been recorded for the professional route");
  }

  return {
    decision: blockers.length === 0 ? "semi_automation_decision_locked" : "incomplete_semi_automation_decision",
    blockers,
    warnings
  };
}

function buildProfessionalSemiAutomationReport({
  topicId,
  decisionId,
  toolchainMapReport = {},
  reintegrationReport = {},
  productionReadiness = {},
  reliabilityReport = {}
}) {
  const summary = summarizeProfessionalSemiAutomationInputs({
    toolchainMapReport,
    reintegrationReport,
    productionReadiness,
    reliabilityReport
  });
  const gate = evaluateProfessionalSemiAutomation(summary);

  let recommendedUse = "keep_as_permanent_solution_candidate";
  if (summary.route_classification === "benchmark_route_only") {
    recommendedUse = "use_as_benchmark_route_only";
  } else if (summary.route_classification === "temporary_accelerator") {
    recommendedUse = "use_as_temporary_accelerator";
  }

  return {
    topic_id: topicId,
    decision_id: decisionId,
    created_at: new Date().toISOString(),
    route_decision: {
      route_classification: summary.route_classification,
      recommended_use: recommendedUse,
      benchmark_scene_id: summary.benchmark_scene_id,
      scale_ready: summary.route_classification === "permanent_solution_candidate"
    },
    summary,
    automation_plan: {
      standardized_now: summary.automation_buckets.standardized_now,
      operator_assisted: summary.automation_buckets.operator_assisted,
      not_ready_for_automation: summary.automation_buckets.not_ready_for_automation
    },
    decision_rationale: [
      summary.route_classification === "benchmark_route_only"
        ? "The benchmark scene route is locked, but the full topic is still blocked by reliability and benchmark-only governance."
        : "The route has some automation value, but governance or production evidence still limits broader trust.",
      "The benchmark benchmark-scene package and reintegration flow are now repeatable enough to keep, even if broader scale is not approved.",
      "Operator-heavy animation polish still lives in the professional toolchain, so the repo should automate packaging and audit, not pretend the acting layer is hands-free."
    ],
    gate
  };
}

function buildProfessionalSemiAutomationMarkdown(report = {}) {
  const lines = [
    "# Professional Semi-Automation Decision Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Decision id: ${report.decision_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Decision: ${report.gate?.decision || "n/a"}`,
    `- Route classification: ${report.route_decision?.route_classification || "n/a"}`,
    `- Recommended use: ${report.route_decision?.recommended_use || "n/a"}`,
    "",
    "## Standardize Now",
    ""
  ];

  for (const item of safeArray(report.automation_plan?.standardized_now)) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Operator Assisted");
  lines.push("");

  for (const item of safeArray(report.automation_plan?.operator_assisted)) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Not Ready For Automation");
  lines.push("");

  for (const item of safeArray(report.automation_plan?.not_ready_for_automation)) {
    lines.push(`- ${item}`);
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
  buildProfessionalSemiAutomationMarkdown,
  buildProfessionalSemiAutomationReport,
  evaluateProfessionalSemiAutomation,
  summarizeProfessionalSemiAutomationInputs
};
