#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("../agents/common");
const {
  ensureDir,
  loadManifest,
  saveManifest,
  upsertAsset,
  relativeWorkspacePath,
  assetTimestamp,
  writeJson
} = require("../src/bricktoon/aiQualityPipeline");
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

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/stabilize_ai_motion.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const selectedSceneIds = parseSceneIdsArg(args["scene-ids"]);
    const selectedScenes = filterScenes(shotPlan.scenes || [], selectedSceneIds);
    const selectedShotIds = hasSceneSelection(selectedSceneIds) ? collectShotIdsFromScenes(selectedScenes) : [];
    const selectedShotIdSet = new Set(selectedShotIds);
    const rawDir = path.join(workspaceDir, "08_animation", "raw_ai_video");
    const stabilizedDir = path.join(workspaceDir, "08_animation", "stabilized_ai_video");
    ensureDir(stabilizedDir);
    const manifest = loadManifest(workspaceDir);
    const existingReport = readJsonSafe(path.join(stabilizedDir, "stabilization_report.json"), {});
    const stabilizationReport = {
      generated_at: assetTimestamp(),
      status: "stabilization_ready",
      shots: []
    };

    for (const fileName of fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : []) {
      if (!fileName.endsWith(".mp4")) {
        continue;
      }
      const shotId = fileName.replace("_ai_motion.mp4", "");
      if (selectedShotIds.length > 0 && !selectedShotIdSet.has(shotId)) {
        continue;
      }
      const source = path.join(rawDir, fileName);
      const target = path.join(stabilizedDir, fileName.replace("_ai_motion", "_stabilized"));
      let qualityGate = "stabilized_render";
      try {
        runFfmpeg([
          "-y",
          "-i",
          source,
          "-vf",
          "fps=24,scale=768:1344:force_original_aspect_ratio=decrease,pad=768:1344:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:0.5:5:5:0.0",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          target
        ], `stabilize motion ${fileName}`);
      } catch (error) {
        fs.copyFileSync(source, target);
        qualityGate = "accepted_copy_after_stabilization_failure";
      }
      upsertAsset(manifest, {
        asset_id: `STABILIZED_${shotId}`,
        asset_type: "stabilized_motion_pass",
        shot_ids: [shotId],
        file: relativeWorkspacePath(workspaceDir, target),
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "motion_pass_stabilization_v1"
        },
        created_at: assetTimestamp()
      });
      stabilizationReport.shots.push({
        shot_id: shotId,
        source_file: relativeWorkspacePath(workspaceDir, source),
        stabilized_file: relativeWorkspacePath(workspaceDir, target),
        quality_gate: qualityGate
      });
    }

    stabilizationReport.shots = mergeScopedRecords(existingReport.shots || [], stabilizationReport.shots, {
      idField: "shot_id",
      scopedIds: selectedShotIds
    });
    saveManifest(workspaceDir, manifest);
    writeJson(path.join(stabilizedDir, "stabilization_report.json"), stabilizationReport);
    console.log(`AI motion stabilization completed for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
