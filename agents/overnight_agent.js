#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  parseCsv,
  toCsv,
  writeText
} = require("./common");

const ROOT = path.resolve(__dirname, "..");
const QUEUE_PATH = path.join(ROOT, "topics", "queue.csv");
const OUTPUT_LOGS_DIR = path.join(ROOT, "output", "logs");
const STATE_PATH = path.join(OUTPUT_LOGS_DIR, "overnight_state.json");
const LOCK_PATH = path.join(OUTPUT_LOGS_DIR, "overnight.lock");

const STAGE_FLOW = ["research", "script", "voice", "assets", "render", "shorts", "qc"];
const STATUS_BY_STAGE = {
  research: "research_done",
  script: "script_done",
  voice: "voice_done",
  assets: "assets_done",
  render: "render_done",
  shorts: "shorts_done",
  qc: "qc_passed"
};

const NEXT_STAGE_BY_STAGE = {
  research: "script",
  script: "voice",
  voice: "assets",
  assets: "render",
  render: "shorts",
  shorts: "qc",
  qc: ""
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readQueue() {
  const parsed = parseCsv(fs.readFileSync(QUEUE_PATH, "utf8"));
  const rows = parsed.rows.map((row) => normalizeQueueRow(row));
  return { headers: parsed.headers, rows };
}

function normalizeQueueRow(row) {
  return {
    id: row.id || "",
    title: row.title || row.id || "",
    video_type: row.video_type || "",
    status: row.status || "planned",
    priority: row.priority || "medium",
    next_stage: row.next_stage || inferNextStageFromStatus(row.status || "planned"),
    allow_overnight: row.allow_overnight || "no",
    last_run_at: row.last_run_at || "",
    last_result: row.last_result || ""
  };
}

function inferNextStageFromStatus(status) {
  const map = {
    planned: "research",
    initialized: "research",
    research_done: "script",
    script_done: "voice",
    voice_done: "assets",
    assets_done: "render",
    render_done: "shorts",
    shorts_done: "qc",
    qc_passed: "",
    needs_human_review: ""
  };
  return map[status] ?? "research";
}

function writeQueue(rows) {
  writeText(QUEUE_PATH, toCsv(rows, [
    "id",
    "title",
    "video_type",
    "status",
    "priority",
    "next_stage",
    "allow_overnight",
    "last_run_at",
    "last_result"
  ]));
}

function acquireLock(resume) {
  ensureDir(OUTPUT_LOGS_DIR);
  if (fs.existsSync(LOCK_PATH) && !resume) {
    throw new Error("Overnight lock already exists. Use --resume if you intend to continue the prior run.");
  }

  const payload = {
    pid: process.pid,
    started_at: nowIso()
  };
  writeText(LOCK_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function releaseLock() {
  if (fs.existsSync(LOCK_PATH)) {
    fs.unlinkSync(LOCK_PATH);
  }
}

function loadState(resume) {
  if (!resume || !fs.existsSync(STATE_PATH)) {
    return {
      started_at: nowIso(),
      completed: [],
      needs_review: [],
      errors: [],
      last_topic: "",
      active: true
    };
  }

  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  if (state.active === false) {
    return {
      started_at: nowIso(),
      completed: [],
      needs_review: [],
      errors: [],
      last_topic: "",
      active: true
    };
  }

  return state;
}

function saveState(state) {
  writeText(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function runStage(topicId, stage) {
  const orchestratorPath = path.join(__dirname, "orchestrator.js");
  const args = [orchestratorPath, "--topic", topicId];
  if (stage === "render") {
    args.push("--stage", "render", "--profile", "draft");
  } else {
    args.push("--stage", stage);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8"
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function eligibleRows(rows) {
  return rows.filter((row) => {
    const allow = String(row.allow_overnight).toLowerCase();
    return allow === "yes" && row.status !== "needs_human_review" && row.next_stage;
  });
}

function sortRows(rows) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...rows].sort((a, b) => {
    const priorityDelta = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return a.id.localeCompare(b.id);
  });
}

function updateRowAfterStage(row, stage, success) {
  row.last_run_at = nowIso();
  if (success) {
    row.status = STATUS_BY_STAGE[stage] || row.status;
    row.next_stage = NEXT_STAGE_BY_STAGE[stage] || "";
    row.last_result = "success";
  } else {
    row.last_result = "error";
  }
}

function stageRequiresReview(stage, row) {
  return stage === "research" && row.video_type === "business_crime_story";
}

function summarizeStdout(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join("; ");
}

function writeMorningReport(state) {
  const reportPath = path.join(OUTPUT_LOGS_DIR, `overnight_report_${todayStamp()}.md`);
  const lines = [
    "# Overnight Report",
    "",
    "Completed:",
    ...(
      state.completed.length > 0
        ? state.completed.map((item) => `- ${item}`)
        : ["- None"]
    ),
    "",
    "Needs review:",
    ...(
      state.needs_review.length > 0
        ? state.needs_review.map((item) => `- ${item}`)
        : ["- None"]
    ),
    "",
    "Errors:",
    ...(
      state.errors.length > 0
        ? state.errors.map((item) => `- ${item}`)
        : ["- None"]
    ),
    ""
  ];

  writeText(reportPath, `${lines.join("\n")}\n`);
  return reportPath;
}

function main() {
  let lockHeld = false;
  try {
    const args = parseArgs(process.argv.slice(2));
    const resume = Boolean(args.resume);

    acquireLock(resume);
    lockHeld = true;

    const state = loadState(resume);
    const queue = readQueue();
    const rows = sortRows(eligibleRows(queue.rows));

    for (const row of rows) {
      if (resume && state.last_topic && row.id < state.last_topic) {
        continue;
      }

      const stage = row.next_stage || inferNextStageFromStatus(row.status);
      if (!stage || !STAGE_FLOW.includes(stage)) {
        continue;
      }

      state.last_topic = row.id;
      saveState(state);

      const result = runStage(row.id, stage);
      if (result.status === 0) {
        updateRowAfterStage(row, stage, true);
        const summary = summarizeStdout(result.stdout) || `${stage} completed`;
        state.completed.push(`${row.id}: ${summary}`);

        if (stageRequiresReview(stage, row)) {
          row.status = "needs_human_review";
          row.next_stage = "script";
          state.needs_review.push(`${row.id}: research complete, verify legal and sourcing claims before script.`);
        } else if (stage === "render") {
          state.needs_review.push(`${row.id}: draft render complete, watch full draft before continuing.`);
        }
      } else {
        updateRowAfterStage(row, stage, false);
        row.status = "needs_human_review";
        row.next_stage = stage;
        const errorSummary = summarizeStdout(result.stderr || result.stdout) || `${stage} failed`;
        state.errors.push(`${row.id}: ${errorSummary}`);
      }

      writeQueue(queue.rows);
      saveState(state);
    }

    state.active = false;
    saveState(state);
    const reportPath = writeMorningReport(state);
    console.log(`Overnight run complete. Report written to ${reportPath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (lockHeld) {
      releaseLock();
    }
  }
}

main();
