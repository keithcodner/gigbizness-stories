#!/usr/bin/env node

const path = require("path");
const {
  assetTimestamp,
  createPlaceholderPng,
  ensureDir,
  loadManifest,
  readJsonSafe,
  relativeWorkspacePath,
  saveManifest,
  upsertAsset,
  writeJson,
  writeMarkdown
} = require("../src/bricktoon/aiQualityPipeline");
const { getCastMembers, getCharacterId, getCharacterBlueprint } = require("../src/bricktoon/normalizeCast");
const { parseArgs } = require("../agents/common");

function defaultPalette(member, blueprint) {
  return {
    primary: member.primary_color || blueprint.primary_color || "#1f2937",
    secondary: member.secondary_color || blueprint.secondary_color || "#b91c1c",
    accent: member.accent_color || "#f59e0b",
    skin: "#f6d54a",
    outline: "#111827"
  };
}

function expressionStatesForMember(member, blueprint) {
  const configured = Array.isArray(member.expressions)
    ? member.expressions
    : Array.isArray(blueprint.expressions)
      ? blueprint.expressions
      : [];
  return [...new Set([...configured, "neutral", "talking", "worried", "emphatic", "blink_closed"])];
}

function gestureStatesForMember(member, blueprint) {
  const configured = Array.isArray(member.poses)
    ? member.poses
    : Array.isArray(blueprint.poses)
      ? blueprint.poses
      : [];
  return [...new Set([...configured, "neutral", "gesture_open", "gesture_point", "gesture_hold_prop"])];
}

function propStatesForMember(member) {
  const propIds = Array.isArray(member.prop_ids) ? member.prop_ids : [];
  return {
    available_props: propIds,
    default_prop_state: propIds.length > 0 ? "hold_primary_prop" : "no_prop",
    required_readability: propIds.length > 0 ? "active_prop_must_be_fully_readable" : "prop_not_required"
  };
}

