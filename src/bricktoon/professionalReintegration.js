function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeProfessionalReintegrationInputs({
  heroSceneReport = {},
  renderContract = {},
  benchmarkSceneRecord = {},
  importedSceneAsset = null,
  professionalShotAssets = []
}) {
  const benchmarkSceneId = heroSceneReport.benchmark_scene?.scene_id || null;
  const renderScene = safeArray(renderContract.scenes).find((scene) => scene.scene_id === benchmarkSceneId) || {};

  return {
    benchmark_scene_id: benchmarkSceneId,
    hero_scene_decision: heroSceneReport.gate?.decision || null,
    scene_shot_contract_count: Number(heroSceneReport.summary?.scene_shot_contract_count || 0),
    premium_motion_shot_count: Number(heroSceneReport.summary?.premium_motion_shot_count || 0),
    talking_shot_count: Number(heroSceneReport.summary?.talking_shot_count || 0),
    prop_interaction_shot_count: Number(heroSceneReport.summary?.prop_interaction_shot_count || 0),
    imported_scene_asset_present: Boolean(importedSceneAsset),
    imported_shot_asset_count: safeArray(professionalShotAssets).length,
    imported_scene_asset_type: importedSceneAsset?.asset_type || null,
    imported_scene_asset_file: importedSceneAsset?.file || null,
    render_contract_scene_present: Boolean(renderScene.scene_id),
    render_contract_selected_asset_type: renderScene.selected_asset_type || null,
    render_contract_selected_asset_file: renderScene.selected_asset_file || null,
    render_contract_quality_classification: renderScene.asset_quality_classification || null,
    render_contract_promotion_status: renderScene.promotion_status || null,
    render_contract_continuity_status: renderScene.continuity_status || null,
    render_contract_audio_mix_strategy: renderScene.audio_mix_strategy || {},
    benchmark_status: heroSceneReport.summary?.benchmark_status || null,
    benchmark_only_mode: heroSceneReport.summary?.benchmark_only_mode === true,
    benchmark_default_decision: heroSceneReport.summary?.benchmark_default_decision || null,
    hero_sequence_file: heroSceneReport.hero_sequence?.final_sequence_file || null,
    audio_mix_match:
      JSON.stringify(renderScene.audio_mix_strategy || {}) === JSON.stringify(heroSceneReport.hero_sequence?.audio_mix_strategy || {})
  };
}

function evaluateProfessionalReintegration(summary = {}) {
  const blockers = [];
  const warnings = [];

  if (summary.hero_scene_decision !== "hero_scene_build_locked") {
    blockers.push("professional hero-scene build is not locked");
  }
  if (!summary.benchmark_scene_id) {
    blockers.push("benchmark scene id is missing");
  }
  if (!summary.imported_scene_asset_present) {
    blockers.push("professional hero-scene asset was not imported into the asset manifest");
  }
  if (summary.imported_scene_asset_type !== "professional_hero_scene_sequence") {
    blockers.push("imported benchmark scene asset is not typed as professional_hero_scene_sequence");
  }
  if (!summary.render_contract_scene_present) {
    blockers.push("benchmark scene is missing from the render contract");
  }
  if (summary.render_contract_selected_asset_type !== "professional_hero_scene_sequence") {
    blockers.push("render contract did not select the imported professional benchmark scene");
  }
  if (summary.render_contract_selected_asset_file !== summary.imported_scene_asset_file) {
    blockers.push("render contract selected asset file does not match the imported professional benchmark scene");
  }
  if (summary.imported_shot_asset_count === 0) {
    blockers.push("professional benchmark shot assets were not imported");
  }
  if (summary.premium_motion_shot_count === 0) {
    blockers.push("benchmark hero scene still lacks premium-motion coverage");
  }
  if (summary.talking_shot_count === 0) {
    blockers.push("benchmark hero scene still lacks talking-shot coverage");
  }
  if (summary.prop_interaction_shot_count === 0) {
    blockers.push("benchmark hero scene still lacks prop-interaction coverage");
  }
  if (summary.benchmark_status !== "editorial_benchmark_ready") {
    blockers.push("benchmark comparison is not editorial-benchmark ready");
  }

  if (!summary.audio_mix_match) {
    warnings.push("render-contract audio mix strategy differs from the hero-scene handoff package");
  }
  if (summary.benchmark_only_mode) {
    warnings.push("benchmark governance still keeps this route in benchmark-only mode rather than full default approval");
  }
  if (summary.benchmark_default_decision && summary.benchmark_default_decision !== "approve_option2_as_default") {
    warnings.push(`benchmark governance currently records '${summary.benchmark_default_decision}' rather than full default approval`);
  }

  return {
    decision: blockers.length === 0 ? "professional_reintegration_locked" : "incomplete_professional_reintegration",
    blockers,
    warnings
  };
}

