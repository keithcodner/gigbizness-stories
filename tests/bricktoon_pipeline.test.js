const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const { resolveSceneAsset } = require("../src/render/resolveSceneAsset");
const { buildLayerRegions } = require("../src/bricktoon/layerRegions");
const {
  buildOvernightRunReport,
  buildReliabilityReport,
  evaluateReliabilityGate,
  summarizeOvernightState
} = require("../src/bricktoon/reliabilityGate");
const {
  buildReliabilityRecoveryPlan,
  buildSceneRecoveryQueue,
  buildRecoveryTargets
} = require("../src/bricktoon/reliabilityRecoveryPlan");
const { cameraRecipeForShot, propTrackForMember } = require("../src/bricktoon/shotPerformanceContracts");
const {
  buildBenchmarkSceneProofPackage,
  getPromotedSceneIds,
  normalizeSceneTimes
} = require("../src/bricktoon/benchmarkSceneProof");
const { splitNarrationIntoCaptionChunks, summarizeSceneSequence } = require("../src/bricktoon/sequencePolish");
const { loadVisualGenerationConfig, resolveWorkflowTemplate, qualityClassificationForAsset } = require("../src/bricktoon/workflowContracts");
const { buildPerformanceFrameState, cameraStateForFrame } = require("../src/bricktoon/proceduralSequenceRenderer");
const { buildHybridCharacterContract, buildHybridShotContract } = require("../src/bricktoon/hybridAnimationContract");
const { buildHybridProofPerformance, selectHybridProofShots } = require("../src/bricktoon/hybridPerformanceProof");
const {
  buildHybridEditorialPerformance,
  selectHybridEditorialScene,
  summarizeHybridEditorialSequence
} = require("../src/bricktoon/hybridEditorialProof");
const {
  buildHybridPromotionGateReport,
  buildScenePromotionDecisions,
  evaluateHybridPromotionGate,
  summarizeStillBenchmark
} = require("../src/bricktoon/hybridPromotionGate");
const {
  buildHybridProductionReadinessReport,
  evaluateHybridProductionReadiness,
  summarizeAssetCatalog,
  summarizeBenchmarkFixture
} = require("../src/bricktoon/hybridProductionReadiness");
const {
  buildProfessionalExportLockReport,
  evaluateProfessionalExportLock,
  summarizeProfessionalExportInputs
} = require("../src/bricktoon/professionalExportLock");
const {
  buildProfessionalToolchainMapReport,
  evaluateProfessionalToolchainMap,
  summarizeProfessionalToolchainInputs
} = require("../src/bricktoon/professionalToolchainMap");
const {
  buildProfessionalHeroSceneReport,
  evaluateProfessionalHeroScene,
  summarizeProfessionalHeroSceneInputs
} = require("../src/bricktoon/professionalHeroScene");
const {
  buildProfessionalReintegrationReport,
  evaluateProfessionalReintegration,
  summarizeProfessionalReintegrationInputs
} = require("../src/bricktoon/professionalReintegration");
const {
  buildProfessionalSemiAutomationReport,
  evaluateProfessionalSemiAutomation,
  summarizeProfessionalSemiAutomationInputs
} = require("../src/bricktoon/professionalSemiAutomationDecision");
const {
  buildAnimationSafetyLines,
  buildCharacterLockLines,
  buildShotNegativePrompt,
  selectCharacterRefPaths
} = require("../src/bricktoon/shotKeyframeGuidance");

test("normalizeCast supports legacy and cast-package schemas", () => {
  const legacy = { cast: [{ character_id: "LEGACY_1" }] };
  const packaged = { cast_members: [{ character_id: "PKG_1" }] };

  assert.equal(getCastMembers(legacy).length, 1);
  assert.equal(getCastMembers(packaged).length, 1);
  assert.equal(getCastMembers(packaged)[0].character_id, "PKG_1");
});

test("resolveSceneAsset prefers animated clips over static bricktoon scenes", () => {
  const resolved = resolveSceneAsset({
    scene_id: "S03",
    visual_type: "bricktoon_scene",
    allowed_fallback_types: ["bricktoon_scene", "text_card"]
  }, {
    assets: [
      {
        asset_id: "ASSET_S03_MAIN",
        asset_type: "bricktoon_scene",
        scene_ids: ["S03"],
        status: "approved",
        file: "07_visuals/generated_images/S03_main.bmp"
      },
      {
        asset_id: "CLIP_S03_MAIN",
        asset_type: "bricktoon_animated_clip",
        scene_ids: ["S03"],
        status: "approved",
        file: "08_animation/animated_clips/S03_clip.mp4"
      }
    ]
  });

  assert.equal(resolved.asset.asset_type, "bricktoon_animated_clip");
  assert.equal(resolved.asset.file, "08_animation/animated_clips/S03_clip.mp4");
});

test("resolveSceneAsset prefers scene sequences over animated clips", () => {
  const resolved = resolveSceneAsset({
    scene_id: "S03",
    visual_type: "bricktoon_scene",
    allowed_fallback_types: ["bricktoon_scene", "text_card"]
  }, {
    assets: [
      {
        asset_id: "CLIP_S03_MAIN",
        asset_type: "bricktoon_animated_clip",
        scene_ids: ["S03"],
        status: "approved",
        file: "08_animation/scene_sequences/S03_sequence.mp4"
      },
      {
        asset_id: "SEQ_S03_MAIN",
        asset_type: "bricktoon_scene_sequence",
        scene_ids: ["S03"],
        status: "approved",
        file: "08_animation/scene_sequences/S03_sequence.mp4"
      }
    ]
  });

  assert.equal(resolved.asset.asset_type, "bricktoon_scene_sequence");
});

test("resolveSceneAsset prefers composited scene sequences over standard scene sequences", () => {
  const resolved = resolveSceneAsset({
    scene_id: "S04",
    visual_type: "bricktoon_scene",
    allowed_fallback_types: ["bricktoon_scene", "text_card"]
  }, {
    assets: [
      {
        asset_id: "SEQ_S04_MAIN",
        asset_type: "bricktoon_scene_sequence",
        scene_ids: ["S04"],
        status: "approved",
        file: "08_animation/scene_sequences/S04_sequence.mp4"
      },
      {
        asset_id: "SEQCOMP_S04_MAIN",
        asset_type: "bricktoon_composited_shot_sequence",
        scene_ids: ["S04"],
        status: "approved",
        file: "08_animation/scene_sequences/S04_sequence.mp4"
      }
    ]
  });

  assert.equal(resolved.asset.asset_type, "bricktoon_composited_shot_sequence");
});

test("resolveSceneAsset prefers imported professional hero sequences over composited scene sequences", () => {
  const resolved = resolveSceneAsset({
    scene_id: "S04",
    visual_type: "bricktoon_scene",
    allowed_fallback_types: ["bricktoon_scene", "text_card"]
  }, {
    assets: [
      {
        asset_id: "SEQ_S04_MAIN",
        asset_type: "bricktoon_composited_shot_sequence",
        scene_ids: ["S04"],
        status: "approved",
        file: "08_animation/scene_sequences/S04_sequence.mp4"
      },
      {
        asset_id: "PROHEROSEQ_S04_MAIN",
        asset_type: "professional_hero_scene_sequence",
        scene_ids: ["S04"],
        status: "approved",
        file: "08_animation/professional_imports/S04_professional_hero_sequence.mp4"
      }
    ]
  });

  assert.equal(resolved.asset.asset_type, "professional_hero_scene_sequence");
});

test("visual generation config defaults to comfyui-first managed workflows", () => {
  const config = loadVisualGenerationConfig();
  assert.equal(config.default_image_provider, "comfyui");
  assert.equal(config.workflow_selection.character_reference, "character_ref_v1");
  assert.equal(config.workflow_selection.scene_still, "scene_still_v1");
});

test("hero shot workflow resolves to managed hero refinement template", () => {
  const config = loadVisualGenerationConfig();
  const template = resolveWorkflowTemplate(config, "shot_keyframe", { qualityTier: "hero", providerName: "comfyui" });
  assert.equal(template.workflow_id, "hero_refine_v1");
  assert.equal(template.output.width, 1920);
  assert.ok(template.pass_plan.includes("hero_refine"));
});

test("quality classification favors composited motion outputs", () => {
  assert.equal(qualityClassificationForAsset("composited_shot_clip"), "premium_motion");
  assert.equal(qualityClassificationForAsset("approved_keyframe"), "premium_still");
});

test("single-character shot guidance prioritizes only the hero references", () => {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "bricktoon-guidance-"));
  const refDir = path.join(workspaceDir, "07_visuals", "character_refs", "BT_CHAR_0001");
  const expressionDir = path.join(refDir, "expressions");
  fs.mkdirSync(expressionDir, { recursive: true });
  for (const filePath of [
    path.join(refDir, "front.png"),
    path.join(refDir, "master.png"),
    path.join(refDir, "three_quarter.png"),
    path.join(expressionDir, "talking.png")
  ]) {
    fs.writeFileSync(filePath, "test");
  }

  const visualBible = {
    characters: [{
      character_id: "BT_CHAR_0001",
      reference_slots: {
        neutral_turnaround: "BT_CHAR_0001/front.png"
      }
    }]
  };
  const shotCharacters = [{
    cast_member_id: "CAST_001",
    character_id: "BT_CHAR_0001",
    name: "Guide",
    role: "narrator",
    visual_description: "navy blazer narrator",
    continuity_rules: {
      hard_locks: {
        silhouette: "narrator",
        wardrobe: "WARDROBE_BLAZER_NAVY",
        facial_hair: "FH_NONE",
        headwear: "HEAD_NONE"
      },
      forbidden_changes: ["hard lock removal"]
    }
  }, {
    cast_member_id: "CAST_002",
    character_id: "BT_CHAR_0002",
    name: "Casey",
    role: "worried_customer",
    visual_description: "blue hoodie",
    continuity_rules: {
      hard_locks: {
        headwear: "HEAD_NONE"
      },
      forbidden_changes: ["hard lock removal"]
    }
  }];
  const shot = {
    shot_type: "closeup_face",
    primary_character_id: "BT_CHAR_0001",
    cast_member_ids: ["CAST_001", "CAST_002"]
  };

  const refs = selectCharacterRefPaths(workspaceDir, visualBible, shotCharacters, shot);
  const lockLines = buildCharacterLockLines(shotCharacters, shot);
  const negative = buildShotNegativePrompt(shotCharacters, shot);

  assert.equal(refs.length, 4);
  assert.ok(refs.every((ref) => ref.character_id === "BT_CHAR_0001"));
  assert.ok(lockLines.lines.some((line) => line.includes("Do not show the secondary cast")));
  assert.match(negative, /multiple visible characters/);

  fs.rmSync(workspaceDir, { recursive: true, force: true });
});

