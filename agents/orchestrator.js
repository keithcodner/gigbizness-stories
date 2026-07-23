#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseCsv, toCsv, writeText } = require("./common");
const { hasUsableVoiceAudio } = require("../src/audio/audioReadiness");
const { isFreshArtifact } = require("../src/bricktoon/artifactFreshness");
const { parseSceneIdsArg } = require("../src/bricktoon/sceneSelection");

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
      "visual_quality_profile.json": "{\n  \"profile_id\": \"cinematic_bricktoon_editorial\",\n  \"production_target\": {\n    \"detail\": \"high\",\n    \"finish\": \"premium illustrated editorial\",\n    \"depth\": \"layered cinematic depth\",\n    \"character_expression\": \"strong and exaggerated\",\n    \"material_rendering\": \"painted plastic with dimensional highlights\",\n    \"lighting\": \"dramatic directional lighting\",\n    \"composition\": \"clear focal hierarchy\",\n    \"environment\": \"rich but controlled detail\",\n    \"movement\": \"selective, purposeful, cinematic\"\n  },\n  \"avoid\": [\n    \"flat vector appearance\",\n    \"stick-figure limbs\",\n    \"empty backgrounds\",\n    \"uniform lighting\",\n    \"front-facing character lineup\",\n    \"debug overlays\",\n    \"paragraph overlays\",\n    \"blurry faces\",\n    \"inconsistent costumes\",\n    \"distorted hands\",\n    \"extra limbs\",\n    \"unreadable generated text\",\n    \"floating props\"\n  ]\n}\n",
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
      "cast_request.json": "{\n  \"style_id\": \"bricktoon\",\n  \"reference_ids\": []\n}\n",
      "role_requirements.json": "{\n  \"required_roles\": []\n}\n",
      "cast_continuity.json": "{\n  \"characters\": []\n}\n",
      "scene_cast_map.json": "{\n  \"scenes\": []\n}\n",
      "prop_assignments.json": "{\n  \"props\": []\n}\n",
      "visual_character_bible.json": "{\n  \"characters\": []\n}\n",
      "reference_usage.json": "{\n  \"references\": []\n}\n",
      "cast_validation.json": "{\n  \"passed\": false,\n  \"errors\": [],\n  \"warnings\": []\n}\n",
      "cast_report.md": "# Cast Report\n\n",
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
      "licenses.csv": "asset_name,asset_type,source_url,license,status,notes\n",
      "reference_manifest.json": "{\n  \"mode\": \"selected\",\n  \"selected_references\": [],\n  \"selected_asset_categories\": []\n}\n"
    },
    subdirs: [
      "images",
      "reference_images",
      "stock_videos",
      "screenshots",
      "music",
      "sfx",
      "charts",
      "documents"
    ]
  },
  {
    dir: "06_scene_beats",
    files: {
      "scene_beats.json": "{\n  \"scenes\": []\n}\n",
      "scene_beats_report.md": "# Scene Beats Report\n\n",
      "scene_beats_validation.json": "{\n  \"passed\": false,\n  \"warnings\": [],\n  \"errors\": []\n}\n"
    },
    subdirs: [
      "scenes"
    ]
  },
  {
    dir: "07_shot_plans",
    files: {
      "shot_plan.json": "{\n  \"scenes\": []\n}\n",
      "layout_assignments.json": "{\n  \"layout_assignments\": []\n}\n",
      "shot_plan_report.md": "# Shot Plan Report\n\n",
      "shot_plan_validation.json": "{\n  \"passed\": false,\n  \"warnings\": [],\n  \"errors\": []\n}\n"
    },
    subdirs: [
      "scenes"
    ]
  },
  {
    dir: "07_visuals",
    files: {
      "asset_manifest.json": "{\n  \"style\": \"bricktoon\",\n  \"assets\": []\n}\n"
    },
    subdirs: [
      "style_profiles",
      "character_bibles",
      "environment_bibles",
      "workflow_requests",
      "workflow_requests/characters",
      "workflow_requests/scenes",
      "workflow_requests/shots",
      "workflow_requests/motion",
      "generation_reports",
      "generation_reports/characters",
      "generation_reports/scenes",
      "generation_reports/shots",
      "generation_reports/motion",
      "production_routes",
      "production_routes/scenes",
      "art_direction",
      "composition_guides",
      "generated_keyframes",
      "approved_keyframes",
      "consistency_reports",
      "shot_layers",
      "clean_plates",
      "props",
      "character_rigs",
      "generated_images",
      "generated_images/shot_posters",
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
    },
    subdirs: [
      "previews"
    ]
  },
  {
    dir: "08_animation",
    files: {
      "animation_plan.json": "{\n  \"style\": \"bricktoon_static_motion\",\n  \"scenes\": []\n}\n",
      "camera_moves.json": "[]\n",
      "shot_performances.json": "{\n  \"shots\": []\n}\n"
    },
    subdirs: [
      "animated_clips",
      "performance_timelines",
      "raw_ai_video",
      "stabilized_ai_video",
      "puppet_shots",
      "hybrid_shots",
      "raw_shot_clips",
      "composited_shot_clips",
      "compositing_reports",
      "shot_clips",
      "scene_sequences"
      ,
      "professional_imports",
      "professional_imports/shots",
      "hybrid_contract",
      "hybrid_contract/characters",
      "hybrid_contract/shots"
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
  },
  {
    dir: "11_external_handoff",
    files: {},
    subdirs: [
      "professional_export_lock",
      "professional_toolchain_map",
      "professional_hero_scene",
      "professional_reintegration",
      "professional_semi_automation"
    ]
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

function readJson(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallbackValue;
  }
}

function fileHasContent(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function isFileNewerOrEqual(targetPath, dependencyPath) {
  if (!fs.existsSync(targetPath) || !fs.existsSync(dependencyPath)) {
    return false;
  }

  return fs.statSync(targetPath).mtimeMs >= fs.statSync(dependencyPath).mtimeMs;
}

function areArtifactsFresh(targetPath, dependencyPaths = []) {
  return isFreshArtifact(targetPath, dependencyPaths);
}

function getTopicPaths(topicId) {
  const workspaceDir = getWorkspaceDir(topicId);
  return {
    workspaceDir,
    guidedStatusPath: path.join(workspaceDir, "guided_status.md"),
    qualityRulesPath: path.join(ROOT_CONFIG_DIR, "quality_rules.json"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    visualQualityProfilePath: path.join(workspaceDir, "00_brief", "visual_quality_profile.json"),
    beatSheetPath: path.join(workspaceDir, "02_angle", "beat_sheet.md"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    castRequestPath: path.join(workspaceDir, "03_cast", "cast_request.json"),
    roleRequirementsPath: path.join(workspaceDir, "03_cast", "role_requirements.json"),
    castContinuityPath: path.join(workspaceDir, "03_cast", "cast_continuity.json"),
    sceneCastMapPath: path.join(workspaceDir, "03_cast", "scene_cast_map.json"),
    propAssignmentsPath: path.join(workspaceDir, "03_cast", "prop_assignments.json"),
    visualCharacterBiblePath: path.join(workspaceDir, "03_cast", "visual_character_bible.json"),
    referenceUsagePath: path.join(workspaceDir, "03_cast", "reference_usage.json"),
    castValidationPath: path.join(workspaceDir, "03_cast", "cast_validation.json"),
    castReportPath: path.join(workspaceDir, "03_cast", "cast_report.md"),
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
    referenceManifestPath: path.join(workspaceDir, "04_assets", "reference_manifest.json"),
    sceneBeatsPath: path.join(workspaceDir, "06_scene_beats", "scene_beats.json"),
    shotPlanPath: path.join(workspaceDir, "07_shot_plans", "shot_plan.json"),
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    productionRoutesPath: path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"),
    productionRouteValidationPath: path.join(workspaceDir, "07_visuals", "production_routes", "production_route_validation.json"),
    productionRouteReportPath: path.join(workspaceDir, "07_visuals", "production_routes", "production_route_report.md"),
    artDirectionDir: path.join(workspaceDir, "07_visuals", "art_direction"),
    compositionGuidesDir: path.join(workspaceDir, "07_visuals", "composition_guides"),
    approvedKeyframesDir: path.join(workspaceDir, "07_visuals", "approved_keyframes"),
    benchmarkPackDir: path.join(workspaceDir, "07_visuals", "benchmark_pack"),
    hybridStillBenchmarkPackPath: path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.json"),
    hybridStillBenchmarkPackMdPath: path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.md"),
    consistencyReportsDir: path.join(workspaceDir, "07_visuals", "consistency_reports"),
    consistencySummaryPath: path.join(workspaceDir, "07_visuals", "consistency_reports", "consistency_summary.md"),
    shotLayersDir: path.join(workspaceDir, "07_visuals", "shot_layers"),
    cleanPlatesDir: path.join(workspaceDir, "07_visuals", "clean_plates"),
    characterRigsDir: path.join(workspaceDir, "07_visuals", "character_rigs"),
    characterRefsDir: path.join(workspaceDir, "07_visuals", "character_refs"),
    generatedImagesDir: path.join(workspaceDir, "07_visuals", "generated_images"),
    animatedClipsDir: path.join(workspaceDir, "08_animation", "animated_clips"),
    rawAiVideoDir: path.join(workspaceDir, "08_animation", "raw_ai_video"),
    stabilizedAiVideoDir: path.join(workspaceDir, "08_animation", "stabilized_ai_video"),
    compositedShotClipsDir: path.join(workspaceDir, "08_animation", "composited_shot_clips"),
    compositingReportsDir: path.join(workspaceDir, "08_animation", "compositing_reports"),
    shotClipsDir: path.join(workspaceDir, "08_animation", "shot_clips"),
    sceneSequencesDir: path.join(workspaceDir, "08_animation", "scene_sequences"),
    hybridContractDir: path.join(workspaceDir, "08_animation", "hybrid_contract"),
    hybridAnimationContractPath: path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"),
    hybridAnimationContractMdPath: path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.md"),
    shotClipReportPath: path.join(workspaceDir, "08_animation", "shot_clips", "shot_clip_report.json"),
    aiMotionReportPath: path.join(workspaceDir, "08_animation", "raw_ai_video", "ai_motion_report.json"),
    stabilizationReportPath: path.join(workspaceDir, "08_animation", "stabilized_ai_video", "stabilization_report.json"),
    compositingReportPath: path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"),
    sceneSequenceReportPath: path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"),
    hybridEditorialReportPath: path.join(workspaceDir, "08_animation", "hybrid_editorial", "hybrid_editorial_sequence_report.json"),
    hybridPromotionGatePath: path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.json"),
    hybridPromotionGateMdPath: path.join(workspaceDir, "10_qc", "hybrid_promotion_gate_report.md"),
    hybridProductionReadinessPath: path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.json"),
    hybridProductionReadinessMdPath: path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.md"),
    professionalExportLockDir: path.join(workspaceDir, "11_external_handoff", "professional_export_lock"),
    professionalExportLockLatestPath: path.join(workspaceDir, "11_external_handoff", "professional_export_lock", "latest_export_lock_report.json"),
    professionalExportLockLatestMdPath: path.join(workspaceDir, "11_external_handoff", "professional_export_lock", "latest_export_lock_report.md"),
    professionalToolchainMapDir: path.join(workspaceDir, "11_external_handoff", "professional_toolchain_map"),
    professionalToolchainMapLatestPath: path.join(workspaceDir, "11_external_handoff", "professional_toolchain_map", "latest_toolchain_map_report.json"),
    professionalToolchainMapLatestMdPath: path.join(workspaceDir, "11_external_handoff", "professional_toolchain_map", "latest_toolchain_map_report.md"),
    professionalHeroSceneDir: path.join(workspaceDir, "11_external_handoff", "professional_hero_scene"),
    professionalHeroSceneLatestPath: path.join(workspaceDir, "11_external_handoff", "professional_hero_scene", "latest_professional_hero_scene_report.json"),
    professionalHeroSceneLatestMdPath: path.join(workspaceDir, "11_external_handoff", "professional_hero_scene", "latest_professional_hero_scene_report.md"),
    professionalReintegrationDir: path.join(workspaceDir, "11_external_handoff", "professional_reintegration"),
    professionalReintegrationLatestPath: path.join(workspaceDir, "11_external_handoff", "professional_reintegration", "latest_professional_reintegration_report.json"),
    professionalReintegrationLatestMdPath: path.join(workspaceDir, "11_external_handoff", "professional_reintegration", "latest_professional_reintegration_report.md"),
    professionalReintegrationQcPath: path.join(workspaceDir, "10_qc", "professional_reintegration_report.json"),
    professionalReintegrationQcMdPath: path.join(workspaceDir, "10_qc", "professional_reintegration_report.md"),
    professionalSemiAutomationDir: path.join(workspaceDir, "11_external_handoff", "professional_semi_automation"),
    professionalSemiAutomationLatestPath: path.join(workspaceDir, "11_external_handoff", "professional_semi_automation", "latest_professional_semi_automation_report.json"),
    professionalSemiAutomationLatestMdPath: path.join(workspaceDir, "11_external_handoff", "professional_semi_automation", "latest_professional_semi_automation_report.md"),
    professionalSemiAutomationQcPath: path.join(workspaceDir, "10_qc", "professional_semi_automation_report.json"),
    professionalSemiAutomationQcMdPath: path.join(workspaceDir, "10_qc", "professional_semi_automation_report.md"),
    animationPlanPath: path.join(workspaceDir, "08_animation", "animation_plan.json"),
    editPlanPath: path.join(workspaceDir, "09_edit_plan", "edit_plan.md"),
    renderContractPath: path.join(workspaceDir, "09_edit_plan", "render_contract.json"),
    draftRenderPath: path.join(workspaceDir, "06_renders", "draft_01.mp4"),
    visualPreviewPath: path.join(workspaceDir, "06_renders", "previews", "visual_preview.mp4"),
    benchmarkSceneProofPath: path.join(workspaceDir, "06_renders", "benchmark_scene_proof.mp4"),
    shortOnePath: path.join(workspaceDir, "07_shorts", "short_01.mp4"),
    thumbnailPath: path.join(workspaceDir, "08_thumbnail", "final_thumbnail.jpg"),
    titleOptionsPath: path.join(workspaceDir, "09_publish", "title_options.txt"),
    benchmarkSceneManifestPath: path.join(workspaceDir, "05_render_plan", "benchmark_scene_manifest.json"),
    benchmarkRenderPlanPath: path.join(workspaceDir, "05_render_plan", "benchmark_render_plan.json"),
    qualityReportPath: path.join(workspaceDir, "10_qc", "quality_report.md"),
    requiredFixesPath: path.join(workspaceDir, "10_qc", "required_fixes.md"),
    finalApprovalPath: path.join(workspaceDir, "10_qc", "final_approval.md"),
    bricktoonReliabilityReportPath: path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.json"),
    bricktoonReliabilityReportMdPath: path.join(workspaceDir, "10_qc", "bricktoon_reliability_report.md"),
    bricktoonBenchmarkReliabilityReportPath: path.join(workspaceDir, "10_qc", "bricktoon_benchmark_reliability_report.json"),
    bricktoonBenchmarkReliabilityReportMdPath: path.join(workspaceDir, "10_qc", "bricktoon_benchmark_reliability_report.md"),
    benchmarkSceneProofReportPath: path.join(workspaceDir, "10_qc", "benchmark_scene_proof_report.json"),
    benchmarkSceneProofReportMdPath: path.join(workspaceDir, "10_qc", "benchmark_scene_proof_report.md"),
    bricktoonRenderOutputProofPath: path.join(workspaceDir, "10_qc", "bricktoon_render_output_proof.json"),
    bricktoonRenderOutputProofMdPath: path.join(workspaceDir, "10_qc", "bricktoon_render_output_proof.md"),
    bricktoonFinalRenderOutputProofPath: path.join(workspaceDir, "10_qc", "bricktoon_final_render_output_proof.json"),
    bricktoonFinalRenderOutputProofMdPath: path.join(workspaceDir, "10_qc", "bricktoon_final_render_output_proof.md"),
    bricktoonRecoveryPlanPath: path.join(workspaceDir, "10_qc", "bricktoon_recovery_plan.json"),
    bricktoonRecoveryPlanMdPath: path.join(workspaceDir, "10_qc", "bricktoon_recovery_plan.md"),
    bricktoonSceneReviewDecisionsPath: path.join(workspaceDir, "10_qc", "bricktoon_scene_review_decisions.json"),
    bricktoonSceneReviewPacketPath: path.join(workspaceDir, "10_qc", "bricktoon_scene_review_packet.json"),
    bricktoonSceneReviewPacketMdPath: path.join(workspaceDir, "10_qc", "bricktoon_scene_review_packet.md"),
    bricktoonOvernightStatePath: path.join(workspaceDir, "10_qc", "bricktoon_overnight_state.json"),
    bricktoonOvernightReportPath: path.join(workspaceDir, "10_qc", "bricktoon_overnight_report.json"),
    bricktoonOvernightReportMdPath: path.join(workspaceDir, "10_qc", "bricktoon_overnight_report.md"),
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
  const validationText = readText(paths.castValidationPath);
  return validationText.includes("\"passed\": true") &&
    readText(paths.castPath).includes("\"cast_members\"") &&
    readText(paths.roleRequirementsPath).includes("\"required_roles\"") &&
    readText(paths.castContinuityPath).includes("\"hard_locks\"") &&
    readText(paths.sceneCastMapPath).includes("\"environment_id\"") &&
    readText(paths.propAssignmentsPath).includes("\"prop_id\"") &&
    fileHasContent(paths.castReportPath) &&
    isFileNewerOrEqual(paths.castValidationPath, paths.scriptPath) &&
    isFileNewerOrEqual(paths.castValidationPath, paths.beatSheetPath);
}

function isScriptReady(topicId) {
  const paths = getTopicPaths(topicId);
  const scriptText = readText(paths.scriptPath);
  return scriptText.includes("## S01") && scriptText.length > 1200;
}

function isSceneCardsReady(topicId) {
  const paths = getTopicPaths(topicId);
  return readText(paths.sceneCardsPath).includes("\"scene_id\"") &&
    isFileNewerOrEqual(paths.sceneCardsPath, paths.castValidationPath);
}

function isVoiceReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.voiceCleanPath) &&
    fileHasContent(paths.captionsPath) &&
    hasUsableVoiceAudio(paths.voiceCleanPath);
}

function isAssetsReady(topicId) {
  const paths = getTopicPaths(topicId);
  return countCsvRows(paths.visualManifestPath) >= 6 &&
    fileHasContent(paths.visualPlanPath) &&
    fileHasContent(paths.visualReadinessPath);
}

function directoryHasFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).some((entry) => {
    if (entry.isFile()) {
      return true;
    }
    if (!entry.isDirectory()) {
      return false;
    }

    const nestedPath = path.join(dirPath, entry.name);
    return fs.readdirSync(nestedPath, { withFileTypes: true }).some((nestedEntry) => nestedEntry.isFile());
  });
}

function getExpectedShotIds(topicId) {
  const shotPlan = readJson(getTopicPaths(topicId).shotPlanPath, {});
  const scenes = Array.isArray(shotPlan.scenes) ? shotPlan.scenes : [];
  return scenes.flatMap((scene) => Array.isArray(scene.shots) ? scene.shots.map((shot) => shot.shot_id).filter(Boolean) : []);
}

function getExpectedSceneIds(topicId) {
  const sceneCards = readJson(getTopicPaths(topicId).sceneCardsPath, {});
  const cards = Array.isArray(sceneCards.scene_cards) ? sceneCards.scene_cards : [];
  return cards.map((card) => card.scene_id).filter(Boolean);
}

function countManifestAssetsByType(topicId, assetTypes) {
  const manifest = readJson(getTopicPaths(topicId).assetManifestPath, {});
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  return assets.filter((asset) => assetTypes.includes(asset.asset_type) && asset.status === "approved").length;
}

function isBricktoonCharactersReady(topicId) {
  return directoryHasFiles(getTopicPaths(topicId).characterRefsDir);
}

function isBricktoonScenesReady(topicId) {
  return directoryHasFiles(getTopicPaths(topicId).generatedImagesDir);
}

function isBricktoonManifestReady(topicId) {
  const manifestText = readText(getTopicPaths(topicId).assetManifestPath);
  return manifestText.includes("\"asset_id\"") && manifestText.includes("\"assets\"");
}

function isVisualCharacterBibleReady(topicId) {
  const paths = getTopicPaths(topicId);
  return readText(paths.visualCharacterBiblePath).includes("\"character_id\"") &&
    directoryHasFiles(path.join(paths.workspaceDir, "07_visuals", "character_bibles"));
}

function isSceneBeatsReady(topicId) {
  const text = readText(getTopicPaths(topicId).sceneBeatsPath);
  return text.includes("\"beats\"");
}

function isShotPlannerReady(topicId) {
  const text = readText(getTopicPaths(topicId).shotPlanPath);
  return text.includes("\"shot_id\"");
}

function isVisualProductionRouterReady(topicId) {
  const paths = getTopicPaths(topicId);
  return readText(paths.productionRoutesPath).includes("\"production_mode\"") &&
    readText(paths.productionRouteValidationPath).includes("\"passed\": true");
}

function isShotArtDirectionReady(topicId) {
  return directoryHasFiles(getTopicPaths(topicId).artDirectionDir);
}

function isCompositionGuidesReady(topicId) {
  return directoryHasFiles(getTopicPaths(topicId).compositionGuidesDir);
}

function isAssetGenerationReady(topicId) {
  return directoryHasFiles(getTopicPaths(topicId).approvedKeyframesDir);
}

function isAssetConsistencyReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.consistencySummaryPath);
}

