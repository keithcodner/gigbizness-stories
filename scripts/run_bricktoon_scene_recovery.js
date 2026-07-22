#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseArgs } = require("../agents/common");
const { parseSceneIdsArg } = require("../src/bricktoon/sceneSelection");

function readJsonSafe(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`Script failed: ${path.relative(path.resolve(__dirname, ".."), scriptPath)}`);
  }
}

function resolveRecoverySceneIds(workspaceDir, args) {
  const explicitSceneIds = parseSceneIdsArg(args["scene-ids"]);
  if (explicitSceneIds.length > 0) {
    return explicitSceneIds;
  }

  const recoveryPlan = readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_recovery_plan.json"), {});
  const bucket = String(args.bucket || "").trim().toLowerCase();
  if (bucket) {
    const match = (recoveryPlan.recovery_buckets || []).find((entry) => String(entry.bucket || "").toLowerCase() === bucket);
    if (match?.scene_ids?.length) {
      return match.scene_ids;
    }
  }

  for (const preferredBucket of ["light_rework", "heavy_rework", "manual_review"]) {
    const match = (recoveryPlan.recovery_buckets || []).find((entry) => entry.bucket === preferredBucket);
    if (match?.scene_ids?.length) {
      return match.scene_ids;
    }
  }

  return [];
}

function scopedArgs(workspaceDir, sceneIds = []) {
  const args = ["--workspace", workspaceDir];
  if (sceneIds.length > 0) {
    args.push("--scene-ids", sceneIds.join(","));
  }
  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/run_bricktoon_scene_recovery.js --workspace <workspace_path> [--bucket <bucket>] [--scene-ids S01,S02] [--runtime-profile <profile_id>]");
    }

    const workspaceDir = path.resolve(args.workspace);
    const runtimeProfile = args["runtime-profile"] || "gtx1080_premium_preview";
    const sceneIds = resolveRecoverySceneIds(workspaceDir, args);
    const bucket = String(args.bucket || "").trim().toLowerCase() || null;

    if (bucket === "benchmark_locked") {
      console.log("Benchmark-locked scenes do not need scoped recovery. Use benchmark-scene-proof for benchmark validation.");
      return;
    }

    if (sceneIds.length === 0 && bucket !== "manual_review") {
      throw new Error("No recovery scenes were resolved. Run bricktoon-recovery-plan first or pass --scene-ids.");
    }

    console.log(`Bricktoon scene recovery targeting: ${sceneIds.length > 0 ? sceneIds.join(", ") : "manual review refresh only"}`);

    const rootDir = path.resolve(__dirname, "..");
    const run = (relativeScriptPath, extraArgs = []) => {
      runNodeScript(path.join(rootDir, relativeScriptPath), extraArgs);
    };

    if (bucket === "manual_review") {
      run("scripts/build_bricktoon_scene_review.js", ["--workspace", workspaceDir]);
      run("scripts/build_bricktoon_reliability_report.js", ["--workspace", workspaceDir, "--runtime-profile", runtimeProfile]);
      run("scripts/build_bricktoon_recovery_plan.js", ["--workspace", workspaceDir, "--runtime-profile", runtimeProfile]);
      console.log("Manual-review recovery refresh completed.");
      return;
    }

    run("scripts/generate_shot_keyframes.js", scopedArgs(workspaceDir, sceneIds));
    run("scripts/validate_generated_assets.js", scopedArgs(workspaceDir, sceneIds));
    run("scripts/generate_visual_preview.js", ["--workspace", workspaceDir]);
    run("scripts/generate_ai_motion_passes.js", scopedArgs(workspaceDir, sceneIds));
    run("scripts/stabilize_ai_motion.js", scopedArgs(workspaceDir, sceneIds));
    run("scripts/composite_bricktoon_shots.js", scopedArgs(workspaceDir, sceneIds));
    run("scripts/assemble_bricktoon_scene_sequences.js", scopedArgs(workspaceDir, sceneIds));
    run("scripts/compile_render_contract.js", [
      "--workspace",
      workspaceDir,
      "--profile",
      "draft",
      "--mode",
      "development"
    ]);
    run("scripts/build_hybrid_promotion_gate.js", [
      "--workspace",
      workspaceDir,
      "--runtime-profile",
      runtimeProfile
    ]);
    run("scripts/build_bricktoon_reliability_report.js", [
      "--workspace",
      workspaceDir,
      "--runtime-profile",
      runtimeProfile
    ]);
    run("scripts/build_bricktoon_scene_review.js", ["--workspace", workspaceDir]);
    run("scripts/build_bricktoon_recovery_plan.js", [
      "--workspace",
      workspaceDir,
      "--runtime-profile",
      runtimeProfile
    ]);

    console.log(`Bricktoon scene recovery completed for ${sceneIds.join(", ")}.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