test("animation-ready benchmark profile is pinned for option1 phase1", () => {
  const config = loadVisualGenerationConfig();
  const profile = config.benchmark_profiles.option1_phase1_animation_ready_art_lock;

  assert.equal(profile.hardware_target, "gtx1080_8gb");
  assert.equal(profile.image_provider, "comfyui");
  assert.ok(profile.approval_focus.includes("mouth_visibility"));
});

test("option2 phase1 benchmark profile is pinned for hybrid still lock", () => {
  const config = loadVisualGenerationConfig();
  const profile = config.benchmark_profiles.option2_phase1_repo_side_still_identity_lock;

  assert.equal(profile.hardware_target, "gtx1080_8gb");
  assert.equal(profile.image_provider, "comfyui");
  assert.equal(profile.character_sampler_profile, "editorial_character_lock");
  assert.equal(profile.shot_class_workflows.closeup_face, "hybrid_character_closeup_v1");
});

test("shot-class workflow routing prefers hybrid closeup template for closeup stills", () => {
  const config = loadVisualGenerationConfig();
  const template = resolveWorkflowTemplate(config, "shot_keyframe", {
    qualityTier: "hero",
    shotClass: "closeup_face",
    providerName: "comfyui"
  });

  assert.equal(template.workflow_id, "hybrid_character_closeup_v1");
  assert.equal(template.sampler_profile.id, "editorial_character_lock");
  assert.ok(template.pass_plan.includes("identity_lock"));
});

test("animation-safe shot guidance protects mouth and prop readability", () => {
  const lines = buildAnimationSafetyLines({
    shot: {
      shot_type: "closeup_face",
      primary_character_id: "BT_CHAR_0001",
      purpose: "Explain invoice pressure"
    },
    shotCharacters: [{
      character_id: "BT_CHAR_0001",
      name: "Guide"
    }],
    sceneCard: {
      narration: "The invoice pressure becomes visible with the contract and bill."
    },
    primaryCharacter: {
      character_id: "BT_CHAR_0001",
      name: "Guide"
    }
  });

  assert.ok(lines.some((line) => line.includes("mouth unobstructed")));
  assert.ok(lines.some((line) => line.includes("active prop fully readable")));
});

test("guide-derived layer regions produce bounded motion-ready regions", () => {
  const regions = buildLayerRegions({
    shot: {
      shot_type: "closeup_face",
      purpose: "Reveal the contract pressure"
    },
    compositionGuide: {
      boxes: [
        { x: 281, y: 86, width: 538, height: 504 },
        { x: 870, y: 180, width: 220, height: 180 }
      ]
    },
    sourceWidth: 1920,
    sourceHeight: 1080
  });

  assert.equal(regions.extraction_mode, "guide_derived_regions_v1");
  assert.ok(regions.face_region.width > 0);
  assert.ok(regions.arm_hand_region.height > 0);
  assert.ok(regions.prop_main.width > 0);
  assert.ok(regions.character_foreground.x >= 0);
  assert.ok((regions.character_foreground.x + regions.character_foreground.width) <= 1920);
});

test("performance frame state opens mouth and raises gesture for talking closeups", () => {
  const state = buildPerformanceFrameState({
    member: {
      character_id: "BT_CHAR_0001",
      role: "narrator"
    },
    shot: {
      shot_type: "closeup_face",
      primary_character_id: "BT_CHAR_0001",
      start: 0,
      end: 2.4
    },
    shotPerformance: {
      duration_seconds: 2.4,
      mouth_sync_mode: "viseme_emphasis",
      blink_profile: "cinematic_readable",
      head_motion_profile: "readable_turns",
      secondary_action: "ambient_hold",
      performances: [{
        character_id: "BT_CHAR_0001",
        gesture_profile: "host_explainer",
        mouth_track: true,
        actions: [{
          action: "talk_calm",
          start: 0,
          end: 1.5,
          intensity: 0.7
        }]
      }]
    },
    motionDirectives: [{ type: "blink_pass" }, { type: "talk_emphasis" }],
    progress: 0.36,
    memberIndex: 0
  });

  assert.ok(state.mouthOpen > 0.2);
  assert.ok(state.point > 0);
  assert.ok(Math.abs(state.headTurn) > 0.05);
});

test("performance frame state supports actor-id fallback binding", () => {
  const state = buildPerformanceFrameState({
    member: {
      cast_member_id: "CAST_001",
      character_id: "BT_CHAR_0001",
      role: "narrator"
    },
    shot: {
      shot_type: "medium_single",
      start: 0,
      end: 2
    },
    shotPerformance: {
      duration_seconds: 2,
      mouth_sync_mode: "talk_cycles",
      blink_profile: "cinematic_readable",
      head_motion_profile: "readable_turns",
      performances: [{
        actor_id: "CAST_001",
        gesture_profile: "host_explainer",
        mouth_track: true,
        actions: [{
          action: "talk_calm",
          start: 0,
          end: 1.4,
          intensity: 0.6
        }]
      }]
    },
    motionDirectives: [{ type: "blink_pass" }],
    progress: 0.3,
    memberIndex: 0
  });

  assert.ok(state.mouthOpen > 0.15);
  assert.ok(state.point > 0);
});

test("camera frame state honors push recipes and idle drift", () => {
  const state = cameraStateForFrame(0.42, {
    camera_recipe: {
      movement: "steady_push",
      start_scale: 1,
      end_scale: 1.08
    }
  }, [{ type: "idle_drift" }]);

  assert.ok(state.scale > 1);
  assert.notEqual(state.offsetY, 0);
});

test("camera recipe strengthens closeups and document inserts", () => {
  const closeup = cameraRecipeForShot({
    shot_type: "closeup_face",
    camera: {
      movement: "steady_push",
      start_scale: 1,
      end_scale: 1.12
    }
  }, {
    camera: {
      focus: "character reaction"
    }
  });
  const insert = cameraRecipeForShot({
    shot_type: "top_down_document",
    camera: {
      movement: "steady_push",
      start_scale: 1,
      end_scale: 1.06
    }
  }, {});

  assert.equal(closeup.angle_profile, "closeup_eye_level");
  assert.equal(closeup.focus_target, "speaker_face");
  assert.equal(insert.angle_profile, "top_down_insert");
  assert.equal(insert.focus_target, "document");
});

test("prop track marks folder reveals and phone checks explicitly", () => {
  const folderTrack = propTrackForMember({
    action_intent: "folder reveal",
    prop_ids: ["PROP_EVIDENCE_FOLDER"]
  }, {
    shot_type: "medium_single"
  });
  const phoneTrack = propTrackForMember({
    action_intent: "phone in hand",
    prop_ids: ["PROP_PHONE", "PROP_MOVING_BOX"]
  }, {
    shot_type: "closeup_face"
  });

  assert.equal(folderTrack.interaction, "folder_reveal");
  assert.equal(phoneTrack.interaction, "phone_check");
  assert.equal(phoneTrack.prop_id, "PROP_PHONE");
});

test("caption chunking splits scene narration into timed subtitle-safe segments", () => {
  const chunks = splitNarrationIntoCaptionChunks(
    "The estimate looks normal at first. Then the paperwork gets more aggressive. Finally the pressure shifts to timing and access.",
    10,
    22
  );

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].start_seconds, 10.2);
  assert.ok(chunks[0].end_seconds > chunks[0].start_seconds);
  assert.equal(chunks.at(-1).end_seconds, 21.8);
});

test("scene sequence summary reports continuity pacing and promotion state", () => {
  const summary = summarizeSceneSequence({
    scene: {
      scene_id: "S04",
      continuity: {
        allow_axis_crossing: false
      },
      shots: [
        { shot_type: "establishing_wide" },
        { shot_type: "closeup_face" },
        { shot_type: "top_down_document" }
      ]
    },
    sceneRecord: {
      id: "S04",
      title: "Where Pressure Enters",
      duration_seconds: 28
    },
    shotSelections: [
      { quality_classification: "premium_motion", scene_id: "S04" },
      { quality_classification: "premium_motion", scene_id: "S04" },
      { quality_classification: "fallback", scene_id: "S04" }
    ]
  });

  assert.equal(summary.continuity_status, "mixed");
  assert.equal(summary.editorial_pacing, "measured");
  assert.equal(summary.subtitle_safe_region.mode, "top_safe");
  assert.equal(summary.promotion_status, "review_before_finish");
});

test("reliability gate blocks overnight finish when fallback and hold pressure are too high", () => {
  const gate = evaluateReliabilityGate({
    require_preview: true,
    require_sequence_reports: true,
    require_render_contract: true,
    require_qc_approval: false,
    allow_review_required_finish: false,
    intended_flow: "overnight_finish",
    max_unresolved_high_priority: 3,
    max_fallback_ratio: 0.35,
    max_fragile_scene_ratio: 0.25
  }, {
    preview_exists: true,
    sequence_reports_ready: true,
    render_contract_ready: true,
    qc_approved: false,
    unresolved_high_priority_count: 5,
    fallback_ratio: 0.5,
    fragile_scene_ratio: 0.6,
    review_scenes: 1,
    hold_scenes: 2
  });

  assert.equal(gate.decision, "blocked");
  assert.ok(gate.blockers.some((item) => item.includes("hold_for_polish")));
  assert.ok(gate.blockers.some((item) => item.includes("fallback ratio")));
});

