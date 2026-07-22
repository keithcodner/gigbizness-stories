#!/usr/bin/env node

const path = require("path");
const { parseArgs } = require("./common");
const { inferProductionMode, inferQualityTier, readJsonSafe, writeJson, writeMarkdown, ensureDir } = require("../src/bricktoon/aiQualityPipeline");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/visual_production_router_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const outputDir = path.join(workspaceDir, "07_visuals", "production_routes");
    const scenesDir = path.join(outputDir, "scenes");
    ensureDir(outputDir);
    ensureDir(scenesDir);

    const routes = [];
    const reportLines = ["# Production Route Report", ""];

    for (const scene of shotPlan.scenes || []) {
      const sceneRoutes = [];
      for (const shot of scene.shots || []) {
        const productionMode = inferProductionMode(shot);
        const qualityTier = inferQualityTier(shot);
        const route = {
          shot_id: shot.shot_id,
          scene_id: scene.scene_id,
          production_mode: productionMode,
          quality_tier: qualityTier,
          reason: `Heuristic route for ${shot.shot_type || "general shot"} based on current AI-quality architecture.`,
          base_artwork: productionMode.includes("ai") ? "ai_illustration" : "procedural_layout",
          character_motion: ["hybrid_2d_ai", "rigged_ai_character_scene"].includes(productionMode)
            ? "layered_puppet"
            : "camera_motion_only",
          camera_motion: shot.camera?.movement || "steady_push",
          secondary_motion: productionMode.includes("ai") ? "ai_video_pass_optional" : "none",
          duration_seconds: Number((shot.end - shot.start).toFixed(2)),
          precision_requirements: {
            preserve_face: qualityTier !== "utility",
            preserve_costume: true,
            preserve_hands: qualityTier === "hero",
            readable_text: productionMode === "procedural_document"
          }
        };
        routes.push(route);
        sceneRoutes.push(route);
        reportLines.push(`- ${route.shot_id}: ${route.production_mode} (${route.quality_tier})`);
      }
      writeJson(path.join(scenesDir, `${scene.scene_id}_routes.json`), {
        scene_id: scene.scene_id,
        routes: sceneRoutes
      });
    }

    writeJson(path.join(outputDir, "production_routes.json"), {
      route_version: 1,
      routes
    });
    writeJson(path.join(outputDir, "production_route_validation.json"), {
      passed: routes.length > 0,
      warnings: [],
      errors: routes.length > 0 ? [] : ["No routes were generated."]
    });
    writeMarkdown(path.join(outputDir, "production_route_report.md"), `${reportLines.join("\n")}\n`);
    console.log(`Visual production routes generated for topic '${args.topic}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
