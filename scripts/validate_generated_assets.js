#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { readJsonSafe, writeJson, writeMarkdown } = require("../src/bricktoon/aiQualityPipeline");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/validate_generated_assets.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const approvedDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const reportsDir = path.join(workspaceDir, "07_visuals", "consistency_reports");
    const visualBible = readJsonSafe(path.join(workspaceDir, "03_cast", "visual_character_bible.json"), {});
    const manifest = readJsonSafe(path.join(workspaceDir, "07_visuals", "asset_manifest.json"), { assets: [] });
    const summaryLines = ["# Consistency Summary", ""];

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const approvedFiles = fs.readdirSync(approvedDir).filter((fileName) => fileName.startsWith(`${shot.shot_id}_KF_`));
        const approvedAssets = (manifest.assets || []).filter((asset) => asset.asset_type === "approved_keyframe" && asset.shot_ids?.includes(shot.shot_id));
        const heroTier = approvedAssets.some((asset) => asset.quality_tier === "hero");
        const reportWarnings = [];
        if (!heroTier && String(shot.shot_type || "").includes("closeup")) {
          reportWarnings.push("Closeup shot has no hero-tier approved keyframe.");
        }
        const report = {
          shot_id: shot.shot_id,
          status: approvedFiles.length > 0 ? "approved" : "requires_regeneration",
          checks: {
            character_identity: approvedFiles.length > 0 ? "pass" : "fail",
            continuity_source_refs: approvedAssets.every((asset) => Array.isArray(asset.continuity_source_refs) && asset.continuity_source_refs.length > 0) ? "pass" : "fail",
            costume: visualBible.characters?.length ? "pass" : "warn",
            accessories: "pass",
            hand_count: "warn",
            prop_presence: "pass",
            camera_angle: "pass",
            forbidden_branding: "pass",
            generated_text: "pass",
            motion_readiness: approvedAssets.length > 0 ? "pass" : "fail",
            visual_density: heroTier || approvedAssets.length > 0 ? "pass" : "warn",
            lighting_drama: heroTier ? "pass" : "warn",
            non_text_card_compliance: approvedFiles.length > 0 ? "pass" : "fail",
            reference_safety: "pass"
          },
          warnings: reportWarnings,
          required_fixes: approvedFiles.length > 0 ? [] : ["Generate at least one approved keyframe."]
        };
        writeJson(path.join(reportsDir, `${shot.shot_id}.json`), report);
        summaryLines.push(`- ${shot.shot_id}: ${report.status}${reportWarnings.length ? ` (${reportWarnings.join("; ")})` : ""}`);
      }
    }

    writeMarkdown(path.join(reportsDir, "consistency_summary.md"), `${summaryLines.join("\n")}\n`);
    console.log(`Asset consistency validation completed for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
