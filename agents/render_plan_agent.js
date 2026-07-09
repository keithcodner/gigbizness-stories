#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  parseCsv,
  readJson,
  toCsv,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const scriptDir = path.join(workspaceDir, "02_script");
  const voiceDir = path.join(workspaceDir, "03_voice");
  const assetsDir = path.join(workspaceDir, "04_assets");
  const renderPlanDir = path.join(workspaceDir, "05_render_plan");
  const rootConfigDir = path.join(path.resolve(__dirname, ".."), "config");

  return {
    topicPath: path.join(configDir, "topic.json"),
    scriptPath: path.join(scriptDir, "script_v2_human_review.md"),
    shotlistPath: path.join(scriptDir, "shotlist.csv"),
    timingPath: path.join(voiceDir, "voice_timing.json"),
    visualManifestPath: path.join(assetsDir, "visual_manifest.csv"),
    renderProfilesPath: path.join(rootConfigDir, "render_profiles.json"),
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    renderPlanPath: path.join(renderPlanDir, "render_plan.json"),
    visualTimingPath: path.join(renderPlanDir, "visual_timing.csv")
  };
}

function extractSceneTexts(scriptMarkdown) {
  const scenes = [];
  const lines = scriptMarkdown.split(/\r?\n/);
  let current = null;
  let collecting = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## S")) {
      if (current) {
        scenes.push(current);
      }
      current = {
        id: line.split(" - ")[0].replace("## ", ""),
        title: line.split(" - ").slice(1).join(" - "),
        narration: []
      };
      collecting = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("Visual note:")) {
      collecting = true;
      continue;
    }
    if (line === "Source support:" || line.startsWith("## Human review focus") || line.startsWith("## Blocked claims snapshot")) {
      collecting = false;
      continue;
    }
    if (!collecting || !line || line.startsWith("- ") || line.startsWith("```")) {
      continue;
    }

    current.narration.push(line);
  }

  if (current) {
    scenes.push(current);
  }

  return scenes;
}

function chooseVisualsForScene(sceneId, manifestRows) {
  const sceneRows = manifestRows.filter((row) => row.scene_id === sceneId);
  const preferred = [];

  const generated = sceneRows.filter((row) => row.status === "generated");
  const planned = sceneRows.filter((row) => row.status !== "generated");

  for (const row of [...generated, ...planned].slice(0, 3)) {
    preferred.push({
      type: row.asset_type,
      file: resolveAssetFile(row),
      source_status: row.status,
      effect: inferEffect(row),
      usage: row.usage
    });
  }

  return preferred;
}

function resolveAssetFile(row) {
  if (row.status === "generated") {
    return `04_assets/charts/${row.filename}`;
  }
  if (row.asset_type === "document") {
    return `04_assets/documents/${row.filename}`;
  }
  return `04_assets/${row.filename}`;
}

function inferEffect(row) {
  if (row.asset_type === "chart" || row.asset_type === "generated_graphic") {
    return "slow_zoom";
  }
  if (row.asset_type === "document") {
    return "hold_with_highlight";
  }
  return "gentle_pan";
}

function buildSceneManifest(topic, scenes, timingData, manifestRows, profile) {
  const timingScenes = timingData.scenes || [];
  const sceneObjects = scenes.map((scene) => {
    const timing = timingScenes.find((item) => item.scene.startsWith(scene.id));
    const start = timing ? timing.start_seconds : 0;
    const end = timing ? timing.end_seconds : start + 10;
    return {
      id: scene.id,
      title: scene.title,
      start,
      end,
      duration_seconds: end - start,
      narration_excerpt: scene.narration.slice(0, 2).join(" "),
      voiceover_file: "03_voice/voiceover_clean.wav",
      visuals: chooseVisualsForScene(scene.id, manifestRows),
      music: null,
      sfx: [],
      motion_style: inferMotionStyle(scene.id),
      retention_purpose: inferRetentionPurpose(scene.id),
      notes: inferSceneNotes(scene.id)
    };
  });

  return {
    video_id: topic.id,
    working_title: topic.working_title,
    profile,
    duration_seconds: timingData.total_seconds || 0,
    scenes: sceneObjects
  };
}

