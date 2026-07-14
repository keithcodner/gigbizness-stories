const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_VIDEO = path.join(ROOT, "workspaces", "test_story_template", "06_renders", "bricktoon_animation_sample.mp4");
const QC_DIR = path.join(ROOT, "workspaces", "test_story_template", "13_qc", "animation_sample");
const TEMP_DIR = path.join(QC_DIR, "_tmp_frames");
const REPORT_PATH = path.join(QC_DIR, "render_report.json");

function ffprobeJson(filePath) {
  return JSON.parse(execFileSync("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ], { encoding: "utf8" }));
}

function sha(filePath) {
  return require("crypto").createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
}

test("animation sample render exists and is approximately five seconds", () => {
  assert.equal(fs.existsSync(OUTPUT_VIDEO), true);
  const probe = ffprobeJson(OUTPUT_VIDEO);
  const duration = Number(probe.format.duration);
  assert.ok(duration > 4.8 && duration < 5.2);
  const videoStream = probe.streams.find((stream) => stream.codec_type === "video");
  assert.equal(videoStream.width, 1080);
  assert.equal(videoStream.height, 1920);
});

test("animation sample creates enough frames and evidence assets", () => {
  assert.equal(fs.existsSync(TEMP_DIR), true);
  const frameFiles = fs.readdirSync(TEMP_DIR).filter((name) => name.endsWith(".png"));
  assert.ok(frameFiles.length >= 140);
  for (const frameName of ["frame_000.png", "frame_030.png", "frame_060.png", "frame_090.png", "frame_120.png", "frame_149.png"]) {
    assert.equal(fs.existsSync(path.join(QC_DIR, frameName)), true);
  }
});

test("animation sample visibly changes over time", () => {
  assert.notEqual(sha(path.join(QC_DIR, "frame_000.png")), sha(path.join(QC_DIR, "frame_149.png")));
  assert.notEqual(sha(path.join(TEMP_DIR, "frame_011.png")), sha(path.join(TEMP_DIR, "frame_012.png")));
  assert.notEqual(sha(path.join(TEMP_DIR, "frame_060.png")), sha(path.join(TEMP_DIR, "frame_065.png")));
  assert.notEqual(sha(path.join(TEMP_DIR, "frame_075.png")), sha(path.join(TEMP_DIR, "frame_096.png")));
});

test("animation sample report stays procedural and lists animated layers", () => {
  assert.equal(fs.existsSync(REPORT_PATH), true);
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  assert.ok(report.animated_layer_ids.length >= 8);
  assert.ok(report.average_frame_difference > 0);
  const sources = report.source_asset_paths.join(" ");
  assert.equal(sources.includes("generated_images"), false);
  assert.equal(sources.includes("fact_card"), false);
});
