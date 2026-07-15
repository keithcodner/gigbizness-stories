#!/usr/bin/env node

const path = require("path");
const { parseArgs } = require("./common");
const { readJsonSafe, writeJson, writeMarkdown, ensureDir } = require("../src/bricktoon/aiQualityPipeline");

function lightingForTier(tier) {
  if (tier === "hero") {
    return "dramatic warm key with cool rim";
  }
  if (tier === "utility") {
    return "clear neutral document lighting";
  }
  return "cinematic directional lighting";
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/shot_art_direction_agent.js --topic <topic_id> --workspace <workspace_path>");
    }
    const workspaceDir = path.resolve(args.workspace);
    const routes = readJsonSafe(path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"), {});
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const outputDir = path.join(workspaceDir, "07_visuals", "art_direction");
    ensureDir(outputDir);
    const shotMap = new Map();
    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        shotMap.set(shot.shot_id, { shot, scene_id: scene.scene_id });
      }
    }

    for (const route of routes.routes || []) {
      const entry = shotMap.get(route.shot_id);
      if (!entry) {
        continue;
      }
      const contract = {
        shot_id: route.shot_id,
        scene_id: route.scene_id,
        quality_tier: route.quality_tier,
        production_mode: route.production_mode,
        visual_target: {
          detail: route.quality_tier === "hero" ? "high" : "medium",
          composition: `${entry.shot.shot_type} with strong focal hierarchy`,
          lighting: lightingForTier(route.quality_tier),
          depth: "foreground, character plane, and softened background separation",
          surface_style: "dimensional painted plastic",
          energy: entry.shot.purpose || "controlled documentary tension"
        },
        references: {
          character_ids: entry.shot.cast_member_ids || [],
          environment_id: `ENV_${route.scene_id}`,
          style_profile: "cinematic_bricktoon_editorial"
        },
        generation: {
          required_keyframes: route.quality_tier === "hero" ? 2 : 1,
          working_resolution: route.quality_tier === "hero" ? "3840x2160" : "1920x1080",
          preserve_face: route.precision_requirements.preserve_face,
          preserve_costume: route.precision_requirements.preserve_costume,
          preserve_accessories: true
        },
        animation: {
          duration_seconds: route.duration_seconds,
          camera: route.camera_motion,
          character_actions: [
            "blink",
            route.quality_tier === "hero" ? "expression_emphasis" : "idle_hold"
          ],
          ai_video_motion_pass: route.secondary_motion === "ai_video_pass_optional"
        }
      };
      writeJson(path.join(outputDir, `${route.shot_id}.json`), contract);
      writeMarkdown(
        path.join(outputDir, `${route.shot_id}.md`),
        `# ${route.shot_id}\n\n- Mode: ${route.production_mode}\n- Tier: ${route.quality_tier}\n- Lighting: ${contract.visual_target.lighting}\n`
      );
    }

    console.log(`Shot art direction contracts generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
