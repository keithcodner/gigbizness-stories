#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("../agents/common");
const {
  ensureDir,
  readJsonSafe,
  writeJson,
  loadManifest,
  saveManifest,
  upsertAsset,
  relativeWorkspacePath,
  assetTimestamp
} = require("../src/bricktoon/aiQualityPipeline");
const { inferMotionRecipe } = require("../src/bricktoon/workflowContracts");
const { collectShotIdsFromScenes, filterScenes, hasSceneSelection, mergeScopedRecords, parseSceneIdsArg } = require("../src/bricktoon/sceneSelection");

function runFfmpeg(args, label) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || "unknown ffmpeg error"}`);
  }
}

function safeFile(filePath) {
  return path.resolve(filePath).replaceAll("\\", "/").replaceAll(":", "\\:");
}

function motionProfile(recipe) {
  const profiles = {
    static_plus_drift: { zoomRate: 0.0015, maxZoom: 1.19, panX: 22, panY: 15, swayX: 13, swayY: 10 },
    establishing_sweep: { zoomRate: 0.0019, maxZoom: 1.23, panX: 32, panY: 16, swayX: 18, swayY: 10 },
    reaction_emphasis: { zoomRate: 0.0021, maxZoom: 1.24, panX: 26, panY: 18, swayX: 14, swayY: 11 },
    villain_hero: { zoomRate: 0.0022, maxZoom: 1.26, panX: 18, panY: 24, swayX: 11, swayY: 15 },
    pressure_reveal: { zoomRate: 0.0024, maxZoom: 1.28, panX: 28, panY: 26, swayX: 14, swayY: 13 },
    talking_character: { zoomRate: 0.0019, maxZoom: 1.23, panX: 24, panY: 16, swayX: 12, swayY: 10 },
    typing_action_insert: { zoomRate: 0.0018, maxZoom: 1.22, panX: 32, panY: 12, swayX: 18, swayY: 8 }
  };
  return profiles[recipe] || profiles.static_plus_drift;
}

function boostedProfile(profile, strengthMultiplier = 1) {
  return {
    zoomRate: profile.zoomRate * strengthMultiplier,
    maxZoom: Math.min(1.34, 1 + ((profile.maxZoom - 1) * (1 + ((strengthMultiplier - 1) * 0.8)))),
    panX: Math.round(profile.panX * strengthMultiplier),
    panY: Math.round(profile.panY * strengthMultiplier),
    swayX: Math.round(profile.swayX * strengthMultiplier),
    swayY: Math.round(profile.swayY * strengthMultiplier)
  };
}

function renderSingleImageMotion({ imagePath, outputPath, durationSeconds, recipe, strengthMultiplier = 1 }) {
  const profile = boostedProfile(motionProfile(recipe), strengthMultiplier);
  const filter = [
    "scale=768:1344:force_original_aspect_ratio=increase",
    "crop=768:1344",
    `zoompan=z='min(zoom+${profile.zoomRate}+0.0015*sin(on/14),${profile.maxZoom})':x='iw/2-(iw/zoom/2)+sin(on/10)*${profile.panX}+cos(on/26)*${profile.swayX}':y='ih/2-(ih/zoom/2)+cos(on/13)*${profile.panY}+sin(on/23)*${profile.swayY}':d=1:s=768x1344:fps=24`,
    "format=yuv420p"
  ].join(",");

  runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-t",
    durationSeconds.toFixed(2),
    "-i",
    imagePath,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath
  ], `render single-image motion ${path.basename(outputPath)}`);
}

function renderCrossfadeMotion({ firstImage, secondImage, outputPath, durationSeconds, recipe, strengthMultiplier = 1 }) {
  const profile = boostedProfile(motionProfile(recipe), strengthMultiplier);
  const transitionDuration = Math.min(0.65, Math.max(0.35, durationSeconds * 0.08));
  const offset = Math.max(0.1, durationSeconds - transitionDuration);
  const firstFilter = [
    "scale=768:1344:force_original_aspect_ratio=increase",
    "crop=768:1344",
    `zoompan=z='min(zoom+${profile.zoomRate}+0.0015*sin(on/14),${profile.maxZoom})':x='iw/2-(iw/zoom/2)+sin(on/10)*${profile.panX}+cos(on/26)*${profile.swayX}':y='ih/2-(ih/zoom/2)+cos(on/13)*${profile.panY}+sin(on/23)*${profile.swayY}':d=1:s=768x1344:fps=24`,
    "format=yuv420p"
  ].join(",");
  const secondFilter = [
    "scale=768:1344:force_original_aspect_ratio=increase",
    "crop=768:1344",
    `zoompan=z='min(zoom+${profile.zoomRate * 1.25}+0.0018*cos(on/13),${Math.max(profile.maxZoom, 1.14)})':x='iw/2-(iw/zoom/2)-sin(on/11)*${profile.panX}-cos(on/24)*${profile.swayX}':y='ih/2-(ih/zoom/2)-cos(on/15)*${profile.panY}-sin(on/21)*${profile.swayY}':d=1:s=768x1344:fps=24`,
    "format=yuv420p"
  ].join(",");

  runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-t",
    durationSeconds.toFixed(2),
    "-i",
    firstImage,
    "-loop",
    "1",
    "-t",
    durationSeconds.toFixed(2),
    "-i",
    secondImage,
    "-filter_complex",
    `[0:v]${firstFilter}[v0];[1:v]${secondFilter}[v1];[v0][v1]xfade=transition=fade:duration=${transitionDuration.toFixed(2)}:offset=${offset.toFixed(2)},format=yuv420p[v]`,
    "-map",
    "[v]",
    "-t",
    durationSeconds.toFixed(2),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath
  ], `render crossfade motion ${path.basename(outputPath)}`);
}

function fallbackCopy(sourceClip, targetClip) {
  fs.copyFileSync(sourceClip, targetClip);
}

function sampleFrameBuffer(videoPath, seconds, width = 64, height = 36) {
  const result = spawnSync("ffmpeg", [
    "-v",
    "error",
    "-ss",
    String(seconds),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${width}:${height},format=rgb24`,
    "-f",
    "rawvideo",
    "-"
  ], {
    encoding: null,
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
    return null;
  }

  return result.stdout;
}

