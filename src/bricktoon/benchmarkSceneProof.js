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

function normalizeSceneTimes(scenes = []) {
  let offset = 0;
  return scenes.map((scene) => {
    const duration = Number(scene.duration_seconds || ((scene.end || 0) - (scene.start || 0)) || 1);
    const normalized = {
      ...scene,
      start: Number(offset.toFixed(2)),
      end: Number((offset + duration).toFixed(2)),
      duration_seconds: duration
    };
    offset = normalized.end;
    return normalized;
  });
}

function buildBenchmarkSceneProofPackage({
  topicId,
  sceneManifest = {},
  renderPlan = {},
  promotionGate = {},
  outputFile = "06_renders/benchmark_scene_proof.mp4"
}) {
  const selectedSceneIds = getPromotedSceneIds(promotionGate);
  if (selectedSceneIds.length === 0) {
    throw new Error("No promoted benchmark scene is available for proof rendering.");
  }

  const sourceScenes = safeArray(sceneManifest.scenes)
    .filter((scene) => selectedSceneIds.includes(scene.id));
  if (sourceScenes.length === 0) {
    throw new Error("The benchmark scene does not exist in the current scene manifest.");
  }

  const normalizedScenes = normalizeSceneTimes(sourceScenes);
  const totalDuration = Number(
    normalizedScenes.reduce((sum, scene) => sum + Number(scene.duration_seconds || 0), 0).toFixed(2)
  );

  const proofManifest = {
    ...sceneManifest,
    duration_seconds: totalDuration,
    scenes: normalizedScenes
  };
  const proofPlan = {
    ...renderPlan,
    render_strategy: "benchmark_scene_proof",
    benchmark_selected_scene_ids: selectedSceneIds,
    scene_count: normalizedScenes.length,
    output_targets: [{
      label: "benchmark_scene_proof",
      render_file: outputFile
    }]
  };
  const report = {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    selected_scene_ids: selectedSceneIds,
    selected_scene_count: normalizedScenes.length,
    expected_duration_seconds: totalDuration,
    source_promotion_decision: promotionGate.gate?.decision || null,
    output_file: outputFile
  };

  return {
    report,
    manifest: proofManifest,
    render_plan: proofPlan
  };
}

function buildBenchmarkSceneProofMarkdown(report = {}) {
  const lines = [
    "# Benchmark Scene Proof Report",
    "",
    `- Topic: ${report.topic_id || "n/a"}`,
    `- Generated: ${report.created_at || "n/a"}`,
    `- Promotion decision: ${report.source_promotion_decision || "n/a"}`,
    `- Selected scenes: ${safeArray(report.selected_scene_ids).join(", ") || "n/a"}`,
    `- Scene count: ${report.selected_scene_count ?? 0}`,
    `- Expected duration: ${report.expected_duration_seconds ?? 0}`,
    `- Output file: ${report.output_file || "n/a"}`,
    ""
  ];

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildBenchmarkSceneProofMarkdown,
  buildBenchmarkSceneProofPackage,
  getPromotedSceneIds,
  normalizeSceneTimes
};
