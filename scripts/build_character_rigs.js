#!/usr/bin/env node

const path = require("path");
const { parseArgs } = require("../agents/common");
const { readJsonSafe, writeJson } = require("../src/bricktoon/aiQualityPipeline");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_character_rigs.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const visualBible = readJsonSafe(path.join(workspaceDir, "03_cast", "visual_character_bible.json"), {});
    const rigsRoot = path.join(workspaceDir, "07_visuals", "character_rigs");

    for (const character of visualBible.characters || []) {
      writeJson(path.join(rigsRoot, `${character.character_id}.json`), {
        character_id: character.character_id,
        rig_version: 1,
        rig_type: "hybrid_2d_ai",
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
    }

    console.log(`Character rigs built for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
