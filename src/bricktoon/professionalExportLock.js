function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countCompositionGuides(entries = []) {
  const files = safeArray(entries);
  return files.filter((entry) => entry.endsWith(".json")).length;
}

function countArtDirectionEntries(entries = []) {
  const files = safeArray(entries);
  return files.filter((entry) => entry.endsWith(".json")).length;
}

function summarizeProfessionalExportInputs({
  castPackage = {},
  shotPlan = {},
  compositionGuideFiles = [],
  artDirectionFiles = [],
  referenceManifest = {},
  voicePackage = {},
  benchmarkPack = {},
  libraryIndex = {},
  productionReadiness = {},
  hybridContract = {}
}) {
  const castMembers = safeArray(castPackage.cast_members);
  const scenes = safeArray(shotPlan.scenes);
  const shotCount = scenes.reduce((sum, scene) => sum + safeArray(scene.shots).length, 0);
  const selectedReferences = safeArray(referenceManifest.selected_references);
  const selectedCategories = safeArray(referenceManifest.selected_asset_categories);
  const benchmarkRequirements = safeArray(benchmarkPack.benchmark_profile?.benchmark_pack_requirements);
  const hybridShots = safeArray(hybridContract.shot_contracts);
  const hybridCharacters = safeArray(hybridContract.character_contracts);

  return {
    cast_member_count: castMembers.length,
    scene_count: scenes.length,
    shot_count: shotCount,
    composition_guide_count: countCompositionGuides(compositionGuideFiles),
    art_direction_count: countArtDirectionEntries(artDirectionFiles),
    selected_reference_count: selectedReferences.length,
    selected_category_count: selectedCategories.length,
    has_voiceover_clean: Boolean(voicePackage.voiceover_clean),
    has_transcript: Boolean(voicePackage.transcript),
    has_captions: Boolean(voicePackage.captions),
    has_voice_timing: Boolean(voicePackage.voice_timing),
    benchmark_requirement_count: benchmarkRequirements.length,
    benchmark_fixture_locked: Boolean(productionReadiness.benchmark_fixture?.fixture_locked),
    benchmark_default_decision: productionReadiness.decision?.decision || null,
    library_reference_image_count: Number(libraryIndex.reference_image_count || 0),
    library_general_asset_category_count: Number(libraryIndex.general_asset_category_count || 0),
    library_general_asset_image_count: Number(libraryIndex.general_asset_image_count || 0),
    hybrid_character_contract_count: hybridCharacters.length,
    hybrid_shot_contract_count: hybridShots.length
  };
}

function evaluateProfessionalExportLock(summary = {}) {
  const blockers = [];
  const warnings = [];

  if (summary.cast_member_count === 0) {
    blockers.push("cast export package is missing cast members");
  }
  if (summary.scene_count === 0 || summary.shot_count === 0) {
    blockers.push("shot-plan export package is missing scenes or shots");
  }
  if (summary.composition_guide_count === 0) {
    blockers.push("composition export package is missing guide JSON files");
  }
  if (summary.art_direction_count === 0) {
    blockers.push("art-direction export package is missing shot guidance files");
  }
  if (summary.selected_reference_count === 0) {
    blockers.push("reference packaging is missing selected reference images");
  }
  if (!summary.has_transcript || !summary.has_captions || !summary.has_voice_timing) {
    blockers.push("audio/timing packaging is incomplete");
  }
  if (summary.benchmark_requirement_count === 0) {
    blockers.push("benchmark reference pack export is missing");
  }
  if (!summary.benchmark_fixture_locked) {
    blockers.push("benchmark fixture governance is not locked");
  }

  if (!summary.has_voiceover_clean) {
    warnings.push("clean voiceover file is not present in the export package");
  }
  if (summary.library_general_asset_image_count === 0) {
    warnings.push("shared asset catalog is structural only and still lacks categorized image population");
  }
  if (summary.selected_category_count === 0) {
    warnings.push("workspace has not selected any reusable asset categories for the external handoff");
  }
  if (summary.hybrid_character_contract_count === 0 || summary.hybrid_shot_contract_count === 0) {
    warnings.push("hybrid contract package is thin or missing");
  }
  if (summary.benchmark_default_decision && summary.benchmark_default_decision !== "approve_option2_as_default") {
    warnings.push(`benchmark governance currently records '${summary.benchmark_default_decision}' rather than full default approval`);
  }

  return {
    decision: blockers.length === 0 ? "export_locked" : "incomplete_export_lock",
    blockers,
    warnings
  };
}

