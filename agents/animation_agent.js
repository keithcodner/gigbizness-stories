#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    sceneCastMapPath: path.join(workspaceDir, "03_cast", "scene_cast_map.json"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    animationPlanPath: path.join(workspaceDir, "08_animation", "animation_plan.json"),
    cameraMovesPath: path.join(workspaceDir, "08_animation", "camera_moves.json")
  };
}

function inferSceneMotions(card, sceneAssignment, castPackage) {
  const text = `${card.narration} ${card.caption_text} ${card.environment} ${card.visual_prompt}`.toLowerCase();
  const motions = [];
  const castMembers = sceneAssignment?.cast || [];

  motions.push({
    type: "idle_drift",
    intensity: card.camera.movement === "quick zoom" ? "medium" : "subtle",
    target: "full_frame",
    purpose: "Keep still scenes feeling alive."
  });

  if (castMembers.some((member) => member.action_intent === "point")) {
    motions.push({
      type: "gesture_pulse",
      intensity: "subtle",
      target: "speaker",
      purpose: "Suggest arm gesture emphasis during explanation."
    });
  }

  if (castMembers.some((member) => member.action_intent === "moustache twirl")) {
    motions.push({
      type: "villain_emphasis",
      intensity: "medium",
      target: "antagonist",
      purpose: "Give the schemer a stronger theatrical presence."
    });
  }

  if (castMembers.some((member) => member.action_intent === "phone in hand")) {
    motions.push({
      type: "phone_glow",
      intensity: "subtle",
      target: "prop_phone",
      purpose: "Make phone-based pressure or discovery moments read instantly."
    });
  }

  if (castMembers.some((member) => member.action_intent === "folder reveal")) {
    motions.push({
      type: "proof_reveal",
      intensity: "medium",
      target: "document_area",
      purpose: "Make source or warning beats feel more official."
    });
  }

  if (/price|invoice|bill|fee|quote|cash/.test(text)) {
    motions.push({
      type: "invoice_counter",
      intensity: "high",
      target: "overlay",
      purpose: "Animate pricing pressure directly in-scene."
    });
  }

  if (/truck|door|slam|close/.test(text)) {
    motions.push({
      type: "impact_shake",
      intensity: "high",
      target: "full_frame",
      purpose: "Simulate truck-door or pressure-hit moments."
    });
  }

  if (/hack|cyber|breach|data/.test(text) || castPackage.cast_members?.some((member) => {
    const lowerName = `${member.role} ${member.name}`.toLowerCase();
    return card.characters.includes(member.character_id) && /hacker/.test(lowerName);
  })) {
    motions.push({
      type: "typing_overlay",
      intensity: "medium",
      target: "screen_area",
      purpose: "Create synthetic hacker activity and alert motion."
    });
  }

  motions.push({
    type: "blink_pass",
    intensity: "subtle",
    target: "character_group",
    purpose: "Add a periodic life cue even on static scene art."
  });

  motions.push({
    type: "talk_emphasis",
    intensity: "subtle",
    target: "speaker",
    purpose: "Add cadence pulses that read like speech energy."
  });

  return motions;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/animation_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const sceneCards = readJson(paths.sceneCardsPath).scene_cards || [];
    const sceneCastMap = readJson(paths.sceneCastMapPath).scenes || [];
    const castPackage = readJson(paths.castPath);
    const animationPlan = {
      style: "bricktoon_motion_plus",
      strategy: "Static image motion with scene-aware overlays, cadence pulses, and hero-beat emphasis before true character rigs.",
      scenes: []
    };
    animationPlan.scenes = sceneCards.map((card) => {
      const sceneAssignment = sceneCastMap.find((scene) => scene.scene_id === card.scene_id) || null;
      const motions = inferSceneMotions(card, sceneAssignment, castPackage);
      return {
        scene_id: card.scene_id,
        motion: card.camera.movement,
        tasks: [
          "slow zoom or push",
          "caption animation",
          ...(card.sound_effects || []).length > 0 ? ["timed sound effect hit"] : [],
          ...motions.map((motion) => `${motion.type}:${motion.intensity}`)
        ],
        motion_directives: motions,
        duration_seconds: card.duration_seconds
      };
    });
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
