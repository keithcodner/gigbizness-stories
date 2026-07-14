#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseCsv, toCsv, writeText } = require("./common");

const ROOT = path.resolve(__dirname, "..");
const TOPICS_DIR = path.join(ROOT, "topics");
const WORKSPACES_DIR = path.join(ROOT, "workspaces");
const OUTPUT_LOGS_DIR = path.join(ROOT, "output", "logs");
const AGENTS_DIR = __dirname;
const ROOT_CONFIG_DIR = path.join(ROOT, "config");
const QUEUE_PATH = path.join(ROOT, "topics", "queue.csv");
const TEMPLATES_DIR = path.join(ROOT, "templates");

const WORKSPACE_LAYOUT = [
  {
    dir: "00_config",
    files: {
      "topic.json": null
    }
  },
  {
    dir: "00_brief",
    files: {
      "format_recipe.json": "{\n  \"format_id\": \"bleak_explainer_bricktoon\"\n}\n",
      "format_brief.md": "# Format Brief\n\n",
      "style_guide.md": "# Style Guide\n\n"
    }
  },
  {
    dir: "01_research",
    files: {
      "manual_notes.md": "# Manual Notes\n\nAdd rough research notes, pasted excerpts, candidate sources, and open questions here before running the research stage.\n",
      "research_dossier.md": "# Research Dossier\n\n## Central question\n\n## Short answer\n\n## Business model\n\n## Money flow\n\n## Key numbers\n\n## Timeline\n\n## Real-world examples\n\n## Crime/scam/legal section if applicable\n\n## Counterpoints\n\n## Visual opportunities\n\n## Approved facts\n\n## Claims needing review\n\n## Sources\n",
      "sources.csv": "source_title,source_url,source_type,reliability,risk_level,notes\n",
      "claims_to_verify.md": "# Claims To Verify\n\n- Add risky or unresolved claims here.\n",
      "fact_table.csv": "claim,claim_type,value,date,source_title,source_url,source_type,reliability,risk_level,needs_human_review\n",
      "case_timeline.md": "# Case Timeline\n\n",
      "source_risk_report.md": "# Source Risk Report\n\n",
      "approved_facts.csv": "claim,claim_type,value,date,source_title,source_url,source_type,reliability,risk_level,legal_status,usage_guidance\n",
      "blocked_claims.md": "# Blocked Claims\n\n"
    }
  },
  {
    dir: "02_angle",
    files: {
      "angle.md": "# Angle\n\n",
      "beat_sheet.md": "# Beat Sheet\n\n"
    }
  },
  {
    dir: "03_cast",
    files: {
      "cast.json": "{\n  \"style_id\": \"bricktoon\",\n  \"cast\": []\n}\n",
      "character_continuity.md": "# Character Continuity\n\n",
      "scene_roles.md": "# Scene Roles\n\n"
    }
  },
  {
    dir: "02_script",
    files: {
      "outline.md": "# Outline\n\n",
      "story_map.md": "# Story Map\n\n",
      "script_v1.md": "# Script V1\n\n",
      "script_v2_human_review.md": "# Script V2 Human Review\n\n",
      "shotlist.csv": "scene_id,section,visual_type,description,source,notes\n",
      "jokes_and_analogies.md": "# Jokes And Analogies\n\n",
      "narrator_notes.md": "# Narrator Notes\n\n"
    }
  },
  {
    dir: "05_scene_cards",
    files: {
      "scene_cards.json": "{\n  \"style_id\": \"bricktoon\",\n  \"scene_cards\": []\n}\n",
      "shot_list.md": "# Shot List\n\n",
      "visual_prompts.md": "# Visual Prompts\n\n"
    }
  },
  {
    dir: "03_voice",
    files: {
      "voiceover.wav": "",
      "voiceover_clean.wav": "",
      "captions.srt": "",
      "transcript.txt": ""
    }
  },
  {
    dir: "04_assets",
    files: {
      "licenses.csv": "asset_name,asset_type,source_url,license,status,notes\n"
    },
    subdirs: [
      "images",
      "stock_videos",
      "screenshots",
      "music",
      "sfx",
      "charts",
      "documents"
    ]
  },
  {
    dir: "07_visuals",
    files: {
      "asset_manifest.json": "{\n  \"style\": \"bricktoon\",\n  \"assets\": []\n}\n"
    },
    subdirs: [
      "generated_images",
      "character_refs",
      "backgrounds",
      "overlays",
      "source_cards",
      "image_prompts",
      "stock_queries",
      "caption_chunks",
      "animation_tasks"
    ]
  },
  {
    dir: "05_render_plan",
    files: {
      "scene_manifest.json": "{\n  \"scenes\": []\n}\n",
      "render_plan.json": "{\n  \"profile\": \"draft\",\n  \"notes\": []\n}\n",
      "visual_timing.csv": "scene_id,start,end,visual_type,asset_ref,notes\n"
    }
  },
  {
    dir: "06_renders",
    files: {
      "draft_01.mp4": "",
      "draft_02.mp4": "",
      "final_1080p.mp4": "",
      "final_1440p.mp4": ""
    }
  },
  {
    dir: "08_animation",
    files: {
      "animation_plan.json": "{\n  \"style\": \"bricktoon_static_motion\",\n  \"scenes\": []\n}\n",
      "camera_moves.json": "[]\n"
    },
    subdirs: [
      "animated_clips"
    ]
  },
  {
    dir: "09_edit_plan",
    files: {
      "edit_plan.md": "# Edit Plan\n\n"
    }
  },
  {
    dir: "07_shorts",
    files: {
      "short_01.mp4": "",
      "short_02.mp4": "",
      "short_03.mp4": "",
      "short_scripts.md": "# Short Scripts\n\n"
    }
  },
  {
    dir: "08_thumbnail",
    files: {
      "thumbnail_prompt.txt": "",
      "thumbnail_concepts.md": "# Thumbnail Concepts\n\n",
      "thumbnail_01.png": "",
      "thumbnail_02.png": "",
      "final_thumbnail.jpg": ""
    }
  },
  {
    dir: "09_publish",
    files: {
      "title_options.txt": "",
      "description.txt": "",
      "tags.txt": "",
      "chapters.txt": "",
      "pinned_comment.txt": "",
      "performance_input.json": "{\n  \"ctr\": null,\n  \"average_view_duration_seconds\": null,\n  \"first_30_second_retention\": null,\n  \"comments_value_mentions\": null,\n  \"subscriber_conversion_percent\": null,\n  \"shorts_to_long_conversion_percent\": null,\n  \"production_hours\": null,\n  \"notes\": \"Fill this in manually after publish.\"\n}\n",
      "publish_record.json": "{\n  \"status\": \"not_published\"\n}\n"
    }
  },
  {
    dir: "10_qc",
    files: {
      "quality_report.md": "# Quality Report\n\n",
      "required_fixes.md": "# Required Fixes\n\n",
      "optional_improvements.md": "# Optional Improvements\n\n",
      "final_approval.md": "NOT APPROVED\n"
    }
  }
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath, contents) {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.writeFileSync(filePath, contents, "utf8");
}

