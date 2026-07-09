#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TOPICS_DIR = path.join(ROOT, "topics");
const WORKSPACES_DIR = path.join(ROOT, "workspaces");
const OUTPUT_LOGS_DIR = path.join(ROOT, "output", "logs");
const AGENTS_DIR = __dirname;

const WORKSPACE_LAYOUT = [
  {
    dir: "00_config",
    files: {
      "topic.json": null
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
      "pinned_comment.txt": ""
    }
  },
  {
    dir: "10_qc",
    files: {
      "quality_report.md": "# Quality Report\n\n",
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

function initTopicWorkspace(topicId) {
  const { topic, topicPath } = loadTopic(topicId);
  const workspaceDir = path.join(WORKSPACES_DIR, topic.id);

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
      if (fileName === "topic.json") {
        fs.copyFileSync(topicPath, filePath);
        continue;
      }

      ensureFile(filePath, defaultContents);
    }
  }

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

  return workspaceDir;
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

function runScriptStage(topicId) {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting script stage for topic '${topicId}'`);

  runNodeAgent("outline_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("script_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);
  runNodeAgent("joke_agent.js", ["--topic", topicId, "--workspace", workspaceDir]);

  writeLog(`Completed script stage for topic '${topicId}'`);
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

function runRenderStage(topicId, profile = "draft") {
  const workspaceDir = ensureWorkspace(topicId);
  writeLog(`Starting render stage for topic '${topicId}' with profile '${profile}'`);

  runNodeAgent("render_plan_agent.js", ["--topic", topicId, "--workspace", workspaceDir, "--profile", profile]);
  runNodeAgent("render_agent.js", ["--topic", topicId, "--workspace", workspaceDir, "--profile", profile]);

  writeLog(`Completed render stage for topic '${topicId}' with profile '${profile}'`);
  return workspaceDir;
}

function printUsage() {
  console.log("Usage:");
  console.log("  node agents/orchestrator.js --init-project");
  console.log("  node agents/orchestrator.js --topic <topic_id> --init");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage research");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage script");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage voice");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage assets");
  console.log("  node agents/orchestrator.js --topic <topic_id> --stage render --profile draft");
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic && args._.length > 0) {
      args.topic = args._[0];
    }

    if (args["init-project"]) {
      initProject();
      console.log("Project directories verified.");
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

      if (!["research", "script", "voice", "assets", "render"].includes(args.stage)) {
        throw new Error(`Unsupported stage for current build: ${args.stage}`);
      }

      let workspaceDir;
      if (args.stage === "research") {
        workspaceDir = runResearchStage(args.topic);
      } else if (args.stage === "script") {
        workspaceDir = runScriptStage(args.topic);
      } else if (args.stage === "voice") {
        workspaceDir = runVoiceStage(args.topic);
      } else if (args.stage === "assets") {
        workspaceDir = runAssetsStage(args.topic);
      } else {
        workspaceDir = runRenderStage(args.topic, args.profile || "draft");
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
