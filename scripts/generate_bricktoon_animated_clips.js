#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawnSync } = require("child_process");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { createEmptyManifest, upsertAsset } = require("../src/bricktoon/buildAssetManifest");
const { getCastMembers, buildCharacterMap } = require("../src/bricktoon/normalizeCast");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function easeInOut(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  const checksum = crc32(Buffer.concat([typeBuffer, data]));
  crcBuffer.writeUInt32BE(checksum >>> 0, 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function writePng(filePath, width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]);

  fs.writeFileSync(filePath, png);
}

function createCanvas(width, height, color) {
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    buffer[offset] = color[0];
    buffer[offset + 1] = color[1];
    buffer[offset + 2] = color[2];
    buffer[offset + 3] = 255;
  }
  return buffer;
}

function blendPixel(buffer, width, height, x, y, color, alpha = 1) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= width || py >= height) {
    return;
  }

  const index = (py * width + px) * 4;
  const sourceAlpha = clamp(alpha, 0, 1);
  const targetAlpha = 1 - sourceAlpha;
  buffer[index] = Math.round(buffer[index] * targetAlpha + color[0] * sourceAlpha);
  buffer[index + 1] = Math.round(buffer[index + 1] * targetAlpha + color[1] * sourceAlpha);
  buffer[index + 2] = Math.round(buffer[index + 2] * targetAlpha + color[2] * sourceAlpha);
  buffer[index + 3] = 255;
}

function fillRect(buffer, width, height, x, y, w, h, color, alpha = 1) {
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(width, Math.ceil(x + w));
  const endY = Math.min(height, Math.ceil(y + h));
  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      blendPixel(buffer, width, height, px, py, color, alpha);
    }
  }
}

function fillCircle(buffer, width, height, cx, cy, radius, color, alpha = 1) {
  const startX = Math.max(0, Math.floor(cx - radius));
  const startY = Math.max(0, Math.floor(cy - radius));
  const endX = Math.min(width - 1, Math.ceil(cx + radius));
  const endY = Math.min(height - 1, Math.ceil(cy + radius));
  const r2 = radius * radius;
  for (let py = startY; py <= endY; py += 1) {
    for (let px = startX; px <= endX; px += 1) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= r2) {
        blendPixel(buffer, width, height, px, py, color, alpha);
      }
    }
  }
}

function drawLine(buffer, width, height, x1, y1, x2, y2, thickness, color, alpha = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  const radius = Math.max(1, thickness / 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillCircle(buffer, width, height, lerp(x1, x2, t), lerp(y1, y2, t), radius, color, alpha);
  }
}

function drawTriangle(buffer, width, height, x, y, size, color, alpha = 1) {
  for (let row = 0; row < size; row += 1) {
    const half = Math.floor((row / size) * (size / 1.8));
    fillRect(buffer, width, height, x - half, y + row, Math.max(2, half * 2), 1, color, alpha);
  }
}

const DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "001", "001", "001"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  "$": ["011", "110", "011", "001", "110"],
  ",": ["000", "000", "000", "010", "100"]
};

function drawDigit(buffer, width, height, digit, x, y, scale, color) {
  const glyph = DIGITS[digit];
  if (!glyph) {
    return;
  }
  glyph.forEach((row, rowIndex) => {
    [...row].forEach((cell, cellIndex) => {
      if (cell === "1") {
        fillRect(
          buffer,
          width,
          height,
          x + cellIndex * scale,
          y + rowIndex * scale,
          scale - 1,
          scale - 1,
          color
        );
      }
    });
  });
}

function drawAmount(buffer, width, height, amount, x, y, scale, color) {
  let cursor = x;
  for (const char of amount) {
    drawDigit(buffer, width, height, char, cursor, y, scale, color);
    cursor += scale * 4;
  }
}

function rolePalette(role) {
  if (role === "narrator") {
    return {
      torso: [40, 63, 91],
      accent: [198, 44, 44],
      headwear: null,
      moustache: false,
      eyewear: false,
      prop: "folder"
    };
  }
  if (role === "worried_customer") {
    return {
      torso: [59, 123, 217],
      accent: [255, 255, 255],
      headwear: null,
      moustache: false,
      eyewear: false,
      prop: "phone"
    };
  }
  if (role === "schemer_villain") {
    return {
      torso: [35, 39, 54],
      accent: [179, 38, 44],
      headwear: "top_hat",
      moustache: true,
      eyewear: false,
      prop: "contract"
    };
  }
  if (role === "investigator") {
    return {
      torso: [96, 113, 132],
      accent: [234, 196, 102],
      headwear: null,
      moustache: false,
      eyewear: true,
      prop: "folder"
    };
  }
  return {
    torso: [70, 90, 115],
    accent: [220, 220, 220],
    headwear: null,
    moustache: false,
    eyewear: false,
    prop: null
  };
}

