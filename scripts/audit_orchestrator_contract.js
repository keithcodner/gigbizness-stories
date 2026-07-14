#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ORCHESTRATOR_PATH = path.join(ROOT, "agents", "orchestrator.js");
const CONTRACT_PATH = path.join(ROOT, "config", "orchestrator_contract.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertContains(sourceText, pattern, label, findings) {
  if (!sourceText.includes(pattern)) {
    findings.push(`Missing ${label}: ${pattern}`);
  }
}

function main() {
  try {
    const orchestratorText = fs.readFileSync(ORCHESTRATOR_PATH, "utf8");
    const contract = readJson(CONTRACT_PATH);
    const findings = [];

    for (const stage of contract.current_pipeline_order) {
      assertContains(orchestratorText, `--stage ${stage}`, `usage entry for stage '${stage}'`, findings);

      if (stage !== "bricktoon-audit") {
        assertContains(orchestratorText, `"${stage}"`, `stage validation reference for '${stage}'`, findings);
      }
    }

    assertContains(orchestratorText, "function runGuidedPipeline(topicId, mode = \"guided\")", "guided pipeline function", findings);
    assertContains(orchestratorText, "function printUsage()", "usage printer", findings);
    assertContains(orchestratorText, "function ensureWorkspaceLayout(workspaceDir, topicPath = null)", "workspace layout seeding", findings);

    if (findings.length > 0) {
      console.error("ORCHESTRATOR CONTRACT AUDIT FAILED");
      for (const finding of findings) {
        console.error(`- ${finding}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("Orchestrator contract audit passed.");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
