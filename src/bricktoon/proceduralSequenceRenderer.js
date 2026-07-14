const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawnSync } = require("child_process");

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
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])) >>> 0, 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function writePng(filePath, width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  fs.writeFileSync(filePath, Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]));
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
  const a = clamp(alpha, 0, 1);
  const b = 1 - a;
  buffer[index] = Math.round(buffer[index] * b + color[0] * a);
  buffer[index + 1] = Math.round(buffer[index + 1] * b + color[1] * a);
  buffer[index + 2] = Math.round(buffer[index + 2] * b + color[2] * a);
}

function fillRect(buffer, width, height, x, y, w, h, color, alpha = 1) {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const ex = Math.min(width, Math.ceil(x + w));
  const ey = Math.min(height, Math.ceil(y + h));
  for (let py = sy; py < ey; py += 1) {
    for (let px = sx; px < ex; px += 1) {
      blendPixel(buffer, width, height, px, py, color, alpha);
    }
  }
}

function fillCircle(buffer, width, height, cx, cy, radius, color, alpha = 1) {
  const sx = Math.max(0, Math.floor(cx - radius));
  const sy = Math.max(0, Math.floor(cy - radius));
  const ex = Math.min(width - 1, Math.ceil(cx + radius));
  const ey = Math.min(height - 1, Math.ceil(cy + radius));
  const r2 = radius * radius;
  for (let py = sy; py <= ey; py += 1) {
    for (let px = sx; px <= ex; px += 1) {
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
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillCircle(buffer, width, height, lerp(x1, x2, t), lerp(y1, y2, t), Math.max(1, thickness / 2), color, alpha);
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
        fillRect(buffer, width, height, x + cellIndex * scale, y + rowIndex * scale, scale - 1, scale - 1, color);
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
  const map = {
    narrator: { torso: [40, 63, 91], accent: [198, 44, 44], face: "neutral", hat: false, moustache: false, prop: "folder" },
    worried_customer: { torso: [59, 123, 217], accent: [235, 241, 252], face: "worried", hat: false, moustache: false, prop: "phone" },
    schemer_villain: { torso: [35, 39, 54], accent: [179, 38, 44], face: "smug", hat: true, moustache: true, prop: "contract" },
    investigator: { torso: [96, 113, 132], accent: [234, 196, 102], face: "serious", hat: false, moustache: false, prop: "folder" }
  };
  return map[role] || { torso: [70, 90, 115], accent: [220, 220, 220], face: "neutral", hat: false, moustache: false, prop: null };
}

function inferPoseForShot(member, shot, motionDirectives, progress) {
  const motions = new Set((motionDirectives || []).map((item) => item.type || item));
  const role = member.role || "";
  return {
    blink: motions.has("blink_pass") && (progress > 0.18 && progress < 0.22 || progress > 0.74 && progress < 0.78),
    talk: /closeup|medium/.test(shot.shot_type || "") && member.character_id === shot.primary_character_id ? Math.sin(progress * Math.PI * 8) * 3 : 0,
    recoil: role === "worried_customer" ? smoothstep(0.55, 0.8, progress) : 0,
    villainRaise: role === "schemer_villain" ? easeInOut(smoothstep(0.28, 0.62, progress)) : 0,
    revealFolder: role === "investigator" ? easeInOut(smoothstep(0.3, 0.65, progress)) : 0,
    phoneGlow: role === "worried_customer" ? 0.3 + Math.sin(progress * Math.PI * 5) * 0.2 : 0
  };
}

function drawBackground(buffer, width, height, shotType, progress, impact) {
  const sky = /top_down/.test(shotType) ? [215, 227, 237] : [124, 196, 238];
  createCanvas(width, height, sky).copy(buffer);
  fillRect(buffer, width, height, 0, height * 0.62 + impact, width, height * 0.38, [103, 111, 81]);
  fillRect(buffer, width, height, width * 0.11, height * 0.16, width * 0.78, height * 0.38, [234, 224, 197]);
  fillRect(buffer, width, height, width * 0.2, height * 0.22, width * 0.56, height * 0.07, [68, 109, 151]);
  fillRect(buffer, width, height, width * 0.18, height * 0.34, width * 0.18, height * 0.14, [108, 173, 220]);
  fillRect(buffer, width, height, width * 0.59, height * 0.34, width * 0.18, height * 0.14, [108, 173, 220]);
  fillRect(buffer, width, height, width * 0.43, height * 0.36, width * 0.14, height * 0.26, [110, 84, 59]);
  fillRect(buffer, width, height, width * 0.1, height * 0.16, width * 0.8, height * 0.38, [255, 255, 255], 0.04 + progress * 0.04);
}

function drawCharacter(buffer, width, height, member, pose, x, y, scale, shotType) {
  const palette = rolePalette(member.role);
  const skin = [246, 198, 76];
  const eye = [24, 24, 24];
  const mouth = [97, 51, 40];
  const hair = member.role === "worried_customer" ? [112, 70, 36] : [20, 24, 36];
  const torsoW = 86 * scale;
  const torsoH = 164 * scale;
  const armLenUpper = 46 * scale;
  const armLenLower = 42 * scale;
  const legLenUpper = 54 * scale;
  const legLenLower = 56 * scale;
  const limbThickness = 18 * scale;
  const headR = 42 * scale;
  const torsoX = x - torsoW / 2;
  const torsoY = y;
  const headY = y - 58 * scale - pose.recoil * 14 * scale + pose.talk;
  const shoulderY = torsoY + 18 * scale;
  const leftShoulderX = x - 28 * scale;
  const rightShoulderX = x + 28 * scale;
  const hipY = torsoY + torsoH;
  const villainRaise = pose.villainRaise * 46 * scale;

  fillCircle(buffer, width, height, x, torsoY + torsoH + 16 * scale, 30 * scale, [0, 0, 0], 0.12);
  fillRect(buffer, width, height, torsoX, torsoY, torsoW, torsoH, palette.torso);
  fillRect(buffer, width, height, x - 18 * scale, torsoY, 36 * scale, torsoH, palette.accent);

  const leftElbowX = leftShoulderX - armLenUpper;
  const leftElbowY = shoulderY + 18 * scale;
  const leftHandX = leftElbowX - armLenLower;
  const leftHandY = leftElbowY + 10 * scale;
  drawLine(buffer, width, height, leftShoulderX, shoulderY, leftElbowX, leftElbowY, limbThickness, skin);
  drawLine(buffer, width, height, leftElbowX, leftElbowY, leftHandX, leftHandY, limbThickness * 0.9, skin);
  fillRect(buffer, width, height, leftHandX - 10 * scale, leftHandY - 6 * scale, 16 * scale, 12 * scale, skin);

  const rightElbowX = rightShoulderX + armLenUpper;
  const rightElbowY = shoulderY + 6 * scale - villainRaise;
  const rightHandX = rightElbowX + armLenLower;
  const rightHandY = rightElbowY - 6 * scale;
  drawLine(buffer, width, height, rightShoulderX, shoulderY, rightElbowX, rightElbowY, limbThickness, skin);
  drawLine(buffer, width, height, rightElbowX, rightElbowY, rightHandX, rightHandY, limbThickness * 0.9, skin);
  fillRect(buffer, width, height, rightHandX - 2 * scale, rightHandY - 6 * scale, 16 * scale, 12 * scale, skin);

  drawLine(buffer, width, height, x - 20 * scale, hipY, x - 20 * scale, hipY + legLenUpper, limbThickness, [42, 51, 68]);
  drawLine(buffer, width, height, x - 20 * scale, hipY + legLenUpper, x - 24 * scale, hipY + legLenUpper + legLenLower, limbThickness * 0.95, [42, 51, 68]);
  fillRect(buffer, width, height, x - 38 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 28 * scale, 16 * scale, [29, 35, 49]);
  drawLine(buffer, width, height, x + 20 * scale, hipY, x + 20 * scale, hipY + legLenUpper, limbThickness, [42, 51, 68]);
  drawLine(buffer, width, height, x + 20 * scale, hipY + legLenUpper, x + 24 * scale, hipY + legLenUpper + legLenLower, limbThickness * 0.95, [42, 51, 68]);
  fillRect(buffer, width, height, x + 8 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 28 * scale, 16 * scale, [29, 35, 49]);

  fillCircle(buffer, width, height, x, headY, headR, skin);
  if (member.role === "worried_customer") {
    fillCircle(buffer, width, height, x - 24 * scale, headY - 16 * scale, 12 * scale, hair);
    fillCircle(buffer, width, height, x, headY - 22 * scale, 10 * scale, hair);
    fillCircle(buffer, width, height, x + 24 * scale, headY - 16 * scale, 12 * scale, hair);
  }
  if (palette.hat) {
    fillRect(buffer, width, height, x - 34 * scale, headY - 68 * scale, 68 * scale, 24 * scale, [12, 16, 26]);
    fillRect(buffer, width, height, x - 50 * scale, headY - 44 * scale, 100 * scale, 10 * scale, [12, 16, 26]);
  }
  if (pose.blink) {
    drawLine(buffer, width, height, x - 14 * scale, headY - 2 * scale, x - 6 * scale, headY - 2 * scale, 2 * scale, eye);
    drawLine(buffer, width, height, x + 6 * scale, headY - 2 * scale, x + 14 * scale, headY - 2 * scale, 2 * scale, eye);
  } else {
    fillCircle(buffer, width, height, x - 12 * scale, headY, 6 * scale, [255, 255, 255]);
    fillCircle(buffer, width, height, x + 12 * scale, headY, 6 * scale, [255, 255, 255]);
    fillCircle(buffer, width, height, x - 10 * scale, headY + 1, 3 * scale, eye);
    fillCircle(buffer, width, height, x + 10 * scale, headY + 1, 3 * scale, eye);
  }
  if (member.role === "schemer_villain") {
    drawLine(buffer, width, height, x - 18 * scale, headY - 18 * scale, x - 3 * scale, headY - 24 * scale, 2 * scale, eye);
    drawLine(buffer, width, height, x + 3 * scale, headY - 24 * scale, x + 18 * scale, headY - 18 * scale, 2 * scale, eye);
    drawLine(buffer, width, height, x - 22 * scale, headY + 12 * scale, x + 22 * scale, headY + 12 * scale, 6 * scale, mouth);
    drawLine(buffer, width, height, x - 22 * scale, headY + 12 * scale, x - 30 * scale, headY + 8 * scale - villainRaise * 0.15, 4 * scale, mouth);
    drawLine(buffer, width, height, x + 22 * scale, headY + 12 * scale, x + 30 * scale, headY + 8 * scale - villainRaise * 0.15, 4 * scale, mouth);
  }
  if (member.role === "worried_customer") {
    drawLine(buffer, width, height, x - 18 * scale, headY - 20 * scale, x - 5 * scale, headY - 10 * scale, 2 * scale, eye);
    drawLine(buffer, width, height, x + 5 * scale, headY - 10 * scale, x + 18 * scale, headY - 20 * scale, 2 * scale, eye);
    drawLine(buffer, width, height, x - 12 * scale, headY + 32 * scale, x, headY + 20 * scale, 3 * scale, mouth);
    drawLine(buffer, width, height, x, headY + 20 * scale, x + 12 * scale, headY + 32 * scale, 3 * scale, mouth);
  } else {
    drawLine(buffer, width, height, x - 14 * scale, headY + 24 * scale, x, headY + 34 * scale, 3 * scale, mouth);
    drawLine(buffer, width, height, x, headY + 34 * scale, x + 14 * scale, headY + 24 * scale, 3 * scale, mouth);
  }
  if (palette.prop === "phone" && /closeup|medium|over_shoulder/.test(shotType || "")) {
    fillRect(buffer, width, height, rightHandX + 2 * scale, rightHandY - 18 * scale, 18 * scale, 30 * scale, [31, 42, 61]);
    fillRect(buffer, width, height, rightHandX + 5 * scale, rightHandY - 14 * scale, 12 * scale, 18 * scale, [106, 225, 255], pose.phoneGlow);
  }
}

function drawInvoice(buffer, width, height, amount, emphasis = 0, shotType = "") {
  const cx = /document_insert|push_in_document/.test(shotType) ? width * 0.5 : width * 0.48;
  const cy = /document_insert|push_in_document/.test(shotType) ? height * 0.58 : height * 0.78;
  const panelW = /document_insert|push_in_document/.test(shotType) ? width * 0.68 : width * 0.46;
  const panelH = /document_insert|push_in_document/.test(shotType) ? height * 0.18 : height * 0.14;
  const panelX = cx - panelW / 2;
  const panelY = cy - panelH / 2;
  fillRect(buffer, width, height, panelX, panelY, panelW, panelH, [245, 239, 225], 0.97);
  fillRect(buffer, width, height, panelX + 28, panelY + 24, panelW * 0.52, 18, [198, 204, 223]);
  drawAmount(buffer, width, height, amount, panelX + 54, panelY + panelH * 0.48, /document_insert/.test(shotType) ? 26 : 18, [176, 40, 40]);
  if (emphasis > 0) {
    fillRect(buffer, width, height, panelX - 8, panelY - 8, panelW + 16, panelH + 16, [255, 225, 120], emphasis * 0.15);
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

function slotLayout(shotType, castMembers) {
  if (/document_insert|push_in_document/.test(shotType)) {
    return [];
  }
  if (shotType === "closeup_face") {
    return castMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.5 : 0.77,
      y: index === 0 ? 0.47 : 0.57,
      scale: index === 0 ? 1.8 : 1.0
    }));
  }
  if (shotType === "low_angle_villain") {
    return castMembers.map((member, index) => ({
      character_id: member.character_id,
      x: member.role === "schemer_villain" ? 0.62 : index === 0 ? 0.26 : 0.78,
      y: member.role === "schemer_villain" ? 0.55 : 0.63,
      scale: member.role === "schemer_villain" ? 1.45 : 0.95
    }));
  }
  if (shotType === "reaction_cutaway") {
    return castMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.5 : 0.78,
      y: 0.58,
      scale: index === 0 ? 1.32 : 0.92
    }));
  }
  if (shotType === "over_shoulder") {
    return castMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.32 : 0.72,
      y: index === 0 ? 0.66 : 0.59,
      scale: index === 0 ? 1.22 : 1.18
    }));
  }
  if (shotType === "establishing_wide" || shotType === "wide_three_character" || shotType === "medium_three_character") {
    return castMembers.map((member, index) => ({
      character_id: member.character_id,
      x: [0.25, 0.5, 0.74][index] || 0.74,
      y: 0.62,
      scale: 1.05
    }));
  }
  return castMembers.map((member, index) => ({
    character_id: member.character_id,
    x: [0.3, 0.56, 0.78][index] || 0.78,
    y: 0.61,
    scale: index === 0 ? 1.18 : 1.04
  }));
}

