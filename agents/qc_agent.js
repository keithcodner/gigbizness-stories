#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  parseCsv,
  readJson,
  writeText
} = require("./common");
const { hasUsableVoiceAudio } = require("../src/audio/audioReadiness");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const researchDir = path.join(workspaceDir, "01_research");
  const scriptDir = path.join(workspaceDir, "02_script");
  const assetsDir = path.join(workspaceDir, "04_assets");
  const renderPlanDir = path.join(workspaceDir, "05_render_plan");
  const renderDir = path.join(workspaceDir, "06_renders");
  const thumbnailDir = path.join(workspaceDir, "08_thumbnail");
  const publishDir = path.join(workspaceDir, "09_publish");
  const qcDir = path.join(workspaceDir, "10_qc");
  const rootConfigDir = path.join(path.resolve(__dirname, ".."), "config");

  return {
    topicPath: path.join(configDir, "topic.json"),
    qualityRulesPath: path.join(rootConfigDir, "quality_rules.json"),
    musicPolicyPath: path.join(rootConfigDir, "music_policy.json"),
    sourceRulesPath: path.join(rootConfigDir, "source_rules.json"),
    researchDossierPath: path.join(researchDir, "research_dossier.md"),
    sourcesPath: path.join(researchDir, "sources.csv"),
    approvedFactsPath: path.join(researchDir, "approved_facts.csv"),
    blockedClaimsPath: path.join(researchDir, "blocked_claims.md"),
    riskReportPath: path.join(researchDir, "source_risk_report.md"),
    scriptPath: path.join(scriptDir, "script_v2_human_review.md"),
    voiceCleanPath: path.join(workspaceDir, "03_voice", "voiceover_clean.wav"),
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    visualManifestPath: path.join(assetsDir, "visual_manifest.csv"),
    musicSelectionPath: path.join(assetsDir, "music", "music_selection.md"),
    musicManifestPath: path.join(assetsDir, "music", "music_manifest.csv"),
    draftRenderPath: path.join(renderDir, "draft_01.mp4"),
    final1080pPath: path.join(renderDir, "final_1080p.mp4"),
    final1440pPath: path.join(renderDir, "final_1440p.mp4"),
    titleOptionsPath: path.join(publishDir, "title_options.txt"),
    descriptionPath: path.join(publishDir, "description.txt"),
    tagsPath: path.join(publishDir, "tags.txt"),
    chaptersPath: path.join(publishDir, "chapters.txt"),
    pinnedCommentPath: path.join(publishDir, "pinned_comment.txt"),
    thumbnailPromptPath: path.join(thumbnailDir, "thumbnail_prompt.txt"),
    thumbnailConceptsPath: path.join(thumbnailDir, "thumbnail_concepts.md"),
    finalThumbnailPath: path.join(thumbnailDir, "final_thumbnail.jpg"),
    qualityReportPath: path.join(qcDir, "quality_report.md"),
    requiredFixesPath: path.join(qcDir, "required_fixes.md"),
    optionalImprovementsPath: path.join(qcDir, "optional_improvements.md"),
    factCheckReportPath: path.join(qcDir, "fact_check_report.md"),
    legalRiskReportPath: path.join(qcDir, "legal_risk_report.md"),
    visualSafetyReportPath: path.join(qcDir, "visual_safety_report.md"),
    finalApprovalPath: path.join(qcDir, "final_approval.md")
  };
}

function safeRead(filePath, fallback = "") {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : fallback;
}

function safeReadCsv(filePath) {
  return fs.existsSync(filePath) ? parseCsv(fs.readFileSync(filePath, "utf8")).rows : [];
}

function safeReadJson(filePath, fallback) {
  return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function resolveAssetPath(workspaceDir, row) {
  const assetsDir = path.join(workspaceDir, "04_assets");
  if (/\.(svg|png|jpg|jpeg|webp|bmp)$/i.test(row.filename || "")) {
    return path.join(assetsDir, "charts", row.filename);
  }
  if ((row.asset_type || "").toLowerCase() === "document") {
    return path.join(assetsDir, "documents", row.filename);
  }
  if ((row.asset_type || "").toLowerCase() === "stock_video") {
    return path.join(assetsDir, "stock_videos", row.filename);
  }
  return path.join(assetsDir, row.filename || "");
}

function parseBlockedClaims(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^- /.test(line.trim()))
    .map((line) => line.trim().replace(/^- /, ""))
    .filter((line) => line && line !== "None.");
}