function inferMotionStyle(sceneId) {
  if (sceneId === "S01") {
    return "fast_intro";
  }
  if (sceneId === "S05") {
    return "documentary_hold";
  }
  return "steady_documentary";
}

function inferRetentionPurpose(sceneId) {
  const map = {
    S01: "Immediate hook and stakes",
    S02: "Ground viewer in the normal business model",
    S03: "Clarify the fee stack visually",
    S04: "Show where leverage shifts",
    S05: "Reserve proof section for sourced evidence",
    S06: "Translate story into practical viewer advice",
    S07: "Close with a clean takeaway"
  };
  return map[sceneId] || "Maintain clarity";
}

function inferSceneNotes(sceneId) {
  if (sceneId === "S05") {
    return "Keep this scene conservative until public-case sourcing improves.";
  }
  if (sceneId === "S01") {
    return "No generic intro. Start with immediate tension.";
  }
  return "Use generated cards where sourced footage is not ready.";
}

function buildRenderPlan(topic, profileName, profileConfig, manifestRows, sceneManifest) {
  return {
    topic_id: topic.id,
    profile: profileName,
    profile_config: profileConfig,
    renderer: "ffmpeg_static_scene_cards",
    draft_strategy: "Use scene cards and generated graphics until sourced b-roll is added.",
    asset_counts: {
      total_manifest_rows: manifestRows.length,
      generated_assets: manifestRows.filter((row) => row.status === "generated").length,
      manual_assets: manifestRows.filter((row) => row.status !== "generated").length
    },
    output_targets: [
      {
        label: profileName,
        render_file: profileName === "draft" ? "06_renders/draft_01.mp4" : "06_renders/final_1080p.mp4"
      }
    ],
    scene_count: sceneManifest.scenes.length
  };
}

function buildVisualTimingRows(sceneManifest) {
  const rows = [];
  for (const scene of sceneManifest.scenes) {
    if (scene.visuals.length === 0) {
      rows.push({
        scene_id: scene.id,
        start: scene.start,
        end: scene.end,
        visual_type: "text_card",
        asset_ref: "rendered scene card",
        notes: "Fallback render card"
      });
      continue;
    }

    const chunkDuration = (scene.end - scene.start) / scene.visuals.length;
    scene.visuals.forEach((visual, index) => {
      const start = Number((scene.start + (index * chunkDuration)).toFixed(2));
      const end = Number((scene.start + ((index + 1) * chunkDuration)).toFixed(2));
      rows.push({
        scene_id: scene.id,
        start,
        end,
        visual_type: visual.type,
        asset_ref: visual.file,
        notes: visual.usage
      });
    });
  }
  return rows;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/render_plan_agent.js --topic <topic_id> --workspace <workspace_path> --profile <profile>");
    }

    const profileName = args.profile || "draft";
    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const scriptMarkdown = fs.readFileSync(paths.scriptPath, "utf8");
    const scenes = extractSceneTexts(scriptMarkdown);
    const timingData = readJson(paths.timingPath);
    const manifestRows = parseCsv(fs.readFileSync(paths.visualManifestPath, "utf8")).rows;
    const renderProfiles = readJson(paths.renderProfilesPath);
    const profileConfig = renderProfiles[profileName];

    if (!profileConfig) {
      throw new Error(`Unknown render profile: ${profileName}`);
    }

    const sceneManifest = buildSceneManifest(topic, scenes, timingData, manifestRows, profileName);
    const renderPlan = buildRenderPlan(topic, profileName, profileConfig, manifestRows, sceneManifest);
    const visualTimingRows = buildVisualTimingRows(sceneManifest);

    writeText(paths.sceneManifestPath, `${JSON.stringify(sceneManifest, null, 2)}\n`);
    writeText(paths.renderPlanPath, `${JSON.stringify(renderPlan, null, 2)}\n`);
    writeText(paths.visualTimingPath, toCsv(visualTimingRows, [
      "scene_id",
      "start",
      "end",
      "visual_type",
      "asset_ref",
      "notes"
    ]));

    console.log(`Render plan generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
