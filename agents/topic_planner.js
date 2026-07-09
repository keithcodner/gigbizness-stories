#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  ROOT,
  parseArgs,
  parseCsv,
  readJson,
  toCsv,
  writeText
} = require("./common");

const QUEUE_PATH = path.join(ROOT, "topics", "queue.csv");
const PUBLISHED_DIR = path.join(ROOT, "output", "published");
const ANALYTICS_TRACKER_PATH = path.join(PUBLISHED_DIR, "analytics_tracker.csv");
const PUBLISHED_VIDEOS_PATH = path.join(PUBLISHED_DIR, "published_videos.csv");
const TOPIC_SCORES_PATH = path.join(ROOT, "topics", "topic_scores.csv");
const PERFORMANCE_REPORT_PATH = path.join(PUBLISHED_DIR, "performance_report.md");
const TEMPLATE_IMPROVEMENTS_PATH = path.join(PUBLISHED_DIR, "template_improvements.md");
const NEXT_WEEK_PLAN_PATH = path.join(PUBLISHED_DIR, "next_week_plan.md");
const TEMPLATE_FEEDBACK_PATH = path.join(ROOT, "config", "template_feedback.json");
const SCHEDULE_PATH = path.join(ROOT, "config", "schedule.json");

const QUEUE_HEADERS = [
  "id",
  "title",
  "video_type",
  "status",
  "priority",
  "next_stage",
  "allow_overnight",
  "last_run_at",
  "last_result"
];

const ANALYTICS_HEADERS = [
  "topic_id",
  "published_at",
  "video_type",
  "title_used",
  "ctr",
  "average_view_duration_seconds",
  "first_30_second_retention",
  "comments_value_mentions",
  "subscriber_conversion_percent",
  "shorts_to_long_conversion_percent",
  "production_hours",
  "notes"
];

const PUBLISHED_HEADERS = [
  "topic_id",
  "published_at",
  "video_type",
  "title_used",
  "final_render",
  "thumbnail_file",
  "qc_status"
];