function ensureWorkspaceStandards(workspaceDir) {
  const musicDir = path.join(workspaceDir, "04_assets", "music");
  ensureDir(musicDir);

  ensureFile(path.join(musicDir, "music_selection.md"), [
    "# Music Selection",
    "",
    "## Standard",
    "",
    "- Prefer tracks from `C:/Users/admin/Music/royalty free music/@all/good`.",
    "- Fallback to sorted subfolders inside `C:/Users/admin/Music/royalty free music/@all` when needed.",
    "- Do not use files sitting directly in the root of `@all`; those are unsorted.",
    "- Document the final chosen track in `music_manifest.csv` before QC.",
    "",
    "## Current Pick",
    "",
    "- Selected track: pending",
    "- Source library: pending",
    "- Mood target: pending",
    "- Why it fits this topic: pending",
    "- License/confidence note: royalty-free local library; confirm usage fit before publish",
    ""
  ].join("\n"));

  ensureFile(
    path.join(musicDir, "music_manifest.csv"),
    "track_path,track_title,source_library,mood,intended_use,status,notes\n"
  );
}

function ensureTopicFixtureContent(topicId, workspaceDir) {
  if (topicId !== "test_story_template") {
    return;
  }

  const fixtureManualNotesPath = path.join(TEMPLATES_DIR, "test_story_template", "manual_notes.md");
  const workspaceManualNotesPath = path.join(workspaceDir, "01_research", "manual_notes.md");

  if (!fs.existsSync(fixtureManualNotesPath) || !fs.existsSync(workspaceManualNotesPath)) {
    return;
  }

  const currentText = fs.readFileSync(workspaceManualNotesPath, "utf8");
  const isDefaultStub = currentText.includes("Add rough research notes, pasted excerpts, candidate sources, and open questions here before running the research stage.");
  if (isDefaultStub) {
    const fixtureText = fs.readFileSync(fixtureManualNotesPath, "utf8");
    fs.writeFileSync(workspaceManualNotesPath, fixtureText, "utf8");
  }
}