function isLayerExtractionReady(topicId) {
  const paths = getTopicPaths(topicId);
  return directoryHasFiles(paths.shotLayersDir) && directoryHasFiles(paths.cleanPlatesDir);
}

function isCharacterRiggingReady(topicId) {
  return directoryHasFiles(getTopicPaths(topicId).characterRigsDir);
}

function isHybridAnimationContractReady(topicId) {
  const paths = getTopicPaths(topicId);
  return fileHasContent(paths.hybridAnimationContractPath)
    && areArtifactsFresh(paths.hybridAnimationContractPath, [
      paths.productionRoutesPath,
      path.join(paths.workspaceDir, "08_animation", "shot_performances.json")
    ]);
}

function isAiVideoMotionReady(topicId) {
  const paths = getTopicPaths(topicId);
  return directoryHasFiles(paths.rawAiVideoDir)
    && directoryHasFiles(paths.stabilizedAiVideoDir)
    && areArtifactsFresh(paths.aiMotionReportPath, [
      paths.productionRoutesPath,
      paths.shotClipReportPath
    ])
    && areArtifactsFresh(paths.stabilizationReportPath, [
      paths.aiMotionReportPath
    ]);
}

function isShotCompositingReady(topicId) {
  const paths = getTopicPaths(topicId);
  return directoryHasFiles(paths.compositedShotClipsDir)
    && directoryHasFiles(paths.compositingReportsDir)
    && areArtifactsFresh(paths.compositingReportPath, [
      paths.aiMotionReportPath,
      paths.shotClipReportPath
    ]);
}

