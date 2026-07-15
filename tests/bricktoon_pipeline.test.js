const test = require("node:test");
const assert = require("node:assert/strict");
const { getCastMembers } = require("../src/bricktoon/normalizeCast");
const { resolveSceneAsset } = require("../src/render/resolveSceneAsset");

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
