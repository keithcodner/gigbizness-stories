#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const { buildRenderOutputProof, writeRenderOutputProof } = require("../src/bricktoon/renderOutputProof");
const { loadRuntimeProfiles, resolveRuntimeProfile } = require("../src/bricktoon/reliabilityGate");

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

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_render_output_proof.js --workspace <workspace_path> [--runtime-profile <profile_id>] [--profile <draft|youtube_1080p>]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const runtimeProfiles = loadRuntimeProfiles(rootDir);
    const runtimeProfile = resolveRuntimeProfile(runtimeProfiles, args["runtime-profile"]);
    const renderProfile = args.profile || runtimeProfile.render_profile || "draft";
    const renderPath = renderProfile === "draft"
      ? path.join(workspaceDir, "06_renders", "draft_01.mp4")
      : path.join(workspaceDir, "06_renders", "final_1080p.mp4");

    const proof = buildRenderOutputProof({
      topicId,
      renderPath,
      renderContract: readJsonSafe(path.join(workspaceDir, "09_edit_plan", "render_contract.json"), {}),
      compositingReport: readJsonSafe(path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"), {}),
      runtimeProfile
    });

    proof.render_file = path.relative(workspaceDir, renderPath).replaceAll("\\", "/");

    const reportDir = path.join(workspaceDir, "10_qc");
    const baseName = renderProfile === "draft"
      ? "bricktoon_render_output_proof"
      : "bricktoon_final_render_output_proof";
    writeRenderOutputProof({
      jsonPath: path.join(reportDir, `${baseName}.json`),
      markdownPath: path.join(reportDir, `${baseName}.md`),
      proof
    });

    console.log(`Bricktoon render output proof created for '${topicId}' with decision '${proof.gate.decision}'.`);
    if (proof.gate.blockers.length > 0) {
      console.log(`Blockers: ${proof.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
