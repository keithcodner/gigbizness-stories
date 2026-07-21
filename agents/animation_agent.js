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

function inferPerformanceClass(shot) {
  const type = String(shot.shot_type || "").toLowerCase();
  if (type.includes("closeup")) {
    return "closeup_talking_puppet";
  }
  if (type.includes("medium_single")) {
    return "single_character_explainer";
  }
  if (type.includes("medium_two")) {
    return "two_character_exchange";
  }
  if (type.includes("document") || type.includes("top_down")) {
    return "document_insert_motion";
  }
  if (type.includes("wide") || type.includes("establishing")) {
    return "staged_cutout_tableau";
  }
  return "editorial_cutout_default";
}

function visibleCharacterLimitForShot(shot) {
  const type = String(shot.shot_type || "").toLowerCase();
  if (type.includes("closeup") || type.includes("medium_single")) {
    return 1;
  }
  if (type.includes("medium_two")) {
    return 2;
  }
  if (type.includes("document") || type.includes("top_down")) {
    return 0;
  }
  return Math.max(1, (shot.cast_member_ids || []).length || 1);
}

function mouthSyncModeForShot(shot) {
  const type = String(shot.shot_type || "").toLowerCase();
  if (type.includes("closeup")) {
    return "viseme_emphasis";
  }
  if (type.includes("medium")) {
    return "talk_cycles";
  }
  return "limited";
}

function gestureProfileForMember(member, shot) {
  const intent = String(member.action_intent || "").toLowerCase();
  const role = String(member.role || "").toLowerCase();
  const shotType = String(shot.shot_type || "").toLowerCase();
  if (intent.includes("moustache")) {
    return "villain_showmanship";
  }
  if (intent.includes("folder reveal")) {
    return "prop_reveal";
  }
  if (intent.includes("phone")) {
    return "phone_hold_react";
  }
  if (intent.includes("point")) {
    return "explain_point";
  }
  if (role.includes("narrator") && /closeup|medium/.test(shotType)) {
    return "host_explainer";
  }
  return "idle_support";
}

function secondaryActionForShot(shot, card) {
  const text = `${shot.purpose || ""} ${card?.narration || ""}`.toLowerCase();
  if (/invoice|bill|fee|quote|amount|price/.test(text)) {
    return "counter_change";
  }
  if (/hack|cyber|breach|data|server/.test(text)) {
    return "typing_loop";
  }
  if (/truck|door|close|slam/.test(text)) {
    return "impact_hit";
  }
  if (/proof|folder|document|evidence/.test(text)) {
    return "document_reveal";
  }
  return "ambient_hold";
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
      style: "bricktoon_puppet_animatic",
      strategy: "Scene-aware motion directives plus shot-level puppet performance cues for cut-out style bricktoon sequences with camera-blocked acting, blink passes, talk cycles, gesture swaps, and insert motion.",
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
        performance_class: inferPerformanceClass(shot),
        duration_seconds: Number((shot.end - shot.start).toFixed(2)),
        visible_character_limit: visibleCharacterLimitForShot(shot),
        camera_recipe: {
          movement: shot.camera?.movement || "steady_push",
          easing: shot.camera?.easing || "ease_in_out",
          start_scale: shot.camera?.start_scale || 1,
          end_scale: shot.camera?.end_scale || 1.06
        },
        mouth_sync_mode: mouthSyncModeForShot(shot),
        blink_profile: /closeup|medium/.test(String(shot.shot_type || "").toLowerCase()) ? "cinematic_readable" : "ambient_sparse",
        head_motion_profile: /closeup|medium/.test(String(shot.shot_type || "").toLowerCase()) ? "readable_turns" : "subtle_nods",
        performances: sceneAssignment.cast.map((member, index) => ({
          actor_id: member.cast_member_id,
          character_id: member.character_id,
          role: member.role,
          gesture_profile: gestureProfileForMember(member, shot),
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
          ],
          mouth_track: index === 0 && visibleCharacterLimitForShot(shot) !== 0,
          blink_track: true,
          head_turn_track: index === 0
        })),
        secondary_action: secondaryActionForShot(shot, card),
        narration_hint: card?.caption_text || ""
      }));
    });

    writeText(paths.animationPlanPath, `${JSON.stringify(animationPlan, null, 2)}\n`);
    writeText(paths.cameraMovesPath, `${JSON.stringify(cameraMoves, null, 2)}\n`);
    writeText(paths.shotPerformancePath, `${JSON.stringify({
      animation_standard: "premium_cutout_animatic_minimum",
      notes: [
        "This is the minimum acceptable animation standard for premium bricktoon output.",
        "Shots should read like storyboarded cut-out animation, not slideshow-only motion."
      ],
      shots: shotPerformances
    }, null, 2)}\n`);

    console.log(`Animation plan generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
