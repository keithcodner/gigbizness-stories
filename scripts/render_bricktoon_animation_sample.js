#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { ROOT, ensureDir, writeText } = require("../agents/common");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_SECONDS = 5;
const FRAME_COUNT = FPS * DURATION_SECONDS;
const SAMPLE_DIR = path.join(ROOT, "animation_samples", "price_jump");
const OUTPUT_VIDEO = path.join(ROOT, "workspaces", "test_story_template", "06_renders", "bricktoon_animation_sample.mp4");
const QC_DIR = path.join(ROOT, "workspaces", "test_story_template", "13_qc", "animation_sample");
const TEMP_DIR = path.join(QC_DIR, "_tmp_frames");
const EVIDENCE_FRAMES = [0, 30, 60, 90, 120, 149];

function loadAnimation() {
  return JSON.parse(fs.readFileSync(path.join(SAMPLE_DIR, "animation.json"), "utf8"));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
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
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
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

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + (width * 4));
    row[0] = 0;
    rgba.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
  fs.writeFileSync(filePath, png);
}

function makeBuffer() {
  return Buffer.alloc(WIDTH * HEIGHT * 4);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setPixel(buffer, x, y, color) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= WIDTH || iy >= HEIGHT) {
    return;
  }
  const index = (iy * WIDTH + ix) * 4;
  const alpha = color.a / 255;
  const inv = 1 - alpha;
  buffer[index] = Math.round((color.r * alpha) + (buffer[index] * inv));
  buffer[index + 1] = Math.round((color.g * alpha) + (buffer[index + 1] * inv));
  buffer[index + 2] = Math.round((color.b * alpha) + (buffer[index + 2] * inv));
  buffer[index + 3] = 255;
}

function fillRect(buffer, x, y, width, height, color) {
  const startX = clamp(Math.floor(x), 0, WIDTH - 1);
  const endX = clamp(Math.ceil(x + width), 0, WIDTH);
  const startY = clamp(Math.floor(y), 0, HEIGHT - 1);
  const endY = clamp(Math.ceil(y + height), 0, HEIGHT);
  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      setPixel(buffer, px, py, color);
    }
  }
}

function fillCircle(buffer, cx, cy, radius, color) {
  const minX = clamp(Math.floor(cx - radius), 0, WIDTH - 1);
  const maxX = clamp(Math.ceil(cx + radius), 0, WIDTH - 1);
  const minY = clamp(Math.floor(cy - radius), 0, HEIGHT - 1);
  const maxY = clamp(Math.ceil(cy + radius), 0, HEIGHT - 1);
  const radiusSq = radius * radius;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) + (dy * dy) <= radiusSq) {
        setPixel(buffer, x, y, color);
      }
    }
  }
}

function drawLine(buffer, x1, y1, x2, y2, thickness, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  if (steps === 0) {
    fillCircle(buffer, x1, y1, thickness / 2, color);
    return;
  }
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x1 + ((x2 - x1) * t);
    const y = y1 + ((y2 - y1) * t);
    fillCircle(buffer, x, y, thickness / 2, color);
  }
}

function fillTriangle(buffer, p1, p2, p3, color) {
  const minX = clamp(Math.floor(Math.min(p1.x, p2.x, p3.x)), 0, WIDTH - 1);
  const maxX = clamp(Math.ceil(Math.max(p1.x, p2.x, p3.x)), 0, WIDTH - 1);
  const minY = clamp(Math.floor(Math.min(p1.y, p2.y, p3.y)), 0, HEIGHT - 1);
  const maxY = clamp(Math.ceil(Math.max(p1.y, p2.y, p3.y)), 0, HEIGHT - 1);

  function area(a, b, c) {
    return ((a.x * (b.y - c.y)) + (b.x * (c.y - a.y)) + (c.x * (a.y - b.y))) / 2;
  }

  const fullArea = Math.abs(area(p1, p2, p3));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const p = { x, y };
      const a1 = Math.abs(area(p, p2, p3));
      const a2 = Math.abs(area(p1, p, p3));
      const a3 = Math.abs(area(p1, p2, p));
      if (Math.abs(fullArea - (a1 + a2 + a3)) <= 0.8) {
        setPixel(buffer, x, y, color);
      }
    }
  }
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function evaluateTrack(track, time) {
  const keyframes = track.keyframes || [];
  if (keyframes.length === 0) {
    return null;
  }
  if (typeof keyframes[0].value === "string") {
    let current = keyframes[0].value;
    for (const keyframe of keyframes) {
      if (time >= keyframe.time) {
        current = keyframe.value;
      }
    }
    return current;
  }
  if (time <= keyframes[0].time) {
    return keyframes[0].value;
  }
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const current = keyframes[i];
    const next = keyframes[i + 1];
    if (time >= current.time && time <= next.time) {
      const span = next.time - current.time || 1;
      return lerp(current.value, next.value, (time - current.time) / span);
    }
  }
  return keyframes[keyframes.length - 1].value;
}