function getCharacterPose(sceneCard, member, animationDirectives, progress) {
  const role = member.role || "";
  const motions = new Set((animationDirectives || []).map((directive) => directive.type));
  return {
    blink: motions.has("blink_pass") && (progress > 0.18 && progress < 0.21 || progress > 0.76 && progress < 0.79),
    talk: motions.has("talk_emphasis") && member.character_id === (sceneCard.characters || [])[0]
      ? Math.sin(progress * Math.PI * 8) * 4
      : 0,
    recoil: role === "worried_customer" && motions.has("invoice_counter") ? smoothstep(0.58, 0.72, progress) : 0,
    villainRaise: role === "schemer_villain" && motions.has("villain_emphasis") ? easeInOut(smoothstep(0.35, 0.65, progress)) : 0,
    revealFolder: role === "investigator" && motions.has("proof_reveal") ? easeInOut(smoothstep(0.4, 0.7, progress)) : 0,
    phoneGlow: role === "worried_customer" && motions.has("phone_glow") ? 0.35 + Math.sin(progress * Math.PI * 6) * 0.2 : 0
  };
}

function drawCharacter(buffer, width, height, member, pose, x, y, scale) {
  const palette = rolePalette(member.role);
  const skin = [246, 198, 76];
  const hair = member.role === "worried_customer" ? [112, 70, 36] : [20, 24, 36];
  const mouthColor = [97, 51, 40];
  const eyeColor = [24, 24, 24];
  const torsoWidth = 74 * scale;
  const torsoHeight = 146 * scale;
  const legWidth = 26 * scale;
  const legHeight = 116 * scale;
  const armLength = 70 * scale;
  const armThickness = 16 * scale;
  const headRadius = 42 * scale;
  const torsoX = x - torsoWidth / 2;
  const torsoY = y;
  const headX = x;
  const headY = y - 55 * scale - pose.recoil * 16 * scale;
  const rightArmLift = pose.villainRaise * 42 * scale;
  const headBob = pose.talk;

  fillRect(buffer, width, height, torsoX, torsoY, torsoWidth, torsoHeight, palette.torso);
  fillRect(buffer, width, height, x - 24 * scale, torsoY, 48 * scale, torsoHeight, palette.accent);
  fillRect(buffer, width, height, x - 32 * scale, torsoY + torsoHeight, legWidth, legHeight, [32, 41, 55]);
  fillRect(buffer, width, height, x + 6 * scale, torsoY + torsoHeight, legWidth, legHeight, [32, 41, 55]);

  drawLine(buffer, width, height, x - 32 * scale, torsoY + 20 * scale, x - 32 * scale - armLength, torsoY + 44 * scale, armThickness, skin);
  drawLine(buffer, width, height, x + 32 * scale, torsoY + 20 * scale, x + 32 * scale + armLength, torsoY + 32 * scale - rightArmLift, armThickness, skin);

  fillCircle(buffer, width, height, headX, headY + headBob, headRadius, skin);

  if (member.role === "worried_customer") {
    fillCircle(buffer, width, height, headX - 26 * scale, headY - 16 * scale, 11 * scale, hair);
    fillCircle(buffer, width, height, headX + 2 * scale, headY - 22 * scale, 10 * scale, hair);
    fillCircle(buffer, width, height, headX + 28 * scale, headY - 14 * scale, 11 * scale, hair);
  }

  if (palette.headwear === "top_hat") {
    fillRect(buffer, width, height, headX - 34 * scale, headY - 68 * scale, 68 * scale, 24 * scale, [12, 16, 26]);
    fillRect(buffer, width, height, headX - 50 * scale, headY - 44 * scale, 100 * scale, 10 * scale, [12, 16, 26]);
  }

  if (palette.eyewear) {
    drawLine(buffer, width, height, headX - 16 * scale, headY - 6 * scale, headX - 3 * scale, headY - 6 * scale, 3 * scale, eyeColor);
    drawLine(buffer, width, height, headX + 3 * scale, headY - 6 * scale, headX + 16 * scale, headY - 6 * scale, 3 * scale, eyeColor);
    drawLine(buffer, width, height, headX - 3 * scale, headY - 6 * scale, headX + 3 * scale, headY - 6 * scale, 2 * scale, eyeColor);
  }

  if (pose.blink) {
    drawLine(buffer, width, height, headX - 15 * scale, headY - 2 * scale, headX - 6 * scale, headY - 2 * scale, 2 * scale, eyeColor);
    drawLine(buffer, width, height, headX + 6 * scale, headY - 2 * scale, headX + 15 * scale, headY - 2 * scale, 2 * scale, eyeColor);
  } else {
    fillCircle(buffer, width, height, headX - 12 * scale, headY, 6 * scale, [255, 255, 255]);
    fillCircle(buffer, width, height, headX + 12 * scale, headY, 6 * scale, [255, 255, 255]);
    fillCircle(buffer, width, height, headX - 10 * scale, headY + 1, 3 * scale, eyeColor);
    fillCircle(buffer, width, height, headX + 10 * scale, headY + 1, 3 * scale, eyeColor);
  }

  if (member.role === "schemer_villain") {
    drawLine(buffer, width, height, headX - 18 * scale, headY - 18 * scale, headX - 3 * scale, headY - 24 * scale, 2 * scale, eyeColor);
    drawLine(buffer, width, height, headX + 3 * scale, headY - 24 * scale, headX + 18 * scale, headY - 18 * scale, 2 * scale, eyeColor);
  }

  if (member.role === "worried_customer") {
    drawLine(buffer, width, height, headX - 18 * scale, headY - 20 * scale, headX - 5 * scale, headY - 10 * scale, 2 * scale, eyeColor);
    drawLine(buffer, width, height, headX + 5 * scale, headY - 10 * scale, headX + 18 * scale, headY - 20 * scale, 2 * scale, eyeColor);
  }

  if (palette.moustache) {
    const twirl = Math.sin(pose.villainRaise * Math.PI) * 8 * scale;
    drawLine(buffer, width, height, headX - 22 * scale, headY + 12 * scale, headX + 22 * scale, headY + 12 * scale, 6 * scale, mouthColor);
    drawLine(buffer, width, height, headX - 22 * scale, headY + 12 * scale, headX - 30 * scale, headY + 8 * scale - twirl, 4 * scale, mouthColor);
    drawLine(buffer, width, height, headX + 22 * scale, headY + 12 * scale, headX + 30 * scale, headY + 8 * scale - twirl, 4 * scale, mouthColor);
  }

  if (member.role === "worried_customer") {
    drawLine(buffer, width, height, headX - 12 * scale, headY + 32 * scale, headX, headY + 20 * scale, 3 * scale, mouthColor);
    drawLine(buffer, width, height, headX, headY + 20 * scale, headX + 12 * scale, headY + 32 * scale, 3 * scale, mouthColor);
  } else {
    drawLine(buffer, width, height, headX - 14 * scale, headY + 24 * scale, headX, headY + 34 * scale, 3 * scale, mouthColor);
    drawLine(buffer, width, height, headX, headY + 34 * scale, headX + 14 * scale, headY + 24 * scale, 3 * scale, mouthColor);
  }

  if (palette.prop === "phone") {
    fillRect(buffer, width, height, x + 58 * scale, torsoY + 14 * scale, 18 * scale, 30 * scale, [31, 42, 61]);
    fillRect(buffer, width, height, x + 61 * scale, torsoY + 18 * scale, 12 * scale, 18 * scale, [106, 225, 255], pose.phoneGlow);
  }
  if (palette.prop === "folder" && pose.revealFolder > 0) {
    fillRect(buffer, width, height, x + 52 * scale, torsoY + 28 * scale - 40 * scale * pose.revealFolder, 36 * scale, 28 * scale, [240, 212, 122]);
  }
}