const SCORE_HEADERS = [
  "topic_id",
  "video_type",
  "topic_score",
  "recommended_priority",
  "reason"
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureCsv(filePath, headers) {
  if (!fs.existsSync(filePath)) {
    writeText(filePath, `${headers.join(",")}\n`);
  }
}

function readQueue() {
  const parsed = parseCsv(fs.readFileSync(QUEUE_PATH, "utf8"));
  return parsed.rows.map((row) => ({
    id: row.id || "",
    title: row.title || row.id || "",
    video_type: row.video_type || "",
    status: row.status || "planned",
    priority: row.priority || "medium",
    next_stage: row.next_stage || "",
    allow_overnight: row.allow_overnight || "no",
    last_run_at: row.last_run_at || "",
    last_result: row.last_result || ""
  }));
}

function writeQueue(rows) {
  writeText(QUEUE_PATH, toCsv(rows, QUEUE_HEADERS));
}

function getWorkspacePaths(workspaceDir) {
  const publishDir = path.join(workspaceDir, "09_publish");
  const renderDir = path.join(workspaceDir, "06_renders");
  const thumbnailDir = path.join(workspaceDir, "08_thumbnail");
  const qcDir = path.join(workspaceDir, "10_qc");
  const configDir = path.join(workspaceDir, "00_config");

  return {
    topicPath: path.join(configDir, "topic.json"),
    titleOptionsPath: path.join(publishDir, "title_options.txt"),
    descriptionPath: path.join(publishDir, "description.txt"),
    analyticsInputPath: path.join(publishDir, "performance_input.json"),
    publishRecordPath: path.join(publishDir, "publish_record.json"),
    finalRenderPath: path.join(renderDir, "final_1080p.mp4"),
    finalThumbnailPath: path.join(thumbnailDir, "final_thumbnail.jpg"),
    finalApprovalPath: path.join(qcDir, "final_approval.md")
  };
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ensureAnalyticsInputTemplate(filePath) {
  if (fs.existsSync(filePath)) {
    return;
  }

  const template = {
    ctr: null,
    average_view_duration_seconds: null,
    first_30_second_retention: null,
    comments_value_mentions: null,
    subscriber_conversion_percent: null,
    shorts_to_long_conversion_percent: null,
    production_hours: null,
    notes: "Fill this in manually after the video has enough performance data."
  };
  writeText(filePath, `${JSON.stringify(template, null, 2)}\n`);
}

function upsertRow(rows, matchKey, matchValue, nextRow) {
  const index = rows.findIndex((row) => row[matchKey] === matchValue);
  if (index >= 0) {
    rows[index] = nextRow;
  } else {
    rows.push(nextRow);
  }
}

function readOptionalJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return readJson(filePath);
}

function validatePublishable(paths) {
  if (!fs.existsSync(paths.finalApprovalPath)) {
    throw new Error("Cannot record publish before QC generates final approval.");
  }

  const qcText = fs.readFileSync(paths.finalApprovalPath, "utf8");
  if (!qcText.startsWith("APPROVED")) {
    throw new Error("Cannot record publish until QC status is APPROVED.");
  }

  if (!fs.existsSync(paths.finalRenderPath) || fs.statSync(paths.finalRenderPath).size === 0) {
    throw new Error("Cannot record publish without a final 1080p render.");
  }

  if (!fs.existsSync(paths.finalThumbnailPath) || fs.statSync(paths.finalThumbnailPath).size === 0) {
    throw new Error("Cannot record publish without a final thumbnail.");
  }
}

function recordPublish(topicId, workspaceDir, publishDate) {
  ensureDir(PUBLISHED_DIR);
  ensureCsv(ANALYTICS_TRACKER_PATH, ANALYTICS_HEADERS);
  ensureCsv(PUBLISHED_VIDEOS_PATH, PUBLISHED_HEADERS);

  const paths = getWorkspacePaths(workspaceDir);
  validatePublishable(paths);
  ensureAnalyticsInputTemplate(paths.analyticsInputPath);

  const topic = readJson(paths.topicPath);
  const titleOptions = readLines(paths.titleOptionsPath);
  const titleUsed = titleOptions[0] || topic.working_title;
  const analyticsInput = readOptionalJson(paths.analyticsInputPath, {});

  const publishedRows = parseCsv(fs.readFileSync(PUBLISHED_VIDEOS_PATH, "utf8")).rows;
  const analyticsRows = parseCsv(fs.readFileSync(ANALYTICS_TRACKER_PATH, "utf8")).rows;

  const publishedRow = {
    topic_id: topic.id,
    published_at: publishDate,
    video_type: topic.video_type,
    title_used: titleUsed,
    final_render: path.relative(ROOT, paths.finalRenderPath).replaceAll("\\", "/"),
    thumbnail_file: path.relative(ROOT, paths.finalThumbnailPath).replaceAll("\\", "/"),
    qc_status: "APPROVED"
  };

  const analyticsRow = {
    topic_id: topic.id,
    published_at: publishDate,
    video_type: topic.video_type,
    title_used: titleUsed,
    ctr: analyticsInput.ctr ?? "",
    average_view_duration_seconds: analyticsInput.average_view_duration_seconds ?? "",
    first_30_second_retention: analyticsInput.first_30_second_retention ?? "",
    comments_value_mentions: analyticsInput.comments_value_mentions ?? "",
    subscriber_conversion_percent: analyticsInput.subscriber_conversion_percent ?? "",
    shorts_to_long_conversion_percent: analyticsInput.shorts_to_long_conversion_percent ?? "",
    production_hours: analyticsInput.production_hours ?? "",
    notes: analyticsInput.notes ?? ""
  };

  upsertRow(publishedRows, "topic_id", topic.id, publishedRow);
  upsertRow(analyticsRows, "topic_id", topic.id, analyticsRow);

  writeText(PUBLISHED_VIDEOS_PATH, toCsv(publishedRows, PUBLISHED_HEADERS));
  writeText(ANALYTICS_TRACKER_PATH, toCsv(analyticsRows, ANALYTICS_HEADERS));

  const publishRecord = {
    topic_id: topic.id,
    published_at: publishDate,
    title_used: titleUsed,
    video_type: topic.video_type,
    final_render: publishedRow.final_render,
    thumbnail_file: publishedRow.thumbnail_file,
    analytics_tracker: path.relative(ROOT, ANALYTICS_TRACKER_PATH).replaceAll("\\", "/")
  };
  writeText(paths.publishRecordPath, `${JSON.stringify(publishRecord, null, 2)}\n`);

  const queueRows = readQueue();
  const queueRow = queueRows.find((row) => row.id === topicId);
  if (queueRow) {
    queueRow.status = "published";
    queueRow.next_stage = "";
    queueRow.last_run_at = new Date().toISOString();
    queueRow.last_result = "published";
    writeQueue(queueRows);
  }

  console.log(`Publish record saved for topic '${topic.id}'.`);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function average(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMetric(value, target, maxPoints) {
  if (value === null) {
    return 0;
  }
  return clamp((value / target) * maxPoints, 0, maxPoints);
}

function scoreAnalyticsRow(row) {
  const ctr = toNumber(row.ctr);
  const retention = toNumber(row.first_30_second_retention);
  const avd = toNumber(row.average_view_duration_seconds);
  const comments = toNumber(row.comments_value_mentions);
  const subscriber = toNumber(row.subscriber_conversion_percent);
  const shorts = toNumber(row.shorts_to_long_conversion_percent);
  const productionHours = toNumber(row.production_hours);

  let score = 0;
  score += normalizeMetric(ctr, 6, 22);
  score += normalizeMetric(retention, 70, 24);
  score += normalizeMetric(avd, 240, 18);
  score += normalizeMetric(comments, 15, 10);
  score += normalizeMetric(subscriber, 2.5, 10);
  score += normalizeMetric(shorts, 8, 10);
  if (productionHours !== null) {
    score += clamp(((20 - productionHours) / 20) * 6, 0, 6);
  }

  return Math.round(score);
}

function priorityFromScore(score) {
  if (score >= 70) {
    return "high";
  }
  if (score >= 45) {
    return "medium";
  }
  return "low";
}

function deriveTemplateActions(analyticsRows) {
  const actions = [];
  const lowCtrRows = analyticsRows.filter((row) => {
    const ctr = toNumber(row.ctr);
    return ctr !== null && ctr < 4;
  });
  const lowRetentionRows = analyticsRows.filter((row) => {
    const retention = toNumber(row.first_30_second_retention);
    return retention !== null && retention < 55;
  });
  const lowShortsRows = analyticsRows.filter((row) => {
    const value = toNumber(row.shorts_to_long_conversion_percent);
    return value !== null && value < 3;
  });

  if (lowCtrRows.length > 0) {
    actions.push("CTR is weak on some published videos. Tighten title and thumbnail around one specific tension instead of a broad business theme.");
  }
  if (lowRetentionRows.length > 0) {
    actions.push("First-30-second retention is slipping. Open faster with the stakes, the contradiction, or the surprising fee/incentive before setup.");
  }
  if (lowShortsRows.length > 0) {
    actions.push("Shorts are not converting strongly enough. Build short hooks around one clean lesson and point more directly to the long-video payoff.");
  }
  if (actions.length === 0) {
    actions.push("No major drop-off pattern detected yet. Keep testing stronger specificity in hooks, visuals, and title framing.");
  }

  return actions;
}

function writeTemplateFeedback(analyticsRows, actions) {
  const byType = {};
  for (const row of analyticsRows) {
    const score = scoreAnalyticsRow(row);
    if (!byType[row.video_type]) {
      byType[row.video_type] = [];
    }
    byType[row.video_type].push(score);
  }

  const templateFeedback = {
    generated_at: new Date().toISOString(),
    video_type_scores: Object.fromEntries(
      Object.entries(byType).map(([videoType, scores]) => [
        videoType,
        {
          average_score: Math.round(average(scores) ?? 0),
          sample_size: scores.length
        }
      ])
    ),
    recommended_actions: actions
  };

  writeText(TEMPLATE_FEEDBACK_PATH, `${JSON.stringify(templateFeedback, null, 2)}\n`);
}

function buildPerformanceReport(analyticsRows) {
  const lines = [
    "# Performance Report",
    "",
    `Published rows tracked: ${analyticsRows.length}`,
    ""
  ];

  if (analyticsRows.length === 0) {
    lines.push("- No published analytics rows yet.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  const scoredRows = analyticsRows.map((row) => ({
    ...row,
    score: scoreAnalyticsRow(row)
  })).sort((a, b) => b.score - a.score);

  for (const row of scoredRows) {
    lines.push(`## ${row.topic_id}`);
    lines.push("");
    lines.push(`- Published: ${row.published_at || "unknown"}`);
    lines.push(`- Video type: ${row.video_type}`);
    lines.push(`- Topic score: ${row.score}`);
    lines.push(`- CTR: ${row.ctr || "n/a"}`);
    lines.push(`- First 30-second retention: ${row.first_30_second_retention || "n/a"}`);
    lines.push(`- Average view duration seconds: ${row.average_view_duration_seconds || "n/a"}`);
    lines.push(`- Shorts-to-long conversion percent: ${row.shorts_to_long_conversion_percent || "n/a"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function buildTemplateImprovements(analyticsRows, actions) {
  const lines = [
    "# Template Improvements",
    "",
    "Use this after reviewing analytics and retention patterns.",
    ""
  ];

  for (const action of actions) {
    lines.push(`- ${action}`);
  }

  lines.push("");
  if (analyticsRows.length === 0) {
    lines.push("- Add at least one published analytics row before making strong template changes.");
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function scoreQueuedTopic(row, analyticsByVideoType) {
  const basePriority = { high: 68, medium: 50, low: 34 };
  let score = basePriority[row.priority] ?? 50;
  const typeAverage = analyticsByVideoType[row.video_type];
  if (typeAverage !== undefined) {
    score = Math.round((score * 0.45) + (typeAverage * 0.55));
  }
  if (row.status === "planned") {
    score += 4;
  }
  if (row.allow_overnight === "yes") {
    score += 2;
  }
  return clamp(score, 0, 100);
}

function buildReason(row, analyticsByVideoType) {
  const typeAverage = analyticsByVideoType[row.video_type];
  if (typeAverage === undefined) {
    return "No published history for this video type yet; score leans on current queue priority.";
  }
  return `Blended from queue priority and published ${row.video_type} performance average of ${Math.round(typeAverage)}.`;
}

function writeNextWeekPlan(schedule, scoredQueue) {
  const releaseDays = schedule.release_days || ["Tuesday", "Friday"];
  const picks = scoredQueue
    .filter((row) => row.status !== "published")
    .slice(0, releaseDays.length);

  const lines = [
    "# Next Week Plan",
    "",
    `Target videos this week: ${schedule.target_videos_per_week || releaseDays.length}`,
    ""
  ];

  releaseDays.forEach((day, index) => {
    const pick = picks[index];
    lines.push(`## ${day}`);
    lines.push("");
    if (!pick) {
      lines.push("- No topic selected yet.");
    } else {
      lines.push(`- Topic: ${pick.title}`);
      lines.push(`- Topic ID: ${pick.id}`);
      lines.push(`- Video type: ${pick.video_type}`);
      lines.push(`- Recommended priority: ${pick.priority}`);
      lines.push(`- Topic score: ${pick.topic_score}`);
    }
    lines.push("");
  });

  writeText(NEXT_WEEK_PLAN_PATH, `${lines.join("\n")}\n`);
}

function runAnalyticsReview() {
  ensureDir(PUBLISHED_DIR);
  ensureCsv(ANALYTICS_TRACKER_PATH, ANALYTICS_HEADERS);
  ensureCsv(PUBLISHED_VIDEOS_PATH, PUBLISHED_HEADERS);

  const analyticsRows = parseCsv(fs.readFileSync(ANALYTICS_TRACKER_PATH, "utf8")).rows;
  const schedule = readJson(SCHEDULE_PATH);
  const queueRows = readQueue();

  const scoredPublished = analyticsRows.map((row) => ({
    ...row,
    topic_score: scoreAnalyticsRow(row)
  }));

  const analyticsByVideoType = {};
  const grouped = {};
  for (const row of scoredPublished) {
    if (!grouped[row.video_type]) {
      grouped[row.video_type] = [];
    }
    grouped[row.video_type].push(row.topic_score);
  }
  for (const [videoType, scores] of Object.entries(grouped)) {
    analyticsByVideoType[videoType] = average(scores) ?? 0;
  }

  const scoredQueue = queueRows.map((row) => {
    const topicScore = scoreQueuedTopic(row, analyticsByVideoType);
    return {
      ...row,
      topic_score: topicScore,
      recommended_priority: priorityFromScore(topicScore),
      reason: buildReason(row, analyticsByVideoType)
    };
  }).sort((a, b) => b.topic_score - a.topic_score);

  const scoreRows = scoredQueue.map((row) => ({
    topic_id: row.id,
    video_type: row.video_type,
    topic_score: row.topic_score,
    recommended_priority: row.recommended_priority,
    reason: row.reason
  }));
  writeText(TOPIC_SCORES_PATH, toCsv(scoreRows, SCORE_HEADERS));

  for (const row of queueRows) {
    const scoredRow = scoredQueue.find((item) => item.id === row.id);
    if (scoredRow && row.status !== "published") {
      row.priority = scoredRow.recommended_priority;
    }
  }
  writeQueue(queueRows);

  const actions = deriveTemplateActions(analyticsRows);
  writeText(PERFORMANCE_REPORT_PATH, buildPerformanceReport(analyticsRows));
  writeText(TEMPLATE_IMPROVEMENTS_PATH, buildTemplateImprovements(analyticsRows, actions));
  writeTemplateFeedback(analyticsRows, actions);
  writeNextWeekPlan(schedule, scoredQueue);

  console.log("Analytics review completed.");
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args["record-publish"]) {
      if (!args.topic || !args.workspace) {
        throw new Error("Usage: node agents/topic_planner.js --record-publish --topic <topic_id> --workspace <workspace_path> [--date YYYY-MM-DD]");
      }
      recordPublish(args.topic, args.workspace, args.date || todayStamp());
      return;
    }

    if (args["analytics-review"]) {
      runAnalyticsReview();
      return;
    }

    throw new Error("Usage: node agents/topic_planner.js --record-publish ... OR --analytics-review");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
