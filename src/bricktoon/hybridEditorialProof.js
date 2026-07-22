const { buildHybridProofPerformance } = require("./hybridPerformanceProof");
const { classifyShotRole, summarizeSceneSequence } = require("./sequencePolish");

function normalizeShotContracts(bundle = {}) {
  if (Array.isArray(bundle.shots)) {
    return bundle.shots;
  }
  if (Array.isArray(bundle.shot_contracts)) {
    return bundle.shot_contracts;
  }
  return [];
}

function isInsertShotClass(shotClass = "") {
  return ["document_insert", "top_down_document", "push_in_document"].includes(String(shotClass || ""));
}

function editorialCoverageForShotContracts(shotContracts = []) {
  const shotClasses = shotContracts.map((shot) => String(shot.shot_class || ""));
  return {
    shot_count: shotContracts.length,
    shot_classes: shotClasses,
    has_establishing: shotClasses.includes("establishing_wide"),
    has_closeup: shotClasses.includes("closeup_face"),
    has_medium_single: shotClasses.includes("medium_single"),
    has_medium_two: shotClasses.includes("medium_two_shot"),
    has_insert: shotClasses.some((shotClass) => isInsertShotClass(shotClass)),
    insert_count: shotClasses.filter((shotClass) => isInsertShotClass(shotClass)).length,
    character_performance_count: shotContracts.filter((shot) => String(shot.motion_requirements?.return_type || "").includes("puppet")).length
  };
}

function premiumCountForScene(sceneId, compositingLookup = new Map()) {
  return [...compositingLookup.values()]
    .filter((entry) => entry.scene_id === sceneId && entry.quality_classification === "premium_motion")
    .length;
}

function scoreSceneSelection(sceneId, shotContracts = [], compositingLookup = new Map(), sequenceLookup = new Map()) {
  const coverage = editorialCoverageForShotContracts(shotContracts);
  const sequenceInfo = sequenceLookup.get(sceneId) || {};
  const score =
    (coverage.has_establishing ? 6 : 0)
    + (coverage.has_closeup ? 10 : 0)
    + (coverage.has_medium_single ? 8 : 0)
    + (coverage.has_medium_two ? 8 : 0)
    + (coverage.has_insert ? 9 : 0)
    + (coverage.shot_count * 2)
    + premiumCountForScene(sceneId, compositingLookup)
    + (sequenceInfo.editorial_pacing === "balanced" ? 3 : 0)
    + (sequenceInfo.editorial_pacing === "measured" ? 2 : 0);

  const reasons = [];
  if (coverage.has_establishing) {
    reasons.push("has establishing coverage");
  }
  if (coverage.has_closeup) {
    reasons.push("has closeup performance coverage");
  }
  if (coverage.has_medium_single || coverage.has_medium_two) {
    reasons.push("has dialogue or explainer coverage");
  }
  if (coverage.has_insert) {
    reasons.push("has evidence/insert coverage");
  }
  if (sequenceInfo.editorial_pacing) {
    reasons.push(`scene pacing is ${sequenceInfo.editorial_pacing}`);
  }

  return {
    scene_id: sceneId,
    score,
    reasons,
    coverage
  };
}

function selectHybridEditorialScene(bundle = {}, options = {}) {
  const shotContracts = normalizeShotContracts(bundle);
  const compositingLookup = new Map(
    ((options.compositingReport?.shots) || []).map((shot) => [shot.shot_id, shot])
  );
  const sequenceLookup = new Map(
    ((options.sceneSequenceReport?.scenes) || []).map((scene) => [scene.scene_id, scene])
  );
  const grouped = new Map();

  for (const shotContract of shotContracts) {
    if (!grouped.has(shotContract.scene_id)) {
      grouped.set(shotContract.scene_id, []);
    }
    grouped.get(shotContract.scene_id).push(shotContract);
  }

  const rankedScenes = [...grouped.entries()]
    .map(([sceneId, sceneShots]) => {
      const score = scoreSceneSelection(sceneId, sceneShots, compositingLookup, sequenceLookup);
      return {
        ...score,
        shots: sceneShots
      };
    })
    .sort((a, b) => b.score - a.score || a.scene_id.localeCompare(b.scene_id));

  return rankedScenes[0] || null;
}

