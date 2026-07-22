#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  buildSceneReviewDecisionTemplate,
  buildSceneReviewMarkdown,
  buildSceneReviewPacket,
  collectReviewRequiredSceneIds
} = require("../src/bricktoon/sceneReviewClearance");

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

function mergeDecisionTemplate(existing = {}, reviewSceneIds = [], benchmarkSceneId = null) {
  const existingLookup = new Map(
    Array.isArray(existing.decisions)
      ? existing.decisions.filter((item) => item && item.scene_id).map((item) => [item.scene_id, item])
      : []
  );

  return {
    topic_id: existing.topic_id || null,
    updated_at: new Date().toISOString(),
    benchmark_scene_id: benchmarkSceneId || existing.benchmark_scene_id || null,
    decisions: reviewSceneIds.map((sceneId) => buildSceneReviewDecisionTemplate({
      sceneId,
      benchmarkSceneId,
      existingDecision: existingLookup.get(sceneId) || {}
    }))
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_bricktoon_scene_review.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const promotionGate = readJsonSafe(path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.json"), {});
    const sceneSequenceReport = readJsonSafe(path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"), {});
    const renderContract = readJsonSafe(path.join(workspaceDir, "09_edit_plan", "render_contract.json"), {});
    const benchmarkReliabilityReport = readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_benchmark_reliability_report.json"), {});
    const existingDecisionFile = readJsonSafe(path.join(workspaceDir, "10_qc", "bricktoon_scene_review_decisions.json"), {});
    const reviewSceneIds = collectReviewRequiredSceneIds({
      promotionGate,
      sceneSequenceReport,
      renderContract
    });
    const benchmarkSceneId = promotionGate.benchmark_editorial_scene?.scene_id || null;
    const decisionFile = mergeDecisionTemplate(existingDecisionFile, reviewSceneIds, benchmarkSceneId);
    decisionFile.topic_id = topicId;

    const packet = buildSceneReviewPacket({
      topicId,
      promotionGate,
      sceneSequenceReport,
      renderContract,
      benchmarkReliabilityReport,
      reviewDecisions: decisionFile
    });

    const qcDir = path.join(workspaceDir, "10_qc");
    fs.writeFileSync(
      path.join(qcDir, "bricktoon_scene_review_decisions.json"),
      `${JSON.stringify(decisionFile, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(qcDir, "bricktoon_scene_review_packet.json"),
      `${JSON.stringify(packet, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(qcDir, "bricktoon_scene_review_packet.md"),
      buildSceneReviewMarkdown(packet),
      "utf8"
    );

    console.log(`Bricktoon scene review packet created for '${topicId}' with ${packet.review_scenes.length} review scene(s).`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