function isBricktoonClipsReady(topicId) {
  const paths = getTopicPaths(topicId);
  const expectedSceneIds = getExpectedSceneIds(topicId);
  if (!expectedSceneIds.length) {
    return false;
  }

  const existingSequenceCount = expectedSceneIds.filter((sceneId) =>
    fileHasContent(path.join(paths.sceneSequencesDir, `${sceneId}_sequence.mp4`))
  ).length;
  const manifestSequenceCount = countManifestAssetsByType(topicId, ["bricktoon_scene_sequence", "bricktoon_animated_clip"]);

  return existingSequenceCount >= expectedSceneIds.length
    && manifestSequenceCount >= expectedSceneIds.length
    && areArtifactsFresh(paths.sceneSequenceReportPath, [
      paths.compositingReportPath
    ]);
}

function isBricktoonShotsReady(topicId) {
  const paths = getTopicPaths(topicId);
  const expectedShotIds = getExpectedShotIds(topicId);
  if (!expectedShotIds.length) {
    return false;
  }

  const existingShotCount = expectedShotIds.filter((shotId) =>
    fileHasContent(path.join(paths.shotClipsDir, `${shotId}.mp4`))
  ).length;
  return existingShotCount >= expectedShotIds.length
    && areArtifactsFresh(paths.shotClipReportPath, [
      paths.animationPlanPath,
      paths.editPlanPath,
      path.join(paths.workspaceDir, "08_animation", "shot_performances.json")
    ]);
}

function isDraftReady(topicId) {
  return fileHasContent(getTopicPaths(topicId).draftRenderPath);
}