test("reliability report promotes clean draft finish readiness", () => {
  const report = buildReliabilityReport({
    topicId: "test_story_template",
    runtimeProfile: {
      profile_id: "gtx1080_overnight_finish_draft",
      machine_target: "gtx1080_8gb",
      require_preview: true,
      require_sequence_reports: true,
      require_render_contract: true,
      require_promotion_gate: false,
      require_qc_approval: false,
      allow_review_required_finish: false,
      intended_flow: "overnight_finish",
      max_unresolved_high_priority: 3,
      max_fallback_ratio: 0.35,
      max_fragile_scene_ratio: 0.25,
      runtime_policy: {
        max_parallel_motion_jobs: 1,
        max_parallel_keyframe_jobs: 1,
        recommended_window: "overnight"
      }
    },
    machineProfile: {
      gpu: {
        model: "NVIDIA GeForce GTX 1080",
        vram_gb: 8,
        preferred_encoding: "h264_nvenc"
      },
      overnight_mode: true
    },
    sceneSequenceReport: {
      scenes: [
        {
          scene_id: "S01",
          continuity_status: "mixed",
          promotion_status: "ready_for_finish",
          premium_motion_shots: 3,
          fallback_shots: 1
        },
        {
          scene_id: "S02",
          continuity_status: "mixed",
          promotion_status: "ready_for_finish",
          premium_motion_shots: 4,
          fallback_shots: 1
        }
      ]
    },
    renderContract: {
      scenes: [{ scene_id: "S01" }, { scene_id: "S02" }]
    },
    visualReadiness: {
      unresolved_high_priority_count: 1
    },
    visualPreviewExists: true,
    finalApprovalText: "NOT APPROVED"
  });

  assert.equal(report.gate.decision, "ready_for_overnight_finish");
  assert.equal(report.readiness.fallback_ratio, 0.222);
  assert.equal(report.readiness.fragile_scene_ratio, 0);
});

test("reliability recovery targets quantify remaining blocker reductions", () => {
  const targets = buildRecoveryTargets({
    readiness: {
      review_scenes: 2,
      hold_scenes: 4,
      fragile_scenes: 4,
      total_scenes: 7,
      fallback_shots: 12,
      premium_motion_shots: 14,
      unresolved_high_priority_count: 5,
      fallback_ratio: 0.462,
      fragile_scene_ratio: 0.571
    }
  }, {
    max_fragile_scene_ratio: 0.5,
    max_fallback_ratio: 0.55,
    max_unresolved_high_priority: 5
  });

  assert.equal(targets.review_scenes_to_clear, 2);
  assert.equal(targets.hold_scenes_to_clear, 4);
  assert.equal(targets.fragile_scenes_to_recover, 1);
  assert.equal(targets.fallback_shots_over_target, 0);
  assert.equal(targets.unresolved_high_priority_buffer, 0);
});

test("reliability recovery queue prioritizes review then lighter rework before benchmark-locked scenes", () => {
  const queue = buildSceneRecoveryQueue({
    topicId: "test_story_template",
    promotionGate: {
      scene_decisions: [
        {
          scene_id: "S01",
          decision: "review_required",
          promotion_status: "review_before_finish",
          continuity_status: "mixed",
          premium_motion_shots: 2,
          fallback_shots: 1,
          reasons: ["human review still required"]
        },
        {
          scene_id: "S03",
          decision: "rework_required",
          promotion_status: "hold_for_polish",
          continuity_status: "fragile",
          premium_motion_shots: 1,
          fallback_shots: 2,
          reasons: ["fallback pressure remains"]
        },
        {
          scene_id: "S05",
          decision: "rework_required",
          promotion_status: "hold_for_polish",
          continuity_status: "fragile",
          premium_motion_shots: 2,
          fallback_shots: 3,
          reasons: ["fallback pressure remains"]
        },
        {
          scene_id: "S04",
          decision: "promote_to_hybrid_finish",
          promotion_status: "hold_for_polish",
          continuity_status: "fragile",
          premium_motion_shots: 2,
          fallback_shots: 3,
          reasons: ["benchmark approved"]
        }
      ]
    },
    sceneSequenceReport: {
      scenes: [
        { scene_id: "S01", fallback_shots: 1, premium_motion_shots: 2, continuity_status: "mixed" },
        { scene_id: "S03", fallback_shots: 2, premium_motion_shots: 1, continuity_status: "fragile" },
        { scene_id: "S05", fallback_shots: 3, premium_motion_shots: 2, continuity_status: "fragile" },
        { scene_id: "S04", fallback_shots: 3, premium_motion_shots: 2, continuity_status: "fragile" }
      ]
    },
    renderContract: {
      scenes: [
        { scene_id: "S01", selected_asset_type: "bricktoon_composited_shot_sequence", asset_quality_classification: "motion_ready" },
        { scene_id: "S03", selected_asset_type: "bricktoon_composited_shot_sequence", asset_quality_classification: "motion_ready" },
        { scene_id: "S05", selected_asset_type: "bricktoon_composited_shot_sequence", asset_quality_classification: "motion_ready" },
        { scene_id: "S04", selected_asset_type: "professional_hero_scene_sequence", asset_quality_classification: "premium_motion" }
      ]
    }
  });

  assert.equal(queue[0].scene_id, "S01");
  assert.equal(queue[0].bucket, "manual_review");
  assert.equal(queue[1].scene_id, "S03");
  assert.equal(queue[1].bucket, "light_rework");
  assert.equal(queue[2].scene_id, "S05");
  assert.equal(queue[2].bucket, "heavy_rework");
  assert.equal(queue.at(-1).scene_id, "S04");
  assert.equal(queue.at(-1).bucket, "benchmark_locked");
});

test("reliability recovery plan summarizes scene queue and benchmark proof path", () => {
  const report = buildReliabilityRecoveryPlan({
    topicId: "test_story_template",
    runtimeProfile: {
      profile_id: "gtx1080_premium_preview",
      label: "GTX 1080 Premium Preview",
      intended_flow: "preview_plus_gate",
      max_fragile_scene_ratio: 0.5,
      max_fallback_ratio: 0.55,
      max_unresolved_high_priority: 5
    },
    reliabilityReport: {
      gate: {
        decision: "blocked",
        blockers: ["4 scene(s) are still marked hold_for_polish"],
        warnings: []
      },
      readiness: {
        benchmark_scene_ready: true,
        review_scenes: 2,
        hold_scenes: 4,
        fragile_scenes: 4,
        total_scenes: 7,
        fallback_shots: 12,
        premium_motion_shots: 14,
        unresolved_high_priority_count: 5,
        fallback_ratio: 0.462,
        fragile_scene_ratio: 0.571
      }
    },
    promotionGate: {
      benchmark_editorial_scene: {
        scene_id: "S04"
      },
      scene_decisions: [
        {
          scene_id: "S01",
          decision: "review_required",
          promotion_status: "review_before_finish",
          continuity_status: "mixed",
          premium_motion_shots: 2,
          fallback_shots: 1,
          reasons: ["human review still required"]
        },
        {
          scene_id: "S04",
          decision: "promote_to_hybrid_finish",
          promotion_status: "hold_for_polish",
          continuity_status: "fragile",
          premium_motion_shots: 2,
          fallback_shots: 3,
          reasons: ["benchmark approved"]
        }
      ]
    },
    sceneSequenceReport: {
      scenes: [
        { scene_id: "S01", fallback_shots: 1, premium_motion_shots: 2, continuity_status: "mixed" },
        { scene_id: "S04", fallback_shots: 3, premium_motion_shots: 2, continuity_status: "fragile" }
      ]
    },
    renderContract: {
      scenes: [
        { scene_id: "S01", selected_asset_type: "bricktoon_composited_shot_sequence", asset_quality_classification: "motion_ready" },
        { scene_id: "S04", selected_asset_type: "professional_hero_scene_sequence", asset_quality_classification: "premium_motion" }
      ]
    }
  });

  assert.equal(report.reliability_gate.decision, "blocked");
  assert.equal(report.recovery_targets.fragile_scenes_to_recover, 1);
  assert.equal(report.recovery_buckets[0].bucket, "manual_review");
  assert.equal(report.scene_queue[0].scene_id, "S01");
  assert.match(report.next_phase_summary.benchmark_proof_command, /benchmark-scene-proof/);
});

test("overnight state summary reports blocked resumable runs with reliability context", () => {
  const summary = summarizeOvernightState({
    status: "blocked",
    blocked: true,
    current_step: "bricktoon-reliability",
    completed_steps: ["bricktoon-preview"],
    blocked_reason: ["fallback ratio exceeds profile allowance"],
    last_reliability_decision: "blocked",
    run_count: 1,
    resume_count: 0,
    step_history: [
      { step: "bricktoon-preview", status: "completed" },
      { step: "bricktoon-reliability", status: "blocked" }
    ]
  }, {});

  assert.equal(summary.status, "blocked");
  assert.equal(summary.resumable, true);
  assert.equal(summary.completed_step_count, 1);
  assert.match(summary.summary, /blocked at bricktoon-reliability/i);
});

test("overnight run report preserves state and reliability snapshot", () => {
  const report = buildOvernightRunReport({
    topicId: "test_story_template",
    runtimeProfile: {
      profile_id: "gtx1080_overnight_finish_draft"
    },
    machineProfile: {
      gpu: {
        model: "NVIDIA GeForce GTX 1080",
        vram_gb: 8
      },
      overnight_mode: true
    },
    reliabilityReport: {
      gate: {
        decision: "blocked",
        blockers: ["fallback ratio exceeds profile allowance"],
        warnings: ["benchmark scene is ready"]
      }
    },
    overnightState: {
      status: "failed",
      current_step: "bricktoon-finish",
      completed_steps: ["bricktoon-preview", "bricktoon-reliability"],
      last_reliability_decision: "ready_for_overnight_finish",
      last_error: "ffmpeg exited with status 1",
      run_count: 1,
      resume_count: 1,
      step_history: [
        { step: "bricktoon-preview", status: "completed" },
        { step: "bricktoon-reliability", status: "completed" },
        { step: "bricktoon-finish", status: "failed" }
      ]
    }
  });

  assert.equal(report.overnight_state.status, "failed");
  assert.equal(report.overnight_state.failed_step_events, 1);
  assert.equal(report.reliability_gate.blocker_count, 1);
  assert.equal(report.reliability_gate.warning_count, 1);
});

