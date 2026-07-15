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
const { resolveSceneAsset } = require("../src/render/resolveSceneAsset");

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
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    timingPath: path.join(voiceDir, "voice_timing.json"),
    visualManifestPath: path.join(assetsDir, "visual_manifest.csv"),
    musicManifestPath: path.join(assetsDir, "music", "music_manifest.csv"),
    musicSelectionPath: path.join(assetsDir, "music", "music_selection.md"),
    assetsDir,
    musicPolicyPath: path.join(rootConfigDir, "music_policy.json"),
    renderProfilesPath: path.join(rootConfigDir, "render_profiles.json"),
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    renderPlanPath: path.join(renderPlanDir, "render_plan.json"),
    visualTimingPath: path.join(renderPlanDir, "visual_timing.csv"),
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    renderContractPath: path.join(workspaceDir, "09_edit_plan", "render_contract.json")
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

function assetExists(row, assetsDir) {
  let assetPath;
  if (/\.(svg|png|jpg|jpeg|webp|bmp)$/i.test(row.filename || "")) {
    assetPath = path.join(assetsDir, "charts", row.filename);
  } else if (row.asset_type === "document") {
    assetPath = path.join(assetsDir, "documents", row.filename);
  } else if (row.asset_type === "stock_video") {
    assetPath = path.join(assetsDir, "stock_videos", row.filename);
  } else {
    assetPath = path.join(assetsDir, row.filename || "");
  }
  return fs.existsSync(assetPath);
}

function chooseVisualsForScene(sceneId, manifestRows, assetsDir, durationSeconds = 0) {
  const sceneRows = manifestRows.filter((row) => row.scene_id === sceneId);
  const preferred = [];

  const available = sceneRows.filter((row) => assetExists(row, assetsDir));
  const generated = available.filter((row) => row.status === "generated");
  const planned = available.filter((row) => row.status !== "generated");
  const visualTarget = Math.max(3, Math.ceil((durationSeconds || 0) / 8));
  const sourceRows = [...generated, ...planned];

  for (const row of sourceRows.slice(0, visualTarget)) {
    preferred.push({
      type: row.asset_type,
      file: resolveAssetFile(row),
      source_status: row.status,
      effect: inferEffect(row),
      usage: row.usage
    });
  }

  let duplicateIndex = 0;
  while (preferred.length > 0 && preferred.length < visualTarget) {
    const duplicate = preferred[duplicateIndex % preferred.length];
    preferred.push({
      ...duplicate,
      usage: `${duplicate.usage} (timing variation ${duplicateIndex + 1})`
    });
    duplicateIndex += 1;
  }

  return preferred;
}