function isAnimationReady(topicId) {
  const paths = getTopicPaths(topicId);
  const animationPlan = readJson(paths.animationPlanPath, {});
  const shotPerformances = readJson(path.join(paths.workspaceDir, "08_animation", "shot_performances.json"), {});
  const hasPlanScenes = Array.isArray(animationPlan.scenes) && animationPlan.scenes.length > 0;
  const hasShotPerformanceData = Array.isArray(shotPerformances.shots) && shotPerformances.shots.length > 0;
  return hasPlanScenes && hasShotPerformanceData && fileHasContent(paths.editPlanPath);
}

function isRenderContractReady(topicId) {
  const contractText = readText(getTopicPaths(topicId).renderContractPath);
  return contractText.includes("\"render_mode\"") && contractText.includes("\"scenes\"");
}

function isBricktoonReliabilityReady(topicId) {
  const report = readJson(getTopicPaths(topicId).bricktoonReliabilityReportPath, {});
  return Boolean(report.gate && report.gate.decision);
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

  if (!isScriptReady(topicId)) {
    runScriptStage(topicId);
  }

  if (!isCastReady(topicId)) {
    runCastStage(topicId);
  }

  if (!isVisualCharacterBibleReady(topicId)) {
    runVisualCharacterBibleStage(topicId);
  }

  if (!isSceneCardsReady(topicId)) {
    runSceneCardStage(topicId);
  }

  if (!isBricktoonCharactersReady(topicId)) {
    runBricktoonCharactersStage(topicId);
  }

  if (!isVoiceReady(topicId)) {
    runVoiceStage(topicId);
  }

  if (!isAssetsReady(topicId)) {
    runAssetsStage(topicId);
  }

  if (!isSceneBeatsReady(topicId)) {
    runSceneBeatsStage(topicId);
  }

  if (!isShotPlannerReady(topicId)) {
    runShotPlannerStage(topicId);
  }

  if (!isVisualProductionRouterReady(topicId)) {
    runVisualProductionRouterStage(topicId);
  }

  if (!isShotArtDirectionReady(topicId)) {
    runShotArtDirectionStage(topicId);
  }

  if (!isCompositionGuidesReady(topicId)) {
    runCompositionGuidesStage(topicId);
  }

  if (!isAssetGenerationReady(topicId)) {
    runAssetGenerationStage(topicId);
  }

  if (!isAssetConsistencyReady(topicId)) {
    runAssetConsistencyValidationStage(topicId);
  }

  if (!isLayerExtractionReady(topicId)) {
    runLayerExtractionStage(topicId);
  }

  if (!isCharacterRiggingReady(topicId)) {
    runCharacterRiggingStage(topicId);
  }

  if (!isBricktoonScenesReady(topicId)) {
    runBricktoonScenesStage(topicId);
  }

  if (!isBricktoonManifestReady(topicId)) {
    runBricktoonManifestStage(topicId);
  }

  if (!isAnimationReady(topicId)) {
    runAnimationStage(topicId);
  }

  if (!isBricktoonShotsReady(topicId)) {
    runBricktoonShotsStage(topicId);
  }

  if (!isAiVideoMotionReady(topicId)) {
    runAiVideoMotionPassesStage(topicId);
  }

  if (!isShotCompositingReady(topicId)) {
    runShotCompositingStage(topicId);
  }

  if (!isBricktoonClipsReady(topicId)) {
    runBricktoonClipsStage(topicId);
  }

  block = getVisualSourcingBlock(topicId);
  if (block) {
    writeGuidedStatus(topicId, mode, "blocked", block.title, block.lines);
    printGuidedBlock(block.title, block.lines);
    return workspaceDir;
  }

  if (!isDraftReady(topicId)) {
    if (!isRenderContractReady(topicId)) {
      runRenderContractStage(topicId, "draft", "development");
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

function runNodeScript(relativeScriptPath, args) {
  const scriptPath = path.join(ROOT, relativeScriptPath);
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
    throw new Error(`Script failed: ${relativeScriptPath}`);
  }
}

function appendSceneScopeArgs(args, sceneIds = []) {
  if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
    return args;
  }
  return [...args, "--scene-ids", sceneIds.join(",")];
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

function runVisualCharacterBibleStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting visual-character-bible stage for topic '${topicId}'`);

  if (!isCastReady(topicId)) {
    runCastStage(topicId);
  }
  runNodeAgent("visual_character_bible_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed visual-character-bible stage for topic '${topicId}'`);
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

function runReferenceSyncStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting reference-sync stage for topic '${topicId}'`);

  runNodeScript("scripts/sync_reference_library.js", ["--workspace", workspaceDir]);

  writeLog(`Completed reference-sync stage for topic '${topicId}'`);
  return workspaceDir;
}

function runSceneBeatsStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting scene-beats stage for topic '${topicId}'`);

  runNodeScript("scripts/generate_scene_beats.js", ["--workspace", workspaceDir]);

  writeLog(`Completed scene-beats stage for topic '${topicId}'`);
  return workspaceDir;
}

function runShotPlannerStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting shot-planner stage for topic '${topicId}'`);

  runNodeScript("scripts/generate_shot_plan.js", ["--workspace", workspaceDir]);

  writeLog(`Completed shot-planner stage for topic '${topicId}'`);
  return workspaceDir;
}

function runVisualProductionRouterStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting visual-production-router stage for topic '${topicId}'`);

  if (!isShotPlannerReady(topicId)) {
    runShotPlannerStage(topicId);
  }
  if (!isVisualCharacterBibleReady(topicId)) {
    runVisualCharacterBibleStage(topicId);
  }
  runNodeAgent("visual_production_router_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed visual-production-router stage for topic '${topicId}'`);
  return workspaceDir;
}

function runShotArtDirectionStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting shot-art-direction stage for topic '${topicId}'`);

  if (!isVisualProductionRouterReady(topicId)) {
    runVisualProductionRouterStage(topicId);
  }
  runNodeAgent("shot_art_direction_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed shot-art-direction stage for topic '${topicId}'`);
  return workspaceDir;
}

function runCompositionGuidesStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting composition-guides stage for topic '${topicId}'`);

  if (!isShotArtDirectionReady(topicId)) {
    runShotArtDirectionStage(topicId);
  }
  runNodeAgent("composition_guide_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed composition-guides stage for topic '${topicId}'`);
  return workspaceDir;
}

function runAssetGenerationStage(topicId, sceneIds = []) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting asset-generation stage for topic '${topicId}'`);

  if (!isBricktoonCharactersReady(topicId)) {
    runBricktoonCharactersStage(topicId);
  }
  if (!isBricktoonScenesReady(topicId)) {
    runBricktoonScenesStage(topicId);
  }
  if (!isCompositionGuidesReady(topicId)) {
    runCompositionGuidesStage(topicId);
  }
  runNodeScript("scripts/generate_shot_keyframes.js", appendSceneScopeArgs(["--workspace", workspaceDir], sceneIds));

  writeLog(`Completed asset-generation stage for topic '${topicId}'`);
  return workspaceDir;
}

function runHybridStillBenchmarkStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting hybrid-still-benchmark stage for topic '${topicId}'`);

  if (!isVisualCharacterBibleReady(topicId)) {
    runVisualCharacterBibleStage(topicId);
  }
  if (!isBricktoonCharactersReady(topicId)) {
    runBricktoonCharactersStage(topicId);
  }
  if (!isAssetGenerationReady(topicId)) {
    runAssetGenerationStage(topicId);
  }
  runNodeScript("scripts/build_hybrid_still_benchmark_pack.js", ["--workspace", workspaceDir]);

  writeLog(`Completed hybrid-still-benchmark stage for topic '${topicId}'`);
  return workspaceDir;
}

function runAssetConsistencyValidationStage(topicId, sceneIds = []) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting asset-consistency-validation stage for topic '${topicId}'`);

  if (!isAssetGenerationReady(topicId)) {
    runAssetGenerationStage(topicId);
  }
  runNodeAgent("asset_consistency_agent.js", appendSceneScopeArgs(["--topic", topicId, "--workspace", workspaceDir], sceneIds));

  writeLog(`Completed asset-consistency-validation stage for topic '${topicId}'`);
  return workspaceDir;
}

function runLayerExtractionStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting layer-extraction stage for topic '${topicId}'`);

  if (!isAssetConsistencyReady(topicId)) {
    runAssetConsistencyValidationStage(topicId);
  }
  runNodeAgent("layer_extraction_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed layer-extraction stage for topic '${topicId}'`);
  return workspaceDir;
}

function runHybridAnimationContractStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting hybrid-animation-contract stage for topic '${topicId}'`);

  if (!fileHasContent(getTopicPaths(topicId).hybridStillBenchmarkPackPath)) {
    runHybridStillBenchmarkStage(topicId);
  }
  runLayerExtractionStage(topicId);
  runCharacterRiggingStage(topicId);
  runAnimationStage(topicId);
  runNodeScript("scripts/build_hybrid_animation_contract.js", ["--workspace", workspaceDir]);

  writeLog(`Completed hybrid-animation-contract stage for topic '${topicId}'`);
  return workspaceDir;
}

function runHybridPerformanceProofStage(topicId, selectionMode = "topic_wide") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting hybrid-performance-proof stage for topic '${topicId}' with selection mode '${selectionMode}'`);

  if (!isHybridAnimationContractReady(topicId)) {
    runHybridAnimationContractStage(topicId);
  }
  runNodeScript("scripts/render_hybrid_performance_proof.js", ["--workspace", workspaceDir, "--selection-mode", selectionMode]);

  writeLog(`Completed hybrid-performance-proof stage for topic '${topicId}'`);
  return workspaceDir;
}

function runHybridEditorialProofStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting hybrid-editorial-proof stage for topic '${topicId}'`);

  if (!isHybridAnimationContractReady(topicId)) {
    runHybridAnimationContractStage(topicId);
  }
  runSceneAssemblyStage(topicId);
  runNodeScript("scripts/render_hybrid_editorial_sequence.js", ["--workspace", workspaceDir]);

  writeLog(`Completed hybrid-editorial-proof stage for topic '${topicId}'`);
  return workspaceDir;
}

function runHybridPromotionGateStage(topicId, runtimeProfile = "gtx1080_premium_preview") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting hybrid-promotion-gate stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).visualPreviewPath)) {
    runVisualPreviewStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridStillBenchmarkPackPath)) {
    runHybridStillBenchmarkStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridEditorialReportPath)) {
    runHybridEditorialProofStage(topicId);
  }
  if (!isRenderContractReady(topicId)) {
    runRenderContractStage(topicId, "draft", "development");
  }

  runNodeScript("scripts/build_hybrid_promotion_gate.js", [
    "--workspace",
    workspaceDir,
    "--runtime-profile",
    runtimeProfile
  ]);

  writeLog(`Completed hybrid-promotion-gate stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runHybridProductionReadinessStage(topicId, runtimeProfile = "gtx1080_premium_preview") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting hybrid-production-readiness stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).hybridPromotionGatePath)) {
    runHybridPromotionGateStage(topicId, runtimeProfile);
  }
  if (!fileHasContent(getTopicPaths(topicId).bricktoonReliabilityReportPath)) {
    runBricktoonReliabilityStage(topicId, runtimeProfile);
  }

  runNodeScript("scripts/build_hybrid_production_readiness_report.js", [
    "--workspace",
    workspaceDir
  ]);

  writeLog(`Completed hybrid-production-readiness stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runProfessionalExportLockStage(topicId, runtimeProfile = "gtx1080_premium_preview") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting professional-export-lock stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);

  if (!isCastReady(topicId)) {
    runCastStage(topicId);
  }
  if (!isShotPlannerReady(topicId)) {
    runShotPlannerStage(topicId);
  }
  if (!isShotArtDirectionReady(topicId)) {
    runShotArtDirectionStage(topicId);
  }
  if (!isCompositionGuidesReady(topicId)) {
    runCompositionGuidesStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridStillBenchmarkPackPath)) {
    runHybridStillBenchmarkStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridProductionReadinessPath)) {
    runHybridProductionReadinessStage(topicId, runtimeProfile);
  }

  runNodeScript("scripts/build_professional_export_lock.js", [
    "--workspace",
    workspaceDir
  ]);

  writeLog(`Completed professional-export-lock stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runProfessionalToolchainMapStage(
  topicId,
  toolchainProfile = "adobe_character_animator_after_effects",
  runtimeProfile = "gtx1080_premium_preview"
) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting professional-toolchain-map stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).professionalExportLockLatestPath)) {
    runProfessionalExportLockStage(topicId, runtimeProfile);
  }
  if (!isHybridAnimationContractReady(topicId)) {
    runHybridAnimationContractStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridProductionReadinessPath)) {
    runHybridProductionReadinessStage(topicId, runtimeProfile);
  }

  runNodeScript("scripts/build_professional_toolchain_map.js", [
    "--workspace",
    workspaceDir,
    "--toolchain-profile",
    toolchainProfile
  ]);

  writeLog(`Completed professional-toolchain-map stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runProfessionalHeroSceneStage(
  topicId,
  toolchainProfile = "adobe_character_animator_after_effects",
  runtimeProfile = "gtx1080_premium_preview"
) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting professional-hero-scene stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).professionalToolchainMapLatestPath)) {
    runProfessionalToolchainMapStage(topicId, toolchainProfile, runtimeProfile);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridEditorialReportPath)) {
    runHybridEditorialProofStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridProductionReadinessPath)) {
    runHybridProductionReadinessStage(topicId, runtimeProfile);
  }

  runNodeScript("scripts/build_professional_hero_scene.js", [
    "--workspace",
    workspaceDir
  ]);

  writeLog(`Completed professional-hero-scene stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runProfessionalReintegrationStage(
  topicId,
  toolchainProfile = "adobe_character_animator_after_effects",
  runtimeProfile = "gtx1080_premium_preview"
) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting professional-reintegration stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).professionalHeroSceneLatestPath)) {
    runProfessionalHeroSceneStage(topicId, toolchainProfile, runtimeProfile);
  }

  runNodeScript("scripts/build_professional_reintegration.js", [
    "--workspace",
    workspaceDir,
    "--profile",
    "draft",
    "--mode",
    "development"
  ]);

  writeLog(`Completed professional-reintegration stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runProfessionalSemiAutomationStage(
  topicId,
  toolchainProfile = "adobe_character_animator_after_effects",
  runtimeProfile = "gtx1080_premium_preview"
) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting professional-semi-automation stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).professionalReintegrationLatestPath)) {
    runProfessionalReintegrationStage(topicId, toolchainProfile, runtimeProfile);
  }
  if (!fileHasContent(getTopicPaths(topicId).bricktoonReliabilityReportPath)) {
    runBricktoonReliabilityStage(topicId, runtimeProfile);
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridProductionReadinessPath)) {
    runHybridProductionReadinessStage(topicId, runtimeProfile);
  }

  runNodeScript("scripts/build_professional_semi_automation_decision.js", [
    "--workspace",
    workspaceDir
  ]);

  writeLog(`Completed professional-semi-automation stage for topic '${topicId}' with profile '${toolchainProfile}' and runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runCharacterRiggingStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting character-rigging stage for topic '${topicId}'`);

  if (!isLayerExtractionReady(topicId)) {
    runLayerExtractionStage(topicId);
  }
  runNodeAgent("character_rigging_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed character-rigging stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonCharactersStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon character-ref stage for topic '${topicId}'`);

  runNodeScript("scripts/generate_bricktoon_character_refs.js", ["--workspace", workspaceDir]);

  writeLog(`Completed bricktoon character-ref stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonScenesStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon scene-image stage for topic '${topicId}'`);

  runNodeScript("scripts/generate_bricktoon_scene_images.js", ["--workspace", workspaceDir]);

  writeLog(`Completed bricktoon scene-image stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonManifestStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon asset-manifest stage for topic '${topicId}'`);

  runNodeScript("scripts/build_bricktoon_asset_manifest.js", ["--workspace", workspaceDir]);

  writeLog(`Completed bricktoon asset-manifest stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonClipsStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon animated-clip compatibility stage for topic '${topicId}'`);

  if (!isSceneBeatsReady(topicId)) {
    runSceneBeatsStage(topicId);
  }
  if (!isShotPlannerReady(topicId)) {
    runShotPlannerStage(topicId);
  }
  if (!isAnimationReady(topicId)) {
    runAnimationStage(topicId);
  }
  if (!isBricktoonShotsReady(topicId)) {
    runBricktoonShotsStage(topicId);
  }
  runSceneAssemblyStage(topicId);

  writeLog(`Completed bricktoon animated-clip compatibility stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonShotsStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-shots stage for topic '${topicId}'`);

  if (!isCharacterRiggingReady(topicId)) {
    runCharacterRiggingStage(topicId);
  }
  if (!isSceneBeatsReady(topicId)) {
    runSceneBeatsStage(topicId);
  }
  if (!isShotPlannerReady(topicId)) {
    runShotPlannerStage(topicId);
  }
  if (!isAnimationReady(topicId)) {
    runAnimationStage(topicId);
  }
  runNodeScript("scripts/generate_bricktoon_shot_clips.js", ["--workspace", workspaceDir]);

  writeLog(`Completed bricktoon-shots stage for topic '${topicId}'`);
  return workspaceDir;
}