test("benchmark scene proof package selects promoted scenes and normalizes timing", () => {
  const sceneTimes = normalizeSceneTimes([
    { id: "S04", start: 84, end: 112, duration_seconds: 28 },
    { id: "S05", start: 112, end: 140, duration_seconds: 28 }
  ]);
  const pkg = buildBenchmarkSceneProofPackage({
    topicId: "test_story_template",
    sceneManifest: {
      duration_seconds: 185,
      scenes: [
        { id: "S01", start: 0, end: 29, duration_seconds: 29 },
        { id: "S04", start: 84, end: 112, duration_seconds: 28, visuals: [{ file: "S04.mp4" }] }
      ]
    },
    renderPlan: {
      scene_count: 7
    },
    promotionGate: {
      gate: {
        decision: "approved_for_selected_scene_promotion"
      },
      benchmark_editorial_scene: {
        scene_id: "S04"
      },
      scene_decisions: [{
        scene_id: "S04",
        decision: "promote_to_hybrid_finish"
      }]
    }
  });

  assert.equal(sceneTimes[0].start, 0);
  assert.equal(sceneTimes[1].start, 28);
  assert.deepEqual(getPromotedSceneIds({
    scene_decisions: [{ scene_id: "S04", decision: "promote_to_hybrid_finish" }]
  }), ["S04"]);
  assert.equal(pkg.report.selected_scene_count, 1);
  assert.equal(pkg.manifest.scenes[0].start, 0);
  assert.equal(pkg.manifest.duration_seconds, 28);
});

test("benchmark-selected reliability scope respects imported professional benchmark scene", () => {
  const report = buildReliabilityReport({
    topicId: "test_story_template",
    runtimeProfile: {
      profile_id: "gtx1080_benchmark_scene_proof",
      machine_target: "gtx1080_8gb",
      require_preview: true,
      require_sequence_reports: true,
      require_render_contract: true,
      require_promotion_gate: true,
      require_qc_approval: false,
      allow_review_required_finish: false,
      intended_flow: "benchmark_scene_proof",
      max_unresolved_high_priority: 5,
      max_fallback_ratio: 0.2,
      max_fragile_scene_ratio: 0,
      runtime_policy: {
        max_parallel_motion_jobs: 1,
        max_parallel_keyframe_jobs: 1,
        recommended_window: "focused_benchmark_review"
      }
    },
    machineProfile: {
      gpu: {
        model: "NVIDIA GeForce GTX 1080",
        vram_gb: 8
      }
    },
    sceneSequenceReport: {
      scenes: [{
        scene_id: "S04",
        continuity_status: "fragile",
        promotion_status: "hold_for_polish",
        premium_motion_shots: 2,
        fallback_shots: 3
      }, {
        scene_id: "S05",
        continuity_status: "fragile",
        promotion_status: "hold_for_polish",
        premium_motion_shots: 1,
        fallback_shots: 2
      }]
    },
    renderContract: {
      scenes: [{
        scene_id: "S04",
        selected_asset_type: "professional_hero_scene_sequence",
        asset_quality_classification: "premium_motion",
        shot_source_breakdown: {
          premium_motion_shots: 2,
          fallback_shots: 3
        }
      }, {
        scene_id: "S05",
        selected_asset_type: "bricktoon_composited_shot_sequence",
        asset_quality_classification: "motion_ready",
        shot_source_breakdown: {
          premium_motion_shots: 1,
          fallback_shots: 2
        }
      }]
    },
    promotionGate: {
      gate: {
        decision: "approved_for_selected_scene_promotion",
        selected_scene_ready: true,
        promoted_scene_count: 1
      },
      scene_decisions: [{
        scene_id: "S04",
        decision: "promote_to_hybrid_finish"
      }]
    },
    visualReadiness: {
      unresolved_high_priority_count: 2
    },
    visualPreviewExists: true,
    finalApprovalText: "",
    scope: "benchmark_selected"
  });

  assert.equal(report.readiness.scope, "benchmark_selected");
  assert.deepEqual(report.readiness.scoped_scene_ids, ["S04"]);
  assert.equal(report.readiness.fallback_ratio, 0);
  assert.equal(report.readiness.fragile_scene_ratio, 0);
  assert.equal(report.gate.decision, "ready_for_overnight_finish");
});

test("hybrid character contract preserves cast-member binding for handoff", () => {
  const contract = buildHybridCharacterContract({
    character: {
      character_id: "BT_CHAR_0001",
      cast_member_id: "CAST_001",
      continuity_anchors: ["face_print_layout"],
      hybrid_handoff_contract: {
        motion_handoff_targets: ["mouth", "eyes"]
      }
    },
    rig: {
      file: "07_visuals/character_rigs/BT_CHAR_0001/rig.json",
      data: {
        rig_type: "hybrid_2d_ai",
        motion_states: {
          talk: ["neutral", "talk_open"]
        },
        sockets: {
          prop_socket_primary: { x: 0.7, y: 0.6 }
        },
        source_reference_assets: {
          master: "07_visuals/character_refs/BT_CHAR_0001/master.png"
        }
      }
    },
    identityPackage: {
      package_file: "07_visuals/character_refs/BT_CHAR_0001/hybrid_identity_package.json"
    }
  });

  assert.equal(contract.cast_member_id, "CAST_001");
  assert.equal(contract.rig_type, "hybrid_2d_ai");
  assert.ok(contract.return_requirements.preserve_identity_locks);
});

test("hybrid shot contract blocks premium speaking shots when layer or rig handoff is missing", () => {
  const contract = buildHybridShotContract({
    scene: {
      scene_id: "S02"
    },
    shot: {
      shot_id: "S02_SHOT_002",
      shot_type: "closeup_face",
      start: 8,
      end: 16,
      cast_member_ids: ["CAST_001"]
    },
    route: {
      production_mode: "hybrid_2d_ai",
      quality_tier: "hero"
    },
    approval: {
      approved_keyframes: [
        { approved_file: "07_visuals/approved_keyframes/S02_SHOT_002_KF_01.png" }
      ]
    },
    layerManifest: null,
    performance: {
      performance_class: "closeup_talking_puppet",
      narration_hint: "Show the reaction clearly.",
      timing_windows: {
        emphasis_start: 2.72
      },
      performances: [
        {
          actor_id: "CAST_001"
        }
      ]
    },
    characterContracts: [
      {
        character_id: "BT_CHAR_0001",
        cast_member_id: "CAST_001",
        rig_file: "07_visuals/character_rigs/BT_CHAR_0001/rig.json",
        identity_package_file: "07_visuals/character_refs/BT_CHAR_0001/hybrid_identity_package.json",
        sockets: {
          prop_socket_primary: { x: 0.73, y: 0.64 }
        }
      }
    ],
    voiceoverFile: "03_voice/voiceover_clean.wav",
    captionsFile: "03_voice/captions.srt"
  });

  assert.equal(contract.rig_bindings.length, 1);
  assert.equal(contract.motion_requirements.return_type, "puppet_performance_shot");
  assert.equal(contract.fallback_discipline.silent_fallback_allowed, false);
  assert.ok(contract.fallback_discipline.block_if_missing.includes("layer_manifest"));
  assert.ok(contract.fallback_discipline.block_if_missing.includes("character_rig"));
});

test("hybrid proof shot selection prefers closeup, speaking single, dialogue, then insert", () => {
  const selected = selectHybridProofShots({
    shot_contracts: [
      { shot_id: "A", shot_class: "establishing_wide" },
      { shot_id: "B", shot_class: "medium_single" },
      { shot_id: "C", shot_class: "document_insert" },
      { shot_id: "D", shot_class: "closeup_face" },
      { shot_id: "E", shot_class: "medium_two_shot" }
    ]
  }, 4);

  assert.deepEqual(selected.map((shot) => shot.shot_id), ["D", "B", "E", "C"]);
});

test("hybrid proof performance boosts speaking closeups into visible acting mode", () => {
  const proof = buildHybridProofPerformance({
    shot_id: "S02_SHOT_002",
    shot_class: "closeup_face",
    motion_requirements: {
      return_type: "puppet_performance_shot"
    },
    timing_handoff: {
      duration_seconds: 8,
      timing_windows: {
        emphasis_start: 2.72,
        emphasis_end: 5.92
      },
      narration_hint: "At first the service can look normal."
    },
    performance_handoff: {
      performance_class: "closeup_talking_puppet",
      visible_character_limit: 1,
      camera_recipe: {
        movement: "steady_push",
        start_scale: 1,
        end_scale: 1.12,
        angle_profile: "closeup_eye_level",
        focus_target: "speaker_face"
      },
      actor_tracks: [
        {
          actor_id: "CAST_001",
          screen_position: "center",
          gesture_profile: "explain_point",
          prop_track: {
            interaction: "host_point_with_support_prop"
          },
          mouth_track: true
        }
      ]
    }
  });

  assert.equal(proof.proof_profile, "option2_phase3_minimum_viable_character_performance");
  assert.equal(proof.mouth_sync_mode, "viseme_emphasis");
  assert.equal(proof.blink_profile, "cinematic_readable");
  assert.equal(proof.visible_character_limit, 1);
  assert.ok(proof.performances[0].mouth_track);
  assert.equal(proof.performances[0].actions[1].action, "talk_emphasis");
});