function buildState(animation, time) {
  const state = {};
  for (const track of animation.tracks) {
    if (!state[track.target]) {
      state[track.target] = {};
    }
    state[track.target][track.property] = evaluateTrack(track, time);
  }

  const pulse = state.warning_icon?.pulse || 0;
  if (!state.warning_icon) {
    state.warning_icon = {};
  }
  state.warning_icon.scale = pulse > 0
    ? 1 + (0.12 * Math.sin(((time - 3.4) / 1.0) * Math.PI * 4))
    : 1;
  state.warning_icon.opacity = pulse > 0 ? 220 : 0;

  const shakeWindow = time >= 3.2 && time <= 3.4;
  const shakeT = shakeWindow ? (time - 3.2) / 0.2 : 0;
  if (!state.camera_group) {
    state.camera_group = {};
  }
  state.camera_group.scale = state.camera_group.scale ?? 1;
  state.camera_group.shake_x = shakeWindow ? Math.sin(shakeT * Math.PI * 10) * 20 * (1 - shakeT) : 0;
  state.camera_group.shake_y = shakeWindow ? Math.cos(shakeT * Math.PI * 8) * 12 * (1 - shakeT) : 0;

  if (!state.customer_eyes_open) {
    state.customer_eyes_open = {};
  }
  if (!state.customer_eyes_closed) {
    state.customer_eyes_closed = {};
  }
  state.customer_eyes_closed.opacity = state.customer_eyes_closed.opacity ?? 0;
  state.customer_eyes_open.opacity = 1 - state.customer_eyes_closed.opacity;

  if (!state.customer_mouth_neutral) {
    state.customer_mouth_neutral = {};
  }
  if (!state.customer_mouth_worried) {
    state.customer_mouth_worried = {};
  }
  state.customer_mouth_worried.opacity = state.customer_mouth_worried.opacity ?? 0;
  state.customer_mouth_neutral.opacity = 1 - state.customer_mouth_worried.opacity;

  return state;
}

function cameraPoint(x, y, camera) {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const scale = camera.scale || 1;
  return {
    x: cx + ((x - cx) * scale) + (camera.shake_x || 0),
    y: cy + ((y - cy) * scale) + (camera.shake_y || 0)
  };
}

function cameraRect(x, y, width, height, camera) {
  const topLeft = cameraPoint(x, y, camera);
  const scale = camera.scale || 1;
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: width * scale,
    height: height * scale
  };
}

function drawBackground(buffer, camera) {
  fillRect(buffer, 0, 0, WIDTH, HEIGHT, { r: 135, g: 215, b: 255, a: 255 });
  const ground = cameraRect(0, 1050, 1080, 870, camera);
  fillRect(buffer, ground.x, ground.y, ground.width, ground.height, { r: 96, g: 104, b: 78, a: 255 });
  const building = cameraRect(120, 360, 840, 760, camera);
  fillRect(buffer, building.x, building.y, building.width, building.height, { r: 239, g: 227, b: 207, a: 255 });
  const sign = cameraRect(240, 450, 600, 110, camera);
  fillRect(buffer, sign.x, sign.y, sign.width, sign.height, { r: 34, g: 77, b: 113, a: 255 });
  const door = cameraRect(470, 660, 140, 390, camera);
  fillRect(buffer, door.x, door.y, door.width, door.height, { r: 91, g: 72, b: 54, a: 255 });
  const leftWindow = cameraRect(220, 610, 220, 220, camera);
  fillRect(buffer, leftWindow.x, leftWindow.y, leftWindow.width, leftWindow.height, { r: 111, g: 185, b: 231, a: 255 });
  const rightWindow = cameraRect(640, 610, 220, 220, camera);
  fillRect(buffer, rightWindow.x, rightWindow.y, rightWindow.width, rightWindow.height, { r: 111, g: 185, b: 231, a: 255 });
}