function runAiVideoMotionPassesStage(topicId, sceneIds = []) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting ai-video-motion-passes stage for topic '${topicId}'`);

  if (!isBricktoonShotsReady(topicId)) {
    runBricktoonShotsStage(topicId);
  }
  runNodeAgent("ai_video_motion_agent.js", appendSceneScopeArgs(["--topic", topicId, "--workspace", workspaceDir], sceneIds));

  writeLog(`Completed ai-video-motion-passes stage for topic '${topicId}'`);
  return workspaceDir;
}

function runShotCompositingStage(topicId, sceneIds = []) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting shot-compositing stage for topic '${topicId}'`);

  if (!isBricktoonShotsReady(topicId)) {
    runBricktoonShotsStage(topicId);
  }
  if (!isAiVideoMotionReady(topicId)) {
    runAiVideoMotionPassesStage(topicId, sceneIds);
  }
  runNodeAgent("shot_compositing_agent.js", appendSceneScopeArgs(["--topic", topicId, "--workspace", workspaceDir], sceneIds));

  writeLog(`Completed shot-compositing stage for topic '${topicId}'`);
  return workspaceDir;
}

function runSceneAssemblyStage(topicId, sceneIds = []) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting scene-assembly stage for topic '${topicId}'`);

  if (!isShotCompositingReady(topicId)) {
    runShotCompositingStage(topicId, sceneIds);
  }
  runNodeScript("scripts/assemble_bricktoon_scene_sequences.js", appendSceneScopeArgs(["--workspace", workspaceDir], sceneIds));

  writeLog(`Completed scene-assembly stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonReliabilityStage(topicId, runtimeProfile = null) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-reliability stage for topic '${topicId}'${runtimeProfile ? ` with runtime profile '${runtimeProfile}'` : ""}`);
  const effectiveRuntimeProfile = runtimeProfile || "gtx1080_premium_preview";

  if (!fileHasContent(getTopicPaths(topicId).visualPreviewPath)) {
    runVisualPreviewStage(topicId);
  }
  if (!isShotCompositingReady(topicId)) {
    runShotCompositingStage(topicId);
  }
  if (!isBricktoonClipsReady(topicId)) {
    runSceneAssemblyStage(topicId);
  }
  if (!isRenderContractReady(topicId)) {
    runRenderContractStage(topicId, "draft", "development");
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridPromotionGatePath)) {
    runHybridPromotionGateStage(topicId, effectiveRuntimeProfile);
  }

  const scriptArgs = ["--workspace", workspaceDir];
  if (runtimeProfile) {
    scriptArgs.push("--runtime-profile", runtimeProfile);
  }
  runNodeScript("scripts/build_bricktoon_reliability_report.js", scriptArgs);
  runNodeScript("scripts/build_bricktoon_scene_review.js", ["--workspace", workspaceDir]);
  runNodeScript("scripts/build_bricktoon_recovery_plan.js", scriptArgs);

  writeLog(`Completed bricktoon-reliability stage for topic '${topicId}'${runtimeProfile ? ` with runtime profile '${runtimeProfile}'` : ""}`);
  return workspaceDir;
}

function runRenderOutputProofStage(topicId, runtimeProfile = null, profile = "draft") {
  const workspaceDir = ensureWorkspace(topicId);
  const effectiveRuntimeProfile = runtimeProfile || "gtx1080_overnight_finish_draft";
  writeLog(`Starting render-output-proof stage for topic '${topicId}' with profile '${profile}' and runtime profile '${effectiveRuntimeProfile}'`);

  runNodeScript("scripts/build_render_output_proof.js", [
    "--workspace",
    workspaceDir,
    "--profile",
    profile,
    "--runtime-profile",
    effectiveRuntimeProfile
  ]);

  writeLog(`Completed render-output-proof stage for topic '${topicId}' with profile '${profile}' and runtime profile '${effectiveRuntimeProfile}'`);
  return workspaceDir;
}

function runBricktoonRecoveryPlanStage(topicId, runtimeProfile = null) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-recovery-plan stage for topic '${topicId}'${runtimeProfile ? ` with runtime profile '${runtimeProfile}'` : ""}`);

  if (!fileHasContent(getTopicPaths(topicId).bricktoonReliabilityReportPath)) {
    runBricktoonReliabilityStage(topicId, runtimeProfile || "gtx1080_premium_preview");
  } else {
    const scriptArgs = ["--workspace", workspaceDir];
    if (runtimeProfile) {
      scriptArgs.push("--runtime-profile", runtimeProfile);
    }
    runNodeScript("scripts/build_bricktoon_recovery_plan.js", scriptArgs);
  }

  writeLog(`Completed bricktoon-recovery-plan stage for topic '${topicId}'${runtimeProfile ? ` with runtime profile '${runtimeProfile}'` : ""}`);
  return workspaceDir;
}

function runBricktoonSceneRecoveryStage(topicId, sceneIds = [], bucket = null, runtimeProfile = "gtx1080_premium_preview") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-scene-recovery stage for topic '${topicId}'`);

  if (!fileHasContent(getTopicPaths(topicId).bricktoonRecoveryPlanPath)) {
    runBricktoonReliabilityStage(topicId, runtimeProfile);
  }

  const scriptArgs = ["--workspace", workspaceDir, "--runtime-profile", runtimeProfile];
  if (bucket) {
    scriptArgs.push("--bucket", bucket);
  }
  if (sceneIds.length > 0) {
    scriptArgs.push("--scene-ids", sceneIds.join(","));
  }
  runNodeScript("scripts/run_bricktoon_scene_recovery.js", scriptArgs);

  writeLog(`Completed bricktoon-scene-recovery stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonSceneReviewStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-scene-review stage for topic '${topicId}'`);

  if (!fileHasContent(getTopicPaths(topicId).hybridPromotionGatePath)) {
    runHybridPromotionGateStage(topicId, "gtx1080_premium_preview");
  }
  if (!fileHasContent(getTopicPaths(topicId).bricktoonBenchmarkReliabilityReportPath)) {
    runBenchmarkSceneProofStage(topicId, "gtx1080_benchmark_scene_proof");
  }
  runNodeScript("scripts/build_bricktoon_scene_review.js", ["--workspace", workspaceDir]);

  writeLog(`Completed bricktoon-scene-review stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBenchmarkSceneProofStage(topicId, runtimeProfile = "gtx1080_benchmark_scene_proof") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting benchmark-scene-proof stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);

  if (!fileHasContent(getTopicPaths(topicId).visualPreviewPath)) {
    runVisualPreviewStage(topicId);
  }
  if (!isShotCompositingReady(topicId)) {
    runShotCompositingStage(topicId);
  }
  if (!isBricktoonClipsReady(topicId)) {
    runSceneAssemblyStage(topicId);
  }
  if (!isRenderContractReady(topicId)) {
    runRenderContractStage(topicId, "draft", "development");
  }
  if (!fileHasContent(getTopicPaths(topicId).hybridPromotionGatePath)) {
    runHybridPromotionGateStage(topicId, "gtx1080_premium_preview");
  }

  runNodeAgent("render_plan_agent.js", ["--topic", topicId, "--workspace", workspaceDir, "--profile", "draft"]);
  runRenderContractStage(topicId, "draft", "development");
  runNodeScript("scripts/build_benchmark_scene_proof.js", ["--workspace", workspaceDir]);
  runNodeScript("scripts/build_bricktoon_reliability_report.js", [
    "--workspace",
    workspaceDir,
    "--runtime-profile",
    runtimeProfile,
    "--scope",
    "benchmark_selected"
  ]);

  const reliabilityReport = readJson(getTopicPaths(topicId).bricktoonBenchmarkReliabilityReportPath, {});
  const reliabilityDecision = reliabilityReport.gate?.decision || null;
  if (!["ready_for_overnight_finish", "ready_for_final_export"].includes(reliabilityDecision)) {
    throw new Error(`Benchmark scene proof blocked by reliability gate. Review ${getTopicPaths(topicId).bricktoonBenchmarkReliabilityReportMdPath}`);
  }

  runNodeAgent("render_agent.js", [
    "--topic",
    topicId,
    "--workspace",
    workspaceDir,
    "--profile",
    "draft",
    "--manifest",
    getTopicPaths(topicId).benchmarkSceneManifestPath,
    "--output",
    getTopicPaths(topicId).benchmarkSceneProofPath
  ]);

  writeLog(`Completed benchmark-scene-proof stage for topic '${topicId}' with runtime profile '${runtimeProfile}'`);
  return workspaceDir;
}

function runVisualPreviewStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting visual-preview stage for topic '${topicId}'`);

  if (!isAssetGenerationReady(topicId)) {
    runAssetGenerationStage(topicId);
  }
  runNodeScript("scripts/generate_visual_preview.js", ["--workspace", workspaceDir]);

  writeLog(`Completed visual-preview stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonPreviewStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-preview stage for topic '${topicId}'`);

  runReferenceSyncStage(topicId);
  runBricktoonCharactersStage(topicId);
  runAssetGenerationStage(topicId);
  runVisualPreviewStage(topicId);

  writeLog(`Completed bricktoon-preview stage for topic '${topicId}'`);
  return workspaceDir;
}

function runBricktoonFinishStage(topicId, profile = "draft", runtimeProfile = null) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-finish stage for topic '${topicId}' with profile '${profile}'${runtimeProfile ? ` and runtime profile '${runtimeProfile}'` : ""}`);

  if (!isAssetGenerationReady(topicId)) {
    runAssetGenerationStage(topicId);
  }
  if (!fileHasContent(getTopicPaths(topicId).visualPreviewPath)) {
    runVisualPreviewStage(topicId);
  }
  runLayerExtractionStage(topicId);
  runCharacterRiggingStage(topicId);
  runAiVideoMotionPassesStage(topicId);
  runShotCompositingStage(topicId);
  runSceneAssemblyStage(topicId);
  runRenderContractStage(topicId, profile, profile === "draft" ? "development" : "production");
  runBricktoonReliabilityStage(topicId, runtimeProfile);

  const reliabilityReport = readJson(getTopicPaths(topicId).bricktoonReliabilityReportPath, {});
  const reliabilityDecision = reliabilityReport.gate?.decision || null;
  const hardGate = profile !== "draft" || Boolean(runtimeProfile);
  if (hardGate && !["ready_for_overnight_finish", "ready_for_final_export"].includes(reliabilityDecision)) {
    throw new Error(`Bricktoon finish blocked by reliability gate. Review ${getTopicPaths(topicId).bricktoonReliabilityReportMdPath}`);
  }
  runRenderStage(topicId, profile);
  runRenderOutputProofStage(topicId, runtimeProfile, profile);
  runBricktoonReliabilityStage(topicId, runtimeProfile);

  const renderOutputProofPath = profile === "draft"
    ? getTopicPaths(topicId).bricktoonRenderOutputProofPath
    : getTopicPaths(topicId).bricktoonFinalRenderOutputProofPath;
  const renderOutputProofMdPath = profile === "draft"
    ? getTopicPaths(topicId).bricktoonRenderOutputProofMdPath
    : getTopicPaths(topicId).bricktoonFinalRenderOutputProofMdPath;
  const renderOutputProof = readJson(renderOutputProofPath, {});
  if (hardGate && renderOutputProof.gate?.decision !== "approved") {
    throw new Error(`Bricktoon finish failed render output proof. Review ${renderOutputProofMdPath}`);
  }

  writeLog(`Completed bricktoon-finish stage for topic '${topicId}' with profile '${profile}'${runtimeProfile ? ` and runtime profile '${runtimeProfile}'` : ""}`);
  return workspaceDir;
}

function runBricktoonAutoStage(topicId, profile = "draft", runtimeProfile = null) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-auto stage for topic '${topicId}' with profile '${profile}'${runtimeProfile ? ` and runtime profile '${runtimeProfile}'` : ""}`);

  runBricktoonPreviewStage(topicId);
  runHybridPromotionGateStage(topicId, runtimeProfile || "gtx1080_premium_preview");
  runBricktoonReliabilityStage(topicId, runtimeProfile);

  writeLog(`Completed bricktoon-auto stage for topic '${topicId}' with profile '${profile}'${runtimeProfile ? ` and runtime profile '${runtimeProfile}'` : ""}`);
  return workspaceDir;
}

function runBricktoonOvernightStage(topicId, runtimeProfile = "gtx1080_overnight_finish_draft", resume = false) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon-overnight stage for topic '${topicId}' with runtime profile '${runtimeProfile}'${resume ? " (resume)" : ""}`);

  const args = ["--topic", topicId, "--workspace", workspaceDir, "--runtime-profile", runtimeProfile];
  if (resume) {
    args.push("--resume");
  }
  runNodeAgent("bricktoon_overnight_agent.js", args);

  writeLog(`Completed bricktoon-overnight stage for topic '${topicId}' with runtime profile '${runtimeProfile}'${resume ? " (resume)" : ""}`);
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

function runRenderContractStage(topicId, profile = "draft", mode = "development") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting render-contract stage for topic '${topicId}' with profile '${profile}'`);

  runNodeScript("scripts/compile_render_contract.js", [
    "--workspace",
    workspaceDir,
    "--profile",
    profile,
    "--mode",
    mode
  ]);

  writeLog(`Completed render-contract stage for topic '${topicId}' with profile '${profile}'`);
  return workspaceDir;
}

function runBricktoonAuditStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting bricktoon audit stage for topic '${topicId}'`);

  runNodeScript("scripts/audit_bricktoon_implementation.js", ["--workspace", workspaceDir]);

  writeLog(`Completed bricktoon audit stage for topic '${topicId}'`);
  return workspaceDir;
}