function drawEnvironment(buffer, width, height, sceneCard, progress, cameraShake) {
  const sky = sceneCard.camera?.shot_type?.includes("overhead") ? [209, 225, 236] : [124, 196, 238];
  createCanvas(width, height, sky).copy(buffer);
  fillRect(buffer, width, height, 0, height * 0.62 + cameraShake, width, height * 0.38, [103, 111, 81]);
  fillRect(buffer, width, height, width * 0.11, height * 0.16, width * 0.78, height * 0.38, [234, 224, 197]);
  fillRect(buffer, width, height, width * 0.2, height * 0.22, width * 0.56, height * 0.07, [42, 86, 128]);
  fillRect(buffer, width, height, width * 0.18, height * 0.34, width * 0.18, height * 0.14, [108, 173, 220]);
  fillRect(buffer, width, height, width * 0.59, height * 0.34, width * 0.18, height * 0.14, [108, 173, 220]);
  fillRect(buffer, width, height, width * 0.43, height * 0.36, width * 0.14, height * 0.26, [110, 84, 59]);

  if ((sceneCard.caption_text || "").toLowerCase().includes("warning")) {
    fillRect(buffer, width, height, width * 0.08, height * 0.11, width * 0.34, height * 0.04, [213, 58, 54]);
  }

  const subtleGlow = 0.05 + progress * 0.05;
  fillRect(buffer, width, height, width * 0.12, height * 0.16, width * 0.76, height * 0.38, [255, 255, 255], subtleGlow);
}

