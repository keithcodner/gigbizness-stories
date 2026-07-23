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

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
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

function strokeRect(buffer, width, height, x, y, w, h, thickness, color, alpha = 1) {
  const t = Math.max(1, Math.round(thickness));
  fillRect(buffer, width, height, x, y, w, t, color, alpha);
  fillRect(buffer, width, height, x, y + h - t, w, t, color, alpha);
  fillRect(buffer, width, height, x, y, t, h, color, alpha);
  fillRect(buffer, width, height, x + w - t, y, t, h, color, alpha);
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

function drawPanelGrid(buffer, width, height, x, y, w, h, rows, cols, color, alpha = 0.35) {
  for (let row = 1; row < rows; row += 1) {
    fillRect(buffer, width, height, x, y + (h * row / rows), w, 1, color, alpha);
  }
  for (let col = 1; col < cols; col += 1) {
    fillRect(buffer, width, height, x + (w * col / cols), y, 1, h, color, alpha);
  }
}

function drawBrickPattern(buffer, width, height, x, y, w, h, brickW, brickH, color, alpha = 0.22) {
  for (let rowY = y; rowY < y + h; rowY += brickH) {
    fillRect(buffer, width, height, x, rowY, w, 1, color, alpha);
    const offset = Math.floor(((rowY - y) / brickH) % 2) === 0 ? 0 : brickW / 2;
    for (let colX = x + offset; colX < x + w; colX += brickW) {
      fillRect(buffer, width, height, colX, rowY, 1, brickH, color, alpha * 0.9);
    }
  }
}

function drawSpeckleTexture(buffer, width, height, x, y, w, h, seed, step, color, alpha = 0.08) {
  const spacing = Math.max(6, Math.round(step));
  for (let py = Math.floor(y); py < y + h; py += spacing) {
    for (let px = Math.floor(x); px < x + w; px += spacing) {
      const value = ((px * 73856093) ^ (py * 19349663) ^ seed) >>> 0;
      if (value % 5 === 0) {
        fillRect(buffer, width, height, px, py, 2, 2, color, alpha);
      } else if (value % 7 === 0) {
        fillRect(buffer, width, height, px, py, 1, 1, color, alpha * 0.85);
      }
    }
  }
}

function drawPerspectiveFloor(buffer, width, height, horizonY, color, alpha = 0.1) {
  for (let row = 0; row < 8; row += 1) {
    const y = lerp(horizonY, height, row / 7);
    fillRect(buffer, width, height, 0, y, width, 1, color, alpha + row * 0.015);
  }
  for (let col = -2; col <= 8; col += 1) {
    const baseX = width * (col / 6);
    drawLine(buffer, width, height, width * 0.5, horizonY, baseX, height, 1, color, alpha * 0.9);
  }
}

function drawDocumentDetail(buffer, width, height, x, y, w, h, accent, body, alpha = 0.95) {
  fillRect(buffer, width, height, x, y, w, h, [245, 240, 228], alpha);
  strokeRect(buffer, width, height, x, y, w, h, 2, [214, 203, 178], 0.85);
  fillRect(buffer, width, height, x + w * 0.06, y + h * 0.1, w * 0.42, h * 0.08, accent, 0.85);
  fillRect(buffer, width, height, x + w * 0.66, y + h * 0.09, w * 0.18, h * 0.12, [232, 221, 187], 0.8);
  for (let line = 0; line < 5; line += 1) {
    fillRect(buffer, width, height, x + w * 0.08, y + h * (0.28 + line * 0.1), w * (0.7 - (line % 2) * 0.12), Math.max(2, h * 0.018), body, 0.45 + (line % 2) * 0.1);
  }
  fillRect(buffer, width, height, x + w * 0.62, y + h * 0.56, w * 0.22, h * 0.08, [191, 76, 52], 0.8);
}

function drawHalftoneDots(buffer, width, height, x, y, w, h, spacing, radius, color, alpha = 0.12) {
  const dotSpacing = Math.max(8, Math.round(spacing));
  const dotRadius = Math.max(1, radius);
  for (let row = 0, py = Math.floor(y); py < y + h; row += 1, py += dotSpacing) {
    const offsetX = row % 2 === 0 ? 0 : dotSpacing / 2;
    for (let px = Math.floor(x + offsetX); px < x + w; px += dotSpacing) {
      fillCircle(buffer, width, height, px, py, dotRadius, color, alpha);
    }
  }
}

function drawCrossHatch(buffer, width, height, x, y, w, h, spacing, color, alpha = 0.08) {
  const step = Math.max(10, Math.round(spacing));
  for (let offset = -h; offset < w; offset += step) {
    drawLine(buffer, width, height, x + offset, y, x + offset + h, y + h, 1, color, alpha);
  }
  for (let offset = 0; offset < w + h; offset += step + 6) {
    drawLine(buffer, width, height, x + offset, y, x + offset - h, y + h, 1, color, alpha * 0.7);
  }
}

function fillVerticalGradient(buffer, width, height, x, y, w, h, topColor, bottomColor, alpha = 1, steps = 28) {
  const bands = Math.max(6, Math.round(steps));
  for (let step = 0; step < bands; step += 1) {
    const t0 = step / bands;
    const t1 = (step + 1) / bands;
    const color = [
      Math.round(lerp(topColor[0], bottomColor[0], t0)),
      Math.round(lerp(topColor[1], bottomColor[1], t0)),
      Math.round(lerp(topColor[2], bottomColor[2], t0))
    ];
    fillRect(buffer, width, height, x, y + (h * t0), w, Math.max(2, h * (t1 - t0) + 1), color, alpha);
  }
}

function drawCloudCluster(buffer, width, height, cx, cy, scale, color, alpha = 0.85) {
  fillCircle(buffer, width, height, cx - 38 * scale, cy + 10 * scale, 24 * scale, color, alpha);
  fillCircle(buffer, width, height, cx, cy, 32 * scale, color, alpha);
  fillCircle(buffer, width, height, cx + 34 * scale, cy + 8 * scale, 23 * scale, color, alpha);
  fillCircle(buffer, width, height, cx - 6 * scale, cy + 12 * scale, 28 * scale, color, alpha * 0.9);
}

function drawPosterCard(buffer, width, height, x, y, w, h, accent, body, alpha = 0.95) {
  fillRect(buffer, width, height, x, y, w, h, [247, 243, 234], alpha);
  strokeRect(buffer, width, height, x, y, w, h, 2, [203, 192, 170], 0.72);
  fillRect(buffer, width, height, x + w * 0.08, y + h * 0.1, w * 0.54, h * 0.1, accent, 0.88);
  for (let line = 0; line < 4; line += 1) {
    fillRect(buffer, width, height, x + w * 0.1, y + h * (0.34 + line * 0.12), w * (0.64 - (line % 2) * 0.12), Math.max(2, h * 0.028), body, 0.48 + (line % 2) * 0.08);
  }
  fillRect(buffer, width, height, x + w * 0.72, y + h * 0.68, w * 0.16, h * 0.08, accent, 0.72);
}

function drawPottedPlant(buffer, width, height, x, y, scale, leafColor, potColor) {
  fillRect(buffer, width, height, x - 18 * scale, y, 36 * scale, 24 * scale, potColor, 0.95);
  fillRect(buffer, width, height, x - 12 * scale, y - 36 * scale, 6 * scale, 38 * scale, [92, 110, 84], 0.8);
  fillRect(buffer, width, height, x + 6 * scale, y - 32 * scale, 6 * scale, 34 * scale, [92, 110, 84], 0.8);
  fillCircle(buffer, width, height, x - 18 * scale, y - 42 * scale, 18 * scale, leafColor, 0.92);
  fillCircle(buffer, width, height, x + 18 * scale, y - 38 * scale, 16 * scale, leafColor, 0.88);
  fillCircle(buffer, width, height, x, y - 58 * scale, 21 * scale, leafColor, 0.94);
}

function applyComicGrade(buffer, width, height, shotType, profile, progress) {
  drawCrossHatch(buffer, width, height, width * 0.04, height * 0.68, width * 0.92, height * 0.28, 34, [96, 92, 78], 0.055);
  drawHalftoneDots(buffer, width, height, width * 0.04, height * 0.06, width * 0.92, height * 0.28, 18, 1.2, [255, 255, 255], 0.055);
  if (/closeup|medium|over_shoulder/.test(shotType || "")) {
    drawCrossHatch(buffer, width, height, width * 0.08, height * 0.18, width * 0.84, height * 0.26, 24, [124, 134, 146], 0.06);
  }
  if (profile?.overlays?.warningBoard || /villain|reaction/.test(shotType || "")) {
    drawHalftoneDots(buffer, width, height, width * 0.62, height * 0.12, width * 0.24, height * 0.18, 16, 1.4, [123, 77, 26], 0.08);
  }
  strokeRect(buffer, width, height, width * 0.015, height * 0.015, width * 0.97, height * 0.97, 3, [25, 30, 38], 0.18 + progress * 0.04);
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

function findCharacterPerformance(shotPerformance = {}, member = {}) {
  return (shotPerformance.performances || []).find((entry) => (
    (entry.character_id && entry.character_id === member.character_id)
    || (entry.actor_id && entry.actor_id === member.cast_member_id)
    || (entry.role && entry.role === member.role)
  )) || null;
}

function findActiveAction(characterPerformance = {}, timeSeconds = 0) {
  const actions = characterPerformance?.actions || [];
  return actions.find((action) => timeSeconds >= Number(action.start || 0) && timeSeconds <= Number(action.end || 0)) || actions[0] || null;
}

function applyEaseByName(name, value) {
  const t = clamp(value, 0, 1);
  switch (String(name || "").toLowerCase()) {
    case "linear":
      return t;
    case "ease_in":
      return t * t;
    case "ease_out":
      return 1 - ((1 - t) * (1 - t));
    default:
      return easeInOut(t);
  }
}

function windowEnvelope(timeSeconds, startSeconds, endSeconds, fadeSeconds = 0.12) {
  const fade = Math.max(0.04, Number(fadeSeconds || 0));
  if (timeSeconds < startSeconds || timeSeconds > endSeconds) {
    return 0;
  }
  const inAmount = smoothstep(startSeconds, startSeconds + fade, timeSeconds);
  const outAmount = 1 - smoothstep(endSeconds - fade, endSeconds, timeSeconds);
  return clamp(Math.min(inAmount, outAmount), 0, 1);
}

function propTypeForTrack(propTrack = {}, member = {}) {
  const propId = String(propTrack.prop_id || "");
  if (propId.includes("PHONE")) {
    return "phone";
  }
  if (propId.includes("CONTRACT")) {
    return "contract";
  }
  if (propId.includes("FOLDER")) {
    return "folder";
  }
  if (propId.includes("BOX")) {
    return "moving_box";
  }
  return rolePalette(member.role).prop || null;
}

function cameraStateForFrame(progress, shotPerformance = {}, motionDirectives = []) {
  const motions = new Set((motionDirectives || []).map((item) => item.type || item));
  const recipe = shotPerformance.camera_recipe || {};
  const startScale = Number(recipe.start_scale || 1);
  const endScale = Number(recipe.end_scale || 1.06);
  const eased = applyEaseByName(recipe.easing || "ease_in_out", progress);
  const movement = String(recipe.movement || "").toLowerCase();
  const angleProfile = String(recipe.angle_profile || "documentary_eye_level").toLowerCase();
  const overshoot = Number(recipe.overshoot || 0);
  const parallaxStrength = Number(recipe.parallax_strength || 0.32);
  const pushScale = lerp(startScale, endScale + overshoot, eased);
  const drift = motions.has("idle_drift") ? Math.sin(progress * Math.PI * 2) : 0;

  let offsetX = 0;
  let offsetY = 0;
  if (movement.includes("pan_left")) {
    offsetX = lerp(18, -22, eased);
  } else if (movement.includes("pan_right")) {
    offsetX = lerp(-18, 22, eased);
  } else if (movement.includes("push")) {
    offsetY = lerp(10, -10, eased);
  } else {
    offsetX = drift * 8;
    offsetY = Math.cos(progress * Math.PI * 2) * 5;
  }

  offsetX += drift * parallaxStrength * 18;
  offsetY += Math.cos(progress * Math.PI * 2) * parallaxStrength * 10;

  if (angleProfile === "closeup_eye_level") {
    offsetY -= 18;
  } else if (angleProfile === "medium_explainer") {
    offsetY -= 10;
  } else if (angleProfile === "dialogue_two_shot") {
    offsetX += Math.sin(progress * Math.PI * 1.5) * 5;
  } else if (angleProfile === "top_down_insert") {
    offsetY -= 44;
    offsetX += Math.sin(progress * Math.PI * 2) * 2;
  } else if (angleProfile === "document_push_in") {
    offsetY -= 36;
  } else if (angleProfile === "villain_low_angle") {
    offsetY += 18;
  } else if (angleProfile === "reaction_punch_in") {
    offsetX += Math.sin(progress * Math.PI * 3) * 4;
    offsetY -= 12;
  } else if (angleProfile === "wide_establish") {
    offsetY -= 4;
  }

  return {
    scale: clamp(pushScale + (angleProfile.includes("document") ? 0.04 : angleProfile.includes("closeup") ? 0.03 : 0), 1, 1.22),
    offsetX,
    offsetY,
    angleProfile
  };
}

function blinkAmount(progress, profile, characterIndex, actionName) {
  const cycle = profile === "cinematic_readable" ? 0.48 : 0.34;
  const width = profile === "cinematic_readable" ? 0.03 : 0.02;
  const shifted = (progress + characterIndex * 0.11) % cycle;
  const scheduled = shifted > (cycle - width) ? smoothstep(cycle - width, cycle, shifted) : 0;
  const forced = /blink|double_take/.test(actionName || "") ? smoothstep(0.12, 0.24, progress) * (1 - smoothstep(0.28, 0.4, progress)) : 0;
  return clamp(Math.max(scheduled, forced), 0, 1);
}

function talkState(progress, mode, mouthTrack, actionName) {
  if (!mouthTrack && !/talk/.test(actionName || "")) {
    return { openness: 0, width: 0, round: 0 };
  }
  const multiplier = mode === "viseme_emphasis" ? 11 : mode === "talk_cycles" ? 8 : 5;
  const waveA = (Math.sin(progress * Math.PI * multiplier) + 1) * 0.5;
  const waveB = (Math.sin(progress * Math.PI * (multiplier * 0.5) + 0.75) + 1) * 0.5;
  const openness = clamp((waveA * 0.8) + (waveB * 0.25), 0, 1);
  return {
    openness,
    width: clamp((1 - waveA) * 0.7 + 0.2, 0.2, 1),
    round: clamp(waveB * (mode === "viseme_emphasis" ? 0.75 : 0.45), 0, 1)
  };
}

function gestureEnvelope(progress, actionName, gestureProfile) {
  const action = String(actionName || "").toLowerCase();
  const profile = String(gestureProfile || "").toLowerCase();
  const emphasis = easeInOut(smoothstep(0.18, 0.7, progress));
  return {
    point: /point|explainer|host_explainer/.test(profile) ? emphasis : 0,
    reveal: /hand_over_document/.test(action) || /prop_reveal/.test(profile) ? emphasis : 0,
    showmanship: /villain/.test(action) || /showmanship/.test(profile) ? emphasis : 0,
    reaction: /double_take/.test(action) ? smoothstep(0.12, 0.42, progress) : 0,
    idleLift: /idle_support|idle_basic/.test(profile) ? smoothstep(0.4, 0.7, progress) * 0.18 : 0
  };
}

function buildPerformanceFrameState({
  member,
  shot,
  shotPerformance = {},
  motionDirectives = [],
  progress = 0,
  memberIndex = 0
}) {
  const motions = new Set((motionDirectives || []).map((item) => item.type || item));
  const role = member.role || "";
  const durationSeconds = Math.max(0.1, Number(shotPerformance.duration_seconds || 0) || Math.max(0.1, Number(shot.end || 0) - Number(shot.start || 0)));
  const timeSeconds = progress * durationSeconds;
  const characterPerformance = findCharacterPerformance(shotPerformance, member);
  const action = findActiveAction(characterPerformance, timeSeconds);
  const actionName = String(action?.action || "");
  const talk = talkState(progress, shotPerformance.mouth_sync_mode, Boolean(characterPerformance?.mouth_track), actionName);
  const gestures = gestureEnvelope(progress, actionName, characterPerformance?.gesture_profile);
  const reaction = /double_take/.test(actionName) ? 1 : 0;
  const headMotionProfile = String(shotPerformance.head_motion_profile || "");
  const timing = shotPerformance.timing_windows || {};
  const emphasisPulse = windowEnvelope(
    timeSeconds,
    Number(timing.emphasis_start || durationSeconds * 0.34),
    Number(timing.emphasis_end || durationSeconds * 0.74),
    durationSeconds * 0.08
  );
  const revealPulse = windowEnvelope(
    timeSeconds,
    Number(timing.setup_end || durationSeconds * 0.22),
    Number(timing.release_start || durationSeconds * 0.86),
    durationSeconds * 0.1
  );
  const propTrack = characterPerformance?.prop_track || {};
  const propInteraction = String(propTrack.interaction || "none");
  const propType = propTypeForTrack(propTrack, member);
  const headTurn = /readable_turns/.test(headMotionProfile)
    ? Math.sin(progress * Math.PI * 1.6 + memberIndex * 0.4) * 0.55
    : Math.sin(progress * Math.PI * 1.1 + memberIndex * 0.4) * 0.18;
  const headBob = talk.openness * (/closeup|medium/.test(shot.shot_type || "") ? 5 : 2.5);
  const eyebrowLift = role === "worried_customer" ? 0.55 + reaction * 0.35 : role === "schemer_villain" ? 0.2 : 0.35;
  const eyebrowTilt = role === "schemer_villain" ? 0.55 : role === "worried_customer" ? -0.45 : 0;

  return {
    blinkAmount: motions.has("blink_pass") ? blinkAmount(progress, shotPerformance.blink_profile, memberIndex, actionName) : 0,
    talkOffsetY: headBob,
    mouthOpen: talk.openness,
    mouthWidth: talk.width,
    mouthRound: talk.round,
    recoil: role === "worried_customer" ? Math.max(reaction * 0.85, smoothstep(0.55, 0.8, progress) * 0.25) : 0,
    villainRaise: role === "schemer_villain" ? Math.max(gestures.showmanship, easeInOut(smoothstep(0.28, 0.62, progress)) * 0.3) : 0,
    revealFolder: role === "investigator" ? Math.max(gestures.reveal, easeInOut(smoothstep(0.3, 0.65, progress)) * 0.4) : 0,
    phoneGlow: role === "worried_customer" ? 0.35 + Math.sin(progress * Math.PI * 5) * 0.2 : 0,
    headTurn,
    headBob,
    eyebrowLift,
    eyebrowTilt,
    eyeScale: role === "worried_customer" ? 1 + reaction * 0.35 : 1,
    bodyLean: role === "schemer_villain" ? gestures.showmanship * 0.18 : role === "worried_customer" ? -reaction * 0.1 : 0,
    point: gestures.point,
    gestureLift: Math.max(gestures.showmanship, gestures.reveal, gestures.point, gestures.idleLift),
    propType,
    propInteraction,
    propReveal: /reveal|present/.test(propInteraction) ? Math.max(emphasisPulse, revealPulse * 0.55) : revealPulse * 0.35,
    propCarry: /hold|phone|supporting|present/.test(propInteraction) ? Math.max(0.35, revealPulse) : 0,
    propCarrySide: propTrack.carry_side || "right",
    phoneRaise: propInteraction === "phone_check" ? Math.max(0.45, revealPulse) : 0,
    contractPresent: propInteraction === "villain_contract_present" ? Math.max(emphasisPulse, gestures.showmanship) : 0,
    boxCarry: propType === "moving_box" ? Math.max(0.4, revealPulse) : 0,
    timingEmphasis: emphasisPulse,
    reaction,
    actionName,
    gestureProfile: characterPerformance?.gesture_profile || null,
    screenPosition: characterPerformance?.screen_position || null,
    secondaryAction: shotPerformance.secondary_action || null
  };
}

function sceneEnvironmentProfile(sceneCard = {}, shotType = "", progress = 0) {
  const sceneId = String(sceneCard.scene_id || "").toUpperCase();
  const context = `${sceneCard.title || ""} ${sceneCard.narration || ""}`.toLowerCase();
  const seed = hashString(context || shotType || "scene");
  const variant = seed % 3;
  if (/basic service is already underway|walk away|high-pressure situation/.test(context) || sceneId === "S01") {
    return {
      name: "hook_service_lot",
      sky: [128, 191, 232],
      ground: [101, 111, 86],
      structure: [233, 225, 201],
      accent: [67, 108, 153],
      window: [114, 174, 221],
      door: [107, 82, 58],
      overlays: { awning: true, curbBand: true, serviceTruck: true, movingBoxes: true, cautionTape: true, skyline: true },
      pulse: 0.06 + (Math.sin(progress * Math.PI * 1.6) * 0.03),
      variant
    };
  }
  if (/legitimate business|clear estimate|clear paperwork|reliability|honest version|normal business workflow/.test(context) || sceneId === "S02") {
    return {
      name: "legit_front_office",
      sky: [214, 225, 236],
      ground: [124, 130, 118],
      structure: [237, 233, 218],
      accent: [175, 161, 94],
      window: [207, 225, 238],
      door: [108, 96, 78],
      overlays: { deskBand: true, officeBands: true, serviceCounter: true, estimateBoard: true, cleanLighting: true },
      pulse: 0.05 + (Math.sin(progress * Math.PI * 2.2) * 0.025),
      variant
    };
  }
  if (/hack|cyber|server|breach|email|data|laptop|typing/.test(context)) {
    return {
      name: "cyber_room",
      sky: [40, 58, 86],
      ground: [23, 31, 44],
      structure: [55, 68, 91],
      accent: [82, 214, 166],
      window: [113, 182, 255],
      door: [31, 42, 61],
      overlays: { monitorGrid: true, sidePanels: true, statusPulse: true },
      pulse: 0.12 + (Math.sin(progress * Math.PI * 4) * 0.08),
      variant
    };
  }
  if (/viewer|lesson|watch|takeaway|protect|advice|tips|red flag/.test(context)) {
    return {
      name: "viewer_briefing",
      sky: [139, 193, 208],
      ground: [76, 90, 88],
      structure: [230, 225, 203],
      accent: [47, 84, 97],
      window: [190, 220, 221],
      door: [95, 82, 64],
      overlays: { deskBand: true, checklistBoard: true, officeBands: true, bigChecklist: true, consumerDesk: true },
      pulse: 0.09 + (Math.sin(progress * Math.PI * 2.5) * 0.03),
      variant
    };
  }
  if (/pressure|warning|fee|invoice|bill|leverage|deadline|risk|urgent/.test(context)) {
    return {
      name: "pressure_scene",
      sky: [214, 168, 91],
      ground: [122, 85, 45],
      structure: [208, 181, 129],
      accent: [179, 61, 31],
      window: [246, 217, 127],
      door: [104, 68, 39],
      overlays: { hazardStripe: true, warningBoard: true, sidePanels: true, storageShelves: true, invoiceBoard: true, chainGate: true },
      pulse: 0.18 + (Math.sin(progress * Math.PI * 3) * 0.06),
      variant
    };
  }
  if (/wording has to match the evidence exactly|alleged cannot become proven|lawsuit claim|strong sourcing matters/.test(context) || sceneId === "S05") {
    return {
      name: "editorial_review",
      sky: [185, 198, 214],
      ground: [92, 98, 104],
      structure: [225, 226, 220],
      accent: [116, 54, 43],
      window: [179, 199, 221],
      door: [82, 78, 71],
      overlays: { monitorGrid: true, sidePanels: true, redlineBoard: true, documentWall: true, deskBand: true },
      pulse: 0.1 + (Math.sin(progress * Math.PI * 2.4) * 0.04),
      variant
    };
  }
  if (/proof|evidence|police|court|investigat|report|document|paperwork/.test(context) || /document_insert|push_in_document/.test(shotType)) {
    return {
      name: "evidence_room",
      sky: [185, 204, 221],
      ground: [106, 109, 104],
      structure: [220, 223, 214],
      accent: [71, 96, 126],
      window: [174, 204, 225],
      door: [88, 73, 58],
      overlays: { briefingBoard: true, evidenceBoxes: true, ceilingBand: true, fileShelves: true, spotlight: true },
      pulse: 0.08 + (Math.sin(progress * Math.PI * 2) * 0.03),
      variant
    };
  }
  if (/move|truck|home|house|customer|service|business|company|office|store/.test(context)) {
    return {
      name: "service_exterior",
      sky: [124, 196, 238],
      ground: [103, 111, 81],
      structure: [234, 224, 197],
      accent: [68, 109, 151],
      window: [108, 173, 220],
      door: [110, 84, 59],
      overlays: { awning: true, curbBand: true, sidewalkCard: true },
      pulse: 0.05 + (Math.sin(progress * Math.PI * 1.5) * 0.02),
      variant
    };
  }
  return {
    name: "neutral_story",
    sky: [146, 185, 206],
    ground: [91, 99, 84],
    structure: [224, 214, 189],
    accent: [87, 106, 128],
    window: [146, 193, 222],
    door: [110, 84, 59],
    overlays: { officeBands: true },
    pulse: 0.06 + (Math.sin(progress * Math.PI * 2) * 0.02),
    variant
  };
}

function drawBackground(buffer, width, height, shotType, sceneCard, progress, impact, cameraState = { offsetX: 0, offsetY: 0, scale: 1 }) {
  const topDown = /top_down/.test(shotType) || cameraState.angleProfile === "top_down_insert";
  const profile = sceneEnvironmentProfile(sceneCard, shotType, progress);
  const seed = hashString(`${profile.name}:${sceneCard.scene_id || "scene"}:${shotType}`);
  const sky = topDown ? [215, 227, 237] : profile.sky;
  const variant = Number(profile.variant || 0);
  const doorX = variant === 0 ? 0.43 : variant === 1 ? 0.28 : 0.58;
  const leftWindowX = variant === 0 ? 0.18 : variant === 1 ? 0.12 : 0.24;
  const rightWindowX = variant === 0 ? 0.59 : variant === 1 ? 0.66 : 0.54;
  const facadeY = variant === 2 ? 0.14 : 0.16;
  const facadeH = variant === 1 ? 0.4 : 0.38;
  createCanvas(width, height, sky).copy(buffer);
  const dx = cameraState.offsetX || 0;
  const dy = cameraState.offsetY || 0;
  drawSpeckleTexture(buffer, width, height, 0, 0, width, height * 0.62, seed, 22, [255, 255, 255], 0.06);
  if (topDown) {
    fillRect(buffer, width, height, width * 0.08 + dx * 0.2, height * 0.14 + dy * 0.15, width * 0.84, height * 0.7, [227, 216, 190]);
    fillRect(buffer, width, height, width * 0.14 + dx * 0.25, height * 0.22 + dy * 0.18, width * 0.72, height * 0.48, [243, 238, 224]);
    strokeRect(buffer, width, height, width * 0.08 + dx * 0.2, height * 0.14 + dy * 0.15, width * 0.84, height * 0.7, 3, [192, 179, 151], 0.9);
    strokeRect(buffer, width, height, width * 0.14 + dx * 0.25, height * 0.22 + dy * 0.18, width * 0.72, height * 0.48, 2, [221, 212, 192], 0.9);
    fillRect(buffer, width, height, width * 0.2 + dx * 0.25, height * 0.28 + dy * 0.18, width * 0.18, height * 0.1, profile.accent);
    drawDocumentDetail(buffer, width, height, width * 0.42 + dx * 0.25, height * 0.52 + dy * 0.18, width * 0.26, height * 0.11, profile.accent, [132, 140, 150], 0.95);
    fillRect(buffer, width, height, width * 0.18, height * 0.26, width * 0.02, height * 0.42, [206, 194, 170], 0.5);
    fillRect(buffer, width, height, width * 0.8, height * 0.26, width * 0.02, height * 0.42, [206, 194, 170], 0.5);
    for (let row = 0; row < 6; row += 1) {
      fillRect(buffer, width, height, width * 0.22, height * (0.31 + row * 0.055), width * 0.46, height * 0.004, [212, 204, 190], 0.45);
    }
    if (profile.overlays.briefingBoard || profile.overlays.checklistBoard) {
      fillRect(buffer, width, height, width * 0.58, height * 0.28, width * 0.16, height * 0.14, profile.accent, 0.82);
    }
    if (profile.overlays.redlineBoard) {
      fillRect(buffer, width, height, width * 0.57, height * 0.28, width * 0.18, height * 0.16, [241, 232, 225], 0.95);
      fillRect(buffer, width, height, width * 0.595, height * 0.315, width * 0.11, height * 0.008, [184, 72, 58], 0.92);
      fillRect(buffer, width, height, width * 0.595, height * 0.34, width * 0.09, height * 0.008, [184, 72, 58], 0.75);
    }
    if (profile.overlays.monitorGrid) {
      fillRect(buffer, width, height, width * 0.26, height * 0.48, width * 0.44, height * 0.08, [31, 42, 61], 0.88);
      fillRect(buffer, width, height, width * 0.29, height * 0.505, width * (0.1 + progress * 0.12), height * 0.012, profile.accent, 0.92);
      drawPanelGrid(buffer, width, height, width * 0.26, height * 0.48, width * 0.44, height * 0.08, 3, 6, [90, 110, 133], 0.35);
    }
    fillRect(buffer, width, height, width * 0.08 + dx * 0.15, height * 0.14 + dy * 0.12, width * 0.84, height * 0.7, [255, 255, 255], 0.03 + progress * 0.03);
    drawSpeckleTexture(buffer, width, height, width * 0.14, height * 0.22, width * 0.72, height * 0.48, seed, 18, [156, 146, 122], 0.06);
    return;
  }
  if (profile.name === "legit_front_office") {
    fillVerticalGradient(buffer, width, height, 0, 0, width, height * 0.58, [236, 239, 243], [202, 211, 222], 1, 24);
    fillVerticalGradient(buffer, width, height, 0, height * 0.58, width, height * 0.42, [123, 127, 118], [94, 99, 88], 1, 18);
    drawPerspectiveFloor(buffer, width, height, height * 0.62, [219, 214, 202], 0.08);
    drawHalftoneDots(buffer, width, height, width * 0.08, height * 0.07, width * 0.84, height * 0.16, 18, 1.1, [255, 255, 255], 0.05);
    drawCrossHatch(buffer, width, height, width * 0.08, height * 0.62, width * 0.84, height * 0.28, 28, [102, 104, 98], 0.045);

    fillRect(buffer, width, height, width * 0.04, height * 0.14, width * 0.24, height * 0.36, [223, 228, 232], 0.9);
    fillRect(buffer, width, height, width * 0.72, height * 0.12, width * 0.22, height * 0.34, [223, 228, 232], 0.88);
    fillRect(buffer, width, height, width * 0.08, height * 0.18, width * 0.16, height * 0.22, [189, 212, 229], 0.94);
    fillRect(buffer, width, height, width * 0.76, height * 0.16, width * 0.14, height * 0.2, [189, 212, 229], 0.94);
    strokeRect(buffer, width, height, width * 0.08, height * 0.18, width * 0.16, height * 0.22, 2, [243, 248, 252], 0.52);
    strokeRect(buffer, width, height, width * 0.76, height * 0.16, width * 0.14, height * 0.2, 2, [243, 248, 252], 0.48);
    drawPanelGrid(buffer, width, height, width * 0.08, height * 0.18, width * 0.16, height * 0.22, 3, 3, [228, 237, 244], 0.38);
    drawPanelGrid(buffer, width, height, width * 0.76, height * 0.16, width * 0.14, height * 0.2, 3, 3, [228, 237, 244], 0.34);

    fillRect(buffer, width, height, width * 0.18 + dx * 0.18, height * 0.42 + dy * 0.12, width * 0.5, height * 0.18, [210, 190, 155], 0.98);
    fillRect(buffer, width, height, width * 0.18 + dx * 0.18, height * 0.4 + dy * 0.08, width * 0.5, height * 0.025, [245, 241, 230], 0.98);
    fillRect(buffer, width, height, width * 0.22 + dx * 0.18, height * 0.45 + dy * 0.12, width * 0.16, height * 0.018, [175, 162, 91], 0.72);
    fillRect(buffer, width, height, width * 0.5 + dx * 0.18, height * 0.445 + dy * 0.12, width * 0.12, height * 0.02, [70, 83, 102], 0.84);
    strokeRect(buffer, width, height, width * 0.18 + dx * 0.18, height * 0.42 + dy * 0.12, width * 0.5, height * 0.18, 3, [154, 134, 104], 0.52);

    fillRect(buffer, width, height, width * 0.28, height * 0.19, width * 0.26, height * 0.06, [249, 246, 239], 0.98);
    fillRect(buffer, width, height, width * 0.31, height * 0.21, width * 0.2, height * 0.016, [175, 161, 94], 0.88);
    strokeRect(buffer, width, height, width * 0.28, height * 0.19, width * 0.26, height * 0.06, 2, [203, 192, 170], 0.58);

    drawPosterCard(buffer, width, height, width * 0.61, height * 0.26, width * 0.17, height * 0.14, [95, 112, 127], [129, 139, 149], 0.94);
    drawPosterCard(buffer, width, height, width * 0.12, height * 0.24, width * 0.12, height * 0.11, [175, 161, 94], [129, 139, 149], 0.92);
    drawPottedPlant(buffer, width, height, width * 0.81, height * 0.61, 1.2, [83, 142, 99], [168, 132, 86]);

    fillRect(buffer, width, height, width * 0.06, height * 0.52, width * 0.07, height * 0.18, [132, 116, 92], 0.86);
    for (let shelf = 0; shelf < 3; shelf += 1) {
      fillRect(buffer, width, height, width * 0.06, height * (0.55 + shelf * 0.05), width * 0.09, height * 0.008, [173, 151, 120], 0.92);
      fillRect(buffer, width, height, width * 0.075, height * (0.525 + shelf * 0.05), width * 0.015, height * 0.024, [84, 122 + shelf * 12, 171], 0.78);
      fillRect(buffer, width, height, width * 0.097, height * (0.525 + shelf * 0.05), width * 0.018, height * 0.024, [213, 189, 118], 0.82);
    }

    fillRect(buffer, width, height, width * 0.74, height * 0.47, width * 0.08, height * 0.12, [226, 215, 189], 0.92);
    fillRect(buffer, width, height, width * 0.755, height * 0.49, width * 0.05, height * 0.018, [246, 243, 234], 0.92);
    fillRect(buffer, width, height, width * 0.765, height * 0.53, width * 0.03, height * 0.008, [175, 161, 94], 0.78);
    strokeRect(buffer, width, height, width * 0.74, height * 0.47, width * 0.08, height * 0.12, 2, [174, 156, 128], 0.48);

    fillCircle(buffer, width, height, width * 0.24, height * 0.12, width * 0.045, [255, 248, 232], 0.12);
    fillCircle(buffer, width, height, width * 0.74, height * 0.12, width * 0.04, [255, 248, 232], 0.1);
    fillRect(buffer, width, height, width * 0.04, height * 0.14, width * 0.9, height * 0.36, [255, 255, 255], 0.035 + progress * 0.03);

    if (/closeup_face|medium_single|medium_two_shot|over_shoulder/.test(shotType || "")) {
      fillRect(buffer, width, height, width * 0.06, height * 0.64, width * 0.88, height * 0.08, [214, 199, 168], 0.96);
      strokeRect(buffer, width, height, width * 0.06, height * 0.64, width * 0.88, height * 0.08, 2, [162, 140, 112], 0.42);
      fillRect(buffer, width, height, width * 0.1, height * 0.645, width * 0.15, height * 0.026, [243, 238, 228], 0.9);
      fillRect(buffer, width, height, width * 0.76, height * 0.648, width * 0.08, height * 0.02, [54, 67, 86], 0.88);
      fillRect(buffer, width, height, width * 0.67, height * 0.22, width * 0.16, height * 0.18, [244, 241, 233], 0.92);
      strokeRect(buffer, width, height, width * 0.67, height * 0.22, width * 0.16, height * 0.18, 2, [205, 194, 168], 0.58);
    }
    return;
  }
  fillRect(buffer, width, height, 0, height * 0.62 + impact + dy * 0.4, width, height * 0.38, profile.ground);
  fillRect(buffer, width, height, width * 0.11 + dx * 0.45, height * facadeY + dy * 0.25, width * 0.78, height * facadeH, profile.structure);
  fillRect(buffer, width, height, width * 0.2 + dx * 0.6, height * 0.22 + dy * 0.3, width * 0.56, height * 0.07, profile.accent);
  fillRect(buffer, width, height, width * leftWindowX + dx * 0.75, height * (0.32 + variant * 0.01) + dy * 0.2, width * 0.18, height * 0.14, profile.window);
  fillRect(buffer, width, height, width * rightWindowX + dx * 0.75, height * (0.31 + (2 - variant) * 0.012) + dy * 0.2, width * 0.18, height * 0.14, profile.window);
  fillRect(buffer, width, height, width * doorX + dx * 0.7, height * (0.34 + variant * 0.02) + dy * 0.25, width * 0.14, height * 0.28, profile.door);
  strokeRect(buffer, width, height, width * 0.11 + dx * 0.45, height * facadeY + dy * 0.25, width * 0.78, height * facadeH, 3, [192, 180, 152], 0.88);
  strokeRect(buffer, width, height, width * 0.2 + dx * 0.6, height * 0.22 + dy * 0.3, width * 0.56, height * 0.07, 2, [49, 67, 95], 0.42);
  drawBrickPattern(buffer, width, height, width * 0.11 + dx * 0.45, height * facadeY + dy * 0.25, width * 0.78, height * facadeH, width * 0.08, height * 0.038, [198, 189, 165], 0.16);
  drawPerspectiveFloor(buffer, width, height, height * 0.71, [233, 226, 197], 0.07);
  drawSpeckleTexture(buffer, width, height, width * 0.11, height * facadeY, width * 0.78, height * facadeH, seed, 20, [255, 255, 255], 0.05);
  drawCrossHatch(buffer, width, height, width * 0.12 + dx * 0.2, height * (facadeY + 0.02), width * 0.76, height * (facadeH - 0.04), 26, [178, 168, 140], 0.045);
  drawHalftoneDots(buffer, width, height, width * 0.12, height * 0.08, width * 0.76, height * 0.16, 20, 1.2, [255, 255, 255], 0.045);
  if (profile.name === "hook_service_lot") {
    fillRect(buffer, width, height, width * 0.37, height * 0.5, width * 0.26, height * 0.1, [244, 236, 214], 0.94);
    fillRect(buffer, width, height, width * 0.395, height * 0.53, width * 0.21, height * 0.018, profile.accent, 0.86);
    fillRect(buffer, width, height, width * 0.42, height * 0.56, width * 0.07, height * 0.06, [177, 132, 76], 0.95);
    fillRect(buffer, width, height, width * 0.5, height * 0.54, width * 0.06, height * 0.08, [190, 146, 86], 0.95);
  } else if (profile.name === "legit_front_office") {
    fillRect(buffer, width, height, width * 0.37, height * 0.48, width * 0.26, height * 0.14, [214, 199, 168], 0.95);
    fillRect(buffer, width, height, width * 0.4, height * 0.43, width * 0.2, height * 0.045, [248, 245, 236], 0.96);
    fillRect(buffer, width, height, width * 0.47, height * 0.37, width * 0.06, height * 0.05, [42, 55, 74], 0.95);
    fillRect(buffer, width, height, width * 0.45, height * 0.52, width * 0.11, height * 0.012, [176, 162, 91], 0.82);
  } else if (profile.name === "pressure_scene") {
    fillRect(buffer, width, height, width * 0.36, height * 0.47, width * 0.28, height * 0.14, [246, 238, 214], 0.95);
    fillRect(buffer, width, height, width * 0.39, height * 0.505, width * 0.22, height * 0.02, [188, 62, 34], 0.88);
    fillRect(buffer, width, height, width * 0.42, height * 0.55, width * 0.16, height * 0.018, [120, 74, 42], 0.75);
    drawLine(buffer, width, height, width * 0.34, height * 0.6, width * 0.66, height * 0.52, 6, [244, 210, 76], 0.68);
  } else if (profile.name === "evidence_room") {
    fillRect(buffer, width, height, width * 0.37, height * 0.42, width * 0.26, height * 0.18, [223, 194, 141], 0.95);
    fillRect(buffer, width, height, width * 0.395, height * 0.45, width * 0.05, height * 0.04, [241, 234, 220], 0.92);
    fillRect(buffer, width, height, width * 0.5, height * 0.47, width * 0.07, height * 0.05, [241, 234, 220], 0.92);
    drawLine(buffer, width, height, width * 0.44, height * 0.49, width * 0.53, height * 0.52, 3, [161, 76, 54], 0.8);
  } else if (profile.name === "editorial_review") {
    fillRect(buffer, width, height, width * 0.36, height * 0.45, width * 0.28, height * 0.15, [34, 45, 58], 0.96);
    fillRect(buffer, width, height, width * 0.39, height * 0.48, width * 0.22, height * 0.09, [214, 224, 233], 0.92);
    fillRect(buffer, width, height, width * 0.41, height * 0.5, width * 0.17, height * 0.01, [184, 72, 58], 0.88);
    fillRect(buffer, width, height, width * 0.41, height * 0.53, width * 0.12, height * 0.01, [184, 72, 58], 0.72);
  } else if (profile.name === "viewer_briefing") {
    fillRect(buffer, width, height, width * 0.38, height * 0.42, width * 0.24, height * 0.22, [244, 242, 232], 0.96);
    for (let item = 0; item < 4; item += 1) {
      fillRect(buffer, width, height, width * 0.41, height * (0.46 + item * 0.04), width * 0.015, height * 0.015, [78, 152, 109], 0.92);
      fillRect(buffer, width, height, width * 0.435, height * (0.462 + item * 0.04), width * 0.12, height * 0.01, [97, 111, 125], 0.7);
    }
  }
  fillRect(buffer, width, height, width * 0.11 + dx * 0.45, height * (facadeY + facadeH) + dy * 0.25, width * 0.78, height * 0.012, [190, 177, 149], 0.9);
  for (let frameX = 0; frameX < 3; frameX += 1) {
    const x = width * (leftWindowX + frameX * 0.06) + dx * 0.75;
    fillRect(buffer, width, height, x, height * (0.32 + variant * 0.01) + dy * 0.2, width * 0.003, height * 0.14, [226, 238, 247], 0.55);
  }
  for (let frameX = 0; frameX < 3; frameX += 1) {
    const x = width * (rightWindowX + frameX * 0.06) + dx * 0.75;
    fillRect(buffer, width, height, x, height * (0.31 + (2 - variant) * 0.012) + dy * 0.2, width * 0.003, height * 0.14, [226, 238, 247], 0.55);
  }
  if (variant === 1) {
    fillRect(buffer, width, height, width * 0.12, height * 0.5, width * 0.18, height * 0.1, [244, 236, 214], 0.86);
  }
  if (variant === 2) {
    fillRect(buffer, width, height, width * 0.74, height * 0.49, width * 0.1, height * 0.12, [234, 229, 210], 0.84);
  }
  if (profile.overlays.sidePanels) {
    fillRect(buffer, width, height, width * 0.02 + dx * 0.18, height * 0.2, width * 0.08, height * 0.32, profile.accent, 0.45);
    fillRect(buffer, width, height, width * 0.9 + dx * 0.18, height * 0.2, width * 0.06, height * 0.32, profile.accent, 0.38);
  }
  if (profile.overlays.officeBands || profile.overlays.ceilingBand) {
    fillRect(buffer, width, height, width * 0.11, height * 0.14, width * 0.78, height * 0.035, [255, 255, 255], 0.18);
  }
  if (profile.overlays.warningBoard) {
    fillRect(buffer, width, height, width * 0.62, height * 0.2, width * 0.16, height * 0.1, [244, 214, 83], 0.95);
    fillRect(buffer, width, height, width * 0.635, height * (0.225 + profile.pulse * 0.02), width * 0.11, height * 0.018, [127, 45, 28], 0.92);
    strokeRect(buffer, width, height, width * 0.62, height * 0.2, width * 0.16, height * 0.1, 2, [123, 77, 26], 0.7);
  }
  if (profile.overlays.briefingBoard || profile.overlays.checklistBoard) {
    drawDocumentDetail(buffer, width, height, width * 0.68, height * 0.27, width * 0.18, height * 0.18, profile.accent, [97, 111, 125], 0.94);
  }
  if (profile.overlays.evidenceBoxes) {
    fillRect(buffer, width, height, width * 0.14, height * 0.54, width * 0.1, height * 0.08, [164, 128, 84], 0.96);
    fillRect(buffer, width, height, width * 0.74, height * 0.56, width * 0.08, height * 0.06, [154, 116, 78], 0.96);
    strokeRect(buffer, width, height, width * 0.14, height * 0.54, width * 0.1, height * 0.08, 2, [118, 90, 56], 0.75);
    strokeRect(buffer, width, height, width * 0.74, height * 0.56, width * 0.08, height * 0.06, 2, [118, 90, 56], 0.75);
  }
  if (profile.overlays.awning) {
    fillRect(buffer, width, height, width * (0.15 + variant * 0.03), height * (0.27 + variant * 0.01), width * (0.54 - variant * 0.04), height * 0.035, [255, 255, 255], 0.35);
  }
  if (profile.overlays.skyline) {
    fillRect(buffer, width, height, width * 0.02, height * 0.46, width * 0.06, height * 0.14, [108, 155, 183], 0.35);
    fillRect(buffer, width, height, width * 0.08, height * 0.42, width * 0.04, height * 0.18, [108, 155, 183], 0.32);
    fillRect(buffer, width, height, width * 0.89, height * 0.44, width * 0.05, height * 0.16, [108, 155, 183], 0.32);
  }
  if (profile.overlays.curbBand) {
    fillRect(buffer, width, height, 0, height * 0.66 + impact + dy * 0.45, width, height * 0.018, [225, 203, 116], 0.88);
  }
  if (profile.overlays.sidewalkCard) {
    fillRect(buffer, width, height, width * (0.08 + profile.pulse * 0.08), height * 0.72, width * 0.12, height * 0.06, [241, 235, 214], 0.82);
  }
  if (profile.overlays.serviceTruck) {
    fillRect(buffer, width, height, width * 0.64, height * 0.58, width * 0.16, height * 0.06, [230, 236, 240], 0.96);
    fillRect(buffer, width, height, width * 0.79, height * 0.595, width * 0.05, height * 0.045, [196, 214, 229], 0.95);
    fillRect(buffer, width, height, width * 0.655, height * 0.592, width * 0.11, height * 0.012, profile.accent, 0.82);
    strokeRect(buffer, width, height, width * 0.64, height * 0.58, width * 0.16, height * 0.06, 2, [116, 132, 148], 0.7);
    fillCircle(buffer, width, height, width * 0.675, height * 0.645, width * 0.016, [36, 42, 52], 0.95);
    fillCircle(buffer, width, height, width * 0.79, height * 0.645, width * 0.016, [36, 42, 52], 0.95);
  }
  if (profile.overlays.movingBoxes) {
    fillRect(buffer, width, height, width * 0.18, height * 0.57, width * 0.08, height * 0.06, [173, 126, 72], 0.96);
    fillRect(buffer, width, height, width * 0.23, height * 0.53, width * 0.06, height * 0.05, [186, 137, 80], 0.94);
  }
  if (profile.overlays.cautionTape) {
    drawLine(buffer, width, height, width * 0.06, height * 0.59, width * 0.28, height * 0.55, 8, [244, 210, 76], 0.78);
    drawLine(buffer, width, height, width * 0.72, height * 0.56, width * 0.94, height * 0.61, 8, [244, 210, 76], 0.72);
  }
  if (profile.overlays.serviceCounter) {
    fillRect(buffer, width, height, width * 0.17, height * 0.53, width * 0.28, height * 0.1, [214, 199, 168], 0.95);
    fillRect(buffer, width, height, width * 0.19, height * 0.49, width * 0.1, height * 0.03, [248, 245, 236], 0.92);
  }
  if (profile.overlays.estimateBoard) {
    drawDocumentDetail(buffer, width, height, width * 0.67, height * 0.29, width * 0.15, height * 0.12, [95, 112, 127], [120, 130, 142], 0.95);
  }
  if (profile.overlays.storageShelves) {
    fillRect(buffer, width, height, width * 0.12, height * 0.28, width * 0.08, height * 0.29, [122, 80, 44], 0.9);
    fillRect(buffer, width, height, width * 0.78, height * 0.3, width * 0.07, height * 0.27, [122, 80, 44], 0.88);
    for (let shelf = 0; shelf < 3; shelf += 1) {
      fillRect(buffer, width, height, width * 0.12, height * (0.34 + shelf * 0.08), width * 0.12, height * 0.012, [162, 112, 62], 0.92);
      fillRect(buffer, width, height, width * 0.72, height * (0.35 + shelf * 0.075), width * 0.13, height * 0.012, [162, 112, 62], 0.92);
      for (let box = 0; box < 3; box += 1) {
        fillRect(buffer, width, height, width * (0.13 + box * 0.03), height * (0.31 + shelf * 0.08), width * 0.02, height * 0.028, [196 - box * 20, 150 - box * 8, 84], 0.9);
        fillRect(buffer, width, height, width * (0.735 + box * 0.03), height * (0.32 + shelf * 0.075), width * 0.024, height * 0.024, [188 - box * 18, 138 - box * 5, 88], 0.88);
      }
    }
  }
  if (profile.overlays.invoiceBoard) {
    drawDocumentDetail(buffer, width, height, width * 0.64, height * 0.22, width * 0.16, height * 0.11, [190, 71, 44], [123, 78, 44], 0.95);
  }
  if (profile.overlays.chainGate) {
    drawLine(buffer, width, height, width * 0.32, height * 0.61, width * 0.42, height * 0.54, 4, [190, 178, 154], 0.68);
    drawLine(buffer, width, height, width * 0.42, height * 0.54, width * 0.52, height * 0.61, 4, [190, 178, 154], 0.68);
    drawLine(buffer, width, height, width * 0.52, height * 0.61, width * 0.62, height * 0.54, 4, [190, 178, 154], 0.68);
  }
  if (profile.overlays.monitorGrid || profile.overlays.statusPulse) {
    fillRect(buffer, width, height, width * 0.14, height * 0.26, width * 0.18, height * 0.12, [27, 37, 52], 0.88);
    fillRect(buffer, width, height, width * 0.17, height * 0.29, width * (0.09 + profile.pulse * 0.05), height * 0.012, profile.accent, 0.92);
    fillRect(buffer, width, height, width * 0.17, height * 0.315, width * (0.06 + profile.pulse * 0.03), height * 0.01, [176, 238, 220], 0.9);
  }
  if (profile.overlays.redlineBoard) {
    fillRect(buffer, width, height, width * 0.67, height * 0.27, width * 0.18, height * 0.16, [241, 238, 232], 0.95);
    fillRect(buffer, width, height, width * 0.695, height * 0.305, width * 0.11, height * 0.009, [184, 72, 58], 0.92);
    fillRect(buffer, width, height, width * 0.695, height * 0.336, width * 0.08, height * 0.009, [184, 72, 58], 0.72);
    fillRect(buffer, width, height, width * 0.695, height * 0.366, width * 0.1, height * 0.009, [106, 118, 132], 0.58);
  }
  if (profile.overlays.documentWall) {
    fillRect(buffer, width, height, width * 0.15, height * 0.26, width * 0.08, height * 0.12, [246, 243, 233], 0.9);
    fillRect(buffer, width, height, width * 0.18, height * 0.29, width * 0.03, height * 0.008, [184, 72, 58], 0.85);
    fillRect(buffer, width, height, width * 0.24, height * 0.31, width * 0.06, height * 0.09, [245, 240, 230], 0.84);
  }
  if (profile.overlays.fileShelves) {
    fillRect(buffer, width, height, width * 0.1, height * 0.24, width * 0.12, height * 0.28, [144, 123, 95], 0.88);
    fillRect(buffer, width, height, width * 0.11, height * 0.28, width * 0.1, height * 0.018, [171, 149, 119], 0.92);
    fillRect(buffer, width, height, width * 0.11, height * 0.36, width * 0.1, height * 0.018, [171, 149, 119], 0.92);
    fillRect(buffer, width, height, width * 0.11, height * 0.44, width * 0.1, height * 0.018, [171, 149, 119], 0.92);
  }
  if (profile.overlays.bigChecklist) {
    fillRect(buffer, width, height, width * 0.67, height * 0.24, width * 0.17, height * 0.22, [244, 242, 232], 0.95);
    for (let item = 0; item < 4; item += 1) {
      fillRect(buffer, width, height, width * 0.69, height * (0.28 + item * 0.04), width * 0.015, height * 0.015, [78, 152, 109], 0.9);
      fillRect(buffer, width, height, width * 0.715, height * (0.282 + item * 0.04), width * 0.085, height * 0.009, [98, 110, 123], 0.72);
    }
  }
  if (profile.overlays.consumerDesk) {
    fillRect(buffer, width, height, width * 0.18, height * 0.55, width * 0.18, height * 0.08, [205, 186, 153], 0.95);
    fillRect(buffer, width, height, width * 0.23, height * 0.5, width * 0.04, height * 0.05, [42, 55, 74], 0.95);
  }
  if (profile.overlays.cleanLighting || profile.overlays.spotlight) {
    fillCircle(buffer, width, height, width * 0.28, height * 0.12, width * 0.05, [255, 250, 231], 0.12);
    fillCircle(buffer, width, height, width * 0.72, height * 0.13, width * 0.045, [255, 250, 231], 0.1);
  }
  if (/closeup_face|medium_single|medium_two_shot|over_shoulder/.test(shotType || "")) {
    fillRect(buffer, width, height, width * 0.07, height * 0.26, width * 0.2, height * 0.26, [227, 220, 198], 0.34);
    fillRect(buffer, width, height, width * 0.73, height * 0.24, width * 0.14, height * 0.2, [244, 240, 228], 0.92);
    strokeRect(buffer, width, height, width * 0.73, height * 0.24, width * 0.14, height * 0.2, 2, [205, 194, 168], 0.7);
    for (let line = 0; line < 5; line += 1) {
      fillRect(buffer, width, height, width * 0.755, height * (0.275 + line * 0.022), width * (0.08 - (line % 2) * 0.018), height * 0.006, [125, 136, 148], 0.66);
    }
    fillRect(buffer, width, height, width * 0.17, height * 0.63, width * 0.66, height * 0.07, [215, 203, 178], 0.9);
    strokeRect(buffer, width, height, width * 0.17, height * 0.63, width * 0.66, height * 0.07, 2, [156, 134, 104], 0.44);
    fillRect(buffer, width, height, width * 0.2, height * 0.635, width * 0.11, height * 0.028, [241, 236, 224], 0.94);
    fillRect(buffer, width, height, width * 0.69, height * 0.642, width * 0.09, height * 0.02, [52, 64, 82], 0.88);
  }
  for (let tile = 0; tile < 6; tile += 1) {
    fillRect(buffer, width, height, width * tile * 0.18, height * 0.78, width * 0.002, height * 0.22, [255, 255, 255], 0.06);
  }
  strokeRect(buffer, width, height, width * leftWindowX + dx * 0.75, height * (0.32 + variant * 0.01) + dy * 0.2, width * 0.18, height * 0.14, 2, [227, 237, 245], 0.42);
  strokeRect(buffer, width, height, width * rightWindowX + dx * 0.75, height * (0.31 + (2 - variant) * 0.012) + dy * 0.2, width * 0.18, height * 0.14, 2, [227, 237, 245], 0.42);
  strokeRect(buffer, width, height, width * doorX + dx * 0.7, height * (0.34 + variant * 0.02) + dy * 0.25, width * 0.14, height * 0.28, 2, [74, 58, 44], 0.45);
  fillRect(buffer, width, height, width * 0.1 + dx * 0.25, height * 0.16 + dy * 0.25, width * 0.8, height * 0.38, [255, 255, 255], 0.04 + progress * 0.04);
}

function drawCharacter(buffer, width, height, member, pose, x, y, scale, shotType) {
  const palette = rolePalette(member.role);
  const skin = [246, 198, 76];
  const eye = [24, 24, 24];
  const mouth = [97, 51, 40];
  const hair = member.role === "worried_customer" ? [112, 70, 36] : [20, 24, 36];
  const torsoW = 90 * scale;
  const torsoH = 156 * scale;
  const armLenUpper = 44 * scale;
  const armLenLower = 40 * scale;
  const legLenUpper = 50 * scale;
  const legLenLower = 58 * scale;
  const limbThickness = 18 * scale;
  const headR = 46 * scale;
  const bodyLeanOffset = pose.bodyLean * 40 * scale;
  const torsoCenterX = x + bodyLeanOffset;
  const torsoX = torsoCenterX - torsoW / 2;
  const torsoY = y;
  const headX = torsoCenterX + pose.headTurn * 14 * scale;
  const headY = y - 60 * scale - pose.recoil * 16 * scale + pose.talkOffsetY;
  const shoulderY = torsoY + 18 * scale;
  const leftShoulderX = torsoCenterX - 30 * scale;
  const rightShoulderX = torsoCenterX + 30 * scale;
  const hipY = torsoY + torsoH;
  const villainRaise = pose.villainRaise * 46 * scale;
  const pointLift = pose.point * 40 * scale;
  const revealLift = Math.max(pose.revealFolder, pose.propReveal) * 32 * scale;
  const reactionPull = pose.reaction * 24 * scale;
  const phoneRaiseLift = pose.phoneRaise * 18 * scale;
  const contractLift = pose.contractPresent * 14 * scale;

  fillCircle(buffer, width, height, torsoCenterX, torsoY + torsoH + 18 * scale, 34 * scale, [0, 0, 0], 0.12);
  fillCircle(buffer, width, height, leftShoulderX, shoulderY + 6 * scale, 18 * scale, [24, 30, 40], 0.2);
  fillCircle(buffer, width, height, rightShoulderX, shoulderY + 6 * scale, 18 * scale, [24, 30, 40], 0.2);
  fillRect(buffer, width, height, torsoX - 5 * scale, torsoY - 4 * scale, torsoW + 10 * scale, torsoH + 10 * scale, [25, 32, 41], 0.16);
  fillRect(buffer, width, height, torsoX, torsoY, torsoW, torsoH, palette.torso);
  fillRect(buffer, width, height, torsoX + 5 * scale, torsoY + 8 * scale, torsoW - 10 * scale, torsoH * 0.22, [255, 255, 255], 0.08);
  fillRect(buffer, width, height, torsoCenterX - 18 * scale, torsoY, 36 * scale, torsoH, palette.accent, member.role === "worried_customer" ? 0.22 : 0.98);
  fillRect(buffer, width, height, torsoX, torsoY, 14 * scale, torsoH, [33, 44, 61], 0.55);
  fillRect(buffer, width, height, torsoX + torsoW - 14 * scale, torsoY, 14 * scale, torsoH, [33, 44, 61], 0.55);
  strokeRect(buffer, width, height, torsoX, torsoY, torsoW, torsoH, Math.max(2, 2 * scale), [28, 36, 46], 0.48);
  drawLine(buffer, width, height, torsoCenterX - 22 * scale, torsoY + 18 * scale, torsoCenterX, torsoY + 52 * scale, 3 * scale, [236, 231, 224], 0.72);
  drawLine(buffer, width, height, torsoCenterX + 22 * scale, torsoY + 18 * scale, torsoCenterX, torsoY + 52 * scale, 3 * scale, [236, 231, 224], 0.72);
  fillRect(buffer, width, height, torsoCenterX - 10 * scale, torsoY + 34 * scale, 20 * scale, 10 * scale, [246, 224, 168], 0.72);
  fillRect(buffer, width, height, torsoCenterX - 4 * scale, torsoY + 54 * scale, 8 * scale, 52 * scale, [40, 46, 58], 0.34);
  fillRect(buffer, width, height, torsoX + 10 * scale, torsoY + torsoH - 18 * scale, torsoW - 20 * scale, 18 * scale, [42, 52, 70], 0.34);
  if (member.role === "worried_customer") {
    drawLine(buffer, width, height, torsoCenterX - 10 * scale, torsoY + 24 * scale, torsoCenterX - 8 * scale, torsoY + 52 * scale, 2 * scale, [232, 236, 244], 0.8);
    drawLine(buffer, width, height, torsoCenterX + 10 * scale, torsoY + 24 * scale, torsoCenterX + 8 * scale, torsoY + 52 * scale, 2 * scale, [232, 236, 244], 0.8);
    fillRect(buffer, width, height, torsoCenterX - 18 * scale, torsoY + 74 * scale, 36 * scale, 18 * scale, [52, 98, 181], 0.52);
  }
  if (member.role === "schemer_villain") {
    fillRect(buffer, width, height, torsoCenterX - 26 * scale, torsoY + 22 * scale, 52 * scale, torsoH * 0.54, [127, 36, 38], 0.92);
    fillRect(buffer, width, height, torsoCenterX - 5 * scale, torsoY + 16 * scale, 10 * scale, torsoH * 0.56, [235, 212, 126], 0.75);
  }
  fillCircle(buffer, width, height, torsoCenterX, torsoY + 102 * scale, 3.5 * scale, [221, 206, 175], 0.75);
  fillCircle(buffer, width, height, torsoCenterX, torsoY + 128 * scale, 3.5 * scale, [221, 206, 175], 0.7);

  const leftElbowX = leftShoulderX - armLenUpper + reactionPull * 0.2;
  const leftElbowY = shoulderY + 18 * scale - pointLift * 0.4 - revealLift * 0.15;
  const leftHandX = leftElbowX - armLenLower + pose.point * 18 * scale;
  const leftHandY = leftElbowY + 10 * scale - pointLift;
  drawLine(buffer, width, height, leftShoulderX, shoulderY, leftElbowX, leftElbowY, limbThickness * 1.32, [38, 45, 56], 0.26);
  drawLine(buffer, width, height, leftElbowX, leftElbowY, leftHandX, leftHandY, limbThickness * 1.18, [38, 45, 56], 0.24);
  drawLine(buffer, width, height, leftShoulderX, shoulderY, leftElbowX, leftElbowY, limbThickness, skin);
  drawLine(buffer, width, height, leftElbowX, leftElbowY, leftHandX, leftHandY, limbThickness * 0.9, skin);
  fillCircle(buffer, width, height, leftElbowX, leftElbowY, 8 * scale, [204, 168, 92], 0.44);
  fillCircle(buffer, width, height, leftHandX, leftHandY, 10 * scale, skin, 0.96);
  strokeRect(buffer, width, height, leftHandX - 7 * scale, leftHandY - 5 * scale, 14 * scale, 10 * scale, 1, [178, 131, 48], 0.34);

  const rightElbowX = rightShoulderX + armLenUpper + pose.gestureLift * 4 * scale;
  const rightElbowY = shoulderY + 6 * scale - villainRaise - revealLift * 0.5 - reactionPull * 0.25 - phoneRaiseLift * 0.5 - contractLift * 0.35;
  const rightHandX = rightElbowX + armLenLower + pose.gestureLift * 14 * scale;
  const rightHandY = rightElbowY - 6 * scale - revealLift * 0.35 - phoneRaiseLift * 0.55;
  drawLine(buffer, width, height, rightShoulderX, shoulderY, rightElbowX, rightElbowY, limbThickness * 1.32, [38, 45, 56], 0.26);
  drawLine(buffer, width, height, rightElbowX, rightElbowY, rightHandX, rightHandY, limbThickness * 1.18, [38, 45, 56], 0.24);
  drawLine(buffer, width, height, rightShoulderX, shoulderY, rightElbowX, rightElbowY, limbThickness, skin);
  drawLine(buffer, width, height, rightElbowX, rightElbowY, rightHandX, rightHandY, limbThickness * 0.9, skin);
  fillCircle(buffer, width, height, rightElbowX, rightElbowY, 8 * scale, [204, 168, 92], 0.44);
  fillCircle(buffer, width, height, rightHandX, rightHandY, 10 * scale, skin, 0.96);
  strokeRect(buffer, width, height, rightHandX - 7 * scale, rightHandY - 5 * scale, 14 * scale, 10 * scale, 1, [178, 131, 48], 0.34);

  fillRect(buffer, width, height, torsoCenterX - 28 * scale, hipY - 4 * scale, 20 * scale, 22 * scale, [46, 58, 77], 0.95);
  fillRect(buffer, width, height, torsoCenterX + 8 * scale, hipY - 4 * scale, 20 * scale, 22 * scale, [46, 58, 77], 0.95);
  drawLine(buffer, width, height, torsoCenterX - 18 * scale, hipY + 14 * scale, torsoCenterX - 18 * scale, hipY + legLenUpper, limbThickness * 1.22, [24, 30, 40], 0.24);
  drawLine(buffer, width, height, torsoCenterX - 18 * scale, hipY + 14 * scale, torsoCenterX - 18 * scale, hipY + legLenUpper, limbThickness * 0.94, [42, 51, 68]);
  drawLine(buffer, width, height, torsoCenterX - 18 * scale, hipY + legLenUpper, torsoCenterX - 21 * scale, hipY + legLenUpper + legLenLower, limbThickness * 1.12, [24, 30, 40], 0.22);
  drawLine(buffer, width, height, torsoCenterX - 18 * scale, hipY + legLenUpper, torsoCenterX - 21 * scale, hipY + legLenUpper + legLenLower, limbThickness * 0.86, [42, 51, 68]);
  drawLine(buffer, width, height, torsoCenterX + 18 * scale, hipY + 14 * scale, torsoCenterX + 18 * scale, hipY + legLenUpper, limbThickness * 1.22, [24, 30, 40], 0.24);
  drawLine(buffer, width, height, torsoCenterX + 18 * scale, hipY + 14 * scale, torsoCenterX + 18 * scale, hipY + legLenUpper, limbThickness * 0.94, [42, 51, 68]);
  drawLine(buffer, width, height, torsoCenterX + 18 * scale, hipY + legLenUpper, torsoCenterX + 21 * scale, hipY + legLenUpper + legLenLower, limbThickness * 1.12, [24, 30, 40], 0.22);
  drawLine(buffer, width, height, torsoCenterX + 18 * scale, hipY + legLenUpper, torsoCenterX + 21 * scale, hipY + legLenUpper + legLenLower, limbThickness * 0.86, [42, 51, 68]);
  fillRect(buffer, width, height, torsoCenterX - 34 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 26 * scale, 16 * scale, [29, 35, 49]);
  fillRect(buffer, width, height, torsoCenterX + 8 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 26 * scale, 16 * scale, [29, 35, 49]);
  strokeRect(buffer, width, height, torsoCenterX - 34 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 26 * scale, 16 * scale, 1, [17, 22, 30], 0.42);
  strokeRect(buffer, width, height, torsoCenterX + 8 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 26 * scale, 16 * scale, 1, [17, 22, 30], 0.42);

  fillCircle(buffer, width, height, headX, headY + 4 * scale, headR * 1.04, [36, 43, 52], 0.16);
  fillCircle(buffer, width, height, headX, headY, headR * 1.05, [36, 43, 52], 0.2);
  fillCircle(buffer, width, height, headX, headY, headR, skin);
  fillCircle(buffer, width, height, headX, headY + 10 * scale, headR * 0.92, [255, 232, 146], 0.15);
  fillCircle(buffer, width, height, headX - headR * 0.92, headY + 2 * scale, 7 * scale, skin, 0.95);
  fillCircle(buffer, width, height, headX + headR * 0.92, headY + 2 * scale, 7 * scale, skin, 0.95);
  fillCircle(buffer, width, height, headX - headR * 0.92, headY + 2 * scale, 7 * scale, [36, 43, 52], 0.16);
  fillCircle(buffer, width, height, headX + headR * 0.92, headY + 2 * scale, 7 * scale, [36, 43, 52], 0.16);
  if (member.role === "worried_customer") {
    fillCircle(buffer, width, height, headX - 30 * scale, headY - 12 * scale, 13 * scale, hair);
    fillCircle(buffer, width, height, headX - 12 * scale, headY - 22 * scale, 12 * scale, hair);
    fillCircle(buffer, width, height, headX + 6 * scale, headY - 24 * scale, 12 * scale, hair);
    fillCircle(buffer, width, height, headX + 24 * scale, headY - 14 * scale, 13 * scale, hair);
    fillCircle(buffer, width, height, headX - 2 * scale, headY - 8 * scale, 28 * scale, hair, 0.22);
  } else if (member.role === "narrator" || member.role === "investigator") {
    fillRect(buffer, width, height, headX - 26 * scale, headY - 30 * scale, 52 * scale, 12 * scale, hair, 0.95);
    fillCircle(buffer, width, height, headX - 18 * scale, headY - 22 * scale, 12 * scale, hair, 0.95);
    fillCircle(buffer, width, height, headX + 18 * scale, headY - 22 * scale, 12 * scale, hair, 0.95);
  }
  if (palette.hat) {
    fillRect(buffer, width, height, headX - 34 * scale, headY - 68 * scale, 68 * scale, 24 * scale, [12, 16, 26]);
    fillRect(buffer, width, height, headX - 50 * scale, headY - 44 * scale, 100 * scale, 10 * scale, [12, 16, 26]);
    strokeRect(buffer, width, height, headX - 34 * scale, headY - 68 * scale, 68 * scale, 24 * scale, 1, [92, 109, 136], 0.25);
  }
  const eyebrowY = headY - (18 + pose.eyebrowLift * 8) * scale;
  drawLine(buffer, width, height, headX - 20 * scale, eyebrowY + pose.eyebrowTilt * 4 * scale, headX - 2 * scale, eyebrowY - pose.eyebrowTilt * 5 * scale, 3 * scale, eye);
  drawLine(buffer, width, height, headX + 2 * scale, eyebrowY - pose.eyebrowTilt * 5 * scale, headX + 20 * scale, eyebrowY + pose.eyebrowTilt * 4 * scale, 3 * scale, eye);

  if (pose.blinkAmount > 0.65) {
    drawLine(buffer, width, height, headX - 16 * scale, headY - 1 * scale, headX - 6 * scale, headY - 1 * scale, 3 * scale, eye);
    drawLine(buffer, width, height, headX + 6 * scale, headY - 1 * scale, headX + 16 * scale, headY - 1 * scale, 3 * scale, eye);
  } else {
    fillCircle(buffer, width, height, headX - 14 * scale, headY, 8 * scale * pose.eyeScale, [255, 255, 255]);
    fillCircle(buffer, width, height, headX + 14 * scale, headY, 8 * scale * pose.eyeScale, [255, 255, 255]);
    fillCircle(buffer, width, height, headX - 11 * scale + pose.headTurn * 2 * scale, headY + 1, 4 * scale, eye);
    fillCircle(buffer, width, height, headX + 11 * scale + pose.headTurn * 2 * scale, headY + 1, 4 * scale, eye);
    fillCircle(buffer, width, height, headX - 9 * scale + pose.headTurn * 2 * scale, headY - 2, 1.4 * scale, [255, 255, 255], 0.9);
    fillCircle(buffer, width, height, headX + 13 * scale + pose.headTurn * 2 * scale, headY - 2, 1.4 * scale, [255, 255, 255], 0.9);
  }
  drawLine(buffer, width, height, headX, headY + 4 * scale, headX - pose.headTurn * 4 * scale, headY + 17 * scale, 2 * scale, [196, 143, 58], 0.48);
  const mouthY = headY + 24 * scale;
  const mouthHalfWidth = lerp(12 * scale, 18 * scale, pose.mouthWidth);
  const mouthHeight = pose.mouthOpen * 16 * scale;
  if (pose.mouthOpen > 0.18) {
    fillRect(buffer, width, height, headX - mouthHalfWidth, mouthY - mouthHeight * 0.3, mouthHalfWidth * 2, Math.max(3, mouthHeight), mouth, 0.95);
    if (pose.mouthRound > 0.3) {
      fillCircle(buffer, width, height, headX, mouthY + mouthHeight * 0.15, Math.max(4, mouthHeight * 0.42), [140, 68, 54], 0.85);
    }
  } else if (member.role === "schemer_villain") {
    drawLine(buffer, width, height, headX - 22 * scale, headY + 12 * scale, headX + 22 * scale, headY + 12 * scale, 6 * scale, mouth);
    drawLine(buffer, width, height, headX - 22 * scale, headY + 12 * scale, headX - 30 * scale, headY + 8 * scale - villainRaise * 0.15, 4 * scale, mouth);
    drawLine(buffer, width, height, headX + 22 * scale, headY + 12 * scale, headX + 30 * scale, headY + 8 * scale - villainRaise * 0.15, 4 * scale, mouth);
  } else if (member.role === "worried_customer") {
    drawLine(buffer, width, height, headX - 12 * scale, headY + 32 * scale, headX, headY + 20 * scale, 3 * scale, mouth);
    drawLine(buffer, width, height, headX, headY + 20 * scale, headX + 12 * scale, headY + 32 * scale, 3 * scale, mouth);
  } else {
    drawLine(buffer, width, height, headX - 14 * scale, headY + 24 * scale, headX, headY + 34 * scale, 3 * scale, mouth);
    drawLine(buffer, width, height, headX, headY + 34 * scale, headX + 14 * scale, headY + 24 * scale, 3 * scale, mouth);
  }
  if (palette.moustache) {
    drawLine(buffer, width, height, headX - 20 * scale, headY + 10 * scale, headX - 4 * scale, headY + 13 * scale, 3 * scale, [30, 24, 24]);
    drawLine(buffer, width, height, headX + 4 * scale, headY + 13 * scale, headX + 20 * scale, headY + 10 * scale, 3 * scale, [30, 24, 24]);
  }
  fillRect(buffer, width, height, headX - 3 * scale, headY + 17 * scale, 6 * scale, 7 * scale, [229, 172, 72], 0.45);
  fillCircle(buffer, width, height, headX - 20 * scale, headY + 14 * scale, 3 * scale, [255, 214, 110], 0.18);
  fillCircle(buffer, width, height, headX + 20 * scale, headY + 14 * scale, 3 * scale, [255, 214, 110], 0.18);
  if (pose.propType === "phone" && /closeup|medium|over_shoulder/.test(shotType || "")) {
    fillRect(buffer, width, height, rightHandX + 1 * scale, rightHandY - 22 * scale, 22 * scale, 36 * scale, [31, 42, 61]);
    fillRect(buffer, width, height, rightHandX + 4 * scale, rightHandY - 18 * scale, 16 * scale, 24 * scale, [106, 225, 255], pose.phoneGlow);
    fillRect(buffer, width, height, rightHandX + 9 * scale, rightHandY + 8 * scale, 6 * scale, 2 * scale, [216, 224, 236], 0.72);
    strokeRect(buffer, width, height, rightHandX + 1 * scale, rightHandY - 22 * scale, 22 * scale, 36 * scale, 2, [220, 228, 236], 0.35);
  }
  if (pose.propType === "folder" && (pose.revealFolder > 0.08 || pose.propCarry > 0.18)) {
    fillRect(buffer, width, height, rightHandX + 4 * scale, rightHandY - 14 * scale, 38 * scale, 30 * scale, [230, 206, 109], 0.92);
    fillRect(buffer, width, height, rightHandX + 9 * scale, rightHandY - 9 * scale, 28 * scale, 20 * scale, [247, 236, 178], 0.9);
    fillRect(buffer, width, height, rightHandX + 14 * scale, rightHandY - 4 * scale, 18 * scale, 3 * scale, [182, 168, 104], 0.8);
    strokeRect(buffer, width, height, rightHandX + 4 * scale, rightHandY - 14 * scale, 38 * scale, 30 * scale, 2, [146, 120, 52], 0.45);
  }
  if (pose.propType === "contract" && (pose.villainRaise > 0.12 || pose.contractPresent > 0.18)) {
    fillRect(buffer, width, height, rightHandX + 4 * scale, rightHandY - 10 * scale, 30 * scale, 22 * scale, [244, 238, 228], 0.95);
    fillRect(buffer, width, height, rightHandX + 8 * scale, rightHandY - 5 * scale, 18 * scale, 3 * scale, [123, 123, 123], 0.8);
    strokeRect(buffer, width, height, rightHandX + 4 * scale, rightHandY - 10 * scale, 30 * scale, 22 * scale, 2, [188, 178, 160], 0.55);
  }
  if (pose.propType === "moving_box" && pose.boxCarry > 0.18) {
    fillRect(buffer, width, height, torsoCenterX - 34 * scale, torsoY + 58 * scale, 68 * scale, 44 * scale, [173, 126, 72], 0.95);
    fillRect(buffer, width, height, torsoCenterX - 28 * scale, torsoY + 64 * scale, 56 * scale, 6 * scale, [204, 168, 110], 0.85);
    strokeRect(buffer, width, height, torsoCenterX - 34 * scale, torsoY + 58 * scale, 68 * scale, 44 * scale, 2, [124, 82, 38], 0.5);
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
  strokeRect(buffer, width, height, panelX, panelY, panelW, panelH, 3, [205, 194, 168], 0.82);
  fillRect(buffer, width, height, panelX + 18, panelY + 18, panelW * 0.16, panelH - 36, [236, 228, 204], 0.78);
  fillRect(buffer, width, height, panelX + 28, panelY + 24, panelW * 0.52, 18, [198, 204, 223]);
  for (let row = 0; row < 5; row += 1) {
    fillRect(buffer, width, height, panelX + panelW * 0.22, panelY + panelH * (0.22 + row * 0.11), panelW * (0.34 - (row % 2) * 0.08), 3, [178, 184, 196], 0.55);
  }
  fillRect(buffer, width, height, panelX + panelW * 0.72, panelY + panelH * 0.16, panelW * 0.13, panelH * 0.12, [224, 211, 176], 0.82);
  drawAmount(buffer, width, height, amount, panelX + 54, panelY + panelH * 0.48, /document_insert/.test(shotType) ? 26 : 18, [176, 40, 40]);
  fillRect(buffer, width, height, panelX + panelW * 0.68, panelY + panelH * 0.68, panelW * 0.16, 6, [176, 40, 40], 0.72);
  fillRect(buffer, width, height, panelX + panelW * 0.68, panelY + panelH * 0.75, panelW * 0.1, 6, [126, 90, 56], 0.58);
  if (emphasis > 0) {
    fillRect(buffer, width, height, panelX - 8, panelY - 8, panelW + 16, panelH + 16, [255, 225, 120], emphasis * 0.15);
  }
}

function drawWarning(buffer, width, height, pulse) {
  const alpha = clamp(0.25 + pulse * 0.55, 0.25, 0.8);
  const x = width * 0.83;
  const y = height * 0.63;
  drawTriangle(buffer, width, height, x, y, 190, [244, 205, 48], alpha);
  drawTriangle(buffer, width, height, x, y + 6, 174, [176, 150, 58], alpha * 0.18);
  fillRect(buffer, width, height, x - 10, y + 58, 20, 70, [42, 52, 78], alpha);
  fillCircle(buffer, width, height, x, y + 150, 11, [42, 52, 78], alpha);
  drawLine(buffer, width, height, x - 56, y + 20, x + 56, y + 20, 3, [128, 96, 22], alpha * 0.55);
}

function slotLayout(shot, castMembers, shotPerformance = {}) {
  const shotType = shot.shot_type;
  const visibleLimit = Number(shotPerformance.visible_character_limit || castMembers.length || 1);
  const primaryCharacterId = shot.primary_character_id || castMembers[0]?.character_id || null;
  const visibleMembers = castMembers
    .slice()
    .sort((a, b) => {
      if (a.character_id === primaryCharacterId) {
        return -1;
      }
      if (b.character_id === primaryCharacterId) {
        return 1;
      }
      return 0;
    })
    .slice(0, visibleLimit);
  const positionMap = new Map(
    (shotPerformance.performances || []).map((entry) => [entry.character_id || entry.actor_id || entry.role, entry.screen_position || null])
  );

  if (/document_insert|push_in_document/.test(shotType)) {
    return [];
  }
  if (shotType === "closeup_face") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.5 : 0.77,
      y: index === 0 ? 0.5 : 0.6,
      scale: index === 0 ? 2.15 : 1.18
    }));
  }
  if (shotType === "low_angle_villain") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: member.role === "schemer_villain" ? 0.62 : index === 0 ? 0.26 : 0.78,
      y: member.role === "schemer_villain" ? 0.58 : 0.66,
      scale: member.role === "schemer_villain" ? 1.72 : 1.08
    }));
  }
  if (shotType === "reaction_cutaway") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.5 : 0.78,
      y: 0.61,
      scale: index === 0 ? 1.55 : 1.02
    }));
  }
  if (shotType === "over_shoulder") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.32 : 0.72,
      y: index === 0 ? 0.69 : 0.63,
      scale: index === 0 ? 1.38 : 1.3
    }));
  }
  if (shotType === "medium_two_shot") {
    return visibleMembers.map((member, index) => {
      const screenPos = positionMap.get(member.character_id) || positionMap.get(member.cast_member_id) || (index === 0 ? "left" : "right");
      return {
        character_id: member.character_id,
        x: screenPos === "left" ? 0.33 : screenPos === "center" ? 0.5 : 0.68,
        y: 0.64,
        scale: 1.28
      };
    });
  }
  if (shotType === "establishing_wide" || shotType === "wide_three_character" || shotType === "medium_three_character") {
    return visibleMembers.map((member, index) => {
      const screenPos = positionMap.get(member.character_id) || positionMap.get(member.cast_member_id) || ["left", "center", "right"][index] || "right";
      return {
        character_id: member.character_id,
        x: screenPos === "left" ? 0.25 : screenPos === "center" ? 0.5 : 0.74,
        y: 0.66,
        scale: 1.22
      };
    });
  }
  return visibleMembers.map((member, index) => {
    const screenPos = positionMap.get(member.character_id) || positionMap.get(member.cast_member_id) || ["left", "center", "right"][index] || "right";
    return {
      character_id: member.character_id,
      x: screenPos === "left" ? 0.3 : screenPos === "center" ? 0.56 : 0.78,
      y: 0.65,
      scale: index === 0 ? 1.4 : 1.18
    };
  });
}