function runRenderStage(topicId, profile = "draft") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting render stage for topic '${topicId}' with profile '${profile}'`);

  if (!isAnimationReady(topicId)) {
    runAnimationStage(topicId);
  }
  if (!isBricktoonShotsReady(topicId)) {
    runBricktoonShotsStage(topicId);
  }
  if (!isBricktoonClipsReady(topicId)) {
    runBricktoonClipsStage(topicId);
  }
  runNodeAgent("render_plan_agent.js", ["--topic", topicId, "--workspace", workspaceDir, "--profile", profile]);
  runRenderContractStage(topicId, profile, profile === "draft" ? "development" : "production");
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
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage visual-character-bible");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage script");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage scene-cards");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage voice");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage assets");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage reference-sync");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage scene-beats");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage shot-planner");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage visual-production-router");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage shot-art-direction");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage composition-guides");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage asset-generation");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage hybrid-still-benchmark");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage hybrid-animation-contract");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage hybrid-performance-proof --selection-mode topic_wide");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage hybrid-editorial-proof");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage hybrid-promotion-gate --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage hybrid-production-readiness --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage professional-export-lock --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage professional-toolchain-map --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage professional-hero-scene --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage professional-reintegration --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage professional-semi-automation --toolchain-profile adobe_character_animator_after_effects --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage asset-consistency-validation");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage layer-extraction");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage character-rigging");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-characters");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-scenes");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-manifest");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-shots");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage ai-video-motion-passes");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage shot-compositing");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage scene-assembly");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-scene-review");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-recovery-plan --runtime-profile gtx1080_premium_preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage benchmark-scene-proof --runtime-profile gtx1080_benchmark_scene_proof");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage visual-preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-preview");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-finish --profile draft");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-auto --profile draft");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-overnight --runtime-profile gtx1080_overnight_finish_draft");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-clips");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage animation");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage render-contract --profile draft");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage render --profile draft");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage bricktoon-audit");
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

    if (args.overnight && !args.stage && !args.topic) {
      runOvernightMode(false);
      console.log("Overnight mode completed.");
      return;
    }

    if (args.resume && !args.stage && !args.topic) {
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

      if (!["format", "research", "angle", "cast", "visual-character-bible", "script", "scene-cards", "voice", "assets", "reference-sync", "scene-beats", "shot-planner", "visual-production-router", "shot-art-direction", "composition-guides", "asset-generation", "hybrid-still-benchmark", "hybrid-animation-contract", "hybrid-performance-proof", "hybrid-editorial-proof", "hybrid-promotion-gate", "hybrid-production-readiness", "professional-export-lock", "professional-toolchain-map", "professional-hero-scene", "professional-reintegration", "professional-semi-automation", "asset-consistency-validation", "layer-extraction", "character-rigging", "bricktoon-characters", "bricktoon-scenes", "bricktoon-manifest", "bricktoon-shots", "ai-video-motion-passes", "shot-compositing", "scene-assembly", "bricktoon-reliability", "bricktoon-scene-review", "bricktoon-recovery-plan", "bricktoon-scene-recovery", "benchmark-scene-proof", "visual-preview", "bricktoon-preview", "bricktoon-finish", "bricktoon-auto", "bricktoon-overnight", "bricktoon-clips", "animation", "render-contract", "render", "bricktoon-audit", "shorts", "qc"].includes(args.stage)) {
        throw new Error(`Unsupported stage for current build: ${args.stage}`);
      }

      const sceneIds = parseSceneIdsArg(args["scene-ids"]);
      let workspaceDir;
      if (args.stage === "format") {
        workspaceDir = runFormatStage(args.topic);
      } else if (args.stage === "research") {
        workspaceDir = runResearchStage(args.topic);
      } else if (args.stage === "angle") {
        workspaceDir = runAngleStage(args.topic);
      } else if (args.stage === "cast") {
        workspaceDir = runCastStage(args.topic);
      } else if (args.stage === "visual-character-bible") {
        workspaceDir = runVisualCharacterBibleStage(args.topic);
      } else if (args.stage === "script") {
        workspaceDir = runScriptStage(args.topic);
      } else if (args.stage === "scene-cards") {
        workspaceDir = runSceneCardStage(args.topic);
      } else if (args.stage === "voice") {
        workspaceDir = runVoiceStage(args.topic);
      } else if (args.stage === "assets") {
        workspaceDir = runAssetsStage(args.topic);
      } else if (args.stage === "reference-sync") {
        workspaceDir = runReferenceSyncStage(args.topic);
      } else if (args.stage === "scene-beats") {
        workspaceDir = runSceneBeatsStage(args.topic);
      } else if (args.stage === "shot-planner") {
        workspaceDir = runShotPlannerStage(args.topic);
      } else if (args.stage === "visual-production-router") {
        workspaceDir = runVisualProductionRouterStage(args.topic);
      } else if (args.stage === "shot-art-direction") {
        workspaceDir = runShotArtDirectionStage(args.topic);
      } else if (args.stage === "composition-guides") {
        workspaceDir = runCompositionGuidesStage(args.topic);
      } else if (args.stage === "asset-generation") {
        workspaceDir = runAssetGenerationStage(args.topic, sceneIds);
      } else if (args.stage === "hybrid-still-benchmark") {
        workspaceDir = runHybridStillBenchmarkStage(args.topic);
      } else if (args.stage === "hybrid-animation-contract") {
        workspaceDir = runHybridAnimationContractStage(args.topic);
      } else if (args.stage === "hybrid-performance-proof") {
        workspaceDir = runHybridPerformanceProofStage(args.topic, args["selection-mode"] || args.mode || "topic_wide");
      } else if (args.stage === "hybrid-editorial-proof") {
        workspaceDir = runHybridEditorialProofStage(args.topic);
      } else if (args.stage === "hybrid-promotion-gate") {
        workspaceDir = runHybridPromotionGateStage(args.topic, args["runtime-profile"] || "gtx1080_premium_preview");
      } else if (args.stage === "hybrid-production-readiness") {
        workspaceDir = runHybridProductionReadinessStage(args.topic, args["runtime-profile"] || "gtx1080_premium_preview");
      } else if (args.stage === "professional-export-lock") {
        workspaceDir = runProfessionalExportLockStage(args.topic, args["runtime-profile"] || "gtx1080_premium_preview");
      } else if (args.stage === "professional-toolchain-map") {
        workspaceDir = runProfessionalToolchainMapStage(
          args.topic,
          args["toolchain-profile"] || "adobe_character_animator_after_effects",
          args["runtime-profile"] || "gtx1080_premium_preview"
        );
      } else if (args.stage === "professional-hero-scene") {
        workspaceDir = runProfessionalHeroSceneStage(
          args.topic,
          args["toolchain-profile"] || "adobe_character_animator_after_effects",
          args["runtime-profile"] || "gtx1080_premium_preview"
        );
      } else if (args.stage === "professional-reintegration") {
        workspaceDir = runProfessionalReintegrationStage(
          args.topic,
          args["toolchain-profile"] || "adobe_character_animator_after_effects",
          args["runtime-profile"] || "gtx1080_premium_preview"
        );
      } else if (args.stage === "professional-semi-automation") {
        workspaceDir = runProfessionalSemiAutomationStage(
          args.topic,
          args["toolchain-profile"] || "adobe_character_animator_after_effects",
          args["runtime-profile"] || "gtx1080_premium_preview"
        );
      } else if (args.stage === "asset-consistency-validation") {
        workspaceDir = runAssetConsistencyValidationStage(args.topic, sceneIds);
      } else if (args.stage === "layer-extraction") {
        workspaceDir = runLayerExtractionStage(args.topic);
      } else if (args.stage === "character-rigging") {
        workspaceDir = runCharacterRiggingStage(args.topic);
      } else if (args.stage === "bricktoon-characters") {
        workspaceDir = runBricktoonCharactersStage(args.topic);
      } else if (args.stage === "bricktoon-scenes") {
        workspaceDir = runBricktoonScenesStage(args.topic);
      } else if (args.stage === "bricktoon-manifest") {
        workspaceDir = runBricktoonManifestStage(args.topic);
      } else if (args.stage === "bricktoon-shots") {
        workspaceDir = runBricktoonShotsStage(args.topic);
      } else if (args.stage === "ai-video-motion-passes") {
        workspaceDir = runAiVideoMotionPassesStage(args.topic, sceneIds);
      } else if (args.stage === "shot-compositing") {
        workspaceDir = runShotCompositingStage(args.topic, sceneIds);
      } else if (args.stage === "scene-assembly") {
        workspaceDir = runSceneAssemblyStage(args.topic, sceneIds);
      } else if (args.stage === "bricktoon-reliability") {
        workspaceDir = runBricktoonReliabilityStage(args.topic, args["runtime-profile"] || null);
      } else if (args.stage === "bricktoon-scene-review") {
        workspaceDir = runBricktoonSceneReviewStage(args.topic);
      } else if (args.stage === "bricktoon-recovery-plan") {
        workspaceDir = runBricktoonRecoveryPlanStage(args.topic, args["runtime-profile"] || null);
      } else if (args.stage === "bricktoon-scene-recovery") {
        workspaceDir = runBricktoonSceneRecoveryStage(args.topic, sceneIds, args.bucket || null, args["runtime-profile"] || "gtx1080_premium_preview");
      } else if (args.stage === "benchmark-scene-proof") {
        workspaceDir = runBenchmarkSceneProofStage(args.topic, args["runtime-profile"] || "gtx1080_benchmark_scene_proof");
      } else if (args.stage === "visual-preview") {
        workspaceDir = runVisualPreviewStage(args.topic);
      } else if (args.stage === "bricktoon-preview") {
        workspaceDir = runBricktoonPreviewStage(args.topic);
      } else if (args.stage === "bricktoon-finish") {
        workspaceDir = runBricktoonFinishStage(args.topic, args.profile || "draft", args["runtime-profile"] || null);
      } else if (args.stage === "bricktoon-auto") {
        workspaceDir = runBricktoonAutoStage(args.topic, args.profile || "draft", args["runtime-profile"] || null);
      } else if (args.stage === "bricktoon-overnight") {
        workspaceDir = runBricktoonOvernightStage(args.topic, args["runtime-profile"] || "gtx1080_overnight_finish_draft", Boolean(args.resume));
      } else if (args.stage === "bricktoon-clips") {
        workspaceDir = runBricktoonClipsStage(args.topic);
      } else if (args.stage === "animation") {
        workspaceDir = runAnimationStage(args.topic);
      } else if (args.stage === "render-contract") {
        workspaceDir = runRenderContractStage(
          args.topic,
          args.profile || "draft",
          args.mode || ((args.profile || "draft") === "draft" ? "development" : "production")
        );
      } else if (args.stage === "render") {
        workspaceDir = runRenderStage(args.topic, args.profile || "draft");
      } else if (args.stage === "bricktoon-audit") {
        workspaceDir = runBricktoonAuditStage(args.topic);
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