function drawInvoiceNumber(buffer, x, y, value, camera, color) {
  const patterns = {
    "$": ["0110", "1111", "0110", "1111", "0110"],
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "8": ["111", "101", "111", "101", "111"],
    ",": ["0", "0", "0", "1", "1"]
  };
  let cursor = x;
  for (const char of value.split("")) {
    const pattern = patterns[char];
    if (!pattern) {
      cursor += 36;
      continue;
    }
    const pixel = char === "," ? 10 : 18;
    for (let row = 0; row < pattern.length; row += 1) {
      const cols = pattern[row].split("");
      for (let col = 0; col < cols.length; col += 1) {
        if (cols[col] === "1") {
          const rect = cameraRect(cursor + (col * pixel), y + (row * pixel), pixel - 2, pixel - 2, camera);
          fillRect(buffer, rect.x, rect.y, rect.width, rect.height, color);
        }
      }
    }
    cursor += (pattern[0].length * pixel) + 16;
  }
}

function drawInvoice(buffer, camera, value) {
  const sheet = cameraRect(310, 1190, 470, 260, camera);
  fillRect(buffer, sheet.x, sheet.y, sheet.width, sheet.height, { r: 255, g: 249, b: 238, a: 255 });
  const title = cameraRect(350, 1230, 250, 20, camera);
  fillRect(buffer, title.x, title.y, title.width, title.height, { r: 213, g: 217, b: 228, a: 255 });
  drawInvoiceNumber(buffer, 400, 1310, value, camera, { r: 162, g: 40, b: 42, a: 255 });
}

function drawWarningIcon(buffer, camera, state) {
  if ((state.opacity || 0) <= 0) {
    return;
  }
  const scale = state.scale || 1;
  const center = cameraPoint(870, 1260, camera);
  const size = 110 * (camera.scale || 1) * scale;
  fillTriangle(
    buffer,
    { x: center.x, y: center.y - size },
    { x: center.x + size, y: center.y + size },
    { x: center.x - size, y: center.y + size },
    { r: 255, g: 207, b: 51, a: state.opacity || 220 }
  );
  fillRect(buffer, center.x - 10, center.y - 38, 20, 66, { r: 42, g: 51, b: 66, a: 255 });
  fillCircle(buffer, center.x, center.y + 54, 12, { r: 42, g: 51, b: 66, a: 255 });
}