function frameDistance(leftBuffer, rightBuffer) {
  if (!leftBuffer || !rightBuffer || leftBuffer.length !== rightBuffer.length) {
    return 1;
  }
  let diff = 0;
  for (let index = 0; index < leftBuffer.length; index += 1) {
    diff += Math.abs(leftBuffer[index] - rightBuffer[index]);
  }
  return Number((diff / (leftBuffer.length * 255)).toFixed(4));
}

function motionThresholdForRecipe(recipe) {
  const thresholds = {
    static_plus_drift: 0.01,
    establishing_sweep: 0.012,
    reaction_emphasis: 0.013,
    villain_hero: 0.013,
    pressure_reveal: 0.013,
    talking_character: 0.012,
    typing_action_insert: 0.012
  };
  return thresholds[recipe] || 0.01;
}

function measureMotionDistance(videoPath, durationSeconds) {
  const safeDuration = Math.max(1, Number(durationSeconds || 0));
  const firstSeconds = Math.min(0.9, Math.max(0.2, safeDuration * 0.18));
  const secondSeconds = Math.min(safeDuration - 0.1, firstSeconds + Math.min(0.8, Math.max(0.45, safeDuration * 0.12)));
  if (secondSeconds <= firstSeconds) {
    return 0;
  }
  const first = sampleFrameBuffer(videoPath, firstSeconds);
  const second = sampleFrameBuffer(videoPath, secondSeconds);
  return frameDistance(first, second);
}