function ensureWorkspaceLayout(workspaceDir, topicPath = null) {
  ensureDir(workspaceDir);

  for (const section of WORKSPACE_LAYOUT) {
    const sectionDir = path.join(workspaceDir, section.dir);
    ensureDir(sectionDir);

    if (section.subdirs) {
      for (const subdir of section.subdirs) {
        ensureDir(path.join(sectionDir, subdir));
      }
    }

    for (const [fileName, defaultContents] of Object.entries(section.files)) {
      const filePath = path.join(sectionDir, fileName);
      if (fileName === "topic.json" && topicPath) {
        if (!fs.existsSync(filePath)) {
          fs.copyFileSync(topicPath, filePath);
        }
        continue;
      }

      ensureFile(filePath, defaultContents);
    }
  }
}

function loadTopic(topicId) {
  const topicPath = path.join(TOPICS_DIR, `${topicId}.json`);
  if (!fs.existsSync(topicPath)) {
    throw new Error(`Topic file not found: ${topicPath}`);
  }

  const topic = JSON.parse(fs.readFileSync(topicPath, "utf8"));
  if (!topic.id) {
    throw new Error(`Topic file is missing required field 'id': ${topicPath}`);
  }

  return { topic, topicPath };
}

function writeLog(message) {
  ensureDir(OUTPUT_LOGS_DIR);
  const stamp = new Date().toISOString();
  const logPath = path.join(OUTPUT_LOGS_DIR, "orchestrator.log");
  fs.appendFileSync(logPath, `[${stamp}] ${message}\n`, "utf8");
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function fileHasContent(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function getTopicPaths(topicId) {
  const workspaceDir = getWorkspaceDir(topicId);
  return {
    workspaceDir,
    guidedStatusPath: path.join(workspaceDir, "guided_status.md"),
    qualityRulesPath: path.join(ROOT_CONFIG_DIR, "quality_rules.json"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    beatSheetPath: path.join(workspaceDir, "02_angle", "beat_sheet.md"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    manualNotesPath: path.join(workspaceDir, "01_research", "manual_notes.md"),
    researchDossierPath: path.join(workspaceDir, "01_research", "research_dossier.md"),
    sourcesPath: path.join(workspaceDir, "01_research", "sources.csv"),
    approvedFactsPath: path.join(workspaceDir, "01_research", "approved_facts.csv"),
    riskReportPath: path.join(workspaceDir, "01_research", "source_risk_report.md"),
    scriptPath: path.join(workspaceDir, "02_script", "script_v2_human_review.md"),
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    voiceCleanPath: path.join(workspaceDir, "03_voice", "voiceover_clean.wav"),
    captionsPath: path.join(workspaceDir, "03_voice", "captions.srt"),
    visualManifestPath: path.join(workspaceDir, "04_assets", "visual_manifest.csv"),
    visualPlanPath: path.join(workspaceDir, "04_assets", "visual_plan.md"),
    visualReadinessPath: path.join(workspaceDir, "04_assets", "visual_readiness.json"),
    assetGapsPath: path.join(workspaceDir, "04_assets", "asset_gaps.md"),
    animationPlanPath: path.join(workspaceDir, "08_animation", "animation_plan.json"),
    editPlanPath: path.join(workspaceDir, "09_edit_plan", "edit_plan.md"),
    draftRenderPath: path.join(workspaceDir, "06_renders", "draft_01.mp4"),
    shortOnePath: path.join(workspaceDir, "07_shorts", "short_01.mp4"),
    thumbnailPath: path.join(workspaceDir, "08_thumbnail", "final_thumbnail.jpg"),
    titleOptionsPath: path.join(workspaceDir, "09_publish", "title_options.txt"),
    qualityReportPath: path.join(workspaceDir, "10_qc", "quality_report.md"),
    requiredFixesPath: path.join(workspaceDir, "10_qc", "required_fixes.md"),
    finalApprovalPath: path.join(workspaceDir, "10_qc", "final_approval.md"),
    finalRenderPath: path.join(workspaceDir, "06_renders", "final_1080p.mp4")
  };
}

function loadQualityRules() {
  return JSON.parse(fs.readFileSync(path.join(ROOT_CONFIG_DIR, "quality_rules.json"), "utf8"));
}

function countCsvRows(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const lines = fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  return Math.max(0, lines.length - 1);
}

function countSourceTypes(filePath, allowedTypes) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const text = fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);

  if (text.length <= 1) {
    return 0;
  }

  const rows = text.slice(1).map((line) => line.split(","));
  return rows.filter((row) => allowedTypes.has((row[2] || "").trim().toLowerCase())).length;
}

function hasMeaningfulManualNotes(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const lines = fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.includes("Add rough research notes"))
    .filter((line) => !line.includes("candidate sources"))
    .filter((line) => !line.includes("open questions"));

  return lines.some((line) => line.length >= 20 || /^[-*]\s+/.test(line));
}

function isResearchApproved(topic) {
  const paths = getTopicPaths(topic.id);
  const qualityRules = loadQualityRules();
  const approvedFacts = countCsvRows(paths.approvedFactsPath);
  const sources = countCsvRows(paths.sourcesPath);
  const officialSources = countSourceTypes(
    paths.sourcesPath,
    new Set(["government", "court", "regulator", "company_filing"])
  );

  if (sources < qualityRules.research.min_sources) {
    return false;
  }
  if (officialSources < qualityRules.research.min_primary_or_official_sources) {
    return false;
  }
  if (topic.video_type === "business_crime_story" &&
      officialSources < qualityRules.research.crime_video_min_official_sources) {
    return false;
  }

  return approvedFacts >= 3 && readText(paths.researchDossierPath).includes("## Sources");
}

function isFormatReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.formatRecipePath);
}