function buildProfessionalExportLockReport({
  topicId,
  exportId,
  castPackage = {},
  shotPlan = {},
  compositionGuideFiles = [],
  artDirectionFiles = [],
  referenceManifest = {},
  voicePackage = {},
  benchmarkPack = {},
  libraryIndex = {},
  productionReadiness = {},
  hybridContract = {}
}) {
  const summary = summarizeProfessionalExportInputs({
    castPackage,
    shotPlan,
    compositionGuideFiles,
    artDirectionFiles,
    referenceManifest,
    voicePackage,
    benchmarkPack,
    libraryIndex,
    productionReadiness,
    hybridContract
  });
  const gate = evaluateProfessionalExportLock(summary);
  const benchmarkFixture = productionReadiness.benchmark_fixture || {};

  return {
    topic_id: topicId,
    export_id: exportId,
    created_at: new Date().toISOString(),
    summary,
    benchmark_guidance: {
      benchmark_scene_id: benchmarkFixture.benchmark_scene_id || null,
      benchmark_scene_title: benchmarkFixture.benchmark_scene_title || null,
      selected_reference_count: Number(benchmarkFixture.selected_reference_count || 0),
      fixture_locked: Boolean(benchmarkFixture.fixture_locked),
      governance_notes: safeArray(benchmarkFixture.governance_notes)
    },
    external_handoff_guidance: {
      preferred_usage: "Use this package as the upstream source of truth for cast, staging, timing, references, and benchmark quality intent.",
      benchmark_quality_rule: "Match the governed benchmark fixture before scaling across additional scenes.",
      benchmark_default_decision: productionReadiness.decision?.decision || null,
      benchmark_only_mode: productionReadiness.decision?.benchmark_only_approved === true
    },
    gate
  };
}

function buildProfessionalExportLockMarkdown(report = {}) {
  const lines = [
    "# Professional Export Lock Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Export id: ${report.export_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Decision: ${report.gate?.decision || "n/a"}`,
    "",
    "## Export Summary",
    "",
    `- Cast members: ${report.summary?.cast_member_count ?? 0}`,
    `- Scenes: ${report.summary?.scene_count ?? 0}`,
    `- Shots: ${report.summary?.shot_count ?? 0}`,
    `- Composition guides: ${report.summary?.composition_guide_count ?? 0}`,
    `- Art-direction files: ${report.summary?.art_direction_count ?? 0}`,
    `- Selected references: ${report.summary?.selected_reference_count ?? 0}`,
    `- Transcript present: ${report.summary?.has_transcript ? "yes" : "no"}`,
    `- Captions present: ${report.summary?.has_captions ? "yes" : "no"}`,
    `- Voice timing present: ${report.summary?.has_voice_timing ? "yes" : "no"}`,
    `- Hybrid shot contracts: ${report.summary?.hybrid_shot_contract_count ?? 0}`,
    "",
    "## Benchmark Guidance",
    "",
    `- Benchmark scene: ${report.benchmark_guidance?.benchmark_scene_id || "n/a"}`,
    `- Fixture locked: ${report.benchmark_guidance?.fixture_locked ? "yes" : "no"}`,
    `- Benchmark-only mode: ${report.external_handoff_guidance?.benchmark_only_mode ? "yes" : "no"}`,
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

  lines.push("");
  lines.push("## External Handoff Rule");
  lines.push("");
  lines.push(`- ${report.external_handoff_guidance?.preferred_usage || "n/a"}`);
  lines.push(`- ${report.external_handoff_guidance?.benchmark_quality_rule || "n/a"}`);

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildProfessionalExportLockMarkdown,
  buildProfessionalExportLockReport,
  evaluateProfessionalExportLock,
  summarizeProfessionalExportInputs
};
