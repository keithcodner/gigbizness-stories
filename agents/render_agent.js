#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  readJson
} = require("./common");

function getPaths(workspaceDir) {
  const renderPlanDir = path.join(workspaceDir, "05_render_plan");
  const renderDir = path.join(workspaceDir, "06_renders");
  const scriptsDir = path.join(path.resolve(__dirname, ".."), "scripts");
  const rootConfigDir = path.join(path.resolve(__dirname, ".."), "config");

  return {
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    renderPlanPath: path.join(renderPlanDir, "render_plan.json"),
    renderProfilesPath: path.join(rootConfigDir, "render_profiles.json"),
    rendererScriptPath: path.join(scriptsDir, "ffmpeg_render.py"),
    draftOutputPath: path.join(renderDir, "draft_01.mp4"),
    finalOutputPath: path.join(renderDir, "final_1080p.mp4")
  };
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

    const outputPath = profileName === "draft" ? paths.draftOutputPath : paths.finalOutputPath;
    runCommand("python", [
      paths.rendererScriptPath,
      "--manifest",
      paths.sceneManifestPath,
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