function drawInvoicePanel(buffer, width, height, amount, emphasis = 0) {
  const panelX = width * 0.28;
  const panelY = height * 0.68;
  const panelW = width * 0.46;
  const panelH = height * 0.14;
  fillRect(buffer, width, height, panelX, panelY, panelW, panelH, [245, 239, 225], 0.97);
  fillRect(buffer, width, height, panelX + 28, panelY + 24, panelW * 0.52, 18, [198, 204, 223]);
  drawAmount(buffer, width, height, amount, panelX + 52, panelY + 78, 18, [176, 40, 40]);
  if (emphasis > 0) {
    fillRect(buffer, width, height, panelX - 10, panelY - 10, panelW + 20, panelH + 20, [255, 225, 120], emphasis * 0.15);
  }
}

function drawWarning(buffer, width, height, pulse) {
  const alpha = clamp(0.25 + pulse * 0.55, 0.25, 0.8);
  const x = width * 0.83;
  const y = height * 0.63;
  drawTriangle(buffer, width, height, x, y, 190, [244, 205, 48], alpha);
  fillRect(buffer, width, height, x - 10, y + 58, 20, 70, [42, 52, 78], alpha);
  fillCircle(buffer, width, height, x, y + 150, 11, [42, 52, 78], alpha);
}

function renderSceneFrame({ width, height, sceneCard, animationScene, castMembers, frameIndex, totalFrames }) {
  const progress = totalFrames <= 1 ? 0 : frameIndex / (totalFrames - 1);
  const motions = new Set((animationScene?.motion_directives || []).map((directive) => directive.type));
  const buffer = createCanvas(width, height, [124, 196, 238]);
  const impact = motions.has("impact_shake") ? Math.sin(progress * Math.PI * 24) * smoothstep(0.4, 0.7, progress) * 12 : 0;

  drawEnvironment(buffer, width, height, sceneCard, progress, impact);

  const castSlots = [
    { x: width * 0.25, y: height * 0.63, scale: 1.1 },
    { x: width * 0.5, y: height * 0.6, scale: 1.08 },
    { x: width * 0.74, y: height * 0.61, scale: 1.15 }
  ];

  const membersToDraw = castMembers.slice(0, 3);
  membersToDraw.forEach((member, index) => {
    const slot = castSlots[index] || castSlots[castSlots.length - 1];
    drawCharacter(
      buffer,
      width,
      height,
      member,
      getCharacterPose(sceneCard, member, animationScene?.motion_directives || [], progress),
      slot.x + Math.sin(progress * Math.PI * (index + 1)) * 4,
      slot.y + Math.sin(progress * Math.PI * 2) * 2,
      slot.scale
    );
  });

  const showInvoice = motions.has("invoice_counter") || /bill|price|fee|quote|leverage/i.test(sceneCard.narration || "");
  if (showInvoice) {
    const invoiceJump = smoothstep(0.55, 0.74, progress);
    const amount = invoiceJump >= 1 ? "$3,800" : "$1,200";
    drawInvoicePanel(buffer, width, height, amount, invoiceJump);
  }

  if (motions.has("proof_reveal")) {
    fillRect(buffer, width, height, width * 0.11, height * 0.71, width * 0.15, height * 0.07, [240, 212, 122], 0.9);
  }

  if (motions.has("typing_overlay")) {
    fillRect(buffer, width, height, width * 0.65, height * 0.31, width * 0.14, height * 0.08, [31, 42, 61], 0.85);
    for (let row = 0; row < 3; row += 1) {
      const pulse = ((frameIndex + row * 3) % 12) / 12;
      fillRect(buffer, width, height, width * 0.665, height * (0.325 + row * 0.018), width * (0.08 * pulse), 6, [95, 243, 166], 0.9);
    }
  }

  if (motions.has("proof_reveal") || motions.has("invoice_counter")) {
    drawWarning(buffer, width, height, smoothstep(0.68, 0.92, progress));
  }

  return buffer;
}

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