test("hybrid editorial scene selection prefers the strongest mixed-coverage scene", () => {
  const selected = selectHybridEditorialScene({
    shot_contracts: [
      { shot_id: "S01_A", scene_id: "S01", shot_class: "establishing_wide" },
      { shot_id: "S01_B", scene_id: "S01", shot_class: "closeup_face" },
      { shot_id: "S02_A", scene_id: "S02", shot_class: "establishing_wide" },
      { shot_id: "S02_B", scene_id: "S02", shot_class: "medium_single" },
      { shot_id: "S02_C", scene_id: "S02", shot_class: "document_insert" },
      { shot_id: "S02_D", scene_id: "S02", shot_class: "closeup_face" }
    ]
  }, {
    sceneSequenceReport: {
      scenes: [
        { scene_id: "S01", editorial_pacing: "balanced" },
        { scene_id: "S02", editorial_pacing: "balanced" }
      ]
    },
    compositingReport: {
      shots: [
        { shot_id: "S02_A", scene_id: "S02", quality_classification: "premium_motion" },
        { shot_id: "S02_D", scene_id: "S02", quality_classification: "premium_motion" }
      ]
    }
  });

  assert.equal(selected.scene_id, "S02");
  assert.ok(selected.coverage.has_closeup);
  assert.ok(selected.coverage.has_insert);
  assert.ok(selected.reasons.includes("has evidence/insert coverage"));
});

test("hybrid editorial performance upgrades closeups into sequence-aware camera language", () => {
  const performance = buildHybridEditorialPerformance({
    shot_id: "S04_SHOT_004",
    shot_class: "closeup_face",
    motion_requirements: {
      return_type: "puppet_performance_shot"
    },
    timing_handoff: {
      duration_seconds: 6,
      timing_windows: {
        emphasis_start: 2,
        emphasis_end: 4.5
      }
    },
    performance_handoff: {
      performance_class: "closeup_talking_puppet",
      visible_character_limit: 1,
      camera_recipe: {
        movement: "steady_push",
        start_scale: 1,
        end_scale: 1.08,
        angle_profile: "closeup_eye_level",
        focus_target: "speaker_face"
      },
      actor_tracks: [
        {
          actor_id: "CAST_001",
          screen_position: "center",
          gesture_profile: "explain_point",
          mouth_track: true
        }
      ]
    }
  }, {
    shotIndex: 2,
    totalShots: 5
  });

  assert.equal(performance.proof_profile, "option2_phase4_shot_language_editorial_quality");
  assert.equal(performance.editorial_role, "performance");
  assert.ok(performance.camera_recipe.end_scale >= 1.12);
  assert.ok(performance.motion_directives.some((item) => item.type === "talk_emphasis"));
});

test("hybrid editorial sequence summary reports benchmark readiness for mixed coverage", () => {
  const summary = summarizeHybridEditorialSequence({
    sceneSelection: {
      scene_id: "S04",
      shots: [
        { shot_class: "establishing_wide" },
        { shot_class: "medium_single" },
        { shot_class: "document_insert" },
        { shot_class: "closeup_face" }
      ]
    },
    sceneRecord: {
      id: "S04",
      title: "Where Pressure Enters",
      duration_seconds: 24
    },
    shotReports: [
      { quality_classification: "premium_motion", stage_warnings: [] },
      { quality_classification: "premium_motion", stage_warnings: [] },
      { quality_classification: "premium_motion", stage_warnings: [] },
      { quality_classification: "premium_motion", stage_warnings: [] }
    ]
  });

  assert.equal(summary.continuity_status, "locked");
  assert.equal(summary.benchmark_status, "editorial_benchmark_ready");
  assert.equal(summary.promotion_status, "ready_for_finish");
});

test("hybrid still benchmark summary reports approval readiness and checklist", () => {
  const summary = summarizeStillBenchmark({
    coverage: {
      shot_classes_covered: 6,
      shots_with_approved_keyframes: 4
    },
    benchmark_profile: {
      approval_focus: ["identity_lock", "thumbnail_style_match", "prop_continuity"]
    }
  });

  assert.equal(summary.ready, true);
  assert.equal(summary.approved_shot_count, 4);
  assert.ok(summary.checklist.some((line) => line.includes("character identity")));
  assert.ok(summary.checklist.some((line) => line.includes("mouth motion")));
});

test("hybrid promotion decisions promote benchmark editorial scenes over legacy hold status", () => {
  const decisions = buildScenePromotionDecisions({
    sceneSequenceReport: {
      scenes: [
        {
          scene_id: "S04",
          continuity_status: "fragile",
          promotion_status: "hold_for_polish",
          premium_motion_shots: 4,
          fallback_shots: 2
        }
      ]
    },
    renderContract: {
      scenes: [
        {
          scene_id: "S04",
          title: "Where Pressure Enters"
        }
      ]
    },
    editorialReport: {
      scene: {
        scene_id: "S04"
      },
      summary: {
        benchmark_status: "editorial_benchmark_ready"
      }
    }
  });

  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "promote_to_hybrid_finish");
  assert.equal(decisions[0].is_benchmark_scene, true);
});

test("hybrid promotion gate allows selected-scene promotion before topic-wide promotion", () => {
  const gate = evaluateHybridPromotionGate({
    stillBenchmark: {
      ready: true
    },
    previewReport: {
      output_file: "06_renders/previews/visual_preview.mp4"
    },
    editorialReport: {
      summary: {
        benchmark_status: "editorial_benchmark_ready"
      }
    },
    visualReadiness: {
      unresolved_high_priority_count: 2
    },
    runtimeProfile: {
      profile_id: "gtx1080_premium_preview",
      max_unresolved_high_priority: 5
    },
    sceneDecisions: [
      {
        scene_id: "S04",
        decision: "promote_to_hybrid_finish"
      },
      {
        scene_id: "S05",
        decision: "rework_required"
      }
    ]
  });

  assert.equal(gate.selected_scene_ready, true);
  assert.equal(gate.topic_wide_ready, false);
  assert.equal(gate.decision, "approved_for_selected_scene_promotion");
  assert.equal(gate.runtime_tier_recommendation, "gtx1080_premium_preview");
});

test("hybrid promotion gate report captures benchmark approval language", () => {
  const report = buildHybridPromotionGateReport({
    topicId: "test_story_template",
    runtimeProfile: {
      profile_id: "gtx1080_premium_preview",
      label: "GTX 1080 Premium Preview",
      intended_flow: "preview_plus_gate",
      max_unresolved_high_priority: 5
    },
    stillBenchmarkPack: {
      coverage: {
        shot_classes_covered: 6,
        shots_with_approved_keyframes: 3
      },
      benchmark_profile: {
        approval_focus: ["identity_lock", "thumbnail_style_match"]
      }
    },
    previewReport: {
      output_file: "06_renders/previews/visual_preview.mp4",
      scenes: [{ scene_id: "S04" }],
      frame_count: 12,
      voiceover_used: true,
      music_used: true
    },
    editorialReport: {
      scene: {
        scene_id: "S04",
        scene_title: "Where Pressure Enters"
      },
      summary: {
        benchmark_status: "editorial_benchmark_ready",
        promotion_status: "ready_for_finish",
        continuity_status: "locked"
      }
    },
    sceneSequenceReport: {
      scenes: [
        {
          scene_id: "S04",
          continuity_status: "mixed",
          promotion_status: "hold_for_polish",
          premium_motion_shots: 4,
          fallback_shots: 1
        }
      ]
    },
    renderContract: {
      scenes: [
        {
          scene_id: "S04",
          title: "Where Pressure Enters"
        }
      ]
    },
    visualReadiness: {
      unresolved_high_priority_count: 1
    }
  });

  assert.equal(report.gate.decision, "approved_for_topic_promotion");
  assert.equal(report.benchmark_editorial_scene.scene_id, "S04");
  assert.match(report.human_checkpoint.approval_language, /approved to advance/i);
});

test("benchmark fixture summary locks a governed benchmark when references and scene proof exist", () => {
  const fixture = summarizeBenchmarkFixture({
    topicId: "test_story_template",
    stillBenchmarkPack: {
      coverage: {
        shot_classes_covered: 6,
        shots_with_approved_keyframes: 3
      }
    },
    editorialReport: {
      scene: {
        scene_id: "S04",
        scene_title: "Where Pressure Enters"
      },
      summary: {
        benchmark_status: "editorial_benchmark_ready"
      }
    },
    promotionGate: {
      benchmark_editorial_scene: {
        scene_id: "S04",
        title: "Where Pressure Enters"
      },
      gate: {
        selected_scene_ready: true
      }
    },
    referenceManifest: {
      selected_references: ["04_assets/reference_images/ref_01.png"]
    }
  });

  assert.equal(fixture.fixture_locked, true);
  assert.equal(fixture.benchmark_scene_id, "S04");
  assert.equal(fixture.selected_reference_count, 1);
});

test("asset catalog summary flags structural-only libraries that lack actual categorized images", () => {
  const summary = summarizeAssetCatalog({
    referenceManifest: {
      selected_references: ["04_assets/reference_images/ref_01.png"],
      selected_asset_categories: []
    },
    libraryIndex: {
      reference_image_count: 3,
      general_asset_category_count: 19,
      general_asset_image_count: 0
    }
  });

  assert.equal(summary.sufficiency_decision, "structural_only");
  assert.ok(summary.warnings.some((item) => item.includes("unpopulated")));
});

test("production readiness keeps option2 in benchmark mode when scene proof exists but reliability blocks default use", () => {
  const decision = evaluateHybridProductionReadiness({
    benchmarkFixture: {
      fixture_locked: true,
      benchmark_promotion_ready: true
    },
    promotionGate: {
      gate: {
        topic_wide_ready: false
      }
    },
    reliabilityReport: {
      gate: {
        decision: "blocked",
        blockers: ["fallback ratio exceeds profile allowance"]
      }
    },
    machineProfile: {
      gpu: {
        model: "NVIDIA GeForce GTX 1080"
      }
    },
    assetCatalog: {
      sufficiency_decision: "structural_only"
    },
    overnightTrial: {
      status: "not_recorded"
    }
  });

  assert.equal(decision.decision, "keep_option2_in_benchmark_mode");
  assert.equal(decision.option2_default_approved, false);
  assert.ok(decision.warnings.some((item) => item.includes("reliability detail")));
});

