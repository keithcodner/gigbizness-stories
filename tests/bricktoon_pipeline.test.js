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
