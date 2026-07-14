const fs = require("fs");
const path = require("path");

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

function validateGeneratedAsset(filePath, expected = {}) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: "missing_file" };
  }

  const ext = path.extname(filePath).toLowerCase();
  let dimensions = { width: 0, height: 0 };
  if (ext === ".bmp") {
    dimensions = readBmpDimensions(filePath);
  }

  const size = fs.statSync(filePath).size;
  if (size <= 1024) {
    return { valid: false, reason: "file_too_small", ...dimensions };
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
