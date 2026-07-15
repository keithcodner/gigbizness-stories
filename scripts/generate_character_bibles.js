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
          outfit_prop_sheet: `${characterId}/outfit_sheet.png`
        },
        continuity_anchors: [
          "face_print_layout",
          "hair_or_hat_silhouette",
          "primary_outfit_palette",
          "signature_prop_zone"
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
      style_lock_package: {
        material_finish: "painted plastic with dimensional highlights",
        lighting_behavior: "dramatic directional lighting",
        face_rules: ["stable eye spacing", "clean face print geometry"],
        hand_arm_rules: ["no extra fingers", "no fused hands", "preserve wrist silhouette"],
        environment_density: "rich but controlled detail",
        never_generate: ["blurry faces", "distorted hands", "extra limbs", "floating props", "unreadable generated text"]
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
