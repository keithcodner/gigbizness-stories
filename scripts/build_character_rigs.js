#!/usr/bin/env node

const path = require("path");
const { parseArgs } = require("../agents/common");
const { loadManifest, readJsonSafe, relativeWorkspacePath, saveManifest, upsertAsset, writeJson, assetTimestamp } = require("../src/bricktoon/aiQualityPipeline");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_character_rigs.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const visualBible = readJsonSafe(path.join(workspaceDir, "03_cast", "visual_character_bible.json"), {});
    const rigsRoot = path.join(workspaceDir, "07_visuals", "character_rigs");
    const manifest = loadManifest(workspaceDir);

    for (const character of visualBible.characters || []) {
      const rigPath = path.join(rigsRoot, `${character.character_id}.json`);
      writeJson(rigPath, {
        character_id: character.character_id,
        rig_version: 1,
        rig_type: "hybrid_2d_ai",
        motion_states: {
          blink: ["neutral", "blink_closed", "blink_half"],
          talk: ["neutral", "talk_open", "talk_emphasis"],
          head: ["neutral", "head_nod", "head_turn_left", "head_turn_right"],
          arms: ["neutral", "gesture_point", "gesture_open", "gesture_hold_prop"],
          props: ["neutral", "prop_reveal"]
        },
        parts: [
          "body",
          "head",
          "eyes",
          "eyebrows",
          "mouth",
          "rear_upper_arm",
          "rear_forearm",
          "rear_hand",
          "front_upper_arm",
          "front_forearm",
          "front_hand",
          "clothing_overlay",
          "shadow_layer"
        ]
      });
      upsertAsset(manifest, {
        asset_id: `RIG_${character.character_id}`,
        asset_type: "character_rig",
        character_ids: [character.character_id],
        file: relativeWorkspacePath(workspaceDir, rigPath),
        status: "approved",
        created_at: assetTimestamp()
      });
    }

    saveManifest(workspaceDir, manifest);
    console.log(`Character rigs built for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
