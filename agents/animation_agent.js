#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    animationPlanPath: path.join(workspaceDir, "08_animation", "animation_plan.json"),
    cameraMovesPath: path.join(workspaceDir, "08_animation", "camera_moves.json")
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/animation_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const sceneCards = readJson(paths.sceneCardsPath).scene_cards || [];
    const animationPlan = {
      style: "bricktoon_static_motion",
      strategy: "Static image motion first, optional image-to-video later.",
      scenes: sceneCards.map((card) => ({
        scene_id: card.scene_id,
        motion: card.camera.movement,
        tasks: [
          "slow zoom or push",
          "caption animation",
          ...(card.sound_effects || []).length > 0 ? ["timed sound effect hit"] : []
        ],
        duration_seconds: card.duration_seconds
      }))
    };
    const cameraMoves = sceneCards.map((card) => ({
      scene_id: card.scene_id,
      shot_type: card.camera.shot_type,
      movement: card.camera.movement,
      focus: card.camera.focus
    }));

    writeText(paths.animationPlanPath, `${JSON.stringify(animationPlan, null, 2)}\n`);
    writeText(paths.cameraMovesPath, `${JSON.stringify(cameraMoves, null, 2)}\n`);

    console.log(`Animation plan generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
