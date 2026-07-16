#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const { parseArgs, parseCsv } = require("../agents/common");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `${label} failed.`);
  }
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

function groupFramesByScene(frames) {
  const groups = new Map();
  for (const filePath of frames) {
    const match = path.basename(filePath).match(/^(S\d+)_/i);
    const sceneId = match ? match[1].toUpperCase() : "UNASSIGNED";
    if (!groups.has(sceneId)) {
      groups.set(sceneId, []);
    }
    groups.get(sceneId).push(filePath);
  }
  return [...groups.entries()].sort((a, b) => naturalSort(a[0], b[0]));
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

function renderSlideshow(files, outputPath, width, height, durationSeconds) {
  const concatPath = path.join(os.tmpdir(), `gigbiz_preview_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(concatPath, buildConcatList(files, durationSeconds), "utf8");
  try {
    runCommand("ffmpeg", [
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
    ], `render preview slideshow ${outputPath}`);
  } finally {
    if (fs.existsSync(concatPath)) {
      fs.unlinkSync(concatPath);
    }
  }
}

function fileHasContent(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function detectSelectedMusic(workspaceDir) {
  const manifestPath = path.join(workspaceDir, "04_assets", "music", "music_manifest.csv");
  if (!fileHasContent(manifestPath)) {
    return null;
  }
  const parsed = parseCsv(fs.readFileSync(manifestPath, "utf8"));
  const row = parsed.rows.find((item) => {
    const status = String(item.status || "").toLowerCase();
    return ["selected", "approved", "picked"].includes(status) && item.track_path;
  });
  if (!row || !row.track_path) {
    return null;
  }
  return row.track_path;
}

function attachAudio(baseVideoPath, outputPath, voicePath, musicPath) {
  if (fileHasContent(voicePath) && musicPath) {
    runCommand("ffmpeg", [
      "-y",
      "-i",
      baseVideoPath,
      "-i",
      voicePath,
      "-stream_loop",
      "-1",
      "-i",
      musicPath,
      "-filter_complex",
      "[1:a]volume=1.0[voice];[2:a]volume=0.18[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]",
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-shortest",
      outputPath
    ], `attach voice and music to ${outputPath}`);
    return;
  }

  if (fileHasContent(voicePath)) {
    runCommand("ffmpeg", [
      "-y",
      "-i",
      baseVideoPath,
      "-i",
      voicePath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-shortest",
      outputPath
    ], `attach voice to ${outputPath}`);
    return;
  }

  if (musicPath) {
    runCommand("ffmpeg", [
      "-y",
      "-i",
      baseVideoPath,
      "-stream_loop",
      "-1",
      "-i",
      musicPath,
      "-filter:a",
      "volume=0.18",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-shortest",
      outputPath
    ], `attach music to ${outputPath}`);
    return;
  }

  fs.copyFileSync(baseVideoPath, outputPath);
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
    const scenePreviewDir = path.join(previewDir, "scenes");
    const reportPath = path.join(previewDir, "visual_preview_report.json");
    const baseOutputPath = path.join(previewDir, "visual_preview_silent.mp4");
    const finalOutputPath = path.join(previewDir, "visual_preview.mp4");
    const durationSeconds = Number(args.duration || 1.2);
    const width = Number(args.width || 1280);
    const height = Number(args.height || 720);
    const voicePath = path.join(workspaceDir, "03_voice", "voiceover_clean.wav");
    const musicPath = detectSelectedMusic(workspaceDir);

    const frames = listApprovedFrames(approvedDir);
    if (frames.length === 0) {
      throw new Error(`No approved keyframes found in ${approvedDir}`);
    }

    ensureDir(previewDir);
    ensureDir(scenePreviewDir);

    const sceneGroups = groupFramesByScene(frames);
    for (const [sceneId, sceneFrames] of sceneGroups) {
      renderSlideshow(sceneFrames, path.join(scenePreviewDir, `${sceneId}_preview.mp4`), width, height, durationSeconds);
    }

    renderSlideshow(frames, baseOutputPath, width, height, durationSeconds);
    attachAudio(baseOutputPath, finalOutputPath, voicePath, musicPath);

    fs.writeFileSync(reportPath, `${JSON.stringify({
      created_at: new Date().toISOString(),
      output_file: path.relative(workspaceDir, finalOutputPath).replaceAll("\\", "/"),
      scene_preview_dir: path.relative(workspaceDir, scenePreviewDir).replaceAll("\\", "/"),
      frame_count: frames.length,
      seconds_per_frame: durationSeconds,
      voiceover_used: fileHasContent(voicePath),
      music_used: Boolean(musicPath),
      music_track: musicPath || null,
      scenes: sceneGroups.map(([sceneId, sceneFrames]) => ({
        scene_id: sceneId,
        preview_file: path.relative(workspaceDir, path.join(scenePreviewDir, `${sceneId}_preview.mp4`)).replaceAll("\\", "/"),
        frame_count: sceneFrames.length,
        frames: sceneFrames.map((filePath) => path.relative(workspaceDir, filePath).replaceAll("\\", "/"))
      }))
    }, null, 2)}\n`, "utf8");

    console.log(`Visual preview created at ${finalOutputPath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
