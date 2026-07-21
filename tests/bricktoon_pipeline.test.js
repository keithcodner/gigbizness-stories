const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const { resolveSceneAsset } = require("../src/render/resolveSceneAsset");
const { loadVisualGenerationConfig, resolveWorkflowTemplate, qualityClassificationForAsset } = require("../src/bricktoon/workflowContracts");
const { buildCharacterLockLines, buildShotNegativePrompt, selectCharacterRefPaths } = require("../src/bricktoon/shotKeyframeGuidance");

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