function resolveAssetFile(row) {
  if (/\.(svg|png|jpg|jpeg|webp|bmp)$/i.test(row.filename || "")) {
    return `04_assets/charts/${row.filename}`;
  }
  if (row.asset_type === "document") {
    return `04_assets/documents/${row.filename}`;
  }
  if (row.asset_type === "stock_video") {
    return `04_assets/stock_videos/${row.filename}`;
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

function inferBricktoonEffect(sceneCard, assetType) {
  const motion = sceneCard?.camera?.movement || "";
  if (["bricktoon_composited_shot_sequence", "bricktoon_scene_sequence", "bricktoon_animated_clip", "composited_shot_clip", "bricktoon_shot_clip"].includes(assetType)) {
    return "play_clip";
  }
  if (motion === "quick zoom") {
    return "impact_push";
  }
  if ((sceneCard?.camera?.shot_type || "").includes("overhead")) {
    return "documentary_hold";
  }
  return "slow_zoom";
}

function buildBricktoonVisuals(scene, sceneCard, renderContract, assetManifest) {
  const contractScene = (renderContract?.scenes || []).find((item) => item.scene_id === scene.id);
  const resolved = resolveSceneAsset(sceneCard || { scene_id: scene.id }, assetManifest || { assets: [] }, { render_mode: renderContract?.render_mode || "development" });
  if (!resolved.asset || !resolved.asset.file) {
    return [];
  }

  const baseVisual = {
    type: resolved.asset.asset_type,
    file: resolved.asset.file,
    source_status: resolved.fallback_used ? "fallback" : "approved",
    effect: inferBricktoonEffect(sceneCard, resolved.asset.asset_type),
    usage: contractScene?.required_asset_ids?.[0]
      ? `${scene.id} primary visual from render contract`
      : `${scene.id} approved bricktoon visual`
  };

  const visualTarget = Math.max(3, Math.ceil(((scene.end - scene.start) || 0) / 8));
  const visuals = [baseVisual];
  while (visuals.length < visualTarget) {
    visuals.push({
      ...baseVisual,
      usage: `${baseVisual.usage} (timing variation ${visuals.length})`
    });
  }

  return visuals;
}

function pickMusicTrack(musicRows) {
  const selected = musicRows.find((row) => (row.status || "").toLowerCase() === "selected");
  if (selected) {
    return selected;
  }
  return musicRows.find((row) => (row.status || "").toLowerCase() === "approved") || null;
}

function buildSceneManifest(topic, scenes, timingData, manifestRows, profile, assetsDir, selectedMusic, sceneCards, renderContract, assetManifest) {
  const timingScenes = timingData.scenes || [];
  const cardMap = new Map((sceneCards || []).map((card) => [card.scene_id, card]));
  const sceneObjects = scenes.map((scene) => {
    const card = cardMap.get(scene.id);
    const timing = timingScenes.find((item) => item.scene.startsWith(scene.id));
    const start = timing ? timing.start_seconds : 0;
    const end = timing ? timing.end_seconds : start + 10;
    const preferredBricktoonVisuals = buildBricktoonVisuals(scene, card, renderContract, assetManifest);
    return {
      id: scene.id,
      title: scene.title,
      start,
      end,
      duration_seconds: end - start,
      narration_excerpt: card?.narration || scene.narration.slice(0, 2).join(" "),
      voiceover_file: "03_voice/voiceover_clean.wav",
      visuals: preferredBricktoonVisuals.length > 0
        ? preferredBricktoonVisuals
        : chooseVisualsForScene(scene.id, manifestRows, assetsDir, end - start),
      music: selectedMusic ? {
        track_path: selectedMusic.track_path,
        track_title: selectedMusic.track_title || "",
        source_library: selectedMusic.source_library || "",
        intended_use: selectedMusic.intended_use || "background_bed"
      } : null,
      sfx: [],
      motion_style: card?.camera?.movement || inferMotionStyle(scene.id),
      retention_purpose: inferRetentionPurpose(scene.id),
      notes: card ? `${inferSceneNotes(scene.id)} Beat ${card.beat_id}. Caption: ${card.caption_text}` : inferSceneNotes(scene.id)
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

function buildRenderPlan(topic, profileName, profileConfig, manifestRows, sceneManifest, selectedMusic, musicPolicy) {
  return {
    topic_id: topic.id,
    profile: profileName,
    profile_config: profileConfig,
    renderer: "ffmpeg_static_scene_cards",
    draft_strategy: "Use scene cards and generated graphics until sourced b-roll is added.",
    audio_plan: {
      voiceover_file: "03_voice/voiceover_clean.wav",
      music_policy_summary: selectedMusic
        ? `Use approved local royalty-free music track: ${selectedMusic.track_title || selectedMusic.track_path}`
        : "No track selected yet. Pick from the approved local sorted royalty-free library before QC.",
      preferred_music_root: musicPolicy.preferred_library_roots?.[0] || "",
      fallback_music_root: musicPolicy.fallback_library_roots?.[0] || ""
    },
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
    const sceneCards = fs.existsSync(paths.sceneCardsPath)
      ? readJson(paths.sceneCardsPath).scene_cards || []
      : [];
    const assetManifest = fs.existsSync(paths.assetManifestPath)
      ? readJson(paths.assetManifestPath)
      : { assets: [] };
    const renderContract = fs.existsSync(paths.renderContractPath)
      ? readJson(paths.renderContractPath)
      : { scenes: [], render_mode: "development" };
    const musicRows = fs.existsSync(paths.musicManifestPath)
      ? parseCsv(fs.readFileSync(paths.musicManifestPath, "utf8")).rows
      : [];
    const musicPolicy = readJson(paths.musicPolicyPath);
    const renderProfiles = readJson(paths.renderProfilesPath);
    const profileConfig = renderProfiles[profileName];

    if (!profileConfig) {
      throw new Error(`Unknown render profile: ${profileName}`);
    }

    const selectedMusic = pickMusicTrack(musicRows);
    const sceneManifest = buildSceneManifest(
      topic,
      scenes,
      timingData,
      manifestRows,
      profileName,
      paths.assetsDir,
      selectedMusic,
      sceneCards,
      renderContract,
      assetManifest
    );
    const renderPlan = buildRenderPlan(
      topic,
      profileName,
      profileConfig,
      manifestRows,
      sceneManifest,
      selectedMusic,
      musicPolicy
    );
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
