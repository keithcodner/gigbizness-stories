#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  readJson
} = require("./common");

function getPaths(workspaceDir) {
  const renderPlanDir = path.join(workspaceDir, "05_render_plan");
  const renderDir = path.join(workspaceDir, "06_renders");
  const qcDir = path.join(workspaceDir, "10_qc");
  const scriptsDir = path.join(path.resolve(__dirname, ".."), "scripts");
  const rootConfigDir = path.join(path.resolve(__dirname, ".."), "config");

  return {
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    renderPlanPath: path.join(renderPlanDir, "render_plan.json"),
    renderProfilesPath: path.join(rootConfigDir, "render_profiles.json"),
    rendererScriptPath: path.join(scriptsDir, "ffmpeg_render.py"),
    draftOutputPath: path.join(renderDir, "draft_01.mp4"),
    finalOutputPath: path.join(renderDir, "final_1080p.mp4"),
    finalApprovalPath: path.join(qcDir, "final_approval.md"),
    visualReadinessPath: path.join(workspaceDir, "04_assets", "visual_readiness.json"),
    qualityRulesPath: path.join(rootConfigDir, "quality_rules.json")
  };
}

function enforceQcForFinal(profileName, finalApprovalPath, visualReadinessPath, qualityRulesPath) {
  if (profileName === "draft") {
    return;
  }

  if (!fs.existsSync(finalApprovalPath)) {
    throw new Error("Final render is blocked until QC creates 10_qc/final_approval.md.");
  }

  const approvalText = fs.readFileSync(finalApprovalPath, "utf8");
  if (!approvalText.startsWith("APPROVED")) {
    throw new Error("Final render is blocked because QC has not approved this package.");
  }

  if (!fs.existsSync(visualReadinessPath)) {
    throw new Error("Final render is blocked until assets/visual_readiness.json exists.");
  }

  const visualReadiness = JSON.parse(fs.readFileSync(visualReadinessPath, "utf8"));
  const qualityRules = JSON.parse(fs.readFileSync(qualityRulesPath, "utf8"));
  const visualRules = qualityRules.visuals || {};

  if ((visualRules.require_visual_plan_for_final || false) &&
      visualReadiness.real_existing_count < (visualRules.min_real_visual_assets_for_final || 0)) {
    throw new Error("Final render is blocked because there are not enough real visual assets for a publishable cut.");
  }

  if ((visualRules.min_stock_video_clips_for_final || 0) > 0 &&
      visualReadiness.stock_video_count < visualRules.min_stock_video_clips_for_final) {
    throw new Error("Final render is blocked because not enough real stock video clips are available.");
  }
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/render_agent.js --topic <topic_id> --workspace <workspace_path> --profile <profile>");
    }

    const profileName = args.profile || "draft";
    const paths = getPaths(args.workspace);
    const renderProfiles = readJson(paths.renderProfilesPath);
    const profile = renderProfiles[profileName];

    if (!profile) {
      throw new Error(`Unknown render profile: ${profileName}`);
    }

    enforceQcForFinal(profileName, paths.finalApprovalPath, paths.visualReadinessPath, paths.qualityRulesPath);

    const manifestPath = args.manifest || paths.sceneManifestPath;
    const outputPath = args.output || (profileName === "draft" ? paths.draftOutputPath : paths.finalOutputPath);
    runCommand("python", [
      paths.rendererScriptPath,
      "--manifest",
      manifestPath,
      "--profile",
      profileName,
      "--output",
      outputPath,
      "--workspace",
      args.workspace
    ], "ffmpeg_render.py");

    console.log(`Render output created at ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