function renderShotFrame({ width, height, shot, sceneCard, castMembers, motionDirectives, shotPerformance = {}, frameIndex, totalFrames }) {
  const progress = totalFrames <= 1 ? 0 : frameIndex / (totalFrames - 1);
  const motions = new Set((motionDirectives || []).map((item) => item.type || item));
  const buffer = createCanvas(width, height, [124, 196, 238]);
  const impact = motions.has("impact_shake") ? Math.sin(progress * Math.PI * 24) * smoothstep(0.45, 0.7, progress) * 10 : 0;
  const cameraState = cameraStateForFrame(progress, shotPerformance, motionDirectives);
  drawBackground(buffer, width, height, shot.shot_type, sceneCard, progress, impact, cameraState);
  const slots = slotLayout(shot, castMembers, shotPerformance);
  const lookup = new Map(slots.map((slot) => [slot.character_id, slot]));
  const durationSeconds = Math.max(0.1, Number(shotPerformance.duration_seconds || 0) || Math.max(0.1, Number(shot.end || 0) - Number(shot.start || 0)));
  const timeSeconds = progress * durationSeconds;
  const timing = shotPerformance.timing_windows || {};
  const documentEmphasis = windowEnvelope(
    timeSeconds,
    Number(timing.emphasis_start || durationSeconds * 0.34),
    Number(timing.emphasis_end || durationSeconds * 0.74),
    durationSeconds * 0.08
  );
  for (const [memberIndex, member] of castMembers.entries()) {
    const slot = lookup.get(member.character_id);
    if (!slot) {
      continue;
    }
    const pose = buildPerformanceFrameState({
      member,
      shot,
      shotPerformance,
      motionDirectives,
      progress,
      memberIndex
    });
    drawCharacter(
      buffer,
      width,
      height,
      member,
      pose,
      (width * slot.x) + cameraState.offsetX,
      (height * slot.y) + cameraState.offsetY,
      slot.scale * cameraState.scale,
      shot.shot_type
    );
  }

  const invoiceScene = /bill|price|fee|quote|invoice|leverage/.test(sceneCard.narration || "") || motions.has("invoice_counter");
  if (invoiceScene || /document_insert|push_in_document/.test(shot.shot_type || "")) {
    drawInvoice(buffer, width, height, documentEmphasis >= 0.9 ? "$3,800" : "$1,200", Math.max(documentEmphasis, smoothstep(0.5, 0.8, progress)), shot.shot_type);
  }
  if (motions.has("proof_reveal") || shotPerformance.secondary_action === "document_reveal") {
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
  applyComicGrade(buffer, width, height, shot.shot_type, sceneEnvironmentProfile(sceneCard, shot.shot_type, progress), progress);
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

function renderShotClip({ shot, sceneCard, castMembers, motionDirectives, shotPerformance = {}, outputPath, posterPath, tempDir, width = 768, height = 1344, fps = 30 }) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  ensureDir(tempDir);
  const totalFrames = Math.max(24, Math.round((Number(shotPerformance.duration_seconds || 0) || (shot.end - shot.start)) * fps));
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const frame = renderShotFrame({
      width,
      height,
      shot,
      sceneCard,
      castMembers,
      motionDirectives,
      shotPerformance,
      frameIndex,
      totalFrames
    });
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
  buildPerformanceFrameState,
  cameraStateForFrame,
  concatClips,
  ensureDir,
  renderShotClip,
  sceneEnvironmentProfile
};
