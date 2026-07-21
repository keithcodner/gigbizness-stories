#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  assetTimestamp,
  ensureDir,
  loadManifest,
  readJsonSafe,
  relativeWorkspacePath,
  saveManifest,
  upsertAsset,
  writeJson
} = require("../src/bricktoon/aiQualityPipeline");
const { parseArgs } = require("../agents/common");
const { buildLayerRegions } = require("../src/bricktoon/layerRegions");

function readMediaDimensions(filePath) {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    filePath
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `Unable to read media dimensions for ${filePath}`);
  }
  const [width, height] = String(result.stdout || "").trim().split("x").map((value) => Number(value));
  return {
    width,
    height
  };
}

function runFfmpeg(args, label) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${label} failed`);
  }
}

function writeTransparentCanvas(outputPath, width, height) {
  runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=black@0.0:s=${width}x${height}:d=1,format=rgba`,
    "-frames:v",
    "1",
    "-pix_fmt",
    "rgba",
    outputPath
  ], `transparent canvas ${path.basename(outputPath)}`);
}

function writeRegionLayer(sourcePath, outputPath, width, height, region) {
  runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-filter_complex",
    `[0:v]crop=${region.width}:${region.height}:${region.x}:${region.y}[crop];color=c=black@0.0:s=${width}x${height}:d=1,format=rgba[base];[base][crop]overlay=${region.x}:${region.y}:format=auto`,
    "-frames:v",
    "1",
    "-pix_fmt",
    "rgba",
    outputPath
  ], `region layer ${path.basename(outputPath)}`);
}

function writeBlurredPlate(sourcePath, outputPath, width, height, maskRegions = []) {
  const boxFilters = maskRegions.map((region) => (
    `drawbox=x=${region.x}:y=${region.y}:w=${region.width}:h=${region.height}:color=black@0.18:t=fill`
  ));
  const filter = [
    "boxblur=16:2",
    "eq=saturation=0.78:brightness=-0.01",
    ...boxFilters
  ].join(",");
  runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-vf",
    filter,
    "-frames:v",
    "1",
    "-pix_fmt",
    "rgba",
    outputPath
  ], `blurred plate ${path.basename(outputPath)}`);
}

function writeLightingOverlay(sourcePath, outputPath, width, height) {
  runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-vf",
    "eq=brightness=0.05:saturation=1.08,format=rgba,colorchannelmixer=aa=0.22",
    "-frames:v",
    "1",
    "-pix_fmt",
    "rgba",
    outputPath
  ], `lighting overlay ${path.basename(outputPath)}`);
}