function hybridHandoffContractForMember(characterId, definition) {
  return {
    benchmark_profile: "option2_phase1_repo_side_still_identity_lock",
    required_reference_variants: [
      `${characterId}/master.png`,
      `${characterId}/front.png`,
      `${characterId}/three_quarter.png`,
      `${characterId}/expressions/talking.png`,
      `${characterId}/expressions/worried.png`,
      `${characterId}/expressions/blink_closed.png`,
      `${characterId}/expressions/gesture_point.png`,
      `${characterId}/expressions/hold_prop.png`
    ],
    continuity_hard_locks: definition.continuity_anchors,
    motion_handoff_targets: [
      "face",
      "mouth",
      "eyes",
      "eyebrows",
      "front_arm",
      "rear_arm",
      "primary_prop_socket"
    ],
    still_acceptance_focus: [
      "identity_lock",
      "thumbnail_style_match",
      "expression_variant_readability",
      "prop_continuity",
      "hybrid_handoff_readiness"
    ]
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_character_bibles.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const castPath = path.join(workspaceDir, "03_cast", "cast.json");
    const castPackage = readJsonSafe(castPath, {});
    const manifest = loadManifest(workspaceDir);
    const members = getCastMembers(castPackage);
    const bibleDir = path.join(workspaceDir, "07_visuals", "character_bibles");
    const environmentDir = path.join(workspaceDir, "07_visuals", "environment_bibles");
    const sceneCards = readJsonSafe(path.join(workspaceDir, "05_scene_cards", "scene_cards.json"), {});
    const topLevelBiblePath = path.join(workspaceDir, "03_cast", "visual_character_bible.json");

    ensureDir(bibleDir);
    ensureDir(environmentDir);

    const characterBibles = [];
    for (const member of members) {
      const characterId = getCharacterId(member);
      if (!characterId) {
        continue;
      }
      const blueprint = getCharacterBlueprint(member);
      const characterDir = path.join(bibleDir, characterId);
      ensureDir(characterDir);

      const definition = {
        character_id: characterId,
        role: member.role || blueprint.archetype_id || "supporting character",
        visual_identity: {
          body_type: member.body_type || "stylized brick-built figure",
          head_shape: member.head_shape || "rounded square brick head",
          primary_expression: member.primary_expression || "focused documentary seriousness",
          hair: member.hair || blueprint.hair || "styled brick hair",
          facial_hair: member.facial_hair || blueprint.facial_hair || "none",
          hat: member.hat || "none",
          outfit: member.outfit || blueprint.outfit || "role-appropriate bricktoon clothing",
          accent: member.accent || "simple highlight accent"
        },
        locked_features: [
          "head proportions",
          "outfit silhouette",
          "eyebrow design",
          "signature accessory"
        ],
        reference_slots: {
          neutral_turnaround: `${characterId}/front.png`,
          expression_sheet: `${characterId}/expression_sheet.png`,
          action_pose_sheet: `${characterId}/hand_sheet.png`,
          outfit_prop_sheet: `${characterId}/outfit_sheet.png`,
          talking_closeup: `${characterId}/expressions/talking.png`,
          blink_variant: `${characterId}/expressions/blink_closed.png`,
          gesture_point_variant: `${characterId}/expressions/gesture_point.png`,
          hold_prop_variant: `${characterId}/expressions/hold_prop.png`
        },
        continuity_anchors: [
          "face_print_layout",
          "hair_or_hat_silhouette",
          "primary_outfit_palette",
          "signature_prop_zone"
        ],
        expression_states: expressionStatesForMember(member, blueprint),
        gesture_states: gestureStatesForMember(member, blueprint),
        prop_states: propStatesForMember(member),
        animation_ready_contract: {
          benchmark_profile: "option1_phase1_animation_ready_art_lock",
          framing_requirements: [
            "preserve mouth readability",
            "preserve eye and eyebrow readability",
            "avoid cropping active hands when gesture or prop work matters",
            "keep signature prop zones separable from background"
          ],
          rig_targets: [
            "mouth",
            "eyes",
            "eyebrows",
            "front_arm",
            "rear_arm",
            "prop_socket_primary"
          ]
        },
        hybrid_handoff_contract: {},
        benchmark_review_checklist: [
          "identity is stable and recognizable",
          "expression variants read clearly",
          "talking variant keeps mouth area clean",
          "gesture variant preserves readable arm silhouette",
          "prop variant keeps the active prop fully readable"
        ],
        approved_visual_locks: {
          material_finish: "painted plastic with dimensional highlights",
          lighting_behavior: "cinematic directional key with controlled rim light",
          face_construction: "stable bricktoon geometry and eye spacing",
          hand_arm_safety: "avoid extra fingers, fused hands, or missing wrists",
          environment_density: "rich but controlled detail",
          never_generate: [
            "blurry faces",
            "distorted hands",
            "extra limbs",
            "floating props",
            "unreadable embedded text"
          ]
        },
        palette: defaultPalette(member, blueprint),
        created_at: assetTimestamp()
      };
      definition.hybrid_handoff_contract = hybridHandoffContractForMember(characterId, definition);

      const palettePath = path.join(characterDir, "palette.json");
      writeJson(path.join(characterDir, "character_definition.json"), definition);
      writeJson(palettePath, definition.palette);

      const imageFiles = [
        "front.png",
        "three_quarter_left.png",
        "three_quarter_right.png",
        "side.png",
        "back.png",
        "expression_sheet.png",
        "hand_sheet.png",
        "outfit_sheet.png"
      ];
      for (const fileName of imageFiles) {
        createPlaceholderPng(path.join(characterDir, fileName), {
          width: 1024,
          height: 1024,
          color: "0x1e293b",
          boxes: [
            { x: 320, y: 120, w: 384, h: 640, color: "0xf59e0b@0.9" },
            { x: 400, y: 60, w: 220, h: 120, color: "0x38bdf8@0.85" }
          ]
        });
      }

      writeMarkdown(path.join(characterDir, "README.md"), `# ${characterId}\n\nGenerated placeholder visual bible for ${characterId}.\n`);

      characterBibles.push({
        character_id: characterId,
        definition_file: relativeWorkspacePath(workspaceDir, path.join(characterDir, "character_definition.json")),
        palette_file: relativeWorkspacePath(workspaceDir, palettePath),
        continuity_anchors: definition.continuity_anchors,
        approved_visual_locks: definition.approved_visual_locks,
        reference_slots: definition.reference_slots,
        expression_states: definition.expression_states,
        gesture_states: definition.gesture_states,
        prop_states: definition.prop_states,
        animation_ready_contract: definition.animation_ready_contract,
        hybrid_handoff_contract: definition.hybrid_handoff_contract,
        benchmark_review_checklist: definition.benchmark_review_checklist,
        views: imageFiles.map((fileName) => relativeWorkspacePath(workspaceDir, path.join(characterDir, fileName)))
      });

      upsertAsset(manifest, {
        asset_id: `BIBLE_${characterId}_MAIN`,
        asset_type: "character_bible",
        character_ids: [characterId],
        file: relativeWorkspacePath(workspaceDir, path.join(characterDir, "front.png")),
        status: "approved",
        quality_tier: "standard",
        created_at: assetTimestamp()
      });
    }

    writeJson(topLevelBiblePath, {
      visual_bible_version: 1,
      benchmark_profile: "option1_phase1_animation_ready_art_lock",
      benchmark_profiles: [
        "option1_phase1_animation_ready_art_lock",
        "option2_phase1_repo_side_still_identity_lock"
      ],
      style_lock_package: {
        material_finish: "painted plastic with dimensional highlights",
        lighting_behavior: "dramatic directional lighting",
        face_rules: ["stable eye spacing", "clean face print geometry"],
        hand_arm_rules: ["no extra fingers", "no fused hands", "preserve wrist silhouette"],
        environment_density: "rich but controlled detail",
        never_generate: ["blurry faces", "distorted hands", "extra limbs", "floating props", "unreadable generated text"]
      },
      animation_ready_global_rules: {
        framing: [
          "keep speaking-shot mouths readable",
          "preserve clean face separation for blink and brow animation",
          "preserve readable hand silhouettes on gesture shots",
          "keep active props separable from background"
        ],
        benchmark_acceptance: [
          "animation-ready still, not poster-only still",
          "identity lock before motion",
          "prop readability when required",
          "clean mouth zone for talking variants"
        ]
      },
      hybrid_handoff_global_rules: {
        benchmark_profile: "option2_phase1_repo_side_still_identity_lock",
        still_quality_gate: [
          "character master refs must be locked before hybrid motion handoff",
          "shot stills must map cleanly to a shot class",
          "talking and reaction variants must exist for hero characters",
          "prop continuity must be explicit when story props matter",
          "workflow and checkpoint evidence must be preserved beside outputs"
        ],
        benchmark_pack_outputs: [
          "benchmark_pack/hybrid_still_benchmark_pack.json",
          "benchmark_pack/hybrid_still_benchmark_pack.md"
        ]
      },
      characters: characterBibles
    });

    const environments = [...new Set((sceneCards.scene_cards || []).map((scene) => scene.environment).filter(Boolean))];
    for (const environmentId of environments) {
      const safeId = environmentId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const envJsonPath = path.join(environmentDir, `${safeId}.json`);
      const envPngPath = path.join(environmentDir, `${safeId}.png`);
      writeJson(envJsonPath, {
        environment_id: safeId,
        source_label: environmentId,
        continuity_notes: [
          "Maintain consistent storefront geometry.",
          "Preserve key prop zones for deterministic staging."
        ]
      });
      createPlaceholderPng(envPngPath, {
        width: 1536,
        height: 864,
        color: "0x334155",
        boxes: [
          { x: 180, y: 180, w: 1170, h: 420, color: "0xf8fafc@0.9" },
          { x: 320, y: 340, w: 280, h: 180, color: "0xf59e0b@0.86" }
        ]
      });
    }

    saveManifest(workspaceDir, manifest);
    console.log(`Character bibles generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
