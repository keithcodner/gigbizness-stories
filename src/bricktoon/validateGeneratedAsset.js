const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function readBmpDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 26 || buffer.toString("ascii", 0, 2) !== "BM") {
    throw new Error(`Not a BMP file: ${filePath}`);
  }
  return {
    width: buffer.readInt32LE(18),
    height: buffer.readInt32LE(22)
  };
}

function readMediaDimensions(filePath) {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    filePath
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    return { width: 0, height: 0 };
  }

  const value = (result.stdout || "").trim();
  const [width, height] = value.split("x").map((item) => Number(item));
  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0
  };
}

function validateGeneratedAsset(filePath, expected = {}) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: "missing_file" };
  }

  const ext = path.extname(filePath).toLowerCase();
  let dimensions = { width: 0, height: 0 };
  if (ext === ".bmp") {
    dimensions = readBmpDimensions(filePath);
  } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    dimensions = readMediaDimensions(filePath);
  }

  const size = fs.statSync(filePath).size;
  if (size <= 1024) {
    return { valid: false, reason: "file_too_small", ...dimensions };
  }
  const pixelCount = (dimensions.width || 0) * (dimensions.height || 0);
  if (pixelCount >= 500000 && size < 20000) {
    return { valid: false, reason: "placeholder_like_image", ...dimensions };
  }
  if (pixelCount >= 1000000 && size < 35000) {
    return { valid: false, reason: "placeholder_like_image", ...dimensions };
  }
  if (expected.width && dimensions.width && expected.width !== dimensions.width) {
    return { valid: false, reason: "unexpected_width", ...dimensions };
  }
  if (expected.height && dimensions.height && expected.height !== dimensions.height) {
    return { valid: false, reason: "unexpected_height", ...dimensions };
  }

  return {
    valid: true,
    reason: null,
    width: dimensions.width || expected.width || 0,
    height: dimensions.height || expected.height || 0,
    size_bytes: size
  };
}

module.exports = {
  validateGeneratedAsset
};