function sourceKeyframesForShot(approvedDir, shotId) {
  if (!fs.existsSync(approvedDir)) {
    return [];
  }
  return fs.readdirSync(approvedDir)
    .filter((fileName) => fileName.startsWith(`${shotId}_KF_`))
    .sort((a, b) => a.localeCompare(b));
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/extract_shot_layers.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const layersRoot = path.join(workspaceDir, "07_visuals", "shot_layers");
    const cleanPlatesRoot = path.join(workspaceDir, "07_visuals", "clean_plates");
    const approvedDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const guidesDir = path.join(workspaceDir, "07_visuals", "composition_guides");
    const manifest = loadManifest(workspaceDir);

    ensureDir(layersRoot);
    ensureDir(cleanPlatesRoot);

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        const layerDir = path.join(layersRoot, shot.shot_id);
        ensureDir(layerDir);
        const approvedKeyframes = sourceKeyframesForShot(approvedDir, shot.shot_id);
        const sourceKeyframe = approvedKeyframes[0] ? path.join(approvedDir, approvedKeyframes[0]) : null;
        const compositionGuide = readJsonSafe(path.join(guidesDir, `${shot.shot_id}.json`), {});
        const layerFiles = [
          "background_far.png",
          "background_middle.png",
          "character_foreground.png",
          "face_region.png",
          "arm_hand_region.png",
          "prop_main.png",
          "fx_overlay.png",
          "foreground_frame.png",
          "lighting_overlay.png"
        ];
        const cleanPlatePath = path.join(cleanPlatesRoot, `${shot.shot_id}_background.png`);
        let extractionStatus = "placeholder_fallback";
        let layerRegions = null;
        let sourceDimensions = { width: 1920, height: 1080 };
        let warnings = [];

        if (sourceKeyframe && fs.existsSync(sourceKeyframe)) {
          sourceDimensions = readMediaDimensions(sourceKeyframe);
          layerRegions = buildLayerRegions({
            shot,
            compositionGuide,
            sourceWidth: sourceDimensions.width,
            sourceHeight: sourceDimensions.height
          });
          writeBlurredPlate(sourceKeyframe, path.join(layerDir, "background_far.png"), sourceDimensions.width, sourceDimensions.height, []);
          writeBlurredPlate(sourceKeyframe, path.join(layerDir, "background_middle.png"), sourceDimensions.width, sourceDimensions.height, [layerRegions.character_foreground]);
          writeRegionLayer(sourceKeyframe, path.join(layerDir, "character_foreground.png"), sourceDimensions.width, sourceDimensions.height, layerRegions.character_foreground);
          writeRegionLayer(sourceKeyframe, path.join(layerDir, "face_region.png"), sourceDimensions.width, sourceDimensions.height, layerRegions.face_region);
          writeRegionLayer(sourceKeyframe, path.join(layerDir, "arm_hand_region.png"), sourceDimensions.width, sourceDimensions.height, layerRegions.arm_hand_region);
          writeRegionLayer(sourceKeyframe, path.join(layerDir, "prop_main.png"), sourceDimensions.width, sourceDimensions.height, layerRegions.prop_main);
          writeTransparentCanvas(path.join(layerDir, "fx_overlay.png"), sourceDimensions.width, sourceDimensions.height);
          writeRegionLayer(sourceKeyframe, path.join(layerDir, "foreground_frame.png"), sourceDimensions.width, sourceDimensions.height, layerRegions.foreground_frame);
          writeLightingOverlay(sourceKeyframe, path.join(layerDir, "lighting_overlay.png"), sourceDimensions.width, sourceDimensions.height);
          writeBlurredPlate(sourceKeyframe, cleanPlatePath, sourceDimensions.width, sourceDimensions.height, layerRegions.clean_plate_proxy.masked_regions || []);
          extractionStatus = "derived_from_approved_keyframe";
        } else {
          warnings.push("No approved keyframe was available, so Phase 2 real layer extraction could not run for this shot.");
          for (const fileName of layerFiles) {
            writeTransparentCanvas(path.join(layerDir, fileName), sourceDimensions.width, sourceDimensions.height);
          }
          writeTransparentCanvas(cleanPlatePath, sourceDimensions.width, sourceDimensions.height);
        }

        writeJson(path.join(layerDir, "layer_manifest.json"), {
          shot_id: shot.shot_id,
          source_keyframes: approvedKeyframes.map((fileName) => `07_visuals/approved_keyframes/${fileName}`),
          source_keyframe_file: sourceKeyframe ? relativeWorkspacePath(workspaceDir, sourceKeyframe) : null,
          extraction_status: extractionStatus,
          benchmark_profile: "option1_phase2_layer_and_rig_foundation",
          source_size: sourceDimensions,
          motion_ready_regions: [
            "character_foreground",
            "face_region",
            "arm_hand_region",
            "prop_main",
            "fx_overlay"
          ],
          region_contract: layerRegions,
          clean_plate: relativeWorkspacePath(workspaceDir, cleanPlatePath),
          layers: layerFiles.map((fileName) => ({
            id: path.basename(fileName, ".png"),
            file: relativeWorkspacePath(workspaceDir, path.join(layerDir, fileName))
          })),
          warnings
        });

        upsertAsset(manifest, {
          asset_id: `LAYERS_${shot.shot_id}`,
          asset_type: "shot_layer",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, path.join(layerDir, "layer_manifest.json")),
          status: "approved",
          created_at: assetTimestamp()
        });
        upsertAsset(manifest, {
          asset_id: `PLATE_${shot.shot_id}`,
          asset_type: "clean_plate",
          shot_ids: [shot.shot_id],
          scene_ids: [scene.scene_id],
          file: relativeWorkspacePath(workspaceDir, cleanPlatePath),
          status: "approved",
          created_at: assetTimestamp()
        });
      }
    }

    saveManifest(workspaceDir, manifest);
    console.log(`Shot layers extracted for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