function listShotKeyframes(approvedDir, generatedDir, shotId) {
  const collect = (dirPath) => (fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath)
      .filter((fileName) => fileName.startsWith(`${shotId}_KF_`) && fileName.endsWith(".png"))
      .map((fileName) => path.join(dirPath, fileName))
    : []);
  const approved = collect(approvedDir);
  return approved.length > 0 ? approved : collect(generatedDir);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_ai_motion_passes.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const routes = readJsonSafe(path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"), {});
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const selectedSceneIds = parseSceneIdsArg(args["scene-ids"]);
    const selectedScenes = filterScenes(shotPlan.scenes || [], selectedSceneIds);
    const selectedShotIds = hasSceneSelection(selectedSceneIds) ? collectShotIdsFromScenes(selectedScenes) : [];
    const selectedShotIdSet = new Set(selectedShotIds);
    const shotClipsDir = path.join(workspaceDir, "08_animation", "shot_clips");
    const rawDir = path.join(workspaceDir, "08_animation", "raw_ai_video");
    const approvedKeyframesDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const generatedKeyframesDir = path.join(workspaceDir, "07_visuals", "generated_keyframes");
    const shotPerformances = readJsonSafe(path.join(workspaceDir, "08_animation", "shot_performances.json"), {});
    const manifest = loadManifest(workspaceDir);
    ensureDir(rawDir);
    const shotLookup = new Map();
    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        shotLookup.set(shot.shot_id, { ...shot, scene_id: scene.scene_id });
      }
    }
    const existingReport = readJsonSafe(path.join(rawDir, "ai_motion_report.json"), {});
    const report = {
      generated_at: assetTimestamp(),
      status: "motion_passes_ready",
      shots: []
    };

    for (const route of routes.routes || []) {
      if (selectedShotIds.length > 0 && !selectedShotIdSet.has(route.shot_id)) {
        continue;
      }
      if (!["hybrid_2d_ai", "layered_ai_illustration", "ai_image_to_video"].includes(route.production_mode)) {
        continue;
      }
      const sourceClip = path.join(shotClipsDir, `${route.shot_id}.mp4`);
      const rawClip = path.join(rawDir, `${route.shot_id}_ai_motion.mp4`);
      const shotInfo = shotLookup.get(route.shot_id) || {};
      const performance = (shotPerformances.shots || []).find((shot) => shot.shot_id === route.shot_id) || {};
      const motionRecipe = inferMotionRecipe(route, performance);
      const durationSeconds = Math.max(
        2,
        Number(route.duration_seconds || 0) || Math.max(2, Number(shotInfo.end || 0) - Number(shotInfo.start || 0))
      );
      const keyframePaths = listShotKeyframes(approvedKeyframesDir, generatedKeyframesDir, route.shot_id);
      let executionMode = "keyframe_motion_render";
      let warnings = [];

      let motionDistance = 0;
      let motionQualityGate = "not_evaluated";
      let rerenderedForMotion = false;
      let attemptCount = 0;
      const minMotionDistance = motionThresholdForRecipe(motionRecipe);

      if (keyframePaths.length >= 2) {
        renderCrossfadeMotion({
          firstImage: keyframePaths[0],
          secondImage: keyframePaths[1],
          outputPath: rawClip,
          durationSeconds,
          recipe: motionRecipe
        });
        attemptCount += 1;
      } else if (keyframePaths.length === 1) {
        renderSingleImageMotion({
          imagePath: keyframePaths[0],
          outputPath: rawClip,
          durationSeconds,
          recipe: motionRecipe
        });
        attemptCount += 1;
      } else if (fs.existsSync(sourceClip)) {
        fallbackCopy(sourceClip, rawClip);
        executionMode = "fallback_copy";
        warnings = ["No approved/generated keyframes were available; reused procedural shot clip."];
      } else {
        continue;
      }

      if (executionMode === "keyframe_motion_render") {
        motionDistance = measureMotionDistance(rawClip, durationSeconds);
        if (motionDistance < minMotionDistance) {
          rerenderedForMotion = true;
          warnings.push(`Initial motion distance ${motionDistance.toFixed(4)} was below threshold ${minMotionDistance.toFixed(4)}; rerendered with stronger motion profile.`);
          if (keyframePaths.length >= 2) {
            renderCrossfadeMotion({
              firstImage: keyframePaths[0],
              secondImage: keyframePaths[1],
              outputPath: rawClip,
              durationSeconds,
              recipe: motionRecipe,
              strengthMultiplier: 1.45
            });
          } else {
            renderSingleImageMotion({
              imagePath: keyframePaths[0],
              outputPath: rawClip,
              durationSeconds,
              recipe: motionRecipe,
              strengthMultiplier: 1.55
            });
          }
          attemptCount += 1;
          motionDistance = measureMotionDistance(rawClip, durationSeconds);
        }
        motionQualityGate = motionDistance >= minMotionDistance ? "motion_validated" : "weak_motion_retry_exhausted";
        if (motionQualityGate === "weak_motion_retry_exhausted") {
          warnings.push(`Motion distance ${motionDistance.toFixed(4)} remains below threshold ${minMotionDistance.toFixed(4)} after retry.`);
        }
      }

      upsertAsset(manifest, {
        asset_id: `AIMOTION_${route.shot_id}`,
        asset_type: "ai_motion_pass",
        shot_ids: [route.shot_id],
        file: relativeWorkspacePath(workspaceDir, rawClip),
        status: "approved",
        generator: {
          provider: executionMode === "keyframe_motion_render" ? "ffmpeg_hybrid_motion" : "procedural",
          workflow: "motion_pass_source_v1"
        },
        motion_recipe: motionRecipe,
        motion_quality_gate: motionQualityGate,
        created_at: assetTimestamp()
      });
      report.shots.push({
        shot_id: route.shot_id,
        production_mode: route.production_mode,
        duration_seconds: durationSeconds,
        source_clip: fs.existsSync(sourceClip) ? relativeWorkspacePath(workspaceDir, sourceClip) : null,
        source_keyframes: keyframePaths.map((filePath) => relativeWorkspacePath(workspaceDir, filePath)),
        motion_recipe: motionRecipe,
        motion_controls: {
          motion_intensity: route.quality_tier === "hero" ? "high" : "medium",
          camera_movement: route.camera_motion || "steady_push",
          facial_motion: route.quality_tier === "utility" ? "limited" : "enabled",
          hand_prop_motion: route.precision_requirements?.preserve_hands ? "careful" : "minimal"
        },
        execution_mode: executionMode,
        motion_distance: motionDistance,
        minimum_motion_distance: minMotionDistance,
        motion_quality_gate: motionQualityGate,
        rerendered_for_motion: rerenderedForMotion,
        attempt_count: attemptCount,
        warnings
      });
    }

    report.shots = mergeScopedRecords(existingReport.shots || [], report.shots, {
      idField: "shot_id",
      scopedIds: selectedShotIds
    });
    saveManifest(workspaceDir, manifest);
    writeJson(path.join(rawDir, "ai_motion_report.json"), report);
    console.log(`AI motion passes generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