test("production readiness report can approve option2 default when full-topic trust is proven", () => {
  const report = buildHybridProductionReadinessReport({
    topicId: "test_story_template",
    stillBenchmarkPack: {
      coverage: {
        shot_classes_covered: 7,
        shots_with_approved_keyframes: 26
      }
    },
    editorialReport: {
      scene: {
        scene_id: "S04",
        scene_title: "Where Pressure Enters"
      },
      summary: {
        benchmark_status: "editorial_benchmark_ready"
      }
    },
    promotionGate: {
      benchmark_editorial_scene: {
        scene_id: "S04",
        title: "Where Pressure Enters"
      },
      gate: {
        decision: "approved_for_topic_promotion",
        topic_wide_ready: true,
        selected_scene_ready: true,
        promoted_scene_count: 7,
        review_scene_count: 0,
        rework_scene_count: 0
      }
    },
    reliabilityReport: {
      gate: {
        decision: "ready_for_overnight_finish",
        blockers: []
      },
      readiness: {
        fallback_ratio: 0.2,
        fragile_scene_ratio: 0.1,
        review_scenes: 0,
        hold_scenes: 0
      }
    },
    machineProfile: {
      gpu: {
        model: "NVIDIA GeForce GTX 1080",
        vram_gb: 8
      },
      target_resolution: "1920x1080",
      overnight_mode: true
    },
    referenceManifest: {
      selected_references: ["04_assets/reference_images/ref_01.png"],
      selected_asset_categories: ["trucks"]
    },
    libraryIndex: {
      reference_image_count: 3,
      general_asset_category_count: 19,
      general_asset_image_count: 120
    },
    overnightState: {
      completed_at: "2026-07-22T03:00:00.000Z",
      completed_steps: ["preview", "finish"],
      last_reliability_decision: "ready_for_overnight_finish"
    }
  });

  assert.equal(report.decision.decision, "approve_option2_as_default");
  assert.equal(report.default_path_recommendation, "make_option2_the_default_milestone_path");
});

test("professional semi-automation can become a permanent-solution candidate when overnight proof passes", () => {
  const summary = summarizeProfessionalSemiAutomationInputs({
    toolchainMapReport: {
      gate: { decision: "toolchain_map_locked" }
    },
    reintegrationReport: {
      gate: { decision: "professional_reintegration_locked" },
      summary: {
        benchmark_scene_id: "S04",
        benchmark_status: "editorial_benchmark_ready",
        benchmark_only_mode: false,
        imported_scene_asset_present: true,
        imported_shot_asset_count: 5
      }
    },
    productionReadiness: {
      asset_catalog: {
        sufficiency_decision: "usable",
        workspace_selected_category_count: 4,
        general_asset_image_count: 120
      },
      overnight_trial: {
        status: "passed"
      },
      decision: {
        decision: "approve_option2_as_default"
      }
    },
    reliabilityReport: {
      gate: {
        decision: "ready_for_overnight_finish",
        blockers: []
      },
      readiness: {
        fallback_ratio: 0.1,
        fragile_scene_ratio: 0,
        review_scenes: 0,
        hold_scenes: 0
      }
    }
  });

  assert.equal(summary.route_classification, "permanent_solution_candidate");
});

test("professional export summary counts upstream handoff materials", () => {
  const summary = summarizeProfessionalExportInputs({
    castPackage: {
      cast_members: [{ cast_member_id: "CAST_001" }, { cast_member_id: "CAST_002" }]
    },
    shotPlan: {
      scenes: [
        { shots: [{ shot_id: "A" }, { shot_id: "B" }] },
        { shots: [{ shot_id: "C" }] }
      ]
    },
    compositionGuideFiles: ["S01_SHOT_001.json", "S01_SHOT_001.png"],
    artDirectionFiles: ["S01_SHOT_001.json", "S01_SHOT_001.md"],
    referenceManifest: {
      selected_references: ["ref_a.png", "ref_b.png"],
      selected_asset_categories: ["trucks"]
    },
    voicePackage: {
      transcript: true,
      captions: true,
      voice_timing: true,
      voiceover_clean: true
    },
    benchmarkPack: {
      benchmark_profile: {
        benchmark_pack_requirements: ["locked refs", "guidance"]
      }
    },
    libraryIndex: {
      reference_image_count: 3,
      general_asset_category_count: 19,
      general_asset_image_count: 0
    },
    productionReadiness: {
      benchmark_fixture: {
        fixture_locked: true
      },
      decision: {
        decision: "keep_option2_in_benchmark_mode"
      }
    },
    hybridContract: {
      character_contracts: [{ character_id: "BT_CHAR_0001" }],
      shot_contracts: [{ shot_id: "S01_SHOT_001" }, { shot_id: "S01_SHOT_002" }]
    }
  });

  assert.equal(summary.cast_member_count, 2);
  assert.equal(summary.shot_count, 3);
  assert.equal(summary.composition_guide_count, 1);
  assert.equal(summary.hybrid_shot_contract_count, 2);
});

test("professional export lock blocks incomplete upstream packages", () => {
  const gate = evaluateProfessionalExportLock({
    cast_member_count: 0,
    scene_count: 0,
    shot_count: 0,
    composition_guide_count: 0,
    art_direction_count: 0,
    selected_reference_count: 0,
    has_transcript: false,
    has_captions: false,
    has_voice_timing: false,
    benchmark_requirement_count: 0,
    benchmark_fixture_locked: false,
    has_voiceover_clean: false,
    library_general_asset_image_count: 0,
    selected_category_count: 0,
    hybrid_character_contract_count: 0,
    hybrid_shot_contract_count: 0
  });

  assert.equal(gate.decision, "incomplete_export_lock");
  assert.ok(gate.blockers.some((item) => item.includes("cast export package")));
  assert.ok(gate.blockers.some((item) => item.includes("audio/timing packaging")));
});

test("professional export report can lock benchmark-safe upstream handoff", () => {
  const report = buildProfessionalExportLockReport({
    topicId: "test_story_template",
    exportId: "export_001",
    castPackage: {
      cast_members: [{ cast_member_id: "CAST_001" }]
    },
    shotPlan: {
      scenes: [{ shots: [{ shot_id: "S01_SHOT_001" }] }]
    },
    compositionGuideFiles: ["S01_SHOT_001.json"],
    artDirectionFiles: ["S01_SHOT_001.json"],
    referenceManifest: {
      selected_references: ["ref_a.png"],
      selected_asset_categories: ["trucks"]
    },
    voicePackage: {
      transcript: true,
      captions: true,
      voice_timing: true,
      voiceover_clean: true
    },
    benchmarkPack: {
      benchmark_profile: {
        benchmark_pack_requirements: ["locked refs", "guidance"]
      }
    },
    libraryIndex: {
      reference_image_count: 3,
      general_asset_category_count: 19,
      general_asset_image_count: 12
    },
    productionReadiness: {
      benchmark_fixture: {
        benchmark_scene_id: "S04",
        benchmark_scene_title: "Where Pressure Enters",
        selected_reference_count: 1,
        fixture_locked: true,
        governance_notes: ["locked"]
      },
      decision: {
        decision: "keep_option2_in_benchmark_mode",
        benchmark_only_approved: true
      }
    },
    hybridContract: {
      character_contracts: [{ character_id: "BT_CHAR_0001" }],
      shot_contracts: [{ shot_id: "S01_SHOT_001" }]
    }
  });

  assert.equal(report.gate.decision, "export_locked");
  assert.equal(report.benchmark_guidance.benchmark_scene_id, "S04");
  assert.equal(report.external_handoff_guidance.benchmark_only_mode, true);
});

test("professional toolchain summary counts repo-side motion coverage for pro tools", () => {
  const summary = summarizeProfessionalToolchainInputs({
    exportLockReport: {
      gate: { decision: "export_locked" },
      benchmark_guidance: { benchmark_scene_id: "S04" },
      external_handoff_guidance: { benchmark_only_mode: true }
    },
    exportManifest: {
      artifact_count: 252
    },
    hybridContract: {
      characters: [{ character_id: "BT_CHAR_0001" }],
      shots: [{
        shot_id: "S04_SHOT_004",
        shot_class: "closeup_face",
        layer_export: {
          layer_manifest_file: "07_visuals/shot_layers/S04_SHOT_004/layer_manifest.json"
        },
        rig_bindings: [{
          sockets: {
            mouth_socket: { x: 0.5, y: 0.63 },
            prop_socket_primary: { x: 0.73, y: 0.64 }
          }
        }],
        motion_requirements: {
          mouth_shapes: ["neutral", "talking"],
          pose_states: ["blink_closed", "head_turn_left"],
          prop_socket_requirements: ["prop_socket_primary"]
        },
        performance_handoff: {
          camera_recipe: { movement: "steady_push" },
          actor_tracks: [{
            mouth_track: true,
            blink_track: true,
            head_turn_track: true,
            gesture_profile: "explain_point",
            prop_track: { interaction: "folder_reveal" },
            prop_ids: ["PROP_EVIDENCE_FOLDER"]
          }]
        },
        return_requirements: {
          required_files: ["rendered_shot", "handoff_report"]
        }
      }]
    },
    productionReadiness: {
      decision: {
        decision: "keep_option2_in_benchmark_mode"
      }
    },
    toolchainProfileId: "adobe_character_animator_after_effects",
    toolchainProfile: {
      label: "Adobe Character Animator + After Effects",
      capability_map: {
        mouth_sync: {},
        blink_and_gesture_systems: {},
        puppet_setup: {},
        prop_interaction: {},
        shot_compositing: {},
        camera_control: {}
      }
    }
  });

  assert.equal(summary.export_lock_decision, "export_locked");
  assert.equal(summary.mouth_ready_shot_count, 1);
  assert.equal(summary.puppet_ready_shot_count, 1);
  assert.equal(summary.prop_ready_shot_count, 1);
  assert.equal(summary.camera_ready_shot_count, 1);
});