function isAngleReady(topicId) {
  const paths = getTopicPaths(topicId);
  return readText(paths.beatSheetPath).includes("B01");
}

function isCastReady(topicId) {
  const paths = getTopicPaths(topicId);
  return readText(paths.castPath).includes("\"character_id\"");
}

function isScriptReady(topicId) {
  const paths = getTopicPaths(topicId);
  const scriptText = readText(paths.scriptPath);
  return scriptText.includes("## S01") && scriptText.length > 1200;
}

function isSceneCardsReady(topicId) {
  const paths = getTopicPaths(topicId);
  return readText(paths.sceneCardsPath).includes("\"scene_id\"");
}

function isVoiceReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.voiceCleanPath) && fileHasContent(paths.captionsPath);
}

function isAssetsReady(topicId) {
  const paths = getTopicPaths(topicId);
  return countCsvRows(paths.visualManifestPath) >= 6 &&
    fileHasContent(paths.visualPlanPath) &&
    fileHasContent(paths.visualReadinessPath);
}

function isDraftReady(topicId) {
  return fileHasContent(getTopicPaths(topicId).draftRenderPath);
}

function isAnimationReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.animationPlanPath) && fileHasContent(paths.editPlanPath);
}

function isShortsPackageReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.shortOnePath) && fileHasContent(paths.thumbnailPath) && fileHasContent(paths.titleOptionsPath);
}

function isQcApproved(topicId) {
  const approvalText = readText(getTopicPaths(topicId).finalApprovalPath);
  return approvalText.startsWith("APPROVED");
}

function isFinalRenderReady(topicId) {
  return fileHasContent(getTopicPaths(topicId).finalRenderPath);
}

function printGuidedBlock(title, lines) {
  console.log("");
  console.log(`GUIDED PIPELINE BLOCKED: ${title}`);
  console.log("");
  for (const line of lines) {
    console.log(`- ${line}`);
  }
  console.log("");
  console.log("Re-run the same command after updating the requested files.");
}

function writeGuidedStatus(topicId, mode, state, title, lines) {
  const paths = getTopicPaths(topicId);
  const statusLines = [
    "# Guided Status",
    "",
    `- Topic ID: ${topicId}`,
    `- Mode: ${mode}`,
    `- State: ${state}`,
    `- Updated at: ${new Date().toISOString()}`,
    ""
  ];

  if (title) {
    statusLines.push(`## ${title}`);
    statusLines.push("");
  }

  if (lines.length === 0) {
    statusLines.push("- None.");
  } else {
    for (const line of lines) {
      statusLines.push(`- ${line}`);
    }
  }

  statusLines.push("");
  statusLines.push(`- Re-run command: node agents/orchestrator.js --topic ${topicId} --${mode}`);
  statusLines.push("");

  fs.writeFileSync(paths.guidedStatusPath, `${statusLines.join("\n")}\n`, "utf8");
}