function motionDirectivesForEditorialShot(shotContract = {}, sequenceRole = "bridge") {
  const shotClass = String(shotContract.shot_class || "");
  const directives = ["idle_drift"];

  if (shotClass === "closeup_face" || shotClass === "medium_single" || shotClass === "medium_two_shot") {
    directives.push("blink_pass", "talk_emphasis");
  }
  if (isInsertShotClass(shotClass)) {
    directives.push("proof_reveal", "invoice_counter");
  }
  if (sequenceRole === "entry") {
    directives.push("proof_reveal");
  }
  if (sequenceRole === "exit") {
    directives.push("impact_shake");
  }
  if (String(shotContract.performance_handoff?.secondary_action || "").includes("typing")) {
    directives.push("typing_overlay");
  }

  return [...new Set(directives)].map((type) => ({ type }));
}

function cameraRecipeForEditorialShot(baseCamera = {}, shotClass = "", sequenceRole = "bridge") {
  const camera = { ...baseCamera };
  if (shotClass === "establishing_wide") {
    camera.angle_profile = "wide_establish";
    camera.focus_target = "ensemble";
    camera.parallax_strength = Math.max(0.4, Number(camera.parallax_strength || 0));
    camera.end_scale = Math.max(1.05, Number(camera.end_scale || 1.05));
  } else if (shotClass === "closeup_face") {
    camera.angle_profile = "closeup_eye_level";
    camera.focus_target = "speaker_face";
    camera.start_scale = Number(camera.start_scale || 1);
    camera.end_scale = Math.max(1.12, Number(camera.end_scale || 1.12));
    camera.overshoot = Math.max(0.03, Number(camera.overshoot || 0));
  } else if (shotClass === "medium_single") {
    camera.angle_profile = "medium_explainer";
    camera.focus_target = "speaker_torso";
    camera.end_scale = Math.max(1.08, Number(camera.end_scale || 1.08));
    camera.overshoot = Math.max(0.024, Number(camera.overshoot || 0));
  } else if (shotClass === "medium_two_shot") {
    camera.angle_profile = "dialogue_two_shot";
    camera.focus_target = "exchange";
    camera.end_scale = Math.max(1.07, Number(camera.end_scale || 1.07));
    camera.parallax_strength = Math.max(0.28, Number(camera.parallax_strength || 0));
  } else if (isInsertShotClass(shotClass)) {
    camera.angle_profile = shotClass === "top_down_document" ? "top_down_insert" : "document_push_in";
    camera.focus_target = "document";
    camera.end_scale = Math.max(1.1, Number(camera.end_scale || 1.1));
    camera.overshoot = Math.max(0.03, Number(camera.overshoot || 0));
    camera.parallax_strength = Math.min(0.14, Math.max(0.08, Number(camera.parallax_strength || 0.1)));
  }

  if (sequenceRole === "entry") {
    camera.movement = "steady_push";
  } else if (sequenceRole === "exit" && !isInsertShotClass(shotClass)) {
    camera.movement = "pan_right";
  }

  return camera;
}

