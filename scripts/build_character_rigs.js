#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { ensureDir, loadManifest, readJsonSafe, relativeWorkspacePath, saveManifest, upsertAsset, writeJson, assetTimestamp } = require("../src/bricktoon/aiQualityPipeline");

function existingRelative(workspaceDir, relativePath) {
  const fullPath = path.join(workspaceDir, relativePath);
  return fs.existsSync(fullPath) ? relativePath.replaceAll("\\", "/") : null;
}

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
    ensureDir(rigsRoot);

    for (const character of visualBible.characters || []) {
      const characterDir = path.join(rigsRoot, character.character_id);
      ensureDir(characterDir);
      const rigPath = path.join(characterDir, "rig.json");
      const legacyRigPath = path.join(rigsRoot, `${character.character_id}.json`);
      const refsRoot = `07_visuals/character_refs/${character.character_id}`;
      const expressionsRoot = `${refsRoot}/expressions`;
      const stateAssets = {
        master: existingRelative(workspaceDir, `${refsRoot}/master.png`),
        front: existingRelative(workspaceDir, `${refsRoot}/front.png`),
        three_quarter: existingRelative(workspaceDir, `${refsRoot}/three_quarter.png`),
        side: existingRelative(workspaceDir, `${refsRoot}/side.png`),
        talking: existingRelative(workspaceDir, `${expressionsRoot}/talking.png`),
        worried: existingRelative(workspaceDir, `${expressionsRoot}/worried.png`),
        emphatic: existingRelative(workspaceDir, `${expressionsRoot}/emphatic.png`),
        blink_closed: existingRelative(workspaceDir, `${expressionsRoot}/blink_closed.png`),
        gesture_point: existingRelative(workspaceDir, `${expressionsRoot}/gesture_point.png`),
        hold_prop: existingRelative(workspaceDir, `${expressionsRoot}/hold_prop.png`)
      };

      writeJson(rigPath, {
        character_id: character.character_id,
        benchmark_profile: "option1_phase2_layer_and_rig_foundation",
        rig_version: 2,
        rig_type: "hybrid_2d_ai",
        source_reference_assets: stateAssets,
        motion_states: {
          blink: ["neutral", "blink_closed", "blink_half"],
          talk: ["neutral", "talk_open", "talk_emphasis"],
          head: ["neutral", "head_nod", "head_turn_left", "head_turn_right"],
          arms: ["neutral", "gesture_point", "gesture_open", "gesture_hold_prop"],
          props: ["neutral", "prop_reveal"]
        },
        parts: {
          body: { source: stateAssets.master || stateAssets.front, role: "torso_base" },
          head: { source: stateAssets.front || stateAssets.master, role: "head_base" },
          eyes: { source: stateAssets.front || stateAssets.master, role: "eye_track" },
          eyebrows: { source: stateAssets.front || stateAssets.master, role: "brow_track" },
          mouth: {
            neutral: stateAssets.front || stateAssets.master,
            talking: stateAssets.talking || stateAssets.front || stateAssets.master,
            emphatic: stateAssets.emphatic || stateAssets.talking || stateAssets.front || stateAssets.master,
            blink_closed: stateAssets.blink_closed || stateAssets.front || stateAssets.master
          },
          front_arm: {
            neutral: stateAssets.front || stateAssets.master,
            gesture_point: stateAssets.gesture_point || stateAssets.three_quarter || stateAssets.front || stateAssets.master,
            gesture_hold_prop: stateAssets.hold_prop || stateAssets.gesture_point || stateAssets.front || stateAssets.master
          },
          rear_arm: {
            neutral: stateAssets.three_quarter || stateAssets.front || stateAssets.master,
            gesture_open: stateAssets.emphatic || stateAssets.three_quarter || stateAssets.front || stateAssets.master
          },
          prop_anchor: {
            neutral: stateAssets.front || stateAssets.master,
            hold_prop: stateAssets.hold_prop || stateAssets.front || stateAssets.master
          },
          shadow_layer: { source: stateAssets.master || stateAssets.front, role: "shadow_proxy" }
        },
        sockets: {
          mouth_socket: { x: 0.5, y: 0.63 },
          brow_socket: { x: 0.5, y: 0.34 },
          eye_line_anchor: { x: 0.5, y: 0.42 },
          front_shoulder_socket: { x: 0.63, y: 0.54 },
          rear_shoulder_socket: { x: 0.37, y: 0.54 },
          prop_socket_primary: { x: 0.73, y: 0.64 }
        },
        extraction_expectations: {
          required_shot_layer_regions: [
            "character_foreground",
            "face_region",
            "arm_hand_region",
            "prop_main"
          ],
          clean_plate_requirement: "blurred_proxy_or_better",
          phase_goal: "motion_ready_package"
        }
      });
      if (fs.existsSync(legacyRigPath)) {
        fs.rmSync(legacyRigPath, { force: true });
      }
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