function getResearchApprovalBlock(topic) {
  const paths = getTopicPaths(topic.id);
  const qualityRules = loadQualityRules();

  const sources = countCsvRows(paths.sourcesPath);
  const approvedFacts = countCsvRows(paths.approvedFactsPath);
  const officialSources = countSourceTypes(
    paths.sourcesPath,
    new Set(["government", "court", "regulator", "company_filing"])
  );
  return {
    title: "Research approval needed",
    lines: [
      `Current sources: ${sources} total, ${officialSources} official/primary, ${approvedFacts} approved facts`,
      `Targets: ${qualityRules.research.min_sources} total and ${qualityRules.research.min_primary_or_official_sources} official/primary`,
      topic.video_type === "business_crime_story"
        ? `Crime-story target: ${qualityRules.research.crime_video_min_official_sources} official sources`
        : "Crime-story official-source target is not applicable here.",
      `Review ${paths.riskReportPath}`,
      `Strengthen ${paths.sourcesPath} and ${paths.approvedFactsPath}`
    ]
  };
}

function getQcBlock(topicId) {
  const paths = getTopicPaths(topicId);
  const fixes = readText(paths.requiredFixesPath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ["))
    .slice(0, 6);

  if (fixes.length === 0 || !fileHasContent(paths.draftRenderPath)) {
    return null;
  }

  return {
    title: "QC fixes required",
    lines: [
      ...fixes.map((line) => line.replace(/^- /, "")),
      `Full report: ${paths.qualityReportPath}`,
      `Approval file: ${paths.finalApprovalPath}`
    ]
  };
}

function getVisualSourcingBlock(topicId) {
  const paths = getTopicPaths(topicId);
  if (!fs.existsSync(paths.visualReadinessPath)) {
    return null;
  }

  const readiness = JSON.parse(fs.readFileSync(paths.visualReadinessPath, "utf8"));
  const qualityRules = loadQualityRules();
  const minReal = qualityRules.visuals.min_real_visual_assets_for_final || 0;
  const minStock = qualityRules.visuals.min_stock_video_clips_for_final || 0;

  if (readiness.real_existing_count >= minReal && readiness.stock_video_count >= minStock) {
    return null;
  }

  return {
    title: "Visual sourcing needed",
    lines: [
      `Real visual assets available: ${readiness.real_existing_count} / ${minReal}`,
      `Stock video clips available: ${readiness.stock_video_count} / ${minStock}`,
      `Review ${paths.visualPlanPath}`,
      `Fill ${path.join(paths.workspaceDir, "04_assets", "stock_videos")} and related asset folders with real sourced visuals, then rerun guided mode.`
    ]
  };
}

function checkForGuidedBlock(topic) {
  const paths = getTopicPaths(topic.id);
  const hasResearchSeed = countCsvRows(paths.sourcesPath) > 0 || countCsvRows(paths.approvedFactsPath) > 0;

  if (!hasMeaningfulManualNotes(paths.manualNotesPath) && !hasResearchSeed) {
    return {
      title: "Research notes needed",
      lines: [
        `Add real notes, candidate sources, or pasted excerpts to ${paths.manualNotesPath}`,
        "Include numbers, public cases, official sources, and open questions before research runs."
      ]
    };
  }

  return getQcBlock(topic.id);
}

function runGuidedPipeline(topicId, mode = "guided") {
  const { topic } = loadTopic(topicId);
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting ${mode} pipeline for topic '${topicId}'`);

  let block = checkForGuidedBlock(topic);
  if (block) {
    writeGuidedStatus(topicId, mode, "blocked", block.title, block.lines);
    printGuidedBlock(block.title, block.lines);
    return workspaceDir;
  }

  if (!isResearchApproved(topic)) {
    runResearchStage(topicId);
    if (!isResearchApproved(topic)) {
      const researchBlock = getResearchApprovalBlock(topic);
      writeGuidedStatus(topicId, mode, "blocked", researchBlock.title, researchBlock.lines);
      printGuidedBlock(researchBlock.title, researchBlock.lines);
      return workspaceDir;
    }
  }

  if (!isFormatReady(topicId)) {
    runFormatStage(topicId);
  }

  if (!isAngleReady(topicId)) {
    runAngleStage(topicId);
  }

  if (!isCastReady(topicId)) {
    runCastStage(topicId);
  }

  if (!isScriptReady(topicId)) {
    runScriptStage(topicId);
  }

  if (!isSceneCardsReady(topicId)) {
    runSceneCardStage(topicId);
  }

  if (!isVoiceReady(topicId)) {
    runVoiceStage(topicId);
  }

  if (!isAssetsReady(topicId)) {
    runAssetsStage(topicId);
  }

  block = getVisualSourcingBlock(topicId);
  if (block) {
    writeGuidedStatus(topicId, mode, "blocked", block.title, block.lines);
    printGuidedBlock(block.title, block.lines);
    return workspaceDir;
  }

  if (!isDraftReady(topicId)) {
    if (!isAnimationReady(topicId)) {
      runAnimationStage(topicId);
    }
    runRenderStage(topicId, "draft");
  }

  if (!isShortsPackageReady(topicId)) {
    runShortsStage(topicId);
  }

  if (!isQcApproved(topicId)) {
    try {
      runQcStage(topicId);
    } catch (error) {
      block = getQcBlock(topic.id) || {
        title: "QC review needed",
        lines: [
          `Review ${getTopicPaths(topicId).requiredFixesPath}`,
          "Resolve the required fixes, then rerun the same guided command."
        ]
      };
      writeGuidedStatus(topicId, mode, "blocked", block.title, block.lines);
      printGuidedBlock(block.title, block.lines);
      return workspaceDir;
    }
  }

  if (mode === "full" && !isFinalRenderReady(topicId)) {
    runRenderStage(topicId, "youtube_1080p");
  }

  console.log("");
  console.log(`GUIDED PIPELINE READY: ${workspaceDir}`);
  console.log("");
  const readyLines = mode === "full"
    ? [
        isFinalRenderReady(topicId)
          ? `Final video ready at ${getTopicPaths(topicId).finalRenderPath}`
          : "QC passed. Final render can run now or may already be complete."
      ]
    : [
        isQcApproved(topicId)
          ? `QC approved. Run final export with: node agents/orchestrator.js --topic ${topicId} --stage render --profile youtube_1080p`
          : "Draft pipeline is complete up to the current human-review gates."
      ];
  writeGuidedStatus(topicId, mode, "ready", "Pipeline Ready", readyLines);
  if (mode === "full") {
    console.log(isFinalRenderReady(topicId)
      ? `Final video ready at ${getTopicPaths(topicId).finalRenderPath}`
      : "QC passed. Final render can run now or may already be complete.");
  } else {
    console.log(isQcApproved(topicId)
      ? `QC approved. Run final export with: node agents/orchestrator.js --topic ${topicId} --stage render --profile youtube_1080p`
      : "Draft pipeline is complete up to the current human-review gates.");
  }
}

function initTopicWorkspace(topicId) {
  const { topic, topicPath } = loadTopic(topicId);
  const workspaceDir = path.join(WORKSPACES_DIR, topic.id);

  ensureWorkspaceLayout(workspaceDir, topicPath);
  ensureWorkspaceStandards(workspaceDir);
  ensureTopicFixtureContent(topic.id, workspaceDir);

  const manifestPath = path.join(workspaceDir, "workspace_manifest.json");
  const manifest = {
    topic_id: topic.id,
    working_title: topic.working_title,
    video_type: topic.video_type,
    created_from: path.relative(ROOT, topicPath).replaceAll("\\", "/"),
    created_at: new Date().toISOString(),
    phase: 1,
    status: "initialized"
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  writeLog(`Initialized workspace for topic '${topic.id}' at ${workspaceDir}`);
  return workspaceDir;
}

function initProject() {
  ensureDir(WORKSPACES_DIR);
  ensureDir(OUTPUT_LOGS_DIR);
  writeLog("Project initialization verified.");
}

function getWorkspaceDir(topicId) {
  return path.join(WORKSPACES_DIR, topicId);
}

function ensureWorkspace(topicId) {
  const workspaceDir = getWorkspaceDir(topicId);
  if (!fs.existsSync(workspaceDir)) {
    return initTopicWorkspace(topicId);
  }

  const { topic, topicPath } = loadTopic(topicId);
  ensureWorkspaceLayout(workspaceDir, topicPath);
  ensureWorkspaceStandards(workspaceDir);
  ensureTopicFixtureContent(topic.id, workspaceDir);
  return workspaceDir;
}

function assertWorkspacePathSafe(targetPath) {
  const resolvedWorkspaceRoot = path.resolve(WORKSPACES_DIR);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedWorkspaceRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to delete path outside workspaces root: ${resolvedTarget}`);
  }
}