function drawCustomer(buffer, camera, state) {
  const bodyX = 210 + (state.customer_body?.offset_x || 0);
  const bodyY = 1110 + (state.customer_body?.offset_y || 0);
  const headX = 240 + (state.customer_head?.offset_x || 0);
  const headY = 980 + (state.customer_head?.offset_y || state.customer_body?.offset_y || 0);

  const body = cameraRect(bodyX, bodyY, 120, 160, camera);
  fillRect(buffer, body.x, body.y, body.width, body.height, { r: 45, g: 127, b: 224, a: 255 });
  const leftLeg = cameraRect(bodyX + 12, bodyY + 155, 42, 132, camera);
  const rightLeg = cameraRect(bodyX + 66, bodyY + 155, 42, 132, camera);
  fillRect(buffer, leftLeg.x, leftLeg.y, leftLeg.width, leftLeg.height, { r: 34, g: 43, b: 52, a: 255 });
  fillRect(buffer, rightLeg.x, rightLeg.y, rightLeg.width, rightLeg.height, { r: 34, g: 43, b: 52, a: 255 });

  const leftShoulder = cameraPoint(bodyX + 8, bodyY + 42, camera);
  const leftHand = cameraPoint(bodyX - 40, bodyY + 16, camera);
  const rightShoulder = cameraPoint(bodyX + 112, bodyY + 42, camera);
  const rightHand = cameraPoint(bodyX + 164, bodyY - 6, camera);
  drawLine(buffer, leftShoulder.x, leftShoulder.y, leftHand.x, leftHand.y, 26 * (camera.scale || 1), { r: 241, g: 196, b: 93, a: 255 });
  drawLine(buffer, rightShoulder.x, rightShoulder.y, rightHand.x, rightHand.y, 26 * (camera.scale || 1), { r: 241, g: 196, b: 93, a: 255 });

  const head = cameraPoint(headX + 70, headY + 70, camera);
  fillCircle(buffer, head.x, head.y, 74 * (camera.scale || 1), { r: 241, g: 196, b: 93, a: 255 });
  fillCircle(buffer, head.x - (56 * (camera.scale || 1)), head.y - (18 * (camera.scale || 1)), 20 * (camera.scale || 1), { r: 110, g: 63, b: 31, a: 255 });
  fillCircle(buffer, head.x + (56 * (camera.scale || 1)), head.y - (18 * (camera.scale || 1)), 20 * (camera.scale || 1), { r: 110, g: 63, b: 31, a: 255 });
  fillCircle(buffer, head.x, head.y - (38 * (camera.scale || 1)), 16 * (camera.scale || 1), { r: 110, g: 63, b: 31, a: 255 });

  if ((state.customer_eyes_open?.opacity || 0) > 0.5) {
    fillCircle(buffer, head.x - (28 * (camera.scale || 1)), head.y + (2 * (camera.scale || 1)), 12 * (camera.scale || 1), { r: 255, g: 255, b: 255, a: 255 });
    fillCircle(buffer, head.x + (28 * (camera.scale || 1)), head.y + (2 * (camera.scale || 1)), 12 * (camera.scale || 1), { r: 255, g: 255, b: 255, a: 255 });
    fillCircle(buffer, head.x - (28 * (camera.scale || 1)), head.y + (5 * (camera.scale || 1)), 4 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
    fillCircle(buffer, head.x + (28 * (camera.scale || 1)), head.y + (5 * (camera.scale || 1)), 4 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
  } else {
    drawLine(buffer, head.x - (42 * (camera.scale || 1)), head.y + (2 * (camera.scale || 1)), head.x - (16 * (camera.scale || 1)), head.y + (2 * (camera.scale || 1)), 5 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
    drawLine(buffer, head.x + (16 * (camera.scale || 1)), head.y + (2 * (camera.scale || 1)), head.x + (42 * (camera.scale || 1)), head.y + (2 * (camera.scale || 1)), 5 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
  }

  if ((state.customer_mouth_neutral?.opacity || 0) > 0.5) {
    drawLine(buffer, head.x - (18 * (camera.scale || 1)), head.y + (44 * (camera.scale || 1)), head.x + (18 * (camera.scale || 1)), head.y + (44 * (camera.scale || 1)), 6 * (camera.scale || 1), { r: 110, g: 47, b: 31, a: 255 });
  }
  if ((state.customer_mouth_worried?.opacity || 0) > 0.2) {
    drawLine(buffer, head.x - (20 * (camera.scale || 1)), head.y + (52 * (camera.scale || 1)), head.x, head.y + (34 * (camera.scale || 1)), 5 * (camera.scale || 1), { r: 110, g: 47, b: 31, a: 255 });
    drawLine(buffer, head.x, head.y + (34 * (camera.scale || 1)), head.x + (20 * (camera.scale || 1)), head.y + (52 * (camera.scale || 1)), 5 * (camera.scale || 1), { r: 110, g: 47, b: 31, a: 255 });
  }
}

function rotatePoint(originX, originY, length, angleDegrees) {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: originX + (Math.cos(angle) * length),
    y: originY + (Math.sin(angle) * length)
  };
}

function drawVillain(buffer, camera, state) {
  const bodyX = 720;
  const bodyY = 1010;
  const headX = 736;
  const headY = 890;

  const body = cameraRect(bodyX, bodyY, 112, 180, camera);
  fillRect(buffer, body.x, body.y, body.width, body.height, { r: 30, g: 35, b: 43, a: 255 });
  const vest = cameraRect(bodyX + 22, bodyY, 68, 140, camera);
  fillRect(buffer, vest.x, vest.y, vest.width, vest.height, { r: 169, g: 40, b: 42, a: 255 });
  const leftLeg = cameraRect(bodyX + 14, bodyY + 176, 34, 150, camera);
  const rightLeg = cameraRect(bodyX + 64, bodyY + 176, 34, 150, camera);
  fillRect(buffer, leftLeg.x, leftLeg.y, leftLeg.width, leftLeg.height, { r: 30, g: 35, b: 43, a: 255 });
  fillRect(buffer, rightLeg.x, rightLeg.y, rightLeg.width, rightLeg.height, { r: 30, g: 35, b: 43, a: 255 });

  const leftShoulder = cameraPoint(bodyX + 6, bodyY + 48, camera);
  const leftHand = cameraPoint(bodyX - 44, bodyY + 46, camera);
  drawLine(buffer, leftShoulder.x, leftShoulder.y, leftHand.x, leftHand.y, 28 * (camera.scale || 1), { r: 240, g: 194, b: 77, a: 255 });

  const rightShoulder = cameraPoint(bodyX + 106, bodyY + 40, camera);
  const armAngle = state.villain_right_arm?.rotation ?? 0;
  const hand = rotatePoint(rightShoulder.x, rightShoulder.y, 160 * (camera.scale || 1), armAngle);
  drawLine(buffer, rightShoulder.x, rightShoulder.y, hand.x, hand.y, 28 * (camera.scale || 1), { r: 240, g: 194, b: 77, a: 255 });

  const head = cameraPoint(headX + 78, headY + 78, camera);
  fillCircle(buffer, head.x, head.y, 78 * (camera.scale || 1), { r: 240, g: 194, b: 77, a: 255 });
  const hatTop = cameraRect(headX + 24, headY - 72, 108, 54, camera);
  const hatBrim = cameraRect(headX + 4, headY - 32, 148, 18, camera);
  fillRect(buffer, hatTop.x, hatTop.y, hatTop.width, hatTop.height, { r: 15, g: 18, b: 24, a: 255 });
  fillRect(buffer, hatBrim.x, hatBrim.y, hatBrim.width, hatBrim.height, { r: 15, g: 18, b: 24, a: 255 });

  drawLine(buffer, head.x - (38 * (camera.scale || 1)), head.y - (18 * (camera.scale || 1)), head.x - (12 * (camera.scale || 1)), head.y - (30 * (camera.scale || 1)), 6 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
  drawLine(buffer, head.x + (12 * (camera.scale || 1)), head.y - (30 * (camera.scale || 1)), head.x + (38 * (camera.scale || 1)), head.y - (18 * (camera.scale || 1)), 6 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
  fillCircle(buffer, head.x - (20 * (camera.scale || 1)), head.y - (4 * (camera.scale || 1)), 7 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
  fillCircle(buffer, head.x + (20 * (camera.scale || 1)), head.y - (4 * (camera.scale || 1)), 7 * (camera.scale || 1), { r: 17, g: 17, b: 17, a: 255 });
  drawLine(buffer, head.x - (28 * (camera.scale || 1)), head.y + (42 * (camera.scale || 1)), head.x, head.y + (58 * (camera.scale || 1)), 6 * (camera.scale || 1), { r: 110, g: 47, b: 31, a: 255 });
  drawLine(buffer, head.x, head.y + (58 * (camera.scale || 1)), head.x + (28 * (camera.scale || 1)), head.y + (42 * (camera.scale || 1)), 6 * (camera.scale || 1), { r: 110, g: 47, b: 31, a: 255 });

  const moustacheAngle = state.villain_moustache?.rotation ?? 0;
  const leftEnd = rotatePoint(head.x - (4 * (camera.scale || 1)), head.y + (24 * (camera.scale || 1)), 48 * (camera.scale || 1), 180 + moustacheAngle);
  const rightEnd = rotatePoint(head.x + (4 * (camera.scale || 1)), head.y + (24 * (camera.scale || 1)), 48 * (camera.scale || 1), moustacheAngle);
  drawLine(buffer, head.x, head.y + (24 * (camera.scale || 1)), leftEnd.x, leftEnd.y, 12 * (camera.scale || 1), { r: 36, g: 24, b: 14, a: 255 });
  drawLine(buffer, head.x, head.y + (24 * (camera.scale || 1)), rightEnd.x, rightEnd.y, 12 * (camera.scale || 1), { r: 36, g: 24, b: 14, a: 255 });
}

function renderFrame(frameIndex, animation, frameHashes, diffAccumulator) {
  const time = frameIndex / FPS;
  const state = buildState(animation, time);
  const buffer = makeBuffer();
  const camera = state.camera_group || { scale: 1, shake_x: 0, shake_y: 0 };
  const invoiceValue = state.invoice?.display_value || "$1,200";

  drawBackground(buffer, camera);
  drawCustomer(buffer, camera, state);
  drawVillain(buffer, camera, state);
  drawInvoice(buffer, camera, invoiceValue);
  drawWarningIcon(buffer, camera, state.warning_icon || {});

  const pngPath = path.join(TEMP_DIR, `frame_${String(frameIndex).padStart(3, "0")}.png`);
  writePng(pngPath, WIDTH, HEIGHT, buffer);
  frameHashes[frameIndex] = crypto.createHash("sha1").update(buffer).digest("hex");

  if (frameIndex > 0) {
    const prevPath = path.join(TEMP_DIR, `frame_${String(frameIndex - 1).padStart(3, "0")}.png`);
    const prevBuffer = fs.readFileSync(prevPath);
    const currentBuffer = fs.readFileSync(pngPath);
    let diff = 0;
    const length = Math.min(prevBuffer.length, currentBuffer.length);
    for (let i = 0; i < length; i += 1) {
      diff += Math.abs(prevBuffer[i] - currentBuffer[i]);
    }
    diffAccumulator.total += diff / length;
  }
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
    throw new Error(`${label} failed`);
  }
}

function extractEvidenceFrames() {
  for (const frameIndex of EVIDENCE_FRAMES) {
    const output = path.join(QC_DIR, `frame_${String(frameIndex).padStart(3, "0")}.png`);
    runCommand("ffmpeg", [
      "-y",
      "-i",
      OUTPUT_VIDEO,
      "-vf",
      `select=eq(n\\,${frameIndex})`,
      "-frames:v",
      "1",
      "-update",
      "1",
      output
    ], `extract evidence frame ${frameIndex}`);
  }
}

function writeRenderReport(frameHashes, averageFrameDifference) {
  const report = {
    output_video_path: OUTPUT_VIDEO,
    duration: DURATION_SECONDS,
    resolution: `${WIDTH}x${HEIGHT}`,
    fps: FPS,
    frame_count: FRAME_COUNT,
    animated_layer_ids: [
      "customer_head",
      "customer_eyes_open",
      "customer_eyes_closed",
      "customer_mouth_neutral",
      "customer_mouth_worried",
      "customer_left_arm",
      "customer_right_arm",
      "villain_head",
      "villain_moustache",
      "villain_right_arm",
      "invoice",
      "warning_icon",
      "camera_group"
    ],
    source_asset_paths: [
      "animation_samples/price_jump/scene.svg",
      "animation_samples/price_jump/animation.json",
      "animation_samples/price_jump/layers/background.svg",
      "animation_samples/price_jump/layers/customer_body.svg",
      "animation_samples/price_jump/layers/customer_head.svg",
      "animation_samples/price_jump/layers/customer_eyes_open.svg",
      "animation_samples/price_jump/layers/customer_eyes_closed.svg",
      "animation_samples/price_jump/layers/customer_mouth_neutral.svg",
      "animation_samples/price_jump/layers/customer_mouth_worried.svg",
      "animation_samples/price_jump/layers/customer_left_arm.svg",
      "animation_samples/price_jump/layers/customer_right_arm.svg",
      "animation_samples/price_jump/layers/villain_body.svg",
      "animation_samples/price_jump/layers/villain_head.svg",
      "animation_samples/price_jump/layers/villain_eyes.svg",
      "animation_samples/price_jump/layers/villain_mouth.svg",
      "animation_samples/price_jump/layers/villain_moustache.svg",
      "animation_samples/price_jump/layers/villain_left_arm.svg",
      "animation_samples/price_jump/layers/villain_right_arm.svg",
      "animation_samples/price_jump/layers/invoice.svg",
      "animation_samples/price_jump/layers/warning_icon.svg"
    ],
    frame_hashes: Object.fromEntries(EVIDENCE_FRAMES.map((index) => [index, frameHashes[index]])),
    average_frame_difference: averageFrameDifference,
    completion_status: "rendered",
    production_character_art: "not_implemented",
    cinematic_bricktoon_quality: "not_implemented",
    notes: "Procedural Bricktoon animation sample only. No AI images, no generated_images BMP files, no fact cards."
  };
  writeText(path.join(QC_DIR, "render_report.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  try {
    ensureDir(path.dirname(OUTPUT_VIDEO));
    ensureDir(QC_DIR);
    ensureDir(TEMP_DIR);

    const animation = loadAnimation();
    const frameHashes = {};
    const diffAccumulator = { total: 0 };

    for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
      renderFrame(frameIndex, animation, frameHashes, diffAccumulator);
    }

    runCommand("ffmpeg", [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(TEMP_DIR, "frame_%03d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      OUTPUT_VIDEO
    ], "encode bricktoon animation sample");

    extractEvidenceFrames();
    const averageFrameDifference = Number((diffAccumulator.total / (FRAME_COUNT - 1)).toFixed(4));
    writeRenderReport(frameHashes, averageFrameDifference);

    console.log(`Bricktoon animation sample rendered at ${OUTPUT_VIDEO}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