test("professional toolchain map blocks incomplete pro-tool handoff", () => {
  const gate = evaluateProfessionalToolchainMap({
    export_lock_decision: "incomplete_export_lock",
    toolchain_profile_id: null,
    shot_contract_count: 0,
    character_contract_count: 0,
    mouth_ready_shot_count: 0,
    puppet_ready_shot_count: 0,
    camera_ready_shot_count: 0,
    compositing_ready_shot_count: 0,
    prop_ready_shot_count: 0,
    socket_coverage: {}
  }, {
    capability_map: {
      mouth_sync: {},
      puppet_setup: {}
    }
  });

  assert.equal(gate.decision, "incomplete_toolchain_map");
  assert.ok(gate.blockers.some((item) => item.includes("export lock")));
  assert.ok(gate.blockers.some((item) => item.includes("mouth-sync coverage")));
});

test("professional toolchain map can lock a benchmark-safe operating model", () => {
  const report = buildProfessionalToolchainMapReport({
    topicId: "test_story_template",
    mapId: "map_001",
    toolchainProfileId: "adobe_character_animator_after_effects",
    toolchainProfile: {
      label: "Adobe Character Animator + After Effects",
      puppet_tool: "Adobe Character Animator",
      speech_tool: "Adobe Character Animator Lip Sync",
      compositing_tool: "Adobe After Effects",
      camera_tool: "Adobe After Effects",
      best_for: ["speaking puppet shots"],
      capability_map: {
        mouth_sync: {
          primary_tool: "Adobe Character Animator Lip Sync",
          secondary_tool: "Adobe After Effects",
          workflow_summary: "lip sync"
        },
        blink_and_gesture_systems: {
          primary_tool: "Adobe Character Animator Behaviors",
          secondary_tool: "Adobe After Effects",
          workflow_summary: "gesture"
        },
        puppet_setup: {
          primary_tool: "Adobe Character Animator Puppet Authoring",
          secondary_tool: "Photoshop",
          workflow_summary: "puppets"
        },
        prop_interaction: {
          primary_tool: "Adobe Character Animator + After Effects",
          secondary_tool: "Manual keyed overrides",
          workflow_summary: "props"
        },
        shot_compositing: {
          primary_tool: "Adobe After Effects",
          secondary_tool: "Premiere",
          workflow_summary: "comp"
        },
        camera_control: {
          primary_tool: "Adobe After Effects",
          secondary_tool: "Null-based camera rigs",
          workflow_summary: "camera"
        }
      }
    },
    exportLockReport: {
      gate: { decision: "export_locked" },
      benchmark_guidance: { benchmark_scene_id: "S04" },
      external_handoff_guidance: { benchmark_only_mode: true }
    },
    exportManifest: {
      export_id: "export_001",
      export_dir: "workspaces/test_story_template/11_external_handoff/professional_export_lock/export_001",
      artifact_count: 252
    },
    hybridContract: {
      characters: [{ character_id: "BT_CHAR_0001" }],
      shots: [{
        shot_id: "S04_SHOT_004",
        shot_class: "closeup_face",
        layer_export: {
          layer_manifest_file: "07_visuals/shot_layers/S04_SHOT_004/layer_manifest.json"
        },
        rig_bindings: [{
          sockets: {
            mouth_socket: { x: 0.5, y: 0.63 },
            brow_socket: { x: 0.5, y: 0.34 },
            eye_line_anchor: { x: 0.5, y: 0.42 },
            prop_socket_primary: { x: 0.73, y: 0.64 }
          }
        }],
        motion_requirements: {
          mouth_shapes: ["neutral", "talking", "emphatic"],
          pose_states: ["blink_closed", "head_turn_left"],
          prop_socket_requirements: ["prop_socket_primary"]
        },
        performance_handoff: {
          camera_recipe: { movement: "steady_push" },
          actor_tracks: [{
            mouth_track: true,
            blink_track: true,
            head_turn_track: true,
            gesture_profile: "explain_point",
            prop_track: { interaction: "folder_reveal" },
            prop_ids: ["PROP_EVIDENCE_FOLDER"]
          }]
        },
        return_requirements: {
          required_files: ["rendered_shot", "alpha_or_matte_if_supported", "handoff_report"]
        }
      }]
    },
    productionReadiness: {
      decision: {
        decision: "keep_option2_in_benchmark_mode"
      }
    }
  });

  assert.equal(report.gate.decision, "toolchain_map_locked");
  assert.equal(report.toolchain_profile.profile_id, "adobe_character_animator_after_effects");
  assert.equal(report.capability_mappings.length, 6);
  assert.equal(report.operating_model.length, 6);
});

test("professional hero scene summary counts benchmark-scene acting coverage", () => {
  const summary = summarizeProfessionalHeroSceneInputs({
    exportLockReport: {
      gate: { decision: "export_locked" },
      benchmark_guidance: { benchmark_scene_id: "S04" }
    },
    toolchainMapReport: {
      gate: { decision: "toolchain_map_locked" },
      summary: { benchmark_scene_id: "S04", benchmark_only_mode: true }
    },
    hybridEditorialReport: {
      scene: { scene_id: "S04" },
      summary: {
        premium_motion_shots: 5,
        fallback_shots: 0,
        editorial_pacing: "balanced",
        continuity_status: "locked",
        benchmark_status: "editorial_benchmark_ready",
        promotion_status: "ready_for_finish"
      },
      final_sequence_file: "08_animation/hybrid_editorial/S04_hybrid_editorial_sequence.mp4",
      shots: [{ shot_id: "S04_SHOT_001" }, { shot_id: "S04_SHOT_002" }]
    },
    hybridContract: {
      shot_contracts: [{
        shot_id: "S04_SHOT_002",
        scene_id: "S04",
        shot_class: "closeup_face",
        performance_handoff: {
          actor_tracks: [{
            mouth_track: true,
            prop_track: { interaction: "folder_reveal" },
            prop_ids: ["PROP_A"]
          }]
        }
      }, {
        shot_id: "S04_SHOT_003",
        scene_id: "S04",
        shot_class: "document_insert",
        performance_handoff: {
          actor_tracks: [{
            mouth_track: false,
            prop_ids: ["PROP_B"]
          }]
        }
      }]
    },
    productionReadiness: {
      decision: { decision: "keep_option2_in_benchmark_mode" }
    },
    voicePackage: {
      voiceover_clean: true,
      captions: true,
      voice_timing: true
    },
    musicPackage: {
      music_manifest: false
    }
  });

  assert.equal(summary.scene_shot_contract_count, 2);
  assert.equal(summary.talking_shot_count, 1);
  assert.equal(summary.prop_interaction_shot_count, 2);
  assert.equal(summary.closeup_shot_count, 1);
  assert.equal(summary.insert_shot_count, 1);
});

test("professional hero scene blocks when benchmark-scene proof is incomplete", () => {
  const gate = evaluateProfessionalHeroScene({
    export_lock_decision: "incomplete_export_lock",
    toolchain_map_decision: "incomplete_toolchain_map",
    benchmark_scene_id: null,
    scene_shot_contract_count: 0,
    has_final_sequence: false,
    premium_motion_shot_count: 0,
    has_voiceover_clean: false,
    has_captions: false,
    has_voice_timing: false,
    talking_shot_count: 0,
    prop_interaction_shot_count: 0,
    closeup_shot_count: 0,
    insert_shot_count: 0,
    fallback_shot_count: 2,
    benchmark_status: "not_ready"
  });

  assert.equal(gate.decision, "incomplete_hero_scene_build");
  assert.ok(gate.blockers.some((item) => item.includes("export lock")));
  assert.ok(gate.blockers.some((item) => item.includes("talking-shot proof")));
});

test("professional hero scene can lock a governed benchmark build package", () => {
  const report = buildProfessionalHeroSceneReport({
    topicId: "test_story_template",
    buildId: "build_001",
    exportLockReport: {
      gate: { decision: "export_locked" },
      benchmark_guidance: {
        benchmark_scene_id: "S04",
        benchmark_scene_title: "Where Pressure Enters"
      }
    },
    toolchainMapReport: {
      gate: { decision: "toolchain_map_locked" },
      summary: { benchmark_scene_id: "S04", benchmark_only_mode: true }
    },
    hybridEditorialReport: {
      scene: {
        scene_id: "S04",
        scene_title: "Where Pressure Enters"
      },
      summary: {
        premium_motion_shots: 5,
        fallback_shots: 0,
        editorial_pacing: "balanced",
        continuity_status: "locked",
        benchmark_status: "editorial_benchmark_ready",
        promotion_status: "ready_for_finish",
        audio_mix_strategy: { music_duck_db: -18 },
        subtitle_safe_region: { mode: "top_safe" }
      },
      final_sequence_file: "08_animation/hybrid_editorial/S04_hybrid_editorial_sequence.mp4",
      shots: [{
        shot_id: "S04_SHOT_001",
        shot_class: "establishing_wide",
        editorial_role: "entry",
        proof_clip_file: "08_animation/hybrid_editorial/S04_SHOT_001_hybrid_editorial.mp4",
        poster_file: "07_visuals/generated_images/shot_posters/S04_SHOT_001_hybrid_editorial.png",
        camera_recipe: { movement: "steady_push" },
        motion_directives: ["idle_drift"]
      }, {
        shot_id: "S04_SHOT_004",
        shot_class: "closeup_face",
        editorial_role: "performance",
        proof_clip_file: "08_animation/hybrid_editorial/S04_SHOT_004_hybrid_editorial.mp4",
        poster_file: "07_visuals/generated_images/shot_posters/S04_SHOT_004_hybrid_editorial.png",
        camera_recipe: { movement: "steady_push" },
        motion_directives: ["talk_emphasis"]
      }, {
        shot_id: "S04_SHOT_005",
        shot_class: "top_down_document",
        editorial_role: "exit",
        proof_clip_file: "08_animation/hybrid_editorial/S04_SHOT_005_hybrid_editorial.mp4",
        poster_file: "07_visuals/generated_images/shot_posters/S04_SHOT_005_hybrid_editorial.png",
        camera_recipe: { movement: "steady_push" },
        motion_directives: ["invoice_counter"]
      }]
    },
    hybridContract: {
      shot_contracts: [{
        shot_id: "S04_SHOT_001",
        scene_id: "S04",
        shot_class: "establishing_wide",
        performance_handoff: {
          actor_tracks: [{ mouth_track: false, prop_ids: ["PROP_A"] }]
        }
      }, {
        shot_id: "S04_SHOT_004",
        scene_id: "S04",
        shot_class: "closeup_face",
        performance_handoff: {
          actor_tracks: [{ mouth_track: true, prop_track: { interaction: "folder_reveal" }, prop_ids: ["PROP_A"] }]
        }
      }, {
        shot_id: "S04_SHOT_005",
        scene_id: "S04",
        shot_class: "top_down_document",
        performance_handoff: {
          actor_tracks: [{ mouth_track: false, prop_ids: ["PROP_B"] }]
        }
      }]
    },
    productionReadiness: {
      decision: { decision: "keep_option2_in_benchmark_mode" }
    },
    voicePackage: {
      voiceover_clean: true,
      captions: true,
      voice_timing: true
    },
    musicPackage: {
      music_manifest: true
    }
  });

  assert.equal(report.gate.decision, "hero_scene_build_locked");
  assert.equal(report.benchmark_scene.scene_id, "S04");
  assert.equal(report.shot_builds.length, 3);
  assert.equal(report.acceptance_checklist.length, 6);
});

