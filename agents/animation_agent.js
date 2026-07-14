#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    sceneCastMapPath: path.join(workspaceDir, "03_cast", "scene_cast_map.json"),
    shotPlanPath: path.join(workspaceDir, "07_shot_plans", "shot_plan.json"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    animationPlanPath: path.join(workspaceDir, "08_animation", "animation_plan.json"),
    cameraMovesPath: path.join(workspaceDir, "08_animation", "camera_moves.json"),
    shotPerformancePath: path.join(workspaceDir, "08_animation", "shot_performances.json")
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
    const shotPlan = readJson(paths.shotPlanPath).scenes || [];
    const castPackage = readJson(paths.castPath);
    const animationPlan = {
      animation_plan_version: 2,
      style: "bricktoon_motion_plus",
      strategy: "Scene-aware motion directives plus shot-level performance timing for procedural multi-shot bricktoon sequences.",
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
    const shotPerformances = shotPlan.flatMap((scene) => {
      const card = sceneCards.find((item) => item.scene_id === scene.scene_id);
      const sceneAssignment = sceneCastMap.find((item) => item.scene_id === scene.scene_id) || { cast: [] };
      return scene.shots.map((shot) => ({
        scene_id: scene.scene_id,
        shot_id: shot.shot_id,
        duration_seconds: Number((shot.end - shot.start).toFixed(2)),
        performances: sceneAssignment.cast.map((member, index) => ({
          actor_id: member.cast_member_id,
          actions: [
            {
              action: index === 0 ? "talk_calm" : "idle_basic",
              start: 0,
              end: Number(Math.max(0.6, (shot.end - shot.start) * 0.55).toFixed(2)),
              intensity: index === 0 ? 0.65 : 0.35
            },
            {
              action: member.action_intent === "moustache twirl"
                ? "villain_grin"
                : member.action_intent === "folder reveal"
                  ? "hand_over_document"
                  : member.action_intent === "phone in hand"
                    ? "double_take"
                    : "blink",
              start: Number(Math.max(0.12, (shot.end - shot.start) * 0.45).toFixed(2)),
              end: Number((shot.end - shot.start).toFixed(2)),
              intensity: member.action_intent === "moustache twirl" ? 0.8 : 0.5
            }
          ]
        })),
        narration_hint: card?.caption_text || ""
      }));
    });

    writeText(paths.animationPlanPath, `${JSON.stringify(animationPlan, null, 2)}\n`);
    writeText(paths.cameraMovesPath, `${JSON.stringify(cameraMoves, null, 2)}\n`);
    writeText(paths.shotPerformancePath, `${JSON.stringify({ shot_performances: shotPerformances }, null, 2)}\n`);

    console.log(`Animation plan generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