function resetQueueRowForTopic(topicId) {
  if (!fs.existsSync(QUEUE_PATH)) {
    return;
  }

  const parsed = parseCsv(fs.readFileSync(QUEUE_PATH, "utf8"));
  const rows = parsed.rows.map((row) => ({ ...row }));
  const target = rows.find((row) => row.id === topicId);
  if (!target) {
    return;
  }

  target.status = "planned";
  target.priority = target.priority || "medium";
  target.next_stage = "research";
  target.last_run_at = "";
  target.last_result = "";

  const headers = parsed.headers.length > 0
    ? parsed.headers
    : ["id", "title", "video_type", "status", "priority", "next_stage", "allow_overnight", "last_run_at", "last_result"];
  writeText(QUEUE_PATH, toCsv(rows, headers));
}

function restartTopicWorkflow(topicId) {
  const workspaceDir = getWorkspaceDir(topicId);
  if (fs.existsSync(workspaceDir)) {
    assertWorkspacePathSafe(workspaceDir);
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }

  resetQueueRowForTopic(topicId);
  const recreatedWorkspace = initTopicWorkspace(topicId);
  writeLog(`Restarted topic workflow for '${topicId}'`);
  return recreatedWorkspace;
}

function runNodeAgent(scriptName, args) {
  const scriptPath = path.join(AGENTS_DIR, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`Agent failed: ${scriptName}`);
  }
}

function runResearchStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting research stage for topic '${topicId}'`);

  runNodeAgent("research_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("source_validator.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed research stage for topic '${topicId}'`);
  return workspaceDir;
}

function runFormatStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting format stage for topic '${topicId}'`);

  runNodeAgent("format_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed format stage for topic '${topicId}'`);
  return workspaceDir;
}

function runAngleStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting angle stage for topic '${topicId}'`);

  runNodeAgent("angle_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed angle stage for topic '${topicId}'`);
  return workspaceDir;
}

function runCastStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting cast stage for topic '${topicId}'`);

  runNodeAgent("character_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed cast stage for topic '${topicId}'`);
  return workspaceDir;
}

function runScriptStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting script stage for topic '${topicId}'`);

  runNodeAgent("outline_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("script_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("joke_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed script stage for topic '${topicId}'`);
  return workspaceDir;
}

function runSceneCardStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting scene card stage for topic '${topicId}'`);

  runNodeAgent("scene_card_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed scene card stage for topic '${topicId}'`);
  return workspaceDir;
}

function runVoiceStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting voice stage for topic '${topicId}'`);

  runNodeAgent("voice_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed voice stage for topic '${topicId}'`);
  return workspaceDir;
}

function runAssetsStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting assets stage for topic '${topicId}'`);

  runNodeAgent("visual_asset_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed assets stage for topic '${topicId}'`);
  return workspaceDir;
}

function runAnimationStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting animation/edit-plan stage for topic '${topicId}'`);

  runNodeAgent("animation_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("edit_plan_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed animation/edit-plan stage for topic '${topicId}'`);
  return workspaceDir;
}

function runRenderStage(topicId, profile = "draft") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting render stage for topic '${topicId}' with profile '${profile}'`);

  runNodeAgent("render_plan_agent.js", ["--topic", topicId, "--workspace", workspaceDir, "--profile", profile]);
  runNodeAgent("render_agent.js", ["--topic", topicId, "--workspace", workspaceDir, "--profile", profile]);

  writeLog(`Completed render stage for topic '${topicId}' with profile '${profile}'`);
  return workspaceDir;
}

function runShortsStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting shorts/thumbnail/metadata stage for topic '${topicId}'`);

  runNodeAgent("shorts_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("thumbnail_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("metadata_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed shorts/thumbnail/metadata stage for topic '${topicId}'`);
  return workspaceDir;
}

function runQcStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting QC stage for topic '${topicId}'`);

  runNodeAgent("qc_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed QC stage for topic '${topicId}'`);
  return workspaceDir;
}