function buildHybridEditorialPerformance(shotContract = {}, options = {}) {
  const shotIndex = Number(options.shotIndex || 0);
  const totalShots = Math.max(1, Number(options.totalShots || 1));
  const shotType = String(shotContract.shot_class || "");
  const sequenceRole = classifyShotRole({ shot_type: shotType }, shotIndex, totalShots);
  const base = buildHybridProofPerformance(shotContract);
  const cameraRecipe = cameraRecipeForEditorialShot(base.camera_recipe, shotType, sequenceRole);
  const motionDirectives = motionDirectivesForEditorialShot(shotContract, sequenceRole);

  return {
    ...base,
    proof_profile: "option2_phase4_shot_language_editorial_quality",
    camera_recipe: cameraRecipe,
    editorial_role: sequenceRole,
    motion_directives: motionDirectives,
    proof_checks: [
      ...base.proof_checks,
      "camera move matches the shot role in sequence",
      "the shot cuts clearly with the adjacent beats"
    ]
  };
}

function summarizeHybridEditorialSequence({ sceneSelection, shotReports = [], sceneRecord = {} }) {
  const scene = {
    scene_id: sceneSelection.scene_id,
    continuity: {
      allow_axis_crossing: false
    },
    shots: (sceneSelection.shots || []).map((shot) => ({
      shot_type: shot.shot_class
    }))
  };
  const shotSelections = shotReports.map((shot) => ({
    quality_classification: shot.quality_classification
  }));
  const summary = summarizeSceneSequence({
    scene,
    sceneRecord,
    shotSelections
  });
  const coverage = editorialCoverageForShotContracts(sceneSelection.shots || []);
  const warnings = shotReports.flatMap((shot) => shot.stage_warnings || []);
  const benchmarkStatus = (
    coverage.has_establishing
    && coverage.has_closeup
    && (coverage.has_medium_single || coverage.has_medium_two)
    && coverage.has_insert
    && coverage.shot_count >= 4
  )
    ? (warnings.length > 0 ? "editorial_benchmark_ready_with_warnings" : "editorial_benchmark_ready")
    : "needs_more_editorial_coverage";

  return {
    ...summary,
    coverage,
    benchmark_status: benchmarkStatus,
    stage_warning_count: warnings.length,
    stage_warnings: [...new Set(warnings)]
  };
}

function buildHybridEditorialMarkdown(report = {}) {
  const lines = [
    "# Hybrid Editorial Sequence Proof",
    "",
    `- Generated: ${report.generated_at}`,
    `- Proof profile: ${report.proof_profile}`,
    `- Benchmark scene: ${report.scene.scene_id}`,
    `- Benchmark scene title: ${report.scene.scene_title || "n/a"}`,
    `- Sequence status: ${report.summary.benchmark_status}`,
    `- Promotion status: ${report.summary.promotion_status}`,
    `- Continuity: ${report.summary.continuity_status}`,
    `- Editorial pacing: ${report.summary.editorial_pacing}`,
    "",
    "## Why This Scene",
    ""
  ];

  for (const reason of report.scene.selection_reasons || []) {
    lines.push(`- ${reason}`);
  }

  lines.push("");
  lines.push("## Shot Sequence");
  lines.push("");

  for (const shot of report.shots || []) {
    lines.push(`### ${shot.shot_id}`);
    lines.push("");
    lines.push(`- Scene role: ${shot.editorial_role}`);
    lines.push(`- Shot class: ${shot.shot_class}`);
    lines.push(`- Camera: ${shot.camera_recipe.angle_profile} / ${shot.camera_recipe.movement}`);
    lines.push(`- Motion directives: ${shot.motion_directives.join(", ")}`);
    lines.push(`- Quality classification: ${shot.quality_classification}`);
    lines.push(`- Stage warnings: ${shot.stage_warnings.length > 0 ? shot.stage_warnings.join(", ") : "none"}`);
    lines.push("");
  }

  lines.push("## Next Phase");
  lines.push("");
  lines.push("- Option 2 Phase 5 should decide whether this editorial sample is trustworthy enough to become the preview/promotion gate benchmark.");

  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildHybridEditorialMarkdown,
  buildHybridEditorialPerformance,
  editorialCoverageForShotContracts,
  motionDirectivesForEditorialShot,
  selectHybridEditorialScene,
  summarizeHybridEditorialSequence
};
