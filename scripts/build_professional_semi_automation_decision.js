#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const {
  buildProfessionalSemiAutomationMarkdown,
  buildProfessionalSemiAutomationReport
} = require("../src/bricktoon/professionalSemiAutomationDecision");

function nextDecisionId(rootDir) {
  const fs = require("fs");
  fs.mkdirSync(rootDir, { recursive: true });
  const dirs = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^decision_\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const nextNumber = dirs.length + 1;
  return `decision_${String(nextNumber).padStart(3, "0")}`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_professional_semi_automation_decision.js --workspace <workspace_path>");
    }

    const fs = require("fs");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const decisionRoot = path.join(workspaceDir, "11_external_handoff", "professional_semi_automation");
    const decisionId = nextDecisionId(decisionRoot);
    const decisionDir = path.join(decisionRoot, decisionId);
    fs.mkdirSync(decisionDir, { recursive: true });

    const toolchainMapReport = readJson(path.join(workspaceDir, "11_external_handoff", "professional_toolchain_map", "latest_toolchain_map_report.json"));
    const reintegrationReport = readJson(path.join(workspaceDir, "11_external_handoff", "professional_reintegration", "latest_professional_reintegration_report.json"));
    const productionReadiness = readJson(path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.json"));
    const reliabilityReport = readJson(path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json"));

    const report = buildProfessionalSemiAutomationReport({
      topicId,
      decisionId,
      toolchainMapReport,
      reintegrationReport,
      productionReadiness,
      reliabilityReport
    });

    const manifest = {
      decision_id: decisionId,
      topic_id: topicId,
      created_at: report.created_at,
      route_classification: report.route_decision.route_classification,
      recommended_use: report.route_decision.recommended_use,
      benchmark_scene_id: report.route_decision.benchmark_scene_id,
      decision: report.gate.decision
    };

    writeText(path.join(decisionDir, "professional_semi_automation_report.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeText(path.join(decisionDir, "professional_semi_automation_report.md"), buildProfessionalSemiAutomationMarkdown(report));
    writeText(path.join(decisionDir, "professional_semi_automation_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    writeText(path.join(decisionRoot, "latest_professional_semi_automation_report.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeText(path.join(decisionRoot, "latest_professional_semi_automation_report.md"), buildProfessionalSemiAutomationMarkdown(report));
    writeText(path.join(decisionRoot, "latest_professional_semi_automation_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    writeText(path.join(workspaceDir, "10_qc", "professional_semi_automation_report.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeText(path.join(workspaceDir, "10_qc", "professional_semi_automation_report.md"), buildProfessionalSemiAutomationMarkdown(report));

    console.log(`Professional semi-automation decision created for '${topicId}' as '${decisionId}'.`);
    console.log(`Decision: ${report.gate.decision}.`);
    console.log(`Route classification: ${report.route_decision.route_classification}.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
