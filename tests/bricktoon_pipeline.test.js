const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const { resolveSceneAsset } = require("../src/render/resolveSceneAsset");
const { buildLayerRegions } = require("../src/bricktoon/layerRegions");
const { buildReliabilityReport, evaluateReliabilityGate } = require("../src/bricktoon/reliabilityGate");
const { cameraRecipeForShot, propTrackForMember } = require("../src/bricktoon/shotPerformanceContracts");
const { splitNarrationIntoCaptionChunks, summarizeSceneSequence } = require("../src/bricktoon/sequencePolish");
const { loadVisualGenerationConfig, resolveWorkflowTemplate, qualityClassificationForAsset } = require("../src/bricktoon/workflowContracts");
const { buildPerformanceFrameState, cameraStateForFrame } = require("../src/bricktoon/proceduralSequenceRenderer");
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
          continuity_status: "mixed",
          promotion_status: "ready_for_finish",
          premium_motion_shots: 3,
          fallback_shots: 1
        },
        {
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
