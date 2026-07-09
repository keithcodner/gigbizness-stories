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

function getPaths(workspaceDir) {
  const researchDir = path.join(workspaceDir, "01_research");
  const configDir = path.join(workspaceDir, "00_config");
  const rootConfigDir = path.join(path.resolve(__dirname, ".."), "config");

  return {
    topicPath: path.join(configDir, "topic.json"),
    factTablePath: path.join(researchDir, "fact_table.csv"),
    sourcesPath: path.join(researchDir, "sources.csv"),
    approvedFactsPath: path.join(researchDir, "approved_facts.csv"),
    blockedClaimsPath: path.join(researchDir, "blocked_claims.md"),
    riskReportPath: path.join(researchDir, "source_risk_report.md"),
    qualityRulesPath: path.join(rootConfigDir, "quality_rules.json"),
    sourceRulesPath: path.join(rootConfigDir, "source_rules.json")
  };
}

function evaluateFact(fact, topic, validSourceTypes) {
  const issues = [];
  const reliability = (fact.reliability || "").toLowerCase();
  const riskLevel = (fact.risk_level || "").toLowerCase();
  const sourceType = (fact.source_type || "").toLowerCase();
  const claim = fact.claim || "";
  const normalizedClaim = claim.toLowerCase();

  if (!claim.trim()) {
    issues.push("Missing claim text.");
  }

  if (!validSourceTypes.has(sourceType)) {
    issues.push(`Unknown source type '${fact.source_type || ""}'.`);
  }

  if (!fact.source_title) {
    issues.push("Missing source title.");
  }

  if ((reliability === "low" || sourceType === "unknown" || sourceType === "blog") && !fact.source_url) {
    issues.push("Weak source row has no source URL.");
  }

  const mentionsNumbers = /\d/.test(claim) || /\d/.test(fact.value || "");
  if (mentionsNumbers && !fact.source_title) {
    issues.push("Numbered claim is missing a source title.");
  }

  const legalTrigger = ["alleg", "charged", "convict", "sued", "lawsuit", "settled", "fined", "indict", "sentence", "forfeiture", "extort"];
  const legalClaimTypes = new Set(["legal", "court_case", "enforcement_action", "regulator_warning"]);
  const isLegalClaim = legalTrigger.some((token) => normalizedClaim.includes(token)) || legalClaimTypes.has(fact.claim_type);
  if (isLegalClaim) {
    if (!["government", "court", "regulator", "reputable_news"].includes(sourceType)) {
      issues.push("Legal or crime claim needs official or reputable reporting support.");
    }
    if (reliability === "low" || sourceType === "unknown") {
      issues.push("Legal or crime claim uses a weak source.");
    }
  }

  if (topic.video_type === "business_crime_story" && riskLevel === "high" && !isLegalClaim && sourceType === "unknown") {
    issues.push("High-risk crime-story claim still needs stronger sourcing.");
  }

  const approved = issues.length === 0 && reliability !== "low" && sourceType !== "unknown";
  const legalStatus = inferLegalStatus(claim);
  const usageGuidance = approved
    ? legalStatus === "none"
      ? "Can be used in script if phrased accurately."
      : `Use exact wording: ${legalStatus}.`
    : "Do not use in script until sourcing gaps are resolved.";

  return {
    approved,
    legal_status: legalStatus,
    usage_guidance: usageGuidance,
    issues
  };
}

function inferLegalStatus(claim) {
  const text = (claim || "").toLowerCase();
  if (text.includes("convict")) {
    return "convicted";
  }
  if (text.includes("charged")) {
    return "charged";
  }
  if (text.includes("settled")) {
    return "settled";
  }
  if (text.includes("fined")) {
    return "fined";
  }
  if (text.includes("lawsuit") || text.includes("sued")) {
    return "lawsuit alleges";
  }
  if (text.includes("alleg")) {
    return "alleged";
  }
  return "none";
}

function buildBlockedClaims(rows) {
  const lines = [
    "# Blocked Claims",
    "",
    "These claims should stay out of the script until better sourcing or tighter wording is added.",
    ""
  ];

  if (rows.length === 0) {
    lines.push("- None.");
  } else {
    for (const row of rows) {
      lines.push(`- ${row.claim}`);
      for (const issue of row.issues) {
        lines.push(`  - ${issue}`);
      }
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildRiskReport(topic, qualityRules, sourceRows, approvedRows, blockedRows) {
  const officialSourceCount = sourceRows.filter((row) =>
    ["government", "court", "regulator", "company_filing"].includes((row.source_type || "").toLowerCase())
  ).length;

  const lines = [
    "# Source Risk Report",
    "",
    `## Topic`,
    "",
    `- ${topic.working_title} (${topic.video_type})`,
    "",
    "## Research coverage",
    "",
    `- Source rows: ${sourceRows.length}`,
    `- Approved facts: ${approvedRows.length}`,
    `- Blocked claims: ${blockedRows.length}`,
    `- Official or primary source rows: ${officialSourceCount}`,
    "",
    "## Rules check",
    "",
    `- Minimum sources target: ${qualityRules.research.min_sources}`,
    `- Minimum primary or official sources: ${qualityRules.research.min_primary_or_official_sources}`,
    topic.video_type === "business_crime_story"
      ? `- Crime-story official source target: ${qualityRules.research.crime_video_min_official_sources}`
      : "- Crime-story official source target: not applicable",
    "",
    "## Status",
    "",
    officialSourceCount >= qualityRules.research.min_primary_or_official_sources
      ? "- Official source minimum for general research is met."
      : "- Official source minimum for general research is not met yet.",
    sourceRows.length >= qualityRules.research.min_sources
      ? "- Total source count target is met."
      : "- Total source count target is not met yet.",
    topic.video_type === "business_crime_story" &&
    officialSourceCount < qualityRules.research.crime_video_min_official_sources
      ? "- Crime-story official source requirement is not met yet."
      : "- Crime-story official source requirement is either met or not applicable.",
    "",
    "## Next actions",
    "",
    "- Replace placeholder source rows with real URLs and titles.",
    "- Add official documentation for every legal or enforcement claim.",
    "- Move only approved rows into script drafting.",
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/source_validator.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const qualityRules = readJson(paths.qualityRulesPath);
    const sourceRules = readJson(paths.sourceRulesPath);
    const factTable = parseCsv(fs.readFileSync(paths.factTablePath, "utf8")).rows;
    const sources = parseCsv(fs.readFileSync(paths.sourcesPath, "utf8")).rows;
    const validSourceTypes = new Set(sourceRules.source_types || []);

    const approvedRows = [];
    const blockedRows = [];

    for (const fact of factTable) {
      const evaluation = evaluateFact(fact, topic, validSourceTypes);
      const enriched = {
        ...fact,
        legal_status: evaluation.legal_status,
        usage_guidance: evaluation.usage_guidance
      };

      if (evaluation.approved) {
        approvedRows.push(enriched);
      } else {
        blockedRows.push({
          claim: fact.claim || "(blank claim)",
          issues: evaluation.issues
        });
      }
    }

    writeText(paths.approvedFactsPath, toCsv(approvedRows, [
      "claim",
      "claim_type",
      "value",
      "date",
      "source_title",
      "source_url",
      "source_type",
      "reliability",
      "risk_level",
      "legal_status",
      "usage_guidance"
    ]));
    writeText(paths.blockedClaimsPath, buildBlockedClaims(blockedRows));
    writeText(
      paths.riskReportPath,
      buildRiskReport(topic, qualityRules, sources, approvedRows, blockedRows)
    );

    console.log(`Source validation completed for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