function loadManifest(filePath, workspaceId) {
  if (!fs.existsSync(filePath)) {
    return createEmptyManifest(workspaceId);
  }
  return readJson(filePath);
}

function renderClipForScene({
  sceneCard,
  animationScene,
  castMembers,
  outputPath,
  posterPath,
  tempDir,
  width,
  height,
  fps
}) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  ensureDir(tempDir);
  const totalFrames = Math.max(45, Math.round((sceneCard.duration_seconds || 5) * fps));
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const frameBuffer = renderSceneFrame({
      width,
      height,
      sceneCard,
      animationScene,
      castMembers,
      frameIndex,
      totalFrames
    });
    writePng(path.join(tempDir, `frame_${String(frameIndex).padStart(3, "0")}.png`), width, height, frameBuffer);
    if (frameIndex === Math.floor(totalFrames * 0.6)) {
      writePng(posterPath, width, height, frameBuffer);
    }
  }

  run("ffmpeg", [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(tempDir, "frame_%03d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath
  ], `encode animated clip ${sceneCard.scene_id}`);

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_bricktoon_animated_clips.js --workspace <workspace_path>");
    }

    const workspaceDir = args.workspace;
    const workspaceId = path.basename(workspaceDir);
    const animationDir = path.join(workspaceDir, "08_animation", "animated_clips");
    const posterDir = path.join(workspaceDir, "07_visuals", "generated_images");
    const manifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    const sceneCards = readJson(path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).scene_cards || [];
    const animationScenes = readJson(path.join(workspaceDir, "08_animation", "animation_plan.json")).scenes || [];
    const castPackage = readJson(path.join(workspaceDir, "03_cast", "cast.json"));
    const characterMap = buildCharacterMap(castPackage);
    let manifest = loadManifest(manifestPath, workspaceId);

    ensureDir(animationDir);
    ensureDir(posterDir);

    for (const sceneCard of sceneCards) {
      const animationScene = animationScenes.find((scene) => scene.scene_id === sceneCard.scene_id) || {
        scene_id: sceneCard.scene_id,
        motion_directives: []
      };
      const castMembers = (sceneCard.characters || [])
        .map((characterId) => characterMap.get(characterId))
        .filter(Boolean);
      if (castMembers.length === 0) {
        continue;
      }

      const clipPath = path.join(animationDir, `${sceneCard.scene_id}_clip.mp4`);
      const posterPath = path.join(posterDir, `${sceneCard.scene_id}_procedural_poster.png`);
      const tempDir = path.join(animationDir, `_tmp_${sceneCard.scene_id}`);

      renderClipForScene({
        sceneCard,
        animationScene,
        castMembers,
        outputPath: clipPath,
        posterPath,
        tempDir,
        width: 768,
        height: 1344,
        fps: 30
      });

      manifest = upsertAsset(manifest, {
        asset_id: `CLIP_${sceneCard.scene_id}_MAIN`,
        asset_type: "bricktoon_animated_clip",
        scene_ids: [sceneCard.scene_id],
        character_ids: castMembers.map((member) => member.character_id),
        file: `08_animation/animated_clips/${sceneCard.scene_id}_clip.mp4`,
        poster_file: `07_visuals/generated_images/${sceneCard.scene_id}_procedural_poster.png`,
        width: 768,
        height: 1344,
        fps: 30,
        status: "approved",
        generator: {
          provider: "procedural",
          workflow: "bricktoon_animated_clip_v1"
        },
        motion_directives: (animationScene.motion_directives || []).map((directive) => directive.type),
        created_at: new Date().toISOString()
      });
    }

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Bricktoon animated clips generated for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