function runPublishRecord(topicId, publishDate) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Recording publish package for topic '${topicId}'`);

  const args = ["--record-publish", "--topic", topicId, "--workspace", workspaceDir];
  if (publishDate) {
    args.push("--date", publishDate);
  }
  runNodeAgent("topic_planner.js", args);

  writeLog(`Publish package recorded for topic '${topicId}'`);
  return workspaceDir;
}

function runAnalyticsReview() {
  writeLog("Starting analytics review and queue refresh");
  runNodeAgent("topic_planner.js", ["--analytics-review"]);
  writeLog("Completed analytics review and queue refresh");
}

function runOvernightMode(resume = false) {
  writeLog(`Starting overnight mode${resume ? " (resume)" : ""}`);
  const args = resume ? ["--resume"] : [];
  runNodeAgent("overnight_agent.js", args);
  writeLog(`Completed overnight mode${resume ? " (resume)" : ""}`);
}

function printUsage() {
  console.log("Usage:");
  console.log("  node agents/orchestrator.js --init-project");
  console.log("  node agents/orchestrator.js --topic <topic_id> --init");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage format");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage research");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage angle");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage cast");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage script");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage scene-cards");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage voice");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage assets");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage animation");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage render --profile draft");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage shorts");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage qc");
  console.log("  node agents/orchestrator.js --topic <topic_id> --guided");
  console.log("  node agents/orchestrator.js --topic <topic_id> --full");
  console.log("  node agents/orchestrator.js --topic <topic_id> --restart");
  console.log("  node agents/orchestrator.js --topic <topic_id> --record-publish --date YYYY-MM-DD");
  console.log("  node agents/orchestrator.js --analytics-review");
  console.log("  node agents/orchestrator.js --overnight");
  console.log("  node agents/orchestrator.js --resume");
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (typeof args.guided === "string" && !args.topic) {
      args.topic = args.guided;
      args.guided = true;
    }
    if (typeof args.full === "string" && !args.topic) {
      args.topic = args.full;
      args.full = true;
    }
    if (!args.topic && args._.length > 0) {
      args.topic = args._[0];
    }

    if (args["init-project"]) {
      initProject();
      console.log("Project directories verified.");
      return;
    }

    if (args.overnight) {
      runOvernightMode(false);
      console.log("Overnight mode completed.");
      return;
    }

    if (args.resume) {
      runOvernightMode(true);
      console.log("Overnight resume completed.");
      return;
    }

    if (args["analytics-review"]) {
      runAnalyticsReview();
      console.log("Analytics review completed.");
      return;
    }

    if (args["record-publish"]) {
      if (!args.topic) {
        throw new Error("Missing required argument: --topic <topic_id>");
      }

      const workspaceDir = runPublishRecord(args.topic, args.date || null);
      console.log(`Publish record completed: ${workspaceDir}`);
      return;
    }

    if (args.restart) {
      if (!args.topic) {
        throw new Error("Missing required argument: --topic <topic_id>");
      }

      const workspaceDir = restartTopicWorkflow(args.topic);
      console.log(`Topic workflow restarted: ${workspaceDir}`);
      return;
    }

    if (args.guided || args.full) {
      if (!args.topic) {
        throw new Error("Missing required argument: --topic <topic_id>");
      }

      runGuidedPipeline(args.topic, args.full ? "full" : "guided");
      return;
    }

    if (args.init) {
      if (!args.topic) {
        throw new Error("Missing required argument: --topic <topic_id>");
      }

      const workspaceDir = initTopicWorkspace(args.topic);
      console.log(`Workspace initialized: ${workspaceDir}`);
      return;
    }

    if (args.stage) {
      if (!args.topic) {
        throw new Error("Missing required argument: --topic <topic_id>");
      }

      if (!["format", "research", "angle", "cast", "script", "scene-cards", "voice", "assets", "animation", "render", "shorts", "qc"].includes(args.stage)) {
        throw new Error(`Unsupported stage for current build: ${args.stage}`);
      }

      let workspaceDir;
      if (args.stage === "format") {
        workspaceDir = runFormatStage(args.topic);
      } else if (args.stage === "research") {
        workspaceDir = runResearchStage(args.topic);
      } else if (args.stage === "angle") {
        workspaceDir = runAngleStage(args.topic);
      } else if (args.stage === "cast") {
        workspaceDir = runCastStage(args.topic);
      } else if (args.stage === "script") {
        workspaceDir = runScriptStage(args.topic);
      } else if (args.stage === "scene-cards") {
        workspaceDir = runSceneCardStage(args.topic);
      } else if (args.stage === "voice") {
        workspaceDir = runVoiceStage(args.topic);
      } else if (args.stage === "assets") {
        workspaceDir = runAssetsStage(args.topic);
      } else if (args.stage === "animation") {
        workspaceDir = runAnimationStage(args.topic);
      } else if (args.stage === "render") {
        workspaceDir = runRenderStage(args.topic, args.profile || "draft");
      } else if (args.stage === "qc") {
        workspaceDir = runQcStage(args.topic);
      } else {
        workspaceDir = runShortsStage(args.topic);
      }
      console.log(`${args.stage[0].toUpperCase()}${args.stage.slice(1)} stage completed: ${workspaceDir}`);
      return;
    }

    printUsage();
    process.exitCode = 1;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
