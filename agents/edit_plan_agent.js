#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    animationPlanPath: path.join(workspaceDir, "08_animation", "animation_plan.json"),
    editPlanPath: path.join(workspaceDir, "09_edit_plan", "edit_plan.md")
  };
}

function buildEditPlan(sceneCards, animationPlan) {
  const lines = [
    "# Edit Plan",
    "",
    "- Use bricktoon dramatization for story pressure scenes.",
    "- Use official source cards for proof scenes.",
    "- Keep captions centered and readable.",
    "- Use sound effects only on reveal beats, not constantly.",
    "",
    "## Scene Flow",
    ""
  ];

  for (const scene of sceneCards) {
    const animation = animationPlan.scenes.find((item) => item.scene_id === scene.scene_id);
    lines.push(`- ${scene.scene_id}: ${scene.caption_text} | ${scene.camera.movement} | ${(animation?.tasks || []).join(", ")}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/edit_plan_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const sceneCards = readJson(paths.sceneCardsPath).scene_cards || [];
    const animationPlan = readJson(paths.animationPlanPath);

    writeText(paths.editPlanPath, buildEditPlan(sceneCards, animationPlan));
    console.log(`Edit plan generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
