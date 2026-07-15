#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const { parseArgs } = require("../agents/common");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function listApprovedFrames(approvedDir) {
  if (!fs.existsSync(approvedDir)) {
    return [];
  }
  return fs.readdirSync(approvedDir)
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort(naturalSort)
    .map((name) => path.join(approvedDir, name));
}

function buildConcatList(files, durationSeconds) {
  const lines = [];
  for (const filePath of files) {
    const normalized = filePath.replaceAll("\\", "/").replace(/'/g, "'\\''");
    lines.push(`file '${normalized}'`);
    lines.push(`duration ${durationSeconds}`);
  }
  if (files.length > 0) {
    const last = files[files.length - 1].replaceAll("\\", "/").replace(/'/g, "'\\''");
    lines.push(`file '${last}'`);
  }
  return `${lines.join("\n")}\n`;
}

function runFfmpeg(concatPath, outputPath, width, height) {
  const result = spawnSync("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-vf",
    `fps=24,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x111827,format=yuv420p`,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath
  ], { encoding: "utf8" });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `Failed to render preview slideshow to ${outputPath}`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_visual_preview.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const approvedDir = path.join(workspaceDir, "07_visuals", "approved_keyframes");
    const previewDir = path.join(workspaceDir, "06_renders", "previews");
    const reportPath = path.join(previewDir, "visual_preview_report.json");
    const outputPath = path.join(previewDir, "visual_preview.mp4");
    const durationSeconds = Number(args.duration || 1.2);
    const width = Number(args.width || 1280);
    const height = Number(args.height || 720);

    const frames = listApprovedFrames(approvedDir);
    if (frames.length === 0) {
      throw new Error(`No approved keyframes found in ${approvedDir}`);
    }

    ensureDir(previewDir);
    const concatPath = path.join(os.tmpdir(), `gigbiz_preview_${Date.now()}.txt`);
    fs.writeFileSync(concatPath, buildConcatList(frames, durationSeconds), "utf8");
    try {
      runFfmpeg(concatPath, outputPath, width, height);
    } finally {
      if (fs.existsSync(concatPath)) {
        fs.unlinkSync(concatPath);
      }
    }

    fs.writeFileSync(reportPath, `${JSON.stringify({
      created_at: new Date().toISOString(),
      output_file: path.relative(workspaceDir, outputPath).replaceAll("\\", "/"),
      frame_count: frames.length,
      seconds_per_frame: durationSeconds,
      frames: frames.map((filePath) => path.relative(workspaceDir, filePath).replaceAll("\\", "/"))
    }, null, 2)}\n`, "utf8");

    console.log(`Visual preview created at ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