test("professional reintegration summary tracks imported benchmark assets and render-contract selection", () => {
  const summary = summarizeProfessionalReintegrationInputs({
    heroSceneReport: {
      benchmark_scene: { scene_id: "S04" },
      gate: { decision: "hero_scene_build_locked" },
      summary: {
        scene_shot_contract_count: 5,
        premium_motion_shot_count: 5,
        talking_shot_count: 3,
        prop_interaction_shot_count: 5,
        benchmark_status: "editorial_benchmark_ready",
        benchmark_only_mode: true,
        benchmark_default_decision: "keep_option2_in_benchmark_mode"
      },
      hero_sequence: {
        final_sequence_file: "08_animation/hybrid_editorial/S04_hybrid_editorial_sequence.mp4",
        audio_mix_strategy: { music_duck_db: -18 }
      }
    },
    renderContract: {
      scenes: [{
        scene_id: "S04",
        selected_asset_type: "professional_hero_scene_sequence",
        selected_asset_file: "08_animation/professional_imports/S04_professional_hero_sequence.mp4",
        asset_quality_classification: "premium_motion",
        promotion_status: "ready_for_finish",
        continuity_status: "locked",
        audio_mix_strategy: { music_duck_db: -18 }
      }]
    },
    importedSceneAsset: {
      asset_type: "professional_hero_scene_sequence",
      file: "08_animation/professional_imports/S04_professional_hero_sequence.mp4"
    },
    professionalShotAssets: [
      { asset_id: "PROHSHOT_S04_SHOT_001" },
      { asset_id: "PROHSHOT_S04_SHOT_002" }
    ]
  });

  assert.equal(summary.imported_scene_asset_present, true);
  assert.equal(summary.render_contract_selected_asset_type, "professional_hero_scene_sequence");
  assert.equal(summary.imported_shot_asset_count, 2);
  assert.equal(summary.audio_mix_match, true);
});

test("professional reintegration blocks when imported benchmark asset is not selected in render contract", () => {
  const gate = evaluateProfessionalReintegration({
    benchmark_scene_id: "S04",
    hero_scene_decision: "hero_scene_build_locked",
    imported_scene_asset_present: true,
    imported_scene_asset_type: "professional_hero_scene_sequence",
    imported_scene_asset_file: "08_animation/professional_imports/S04_professional_hero_sequence.mp4",
    imported_shot_asset_count: 5,
    render_contract_scene_present: true,
    render_contract_selected_asset_type: "bricktoon_composited_shot_sequence",
    render_contract_selected_asset_file: "08_animation/scene_sequences/S04_sequence.mp4",
    premium_motion_shot_count: 5,
    talking_shot_count: 3,
    prop_interaction_shot_count: 5,
    benchmark_status: "editorial_benchmark_ready"
  });

  assert.equal(gate.decision, "incomplete_professional_reintegration");
  assert.ok(gate.blockers.some((item) => item.includes("render contract did not select")));
});

test("professional reintegration can lock benchmark asset import back into repo contracts", () => {
  const report = buildProfessionalReintegrationReport({
    topicId: "test_story_template",
    reintegrationId: "reintegration_001",
    heroSceneReport: {
      benchmark_scene: { scene_id: "S04", scene_title: "Where Pressure Enters" },
      gate: { decision: "hero_scene_build_locked" },
      summary: {
        scene_shot_contract_count: 5,
        premium_motion_shot_count: 5,
        talking_shot_count: 3,
        prop_interaction_shot_count: 5,
        benchmark_status: "editorial_benchmark_ready",
        benchmark_only_mode: true,
        benchmark_default_decision: "keep_option2_in_benchmark_mode"
      },
      hero_sequence: {
        final_sequence_file: "08_animation/hybrid_editorial/S04_hybrid_editorial_sequence.mp4",
        audio_mix_strategy: { music_duck_db: -18 }
      },
      acceptance_checklist: ["speech readability", "prop interaction"]
    },
    renderContract: {
      scenes: [{
        scene_id: "S04",
        selected_asset_type: "professional_hero_scene_sequence",
        selected_asset_file: "08_animation/professional_imports/S04_professional_hero_sequence.mp4",
        asset_quality_classification: "premium_motion",
        promotion_status: "ready_for_finish",
        continuity_status: "locked",
        audio_mix_strategy: { music_duck_db: -18 }
      }]
    },
    importedSceneAsset: {
      asset_id: "PROHEROSEQ_S04_MAIN",
      asset_type: "professional_hero_scene_sequence",
      file: "08_animation/professional_imports/S04_professional_hero_sequence.mp4"
    },
    professionalShotAssets: [
      { asset_id: "PROHSHOT_S04_SHOT_001" },
      { asset_id: "PROHSHOT_S04_SHOT_002" }
    ]
  });

  assert.equal(report.gate.decision, "professional_reintegration_locked");
  assert.equal(report.render_contract_alignment.selected_asset_type, "professional_hero_scene_sequence");
  assert.equal(report.imported_assets.shot_assets.length, 2);
});

test("professional semi-automation summary classifies current route as benchmark-only when reliability still blocks scale", () => {
  const summary = summarizeProfessionalSemiAutomationInputs({
    toolchainMapReport: {
      gate: { decision: "toolchain_map_locked" }
    },
    reintegrationReport: {
      gate: { decision: "professional_reintegration_locked" },
      summary: {
        benchmark_scene_id: "S04",
        benchmark_status: "editorial_benchmark_ready",
        benchmark_only_mode: true,
        benchmark_default_decision: "keep_option2_in_benchmark_mode",
        imported_scene_asset_present: true,
        imported_shot_asset_count: 5
      }
    },
    productionReadiness: {
      asset_catalog: {
        sufficiency_decision: "structural_only",
        workspace_selected_category_count: 0,
        general_asset_image_count: 0
      },
      overnight_trial: {
        status: "not_recorded"
      },
      decision: {
        decision: "keep_option2_in_benchmark_mode"
      }
    },
    reliabilityReport: {
      gate: {
        decision: "blocked",
        blockers: ["fallback ratio too high"]
      },
      readiness: {
        fallback_ratio: 0.577,
        fragile_scene_ratio: 0.714,
        review_scenes: 2,
        hold_scenes: 5
      }
    }
  });

  assert.equal(summary.route_classification, "benchmark_route_only");
  assert.equal(summary.automation_buckets.standardized_now.length > 0, true);
  assert.equal(summary.automation_buckets.not_ready_for_automation.includes("automatic preview-to-finish promotion for the whole topic"), true);
});

test("professional semi-automation blocks if reintegration and benchmark inputs are missing", () => {
  const gate = evaluateProfessionalSemiAutomation({
    toolchain_map_decision: "incomplete_toolchain_map",
    reintegration_decision: "incomplete_professional_reintegration",
    benchmark_scene_id: null,
    imported_scene_asset_present: false,
    benchmark_status: "not_ready"
  });

  assert.equal(gate.decision, "incomplete_semi_automation_decision");
  assert.ok(gate.blockers.some((item) => item.includes("toolchain map")));
  assert.ok(gate.blockers.some((item) => item.includes("reintegration")));
});

test("professional semi-automation can lock a route classification decision", () => {
  const report = buildProfessionalSemiAutomationReport({
    topicId: "test_story_template",
    decisionId: "decision_001",
    toolchainMapReport: {
      gate: { decision: "toolchain_map_locked" }
    },
    reintegrationReport: {
      gate: { decision: "professional_reintegration_locked" },
      summary: {
        benchmark_scene_id: "S04",
        benchmark_status: "editorial_benchmark_ready",
        benchmark_only_mode: true,
        benchmark_default_decision: "keep_option2_in_benchmark_mode",
        imported_scene_asset_present: true,
        imported_shot_asset_count: 5
      }
    },
    productionReadiness: {
      asset_catalog: {
        sufficiency_decision: "structural_only",
        workspace_selected_category_count: 0,
        general_asset_image_count: 0
      },
      overnight_trial: {
        status: "not_recorded"
      },
      decision: {
        decision: "keep_option2_in_benchmark_mode"
      }
    },
    reliabilityReport: {
      gate: {
        decision: "blocked",
        blockers: ["fallback ratio too high"]
      },
      readiness: {
        fallback_ratio: 0.577,
        fragile_scene_ratio: 0.714,
        review_scenes: 2,
        hold_scenes: 5
      }
    }
  });

  assert.equal(report.gate.decision, "semi_automation_decision_locked");
  assert.equal(report.route_decision.route_classification, "benchmark_route_only");
  assert.equal(report.route_decision.recommended_use, "use_as_benchmark_route_only");
});
