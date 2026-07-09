#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  readJson,
  slugToTitle,
  toCsv,
  writeText
} = require("./common");

function getResearchPaths(workspaceDir) {
  const researchDir = path.join(workspaceDir, "01_research");
  const configDir = path.join(workspaceDir, "00_config");

  return {
    researchDir,
    topicPath: path.join(configDir, "topic.json"),
    manualNotesPath: path.join(researchDir, "manual_notes.md"),
    researchDossierPath: path.join(researchDir, "research_dossier.md"),
    sourcesPath: path.join(researchDir, "sources.csv"),
    factTablePath: path.join(researchDir, "fact_table.csv"),
    claimsPath: path.join(researchDir, "claims_to_verify.md"),
    caseTimelinePath: path.join(researchDir, "case_timeline.md"),
    riskReportPath: path.join(researchDir, "source_risk_report.md")
  };
}

function extractBulletsFromNotes(notes) {
  return notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function buildSeedSources(topic) {
  const sources = [
    {
      source_title: `${topic.working_title} manual research notes`,
      source_url: "",
      source_type: "unknown",
      reliability: "medium",
      risk_level: "medium",
      notes: "Starter placeholder based on manual notes. Replace with real sources during research."
    }
  ];

  if (topic.video_type === "business_crime_story") {
    sources.push({
      source_title: "Regulator, court, or attorney general case source needed",
      source_url: "",
      source_type: "regulator",
      reliability: "high",
      risk_level: "high",
      notes: "Add at least one official enforcement or court source before using legal accusations."
    });
  }

  return sources;
}

function buildSeedFacts(topic, noteBullets) {
  const baseFacts = [
    {
      claim: `${topic.working_title} should explain the normal business model before discussing edge cases or abuse.`,
      claim_type: "business_model",
      value: "",
      date: "",
      source_title: "Topic config",
      source_url: "",
      source_type: "company_page",
      reliability: "medium",
      risk_level: "low",
      needs_human_review: "no"
    },
    {
      claim: topic.central_question,
      claim_type: "central_question",
      value: "",
      date: "",
      source_title: "Topic config",
      source_url: "",
      source_type: "company_page",
      reliability: "medium",
      risk_level: "low",
      needs_human_review: "no"
    }
  ];

  const derivedFacts = noteBullets.slice(0, 8).map((bullet) => ({
    claim: bullet,
    claim_type: inferClaimType(bullet, topic),
    value: "",
    date: "",
    source_title: "Manual notes",
    source_url: "",
    source_type: "unknown",
    reliability: "medium",
    risk_level: inferRiskLevel(bullet, topic),
    needs_human_review: "yes"
  }));

  return [...baseFacts, ...derivedFacts];
}

function inferClaimType(text, topic) {
  const normalized = text.toLowerCase();
  if (normalized.includes("fee") || normalized.includes("cost") || normalized.includes("margin")) {
    return "economics";
  }
  if (normalized.includes("law") || normalized.includes("court") || normalized.includes("charged") || normalized.includes("sued")) {
    return "legal";
  }
  if (normalized.includes("timeline") || normalized.includes("history") || normalized.includes("started")) {
    return "timeline";
  }
  if (topic.video_type === "business_crime_story") {
    return "crime_risk";
  }

  return "research_note";
}

function inferRiskLevel(text, topic) {
  const normalized = text.toLowerCase();
  if (normalized.includes("charged") || normalized.includes("convicted") || normalized.includes("lawsuit") || normalized.includes("fraud")) {
    return "high";
  }
  if (normalized.includes("fee") || normalized.includes("profit") || normalized.includes("margin")) {
    return "medium";
  }
  if (topic.video_type === "business_crime_story") {
    return "medium";
  }

  return "low";
}

function buildTimeline(topic, noteBullets) {
  const lines = [
    "# Case Timeline",
    "",
    `## ${topic.working_title}`,
    "",
    "- Background: document how the normal business works before the conflict starts.",
    "- Build-out: add dated events, enforcement actions, and turning points here."
  ];

  for (const bullet of noteBullets.slice(0, 5)) {
    lines.push(`- Candidate event: ${bullet}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildClaimsToVerify(topic, noteBullets) {
  const lines = [
    "# Claims To Verify",
    "",
    "These items need supporting evidence before they should appear as factual narration.",
    ""
  ];

  if (noteBullets.length === 0) {
    lines.push("- Add manual notes with candidate claims, numbers, cases, and sources.");
  } else {
    for (const bullet of noteBullets) {
      lines.push(`- ${bullet}`);
    }
  }

  if (topic.video_type === "business_crime_story") {
    lines.push("- Confirm exact legal status for any named company, person, or enforcement action.");
    lines.push("- Add at least one official source before describing a public case in the script.");
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildDossier(topic, noteBullets, manualNotes) {
  const visualIdeas = (topic.visual_style || []).map((item) => `- ${item}`).join("\n");
  const mustInclude = (topic.must_include || []).map((item) => `- ${item}`).join("\n");
  const claims = noteBullets.length > 0
    ? noteBullets.map((item) => `- ${item}`).join("\n")
    : "- Add verified claims from manual notes and sources.";

  const crimeSection = topic.video_type === "business_crime_story"
    ? [
        "## Crime/scam/legal section if applicable",
        "",
        "Use conservative wording until official sourcing is attached.",
        "- Distinguish alleged, charged, sued, fined, settled, and convicted.",
        "- Note who said it: court documents, regulators, or reputable reporting.",
        ""
      ].join("\n")
    : [
        "## Crime/scam/legal section if applicable",
        "",
        "Not a crime-first topic, but still flag disputed or regulated claims.",
        ""
      ].join("\n");

  const notesExcerpt = manualNotes.trim()
    ? manualNotes.trim().split(/\r?\n/).slice(0, 12).join("\n")
    : "_No manual notes added yet._";

  return [
    "# Research Dossier",
    "",
    "## Central question",
    "",
    topic.central_question,
    "",
    "## Short answer",
    "",
    `${topic.value_promise} This draft dossier is manual-first and should be tightened with sourced reporting before scripting.`,
    "",
    "## Business model",
    "",
    mustInclude || "- Define the business model and its core workflow.",
    "",
    "## Money flow",
    "",
    "- Identify where revenue starts, where costs pile up, and where incentives shift behavior.",
    "- Add sourced numbers to replace placeholders before script drafting.",
    "",
    "## Key numbers",
    "",
    "- Add prices, margins, fees, fines, growth rates, or volume figures with sources.",
    "",
    "## Timeline",
    "",
    "- Add dated events, regulation changes, notable incidents, and industry shifts.",
    "",
    "## Real-world examples",
    "",
    "- Add at least one public case or operator example with sources.",
    "",
    crimeSection,
    "## Counterpoints",
    "",
    "- What does the legitimate version of this business do well?",
    "- Where can viewers overgeneralize or misunderstand the issue?",
    "",
    "## Visual opportunities",
    "",
    visualIdeas || "- Add visuals based on topic style.",
    "",
    "## Approved facts",
    "",
    "- None yet. Use `approved_facts.csv` after validation.",
    "",
    "## Claims needing review",
    "",
    claims,
    "",
    "## Working notes snapshot",
    "",
    notesExcerpt,
    "",
    "## Sources",
    "",
    "- Replace placeholder rows in `sources.csv` with real sources.",
    ""
  ].join("\n");
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/research_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getResearchPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    if (!fs.existsSync(paths.manualNotesPath)) {
      writeText(
        paths.manualNotesPath,
        "# Manual Notes\n\nAdd rough research notes, pasted excerpts, candidate sources, and open questions here before running the research stage.\n"
      );
    }
    const manualNotes = fs.existsSync(paths.manualNotesPath)
      ? fs.readFileSync(paths.manualNotesPath, "utf8")
      : "";
    const noteBullets = extractBulletsFromNotes(manualNotes);

    const sourceRows = buildSeedSources(topic);
    const factRows = buildSeedFacts(topic, noteBullets);

    writeText(paths.researchDossierPath, buildDossier(topic, noteBullets, manualNotes));
    writeText(paths.sourcesPath, toCsv(sourceRows, [
      "source_title",
      "source_url",
      "source_type",
      "reliability",
      "risk_level",
      "notes"
    ]));
    writeText(paths.factTablePath, toCsv(factRows, [
      "claim",
      "claim_type",
      "value",
      "date",
      "source_title",
      "source_url",
      "source_type",
      "reliability",
      "risk_level",
      "needs_human_review"
    ]));
    writeText(paths.claimsPath, buildClaimsToVerify(topic, noteBullets));
    writeText(paths.caseTimelinePath, buildTimeline(topic, noteBullets));

    const researchSummary = [
      "# Source Risk Report",
      "",
      `Research seed created for ${topic.working_title}.`,
      "",
      `- Topic slug: ${topic.id}`,
      `- Topic label: ${slugToTitle(topic.id)}`,
      `- Manual note bullets found: ${noteBullets.length}`,
      "- Validation stage will replace this report with a fuller assessment."
    ].join("\n");
    writeText(paths.riskReportPath, `${researchSummary}\n`);

    console.log(`Research files generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
