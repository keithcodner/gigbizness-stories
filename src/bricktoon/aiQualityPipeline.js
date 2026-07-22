const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { createEmptyManifest, upsertAsset } = require("./buildAssetManifest");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath, fallbackValue = {}) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallbackValue;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeMarkdown(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function relativeWorkspacePath(workspaceDir, absolutePath) {
  return path.relative(workspaceDir, absolutePath).replaceAll("\\", "/");
}

function loadManifest(workspaceDir) {
  const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return createEmptyManifest(path.basename(workspaceDir));
  }
  return readJsonSafe(manifestPath, createEmptyManifest(path.basename(workspaceDir)));
}

function saveManifest(workspaceDir, manifest) {
  const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
  writeJson(manifestPath, manifest);
}

function assetTimestamp() {
  return new Date().toISOString();
}

function createPlaceholderPng(outputPath, {
  width = 1280,
  height = 720,
  color = "0x1f2937",
  boxes = [],
  grid = false
} = {}) {
  ensureDir(path.dirname(outputPath));
  const filters = [];
  if (grid) {
    filters.push("drawgrid=width=160:height=120:thickness=1:color=white@0.08");
  }
  for (const box of boxes) {
    const x = Math.max(0, Math.round(box.x || 0));
    const y = Math.max(0, Math.round(box.y || 0));
    const w = Math.max(1, Math.round(box.w || 1));
    const h = Math.max(1, Math.round(box.h || 1));
    const boxColor = box.color || "yellow@0.85";
    const thickness = box.thickness || 4;
    filters.push(`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${boxColor}:t=${thickness}`);
  }

  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=${width}x${height}:d=1`
  ];
  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }
  args.push("-frames:v", "1", outputPath);

  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `Failed to create placeholder PNG at ${outputPath}`);
  }
}

function inferQualityTier(shot) {
  const type = String(shot.shot_type || "");
  const purpose = String(shot.purpose || "").toLowerCase();
  if (type.includes("closeup") || purpose.includes("reveal") || purpose.includes("reaction") || purpose.includes("villain")) {
    return "hero";
  }
  if (type.includes("document") || purpose.includes("invoice") || purpose.includes("proof")) {
    return "utility";
  }
  return "standard";
}

function inferProductionMode(shot) {
  const type = String(shot.shot_type || "");
  const purpose = String(shot.purpose || "").toLowerCase();
  const normalizedType = type.toLowerCase();

  // Character-performance shots must stay on the hybrid path even when
  // the narration beat is about invoices, contracts, or paperwork.
  if (
    normalizedType.includes("closeup")
    || normalizedType.includes("medium_single")
    || normalizedType.includes("medium_two_shot")
    || normalizedType.includes("two_shot")
    || normalizedType.includes("over_shoulder")
  ) {
    return "hybrid_2d_ai";
  }
  if (
    normalizedType.includes("top_down_document")
    || normalizedType.includes("document_insert")
    || normalizedType.includes("push_in_document")
    || normalizedType === "document_insert"
  ) {
    return "procedural_document";
  }
  if (purpose.includes("reaction") || purpose.includes("reveal")) {
    return "hybrid_2d_ai";
  }
  if (normalizedType.includes("wide") || normalizedType.includes("establishing")) {
    return "layered_ai_illustration";
  }
  if (normalizedType.includes("three_character")) {
    return "rigged_ai_character_scene";
  }
  if (purpose.includes("invoice") || purpose.includes("contract") || purpose.includes("proof")) {
    return "procedural_document";
  }
  return "layered_procedural_2d";
}

function boxesForShot(shot, width = 1280, height = 720) {
  const type = String(shot.shot_type || "");
  if (type.includes("closeup")) {
    return [
      { x: width * 0.22, y: height * 0.12, w: width * 0.42, h: height * 0.7, color: "0xf59e0b@0.9" },
      { x: width * 0.68, y: height * 0.16, w: width * 0.18, h: height * 0.28, color: "0x60a5fa@0.85" }
    ];
  }
  if (type.includes("document")) {
    return [
      { x: width * 0.18, y: height * 0.16, w: width * 0.64, h: height * 0.64, color: "0xf8fafc@0.95" },
      { x: width * 0.28, y: height * 0.26, w: width * 0.44, h: height * 0.1, color: "0x22c55e@0.85" }
    ];
  }
  return [
    { x: width * 0.08, y: height * 0.18, w: width * 0.32, h: height * 0.62, color: "0xf59e0b@0.9" },
    { x: width * 0.44, y: height * 0.2, w: width * 0.26, h: height * 0.56, color: "0x60a5fa@0.85" },
    { x: width * 0.74, y: height * 0.26, w: width * 0.16, h: height * 0.42, color: "0xef4444@0.85" }
  ];
}

module.exports = {
  assetTimestamp,
  boxesForShot,
  createPlaceholderPng,
  ensureDir,
  inferProductionMode,
  inferQualityTier,
  loadManifest,
  readJsonSafe,
  relativeWorkspacePath,
  saveManifest,
  upsertAsset,
  writeJson,
  writeMarkdown
};
