#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { buildReliabilityMarkdown, buildReliabilityReport, loadRuntimeProfiles, resolveRuntimeProfile } = require("../src/bricktoon/reliabilityGate");
const { summarizeArtifactFreshness } = require("../src/bricktoon/artifactFreshness");

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

function readFirstExistingJson(filePaths = [], fallback = {}) {
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      return readJsonSafe(filePath, fallback);
    }
  }
  return fallback;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_bricktoon_reliability_report.js --workspace <workspace_path> [--runtime-profile <profile_id>]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const runtimeProfiles = loadRuntimeProfiles(rootDir);
    const runtimeProfile = resolveRuntimeProfile(runtimeProfiles, args["runtime-profile"]);
    const scope = args.scope || "topic";
    const artifactFreshness = summarizeArtifactFreshness([
      {
        artifact_id: "hybrid_animation_contract",
        target_path: path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"),
        dependencies: {
          production_routes: path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"),
          shot_performances: path.join(workspaceDir, "08_animation", "shot_performances.json")
        }
      },
      {
        artifact_id: "ai_motion_passes",
        target_path: path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json"),
        dependencies: {
          production_routes: path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"),
          shot_clip_report: path.join(workspaceDir, "08_animation", "shot_clips", "shot_clip_report.json")
        }
      },
      {
        artifact_id: "stabilized_motion_passes",
        target_path: path.join(workspaceDir, "08_animation", "stabilized_ai_video", "stabilization_report.json"),
        dependencies: {
          ai_motion_report: path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json")
        }
      },
      {
        artifact_id: "shot_compositing",
        target_path: path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"),
        dependencies: {
          ai_motion_report: path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json"),
          shot_clip_report: path.join(workspaceDir, "08_animation", "shot_clips", "shot_clip_report.json")
        }
      },
      {
        artifact_id: "scene_sequence_assembly",
        target_path: path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"),
        dependencies: {
          compositing_report: path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json")
        }
      }
    ]);

    const report = buildReliabilityReport({
      topicId,
      runtimeProfile,
      machineProfile: readJsonSafe(path.join(rootDir, "config", "machine_profile.json"), {}),
      sceneSequenceReport: readJsonSafe(path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"), {}),
      renderContract: readJsonSafe(path.join(workspaceDir, "09_edit_plan", "render_contract.json"), {}),
      promotionGate: readJsonSafe(path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.json"), {}),
      sceneReviewDecisions: readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_scene_review_decisions.json"), {}),
      visualReadiness: readJsonSafe(path.join(workspaceDir, "04_assets", "visual_readiness.json"), {}),
      artifactFreshness,
      motionPassReport: readJsonSafe(path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json"), {}),
      compositingReport: readJsonSafe(path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"), {}),
      renderOutputProof: readFirstExistingJson([
        path.join(workspaceDir, "10_qc", "bricktoon_final_render_output_proof.json"),
        path.join(workspaceDir, "10_qc", "bricktoon_render_output_proof.json")
      ], {}),
      visualPreviewExists: fs.existsSync(path.join(workspaceDir, "06_renders", "previews", "visual_preview.mp4")),
      finalApprovalText: fs.existsSync(path.join(workspaceDir, "10_qc", "final_approval.md"))
        ? fs.readFileSync(path.join(workspaceDir, "10_qc", "final_approval.md"), "utf8")
        : "",
      scope
    });

    const reportDir = path.join(workspaceDir, "10_qc");
    const baseName = scope === "benchmark_selected"
      ? "bricktoon_benchmark_reliability_report"
      : "bricktoon_reliability_report";
    const jsonPath = path.join(reportDir, `${baseName}.json`);
    const mdPath = path.join(reportDir, `${baseName}.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(mdPath, buildReliabilityMarkdown(report), "utf8");

    console.log(`Bricktoon reliability report created for '${topicId}' with decision '${report.gate.decision}' in scope '${scope}'.`);
    if (report.gate.blockers.length > 0) {
      console.log(`Blockers: ${report.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
