#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  readJson,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const renderPlanDir = path.join(workspaceDir, "05_render_plan");
  const shortsDir = path.join(workspaceDir, "07_shorts");
  const scriptsDir = path.join(path.resolve(__dirname, ".."), "scripts");

  return {
    topicPath: path.join(configDir, "topic.json"),
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    shortScriptsPath: path.join(shortsDir, "short_scripts.md"),
    shortPlanPath: path.join(shortsDir, "shorts_plan.json"),
    short1Path: path.join(shortsDir, "short_01.mp4"),
    short2Path: path.join(shortsDir, "short_02.mp4"),
    short3Path: path.join(shortsDir, "short_03.mp4"),
    renderScriptPath: path.join(scriptsDir, "make_shorts.py")
  };
}

function buildShortCandidates(sceneManifest) {
  const candidates = [
    {
      id: "short_01",
      source_scene_id: "S03",
      title: "The fee stack behind towing",
      hook_text: "THE BILL KEEPS GROWING",
      setup: "A tow fee is only the first layer.",
      takeaway: "The leverage changes after the car is already in the lot."
    },
    {
      id: "short_02",
      source_scene_id: "S04",
      title: "Why towing can feel high pressure",
      hook_text: "WHY YOU FEEL TRAPPED",
      setup: "Pressure rises when time and transportation disappear.",
      takeaway: "The customer loses leverage once the vehicle is locked behind the gate."
    },
    {
      id: "short_03",
      source_scene_id: "S06",
      title: "Warning signs before the bill hits",
      hook_text: "WATCH THE PAPERWORK",
      setup: "Vague charges create room for surprise fees.",
      takeaway: "A clear process is one of the easiest ways to spot a better operator."
    }
  ];

  return candidates.map((candidate) => {
    const scene = sceneManifest.scenes.find((item) => item.id === candidate.source_scene_id);
    return {
      ...candidate,
      start_seconds: scene ? scene.start : 0,
      end_seconds: scene ? scene.end : 30,
      narration_excerpt: scene ? scene.narration_excerpt : "",
      duration_seconds: scene ? Math.min(55, Math.max(20, scene.duration_seconds + 8)) : 30
    };
  });
}

function buildShortScriptsMarkdown(topic, shorts) {
  const lines = [
    "# Short Scripts",
    "",
    `Topic: ${topic.working_title}`,
    ""
  ];

  for (const short of shorts) {
    lines.push(`## ${short.id.toUpperCase()}`);
    lines.push("");
    lines.push(`- Source scene: ${short.source_scene_id}`);
    lines.push(`- Hook text: ${short.hook_text}`);
    lines.push(`- Setup: ${short.setup}`);
    lines.push(`- Core line: ${short.narration_excerpt}`);
    lines.push(`- Takeaway: ${short.takeaway}`);
    lines.push(`- Estimated duration: ${short.duration_seconds}s`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
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
      throw new Error("Usage: node agents/shorts_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const sceneManifest = readJson(paths.sceneManifestPath);
    const shorts = buildShortCandidates(sceneManifest);

    writeText(paths.shortScriptsPath, buildShortScriptsMarkdown(topic, shorts));
    writeText(paths.shortPlanPath, `${JSON.stringify({ shorts }, null, 2)}\n`);

    runCommand("python", [
      paths.renderScriptPath,
      "--plan",
      paths.shortPlanPath,
      "--output-dir",
      path.dirname(paths.shortScriptsPath)
    ], "make_shorts.py");

    console.log(`Shorts generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