function renderShotFrame({ width, height, shot, sceneCard, castMembers, motionDirectives, frameIndex, totalFrames }) {
  const progress = totalFrames <= 1 ? 0 : frameIndex / (totalFrames - 1);
  const motions = new Set((motionDirectives || []).map((item) => item.type || item));
  const buffer = createCanvas(width, height, [124, 196, 238]);
  const impact = motions.has("impact_shake") ? Math.sin(progress * Math.PI * 24) * smoothstep(0.45, 0.7, progress) * 10 : 0;
  drawBackground(buffer, width, height, shot.shot_type, progress, impact);
  const slots = slotLayout(shot.shot_type, castMembers);
  const lookup = new Map(slots.map((slot) => [slot.character_id, slot]));
  for (const member of castMembers) {
    const slot = lookup.get(member.character_id);
    if (!slot) {
      continue;
    }
    drawCharacter(
      buffer,
      width,
      height,
      member,
      inferPoseForShot(member, shot, motionDirectives, progress),
      width * slot.x,
      height * slot.y,
      slot.scale,
      shot.shot_type
    );
  }

  const invoiceScene = /bill|price|fee|quote|invoice|leverage/.test(sceneCard.narration || "") || motions.has("invoice_counter");
  if (invoiceScene || /document_insert|push_in_document/.test(shot.shot_type || "")) {
    drawInvoice(buffer, width, height, smoothstep(0.5, 0.8, progress) >= 1 ? "$3,800" : "$1,200", smoothstep(0.5, 0.8, progress), shot.shot_type);
  }
  if (motions.has("proof_reveal")) {
    fillRect(buffer, width, height, width * 0.12, height * 0.72, width * 0.15, height * 0.07, [240, 212, 122], 0.92);
  }
  if (motions.has("typing_overlay")) {
    fillRect(buffer, width, height, width * 0.65, height * 0.31, width * 0.14, height * 0.08, [31, 42, 61], 0.85);
    for (let row = 0; row < 3; row += 1) {
      const pulse = ((frameIndex + row * 3) % 12) / 12;
      fillRect(buffer, width, height, width * 0.665, height * (0.325 + row * 0.018), width * (0.08 * pulse), 6, [95, 243, 166], 0.9);
    }
  }
  if (motions.has("proof_reveal") || motions.has("invoice_counter") || /reaction|villain|push_in_document/.test(shot.shot_type || "")) {
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

function renderShotClip({ shot, sceneCard, castMembers, motionDirectives, outputPath, posterPath, tempDir, width = 768, height = 1344, fps = 30 }) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  ensureDir(tempDir);
  const totalFrames = Math.max(24, Math.round((shot.end - shot.start) * fps));
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const frame = renderShotFrame({ width, height, shot, sceneCard, castMembers, motionDirectives, frameIndex, totalFrames });
    writePng(path.join(tempDir, `frame_${String(frameIndex).padStart(3, "0")}.png`), width, height, frame);
    if (frameIndex === Math.floor(totalFrames * 0.55)) {
      writePng(posterPath, width, height, frame);
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
  ], `encode shot clip ${shot.shot_id}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function concatClips(fileList, outputPath) {
  const concatPath = path.join(path.dirname(outputPath), `${path.basename(outputPath, path.extname(outputPath))}_concat.txt`);
  fs.writeFileSync(concatPath, `${fileList.map((file) => `file '${path.resolve(file).replace(/\\/g, "/")}'`).join("\n")}\n`, "utf8");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", outputPath], `assemble scene sequence ${path.basename(outputPath)}`);
  fs.rmSync(concatPath, { force: true });
}

module.exports = {
  concatClips,
  ensureDir,
  renderShotClip
};