function extractFirstSceneSection(scriptMarkdown) {
  const match = scriptMarkdown.match(/## S01[\s\S]*?(?=\n## S\d{2}\s-\s|\n## Human review focus|\n## Blocked claims snapshot|$)/);
  return match ? match[0] : "";
}

function extractSceneSections(scriptMarkdown) {
  return scriptMarkdown.match(/## S\d{2}[\s\S]*?(?=\n## S\d{2}\s-\s|\n## Human review focus|\n## Blocked claims snapshot|$)/g) || [];
}

function countNumberMentions(text) {
  const matches = text.match(/\b\d+(?:[.,]\d+)?\b/g);
  return matches ? matches.length : 0;
}

function hasPublicCase(topic, dossier, script) {
  const text = `${dossier}\n${script}`.toLowerCase();
  if (topic.video_type !== "business_crime_story") {
    return true;
  }

  return text.includes("public case") ||
    text.includes("court") ||
    text.includes("regulator") ||
    text.includes("attorney general") ||
    text.includes("case study");
}

function buildResearchChecks(topic, qualityRules, sources, approvedFacts, blockedClaims, dossier, riskReport) {
  const findings = [];
  const officialSourceTypes = new Set(["government", "court", "regulator", "company_filing"]);
  const officialSourceCount = sources.filter((row) => officialSourceTypes.has((row.source_type || "").toLowerCase())).length;
  const totalSources = sources.length;
  const researchPass =
    totalSources >= qualityRules.research.min_sources &&
    officialSourceCount >= qualityRules.research.min_primary_or_official_sources &&
    (topic.video_type !== "business_crime_story" || officialSourceCount >= qualityRules.research.crime_video_min_official_sources) &&
    approvedFacts.length > 0;

  if (totalSources < qualityRules.research.min_sources) {
    findings.push(`Only ${totalSources} source rows are present; target is ${qualityRules.research.min_sources}.`);
  }

  if (officialSourceCount < qualityRules.research.min_primary_or_official_sources) {
    findings.push(`Only ${officialSourceCount} official or primary sources are present; target is ${qualityRules.research.min_primary_or_official_sources}.`);
  }

  if (topic.video_type === "business_crime_story" && officialSourceCount < qualityRules.research.crime_video_min_official_sources) {
    findings.push(`Crime-story research has ${officialSourceCount} official sources; target is ${qualityRules.research.crime_video_min_official_sources}.`);
  }

  if (approvedFacts.length < 3) {
    findings.push(`Only ${approvedFacts.length} approved fact rows are available for scripting.`);
  }

  if (!hasPublicCase(topic, dossier, riskReport)) {
    findings.push("Crime-story package still lacks a concrete public-case section with official support.");
  }

  if (blockedClaims.length > 0) {
    findings.push(`${blockedClaims.length} blocked claims still need resolution before final approval.`);
  }

  return {
    passed: researchPass && findings.length === 0,
    findings,
    summary: [
      `Source rows: ${totalSources}`,
      `Official or primary sources: ${officialSourceCount}`,
      `Approved facts: ${approvedFacts.length}`,
      `Blocked claims: ${blockedClaims.length}`
    ]
  };
}

function buildScriptChecks(topic, qualityRules, scriptMarkdown, approvedFacts) {
  const findings = [];
  const scriptLower = scriptMarkdown.toLowerCase();
  const firstScene = extractFirstSceneSection(scriptMarkdown).toLowerCase();
  const sceneSections = extractSceneSections(scriptMarkdown);
  const approvedFactCount = approvedFacts.length;
  const numberMentions = countNumberMentions(scriptMarkdown);

  for (const phrase of qualityRules.script.forbidden_phrases) {
    if (scriptLower.includes(phrase.toLowerCase())) {
      findings.push(`Forbidden phrase found in script: "${phrase}".`);
    }
  }

  if (!firstScene.includes("question") && !firstScene.includes("story") && !firstScene.includes("problem")) {
    findings.push("Hook section does not clearly frame the central question or problem early.");
  }

  if (!scriptLower.includes("practical lesson") && !scriptLower.includes("warning signs") && !scriptLower.includes("takeaway")) {
    findings.push("Viewer payoff is still weak or delayed in the script draft.");
  }

  if (topic.video_type === "business_crime_story" && !scriptLower.includes("alleged") && !scriptLower.includes("lawsuit") && !scriptLower.includes("charged") && !scriptLower.includes("convicted")) {
    findings.push("Crime-story wording does not yet demonstrate exact legal-status language in the body of the script.");
  }

  if (sceneSections.length < 6) {
    findings.push(`Script only has ${sceneSections.length} scene sections; the structure still looks thin for a full documentary package.`);
  }

  if (numberMentions > approvedFactCount && approvedFactCount < 4) {
    findings.push("Script mentions numbers or quantitative framing without enough approved fact support.");
  }

  return {
    passed: findings.length === 0,
    findings,
    summary: [
      `Scene sections: ${sceneSections.length}`,
      `Approved fact rows available: ${approvedFactCount}`,
      `Number mentions in script: ${numberMentions}`
    ]
  };
}

function buildVisualChecks(qualityRules, workspaceDir, sceneManifest, visualManifest, draftRenderPath) {
  const findings = [];
  const scenes = sceneManifest.scenes || [];
  const generatedScenes = new Set(
    visualManifest
      .filter((row) => (row.status || "").toLowerCase() === "generated" && row.scene_id !== "ALL")
      .map((row) => row.scene_id)
  );
  const originalGraphics = visualManifest.filter((row) =>
    (row.status || "").toLowerCase() === "generated" &&
    ["generated_graphic", "chart", "map"].includes((row.asset_type || "").toLowerCase())
  ).length;
  const realExistingVisuals = visualManifest.filter((row) =>
    (row.status || "").toLowerCase() !== "generated" && fs.existsSync(resolveAssetPath(workspaceDir, row))
  );
  const stockVideoCount = realExistingVisuals.filter((row) => (row.asset_type || "").toLowerCase() === "stock_video").length;
  const sourceCards = visualManifest.filter((row) =>
    (row.asset_type || "").toLowerCase() === "document" ||
    (row.filename || "").toLowerCase().includes("source_card")
  ).length;
  const unresolvedAssets = visualManifest.filter((row) =>
    ["missing_source", "manual_needed", "planned"].includes((row.status || "").toLowerCase())
  );
  const highPriorityUnresolved = unresolvedAssets.filter((row) =>
    (row.priority || "").toLowerCase() === "high" &&
    !generatedScenes.has(row.scene_id)
  );

  const maxGapSeconds = scenes.reduce((maxGap, scene) => {
    const visualCount = Array.isArray(scene.visuals) && scene.visuals.length > 0 ? scene.visuals.length : 1;
    const perVisualGap = (scene.duration_seconds || 0) / visualCount;
    return Math.max(maxGap, perVisualGap);
  }, 0);

  if (originalGraphics < qualityRules.visuals.min_original_graphics_per_video) {
    findings.push(`Only ${originalGraphics} original graphics are available; target is ${qualityRules.visuals.min_original_graphics_per_video}.`);
  }

  if (sourceCards < qualityRules.visuals.min_source_cards_per_video) {
    findings.push(`Only ${sourceCards} source-card style visuals are planned; target is ${qualityRules.visuals.min_source_cards_per_video}.`);
  }

  if (maxGapSeconds > qualityRules.visuals.max_seconds_without_visual_change) {
    findings.push(`Visual pacing can stall for about ${maxGapSeconds.toFixed(1)} seconds; target is ${qualityRules.visuals.max_seconds_without_visual_change} seconds or less.`);
  }

  if (highPriorityUnresolved.length > 0) {
    findings.push(`${highPriorityUnresolved.length} high-priority visual assets are still unresolved.`);
  }

  if (realExistingVisuals.length < (qualityRules.visuals.min_real_visual_assets_for_final || 0)) {
    findings.push(`Only ${realExistingVisuals.length} real non-generated visual assets exist locally; target is ${qualityRules.visuals.min_real_visual_assets_for_final}.`);
  }

  if (stockVideoCount < (qualityRules.visuals.min_stock_video_clips_for_final || 0)) {
    findings.push(`Only ${stockVideoCount} stock video clips exist locally; target is ${qualityRules.visuals.min_stock_video_clips_for_final}.`);
  }

  if (!fs.existsSync(draftRenderPath) || fs.statSync(draftRenderPath).size === 0) {
    findings.push("Draft render is missing, so QC cannot verify pacing or visual cohesion yet.");
  }

  return {
    passed: findings.length === 0,
    findings,
    summary: [
      `Scenes in manifest: ${scenes.length}`,
      `Original graphics: ${originalGraphics}`,
      `Source cards: ${sourceCards}`,
      `Unresolved assets: ${unresolvedAssets.length}`,
      `Real local visuals: ${realExistingVisuals.length}`,
      `Stock video clips: ${stockVideoCount}`
    ]
  };
}

function buildMetadataChecks(topic, titleOptionsText, descriptionText, tagsText, chaptersText, pinnedCommentText, thumbnailPromptText, thumbnailConceptsText, finalThumbnailPath) {
  const findings = [];
  const titleOptions = titleOptionsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const chapterLines = chaptersText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (titleOptions.length < 3) {
    findings.push(`Only ${titleOptions.length} title options are available; target is at least 3.`);
  }

  if (!descriptionText.trim() || descriptionText.trim().length < 120) {
    findings.push("Description is still too thin to support publishing.");
  }

  if (!tagsText.trim()) {
    findings.push("Tags file is empty.");
  }

  if (chapterLines.length < 4) {
    findings.push(`Only ${chapterLines.length} chapter markers are present; the package needs clearer navigation.`);
  }

  if (!pinnedCommentText.trim()) {
    findings.push("Pinned comment draft is missing.");
  }

  if (!thumbnailPromptText.toLowerCase().includes("do not imply")) {
    findings.push("Thumbnail prompt is missing a clear legal-safety instruction.");
  }

  if (!thumbnailConceptsText.toLowerCase().includes("avoid")) {
    findings.push("Thumbnail concepts do not include a caution against misleading legal framing.");
  }

  if (!fs.existsSync(finalThumbnailPath) || fs.statSync(finalThumbnailPath).size === 0) {
    findings.push("Final thumbnail file is missing.");
  }

  if (topic.video_type === "business_crime_story" && titleOptions.some((title) => /\bexposed|criminal|arrested|busted\b/i.test(title))) {
    findings.push("Title options drift into overclaiming legal certainty for a crime-story topic.");
  }

  return {
    passed: findings.length === 0,
    findings,
    summary: [
      `Title options: ${titleOptions.length}`,
      `Chapter markers: ${chapterLines.length}`,
      `Thumbnail file present: ${fs.existsSync(finalThumbnailPath) ? "yes" : "no"}`
    ]
  };
}

function normalizeWindowsPath(filePath) {
  return String(filePath || "").replaceAll("\\", "/").trim();
}

function isDirectChildOf(parentDir, filePath) {
  const normalizedParent = normalizeWindowsPath(parentDir).replace(/\/+$/, "").toLowerCase();
  const normalizedFile = normalizeWindowsPath(filePath).toLowerCase();
  const relative = path.posix.relative(normalizedParent, normalizedFile);
  return !!relative && !relative.startsWith("..") && !relative.includes("/");
}

function buildAudioChecks(qualityRules, musicPolicy, voiceCleanPath, musicSelectionText, musicManifestRows) {
  const findings = [];
  const selectedTrack = musicManifestRows.find((row) => (row.status || "").toLowerCase() === "selected") ||
    musicManifestRows.find((row) => (row.status || "").toLowerCase() === "approved") ||
    null;
  const preferredRoots = musicPolicy.preferred_library_roots || [];
  const fallbackRoots = musicPolicy.fallback_library_roots || [];
  const allowedRoots = [...preferredRoots, ...fallbackRoots];

  if (!hasUsableVoiceAudio(voiceCleanPath)) {
    findings.push("Clean voiceover audio is missing.");
  }

  if (!musicSelectionText.trim()) {
    findings.push("Music selection notes are missing.");
  }

  if (!selectedTrack) {
    findings.push("No music track is marked as selected or approved in 04_assets/music/music_manifest.csv.");
  } else {
    const normalizedTrackPath = normalizeWindowsPath(selectedTrack.track_path);
    const insideAllowedRoot = allowedRoots.some((rootPath) => {
      const normalizedRoot = normalizeWindowsPath(rootPath).replace(/\/+$/, "").toLowerCase();
      return normalizedTrackPath.toLowerCase().startsWith(`${normalizedRoot}/`) || normalizedTrackPath.toLowerCase() === normalizedRoot;
    });

    if (!insideAllowedRoot) {
      findings.push("Selected music track is outside the approved local royalty-free music libraries.");
    }

    if ((musicPolicy.disallow_unsorted_root_files || false) &&
      fallbackRoots.some((rootPath) => isDirectChildOf(rootPath, normalizedTrackPath))) {
      findings.push("Selected music track points to an unsorted file in the root of @all. Use a sorted subfolder or @all/good instead.");
    }
  }

  return {
    passed: findings.length === 0,
    findings,
    summary: [
      `Voiceover ready: ${hasUsableVoiceAudio(voiceCleanPath) ? "yes" : "no"}`,
      `Music rows logged: ${musicManifestRows.length}`,
      `Selected music track: ${selectedTrack ? (selectedTrack.track_title || selectedTrack.track_path) : "none"}`
    ]
  };
}

function buildFactCheckReport(topic, approvedFacts, blockedClaims, sceneCards) {
  const sceneCardsWithClaims = sceneCards.filter((card) => Array.isArray(card.claims) && card.claims.length > 0).length;
  const lines = [
    "# Fact Check Report",
    "",
    `Topic: ${topic.working_title}`,
    `Approved fact rows: ${approvedFacts.length}`,
    `Blocked claims: ${blockedClaims.length}`,
    `Scene cards with claim links: ${sceneCardsWithClaims} / ${sceneCards.length}`,
    "",
    blockedClaims.length > 0
      ? "- Resolve blocked claims before treating this package as publish-ready."
      : "- No blocked claims are currently listed.",
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function buildLegalRiskReport(topic, sceneCards) {
  const elevated = sceneCards.filter((card) => (card.legal_risk || "").toLowerCase() !== "low");
  const lines = [
    "# Legal Risk Report",
    "",
    `Topic: ${topic.working_title}`,
    "",
    "- Use fictional characters for dramatization.",
    "- Use exact source-backed language for accusations, lawsuits, charges, convictions, and sentencing.",
    "- Do not visually imply a real company committed fraud unless the source supports it.",
    ""
  ];
  if (elevated.length === 0) {
    lines.push("- No elevated-risk scene cards flagged.");
  } else {
    for (const card of elevated) {
      lines.push(`- ${card.scene_id}: legal risk ${card.legal_risk} | claims ${card.claims.join(", ")}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildVisualSafetyReport(sceneCards) {
  const lines = [
    "# Visual Safety Report",
    "",
    "- Reject visuals with official toy branding, copyrighted characters, private information, or fake agency logos.",
    "- Prefer source cards for proof and bricktoon dramatization for pressure scenes.",
    ""
  ];
  for (const card of sceneCards) {
    lines.push(`- ${card.scene_id}: negative prompt includes branding/privacy guardrails.`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildRequiredFixes(checks) {
  const lines = [
    "# Required Fixes",
    "",
    "These issues block final approval.",
    ""
  ];

  const failures = checks.filter((check) => check.findings.length > 0);
  if (failures.length === 0) {
    lines.push("- None.");
  } else {
    for (const check of failures) {
      for (const finding of check.findings) {
        lines.push(`- [${check.label}] ${finding}`);
      }
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildOptionalImprovements(checks) {
  const lines = [
    "# Optional Improvements",
    "",
    "These are polish ideas once required fixes are handled.",
    ""
  ];

  const optionalLines = [
    "- Add a stronger sourced public case so the story lands with more specificity.",
    "- Replace manual-source placeholders in the visual manifest with real licensed footage or source cards.",
    "- Expand approved facts beyond topic framing so the script can carry more concrete numbers.",
    "- Tighten title and thumbnail pairings around one core tension rather than a broad theme."
  ];

  const anyPasses = checks.some((check) => check.passed);
  if (!anyPasses) {
    lines.push("- None yet. Focus on required fixes first.");
  } else {
    lines.push(...optionalLines);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildQualityReport(topic, checks) {
  const lines = [
    "# Quality Report",
    "",
    `Topic: ${topic.working_title}`,
    `Video type: ${topic.video_type}`,
    "",
    "## Overall status",
    "",
    checks.every((check) => check.passed) ? "- APPROVED" : "- NOT APPROVED",
    "",
    "## Section checks",
    ""
  ];

  for (const check of checks) {
    lines.push(`### ${check.label}`);
    lines.push("");
    lines.push(`- Status: ${check.passed ? "PASS" : "FAIL"}`);
    for (const summaryLine of check.summary) {
      lines.push(`- ${summaryLine}`);
    }
    if (check.findings.length === 0) {
      lines.push("- Findings: none.");
    } else {
      for (const finding of check.findings) {
        lines.push(`- Finding: ${finding}`);
      }
    }
    lines.push("");
  }

  lines.push("## Human review reminders");
  lines.push("");
  lines.push("- Review the first 30 seconds for retention and pacing.");
  lines.push("- Check every legal or enforcement line against official wording.");
  lines.push("- Manually review title, thumbnail, and final export before publishing.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildFinalApproval(checks) {
  const approved = checks.every((check) => check.passed);
  const lines = [
    approved ? "APPROVED" : "NOT APPROVED",
    "",
    `Research: ${checks.find((check) => check.label === "Research")?.passed ? "PASS" : "FAIL"}`,
    `Script: ${checks.find((check) => check.label === "Script")?.passed ? "PASS" : "FAIL"}`,
    `Audio: ${checks.find((check) => check.label === "Audio")?.passed ? "PASS" : "FAIL"}`,
    `Visuals: ${checks.find((check) => check.label === "Visuals")?.passed ? "PASS" : "FAIL"}`,
    `Metadata: ${checks.find((check) => check.label === "Metadata")?.passed ? "PASS" : "FAIL"}`,
    "",
    approved
      ? "QC passed. Final export can proceed with human sign-off."
      : "QC failed. Resolve required fixes before final export."
  ];
  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/qc_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const qualityRules = readJson(paths.qualityRulesPath);
    const musicPolicy = readJson(paths.musicPolicyPath);

    const dossier = safeRead(paths.researchDossierPath);
    const riskReport = safeRead(paths.riskReportPath);
    const scriptMarkdown = safeRead(paths.scriptPath);
    const musicSelectionText = safeRead(paths.musicSelectionPath);
    const sources = safeReadCsv(paths.sourcesPath);
    const approvedFacts = safeReadCsv(paths.approvedFactsPath);
    const blockedClaims = parseBlockedClaims(safeRead(paths.blockedClaimsPath));
    const sceneManifest = safeReadJson(paths.sceneManifestPath, { scenes: [] });
    const visualManifest = safeReadCsv(paths.visualManifestPath);
    const musicManifest = safeReadCsv(paths.musicManifestPath);
    const sceneCards = safeReadJson(paths.sceneCardsPath, { scene_cards: [] }).scene_cards || [];

    const titleOptionsText = safeRead(paths.titleOptionsPath);
    const descriptionText = safeRead(paths.descriptionPath);
    const tagsText = safeRead(paths.tagsPath);
    const chaptersText = safeRead(paths.chaptersPath);
    const pinnedCommentText = safeRead(paths.pinnedCommentPath);
    const thumbnailPromptText = safeRead(paths.thumbnailPromptPath);
    const thumbnailConceptsText = safeRead(paths.thumbnailConceptsPath);

    const checks = [
      {
        label: "Research",
        ...buildResearchChecks(topic, qualityRules, sources, approvedFacts, blockedClaims, dossier, riskReport)
      },
      {
        label: "Script",
        ...buildScriptChecks(topic, qualityRules, scriptMarkdown, approvedFacts)
      },
      {
        label: "Audio",
        ...buildAudioChecks(qualityRules, musicPolicy, paths.voiceCleanPath, musicSelectionText, musicManifest)
      },
      {
        label: "Visuals",
        ...buildVisualChecks(qualityRules, args.workspace, sceneManifest, visualManifest, paths.draftRenderPath)
      },
      {
        label: "Metadata",
        ...buildMetadataChecks(
          topic,
          titleOptionsText,
          descriptionText,
          tagsText,
          chaptersText,
          pinnedCommentText,
          thumbnailPromptText,
          thumbnailConceptsText,
          paths.finalThumbnailPath
        )
      }
    ];

    writeText(paths.qualityReportPath, buildQualityReport(topic, checks));
    writeText(paths.requiredFixesPath, buildRequiredFixes(checks));
    writeText(paths.optionalImprovementsPath, buildOptionalImprovements(checks));
    writeText(paths.factCheckReportPath, buildFactCheckReport(topic, approvedFacts, blockedClaims, sceneCards));
    writeText(paths.legalRiskReportPath, buildLegalRiskReport(topic, sceneCards));
    writeText(paths.visualSafetyReportPath, buildVisualSafetyReport(sceneCards));
    writeText(paths.finalApprovalPath, buildFinalApproval(checks));

    if (!checks.every((check) => check.passed)) {
      console.error(`QC failed for topic '${topic.id}'. Review 10_qc outputs before final export.`);
      process.exitCode = 1;
      return;
    }

    console.log(`QC passed for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