function buildProfessionalReintegrationReport({
  topicId,
  reintegrationId,
  heroSceneReport = {},
  renderContract = {},
  benchmarkSceneRecord = {},
  importedSceneAsset = null,
  professionalShotAssets = []
}) {
  const summary = summarizeProfessionalReintegrationInputs({
    heroSceneReport,
    renderContract,
    benchmarkSceneRecord,
    importedSceneAsset,
    professionalShotAssets
  });
  const gate = evaluateProfessionalReintegration(summary);

  return {
    topic_id: topicId,
    reintegration_id: reintegrationId,
    created_at: new Date().toISOString(),
    benchmark_scene: {
      scene_id: summary.benchmark_scene_id,
      scene_title: heroSceneReport.benchmark_scene?.scene_title || null
    },
    imported_assets: {
      scene_asset: importedSceneAsset,
      shot_assets: safeArray(professionalShotAssets)
    },
    render_contract_alignment: {
      selected_asset_type: summary.render_contract_selected_asset_type,
      selected_asset_file: summary.render_contract_selected_asset_file,
      quality_classification: summary.render_contract_quality_classification,
      promotion_status: summary.render_contract_promotion_status,
      continuity_status: summary.render_contract_continuity_status,
      audio_mix_match: summary.audio_mix_match
    },
    benchmark_comparison: {
      benchmark_status: summary.benchmark_status,
      premium_motion_shot_count: summary.premium_motion_shot_count,
      talking_shot_count: summary.talking_shot_count,
      prop_interaction_shot_count: summary.prop_interaction_shot_count,
      acceptance_checklist: safeArray(heroSceneReport.acceptance_checklist)
    },
    summary,
    gate
  };
}

function buildProfessionalReintegrationMarkdown(report = {}) {
  const lines = [
    "# Professional Reintegration Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Reintegration id: ${report.reintegration_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Decision: ${report.gate?.decision || "n/a"}`,
    `- Benchmark scene: ${report.benchmark_scene?.scene_id || "n/a"}${report.benchmark_scene?.scene_title ? ` - ${report.benchmark_scene.scene_title}` : ""}`,
    "",
    "## Import Summary",
    "",
    `- Imported scene asset: ${report.summary?.imported_scene_asset_present ? "yes" : "no"}`,
    `- Imported shot assets: ${report.summary?.imported_shot_asset_count ?? 0}`,
    `- Render-contract selected asset: ${report.summary?.render_contract_selected_asset_type || "n/a"}`,
    `- Render-contract file match: ${report.summary?.render_contract_selected_asset_file === report.summary?.imported_scene_asset_file ? "yes" : "no"}`,
    "",
    "## Benchmark Comparison",
    "",
    `- Benchmark status: ${report.summary?.benchmark_status || "n/a"}`,
    `- Premium-motion shots: ${report.summary?.premium_motion_shot_count ?? 0}`,
    `- Talking shots: ${report.summary?.talking_shot_count ?? 0}`,
    `- Prop-interaction shots: ${report.summary?.prop_interaction_shot_count ?? 0}`,
    "",
    "## Blockers",
    ""
  ];

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
  buildProfessionalReintegrationMarkdown,
  buildProfessionalReintegrationReport,
  evaluateProfessionalReintegration,
  summarizeProfessionalReintegrationInputs
};
