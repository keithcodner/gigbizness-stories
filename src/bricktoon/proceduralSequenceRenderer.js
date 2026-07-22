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
  const context = `${sceneCard.title || ""} ${sceneCard.narration || ""}`.toLowerCase();
  const seed = hashString(context || shotType || "scene");
  const variant = seed % 3;
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
      overlays: { deskBand: true, checklistBoard: true, officeBands: true },
      pulse: 0.09 + (Math.sin(progress * Math.PI * 2.5) * 0.03),
      variant
    };
  }
  if (/pressure|warning|fee|invoice|bill|leverage|deadline|risk|urgent/.test(context)) {
    return {
      name: "pressure_scene",
      sky: [216, 172, 94],
      ground: [126, 86, 42],
      structure: [214, 186, 132],
      accent: [176, 63, 35],
      window: [247, 216, 124],
      door: [110, 72, 40],
      overlays: { hazardStripe: true, warningBoard: true, sidePanels: true },
      pulse: 0.18 + (Math.sin(progress * Math.PI * 3) * 0.06),
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
      overlays: { briefingBoard: true, evidenceBoxes: true, ceilingBand: true },
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
  if (topDown) {
    fillRect(buffer, width, height, width * 0.08 + dx * 0.2, height * 0.14 + dy * 0.15, width * 0.84, height * 0.7, [227, 216, 190]);
    fillRect(buffer, width, height, width * 0.14 + dx * 0.25, height * 0.22 + dy * 0.18, width * 0.72, height * 0.48, [243, 238, 224]);
    fillRect(buffer, width, height, width * 0.2 + dx * 0.25, height * 0.28 + dy * 0.18, width * 0.18, height * 0.1, profile.accent);
    fillRect(buffer, width, height, width * 0.42 + dx * 0.25, height * 0.52 + dy * 0.18, width * 0.26, height * 0.11, [239, 239, 239], 0.95);
    if (profile.overlays.briefingBoard || profile.overlays.checklistBoard) {
      fillRect(buffer, width, height, width * 0.58, height * 0.28, width * 0.16, height * 0.14, profile.accent, 0.82);
    }
    if (profile.overlays.monitorGrid) {
      fillRect(buffer, width, height, width * 0.26, height * 0.48, width * 0.44, height * 0.08, [31, 42, 61], 0.88);
      fillRect(buffer, width, height, width * 0.29, height * 0.505, width * (0.1 + progress * 0.12), height * 0.012, profile.accent, 0.92);
    }
    fillRect(buffer, width, height, width * 0.08 + dx * 0.15, height * 0.14 + dy * 0.12, width * 0.84, height * 0.7, [255, 255, 255], 0.03 + progress * 0.03);
    return;
  }
  fillRect(buffer, width, height, 0, height * 0.62 + impact + dy * 0.4, width, height * 0.38, profile.ground);
  fillRect(buffer, width, height, width * 0.11 + dx * 0.45, height * facadeY + dy * 0.25, width * 0.78, height * facadeH, profile.structure);
  fillRect(buffer, width, height, width * 0.2 + dx * 0.6, height * 0.22 + dy * 0.3, width * 0.56, height * 0.07, profile.accent);
  fillRect(buffer, width, height, width * leftWindowX + dx * 0.75, height * (0.32 + variant * 0.01) + dy * 0.2, width * 0.18, height * 0.14, profile.window);
  fillRect(buffer, width, height, width * rightWindowX + dx * 0.75, height * (0.31 + (2 - variant) * 0.012) + dy * 0.2, width * 0.18, height * 0.14, profile.window);
  fillRect(buffer, width, height, width * doorX + dx * 0.7, height * (0.34 + variant * 0.02) + dy * 0.25, width * 0.14, height * 0.28, profile.door);
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
  }
  if (profile.overlays.briefingBoard || profile.overlays.checklistBoard) {
    fillRect(buffer, width, height, width * 0.68, height * 0.27, width * 0.18, height * 0.18, [245, 243, 232], 0.94);
    fillRect(buffer, width, height, width * 0.7, height * 0.295, width * 0.12, height * 0.014, profile.accent, 0.85);
    fillRect(buffer, width, height, width * 0.7, height * 0.33, width * (0.09 + profile.pulse * 0.08), height * 0.01, [97, 111, 125], 0.7);
    fillRect(buffer, width, height, width * 0.7, height * 0.358, width * 0.1, height * 0.01, [97, 111, 125], 0.58);
  }
  if (profile.overlays.evidenceBoxes) {
    fillRect(buffer, width, height, width * 0.14, height * 0.54, width * 0.1, height * 0.08, [164, 128, 84], 0.96);
    fillRect(buffer, width, height, width * 0.74, height * 0.56, width * 0.08, height * 0.06, [154, 116, 78], 0.96);
  }
  if (profile.overlays.awning) {
    fillRect(buffer, width, height, width * (0.15 + variant * 0.03), height * (0.27 + variant * 0.01), width * (0.54 - variant * 0.04), height * 0.035, [255, 255, 255], 0.35);
  }
  if (profile.overlays.curbBand) {
    fillRect(buffer, width, height, 0, height * 0.66 + impact + dy * 0.45, width, height * 0.018, [225, 203, 116], 0.88);
  }
  if (profile.overlays.sidewalkCard) {
    fillRect(buffer, width, height, width * (0.08 + profile.pulse * 0.08), height * 0.72, width * 0.12, height * 0.06, [241, 235, 214], 0.82);
  }
  if (profile.overlays.monitorGrid || profile.overlays.statusPulse) {
    fillRect(buffer, width, height, width * 0.14, height * 0.26, width * 0.18, height * 0.12, [27, 37, 52], 0.88);
    fillRect(buffer, width, height, width * 0.17, height * 0.29, width * (0.09 + profile.pulse * 0.05), height * 0.012, profile.accent, 0.92);
    fillRect(buffer, width, height, width * 0.17, height * 0.315, width * (0.06 + profile.pulse * 0.03), height * 0.01, [176, 238, 220], 0.9);
  }
  fillRect(buffer, width, height, width * 0.1 + dx * 0.25, height * 0.16 + dy * 0.25, width * 0.8, height * 0.38, [255, 255, 255], 0.04 + progress * 0.04);
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
  const bodyLeanOffset = pose.bodyLean * 34 * scale;
  const torsoCenterX = x + bodyLeanOffset;
  const torsoX = torsoCenterX - torsoW / 2;
  const torsoY = y;
  const headX = torsoCenterX + pose.headTurn * 10 * scale;
  const headY = y - 58 * scale - pose.recoil * 14 * scale + pose.talkOffsetY;
  const shoulderY = torsoY + 18 * scale;
  const leftShoulderX = torsoCenterX - 28 * scale;
  const rightShoulderX = torsoCenterX + 28 * scale;
  const hipY = torsoY + torsoH;
  const villainRaise = pose.villainRaise * 46 * scale;
  const pointLift = pose.point * 40 * scale;
  const revealLift = Math.max(pose.revealFolder, pose.propReveal) * 32 * scale;
  const reactionPull = pose.reaction * 24 * scale;
  const phoneRaiseLift = pose.phoneRaise * 18 * scale;
  const contractLift = pose.contractPresent * 14 * scale;

  fillCircle(buffer, width, height, torsoCenterX, torsoY + torsoH + 16 * scale, 30 * scale, [0, 0, 0], 0.12);
  fillRect(buffer, width, height, torsoX, torsoY, torsoW, torsoH, palette.torso);
  fillRect(buffer, width, height, torsoCenterX - 18 * scale, torsoY, 36 * scale, torsoH, palette.accent);

  const leftElbowX = leftShoulderX - armLenUpper + reactionPull * 0.2;
  const leftElbowY = shoulderY + 18 * scale - pointLift * 0.4 - revealLift * 0.15;
  const leftHandX = leftElbowX - armLenLower + pose.point * 18 * scale;
  const leftHandY = leftElbowY + 10 * scale - pointLift;
  drawLine(buffer, width, height, leftShoulderX, shoulderY, leftElbowX, leftElbowY, limbThickness, skin);
  drawLine(buffer, width, height, leftElbowX, leftElbowY, leftHandX, leftHandY, limbThickness * 0.9, skin);
  fillRect(buffer, width, height, leftHandX - 10 * scale, leftHandY - 6 * scale, 16 * scale, 12 * scale, skin);

  const rightElbowX = rightShoulderX + armLenUpper + pose.gestureLift * 4 * scale;
  const rightElbowY = shoulderY + 6 * scale - villainRaise - revealLift * 0.5 - reactionPull * 0.25 - phoneRaiseLift * 0.5 - contractLift * 0.35;
  const rightHandX = rightElbowX + armLenLower + pose.gestureLift * 14 * scale;
  const rightHandY = rightElbowY - 6 * scale - revealLift * 0.35 - phoneRaiseLift * 0.55;
  drawLine(buffer, width, height, rightShoulderX, shoulderY, rightElbowX, rightElbowY, limbThickness, skin);
  drawLine(buffer, width, height, rightElbowX, rightElbowY, rightHandX, rightHandY, limbThickness * 0.9, skin);
  fillRect(buffer, width, height, rightHandX - 2 * scale, rightHandY - 6 * scale, 16 * scale, 12 * scale, skin);

  drawLine(buffer, width, height, torsoCenterX - 20 * scale, hipY, torsoCenterX - 20 * scale, hipY + legLenUpper, limbThickness, [42, 51, 68]);
  drawLine(buffer, width, height, torsoCenterX - 20 * scale, hipY + legLenUpper, torsoCenterX - 24 * scale, hipY + legLenUpper + legLenLower, limbThickness * 0.95, [42, 51, 68]);
  fillRect(buffer, width, height, torsoCenterX - 38 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 28 * scale, 16 * scale, [29, 35, 49]);
  drawLine(buffer, width, height, torsoCenterX + 20 * scale, hipY, torsoCenterX + 20 * scale, hipY + legLenUpper, limbThickness, [42, 51, 68]);
  drawLine(buffer, width, height, torsoCenterX + 20 * scale, hipY + legLenUpper, torsoCenterX + 24 * scale, hipY + legLenUpper + legLenLower, limbThickness * 0.95, [42, 51, 68]);
  fillRect(buffer, width, height, torsoCenterX + 8 * scale, hipY + legLenUpper + legLenLower - 8 * scale, 28 * scale, 16 * scale, [29, 35, 49]);

  fillCircle(buffer, width, height, headX, headY, headR, skin);
  if (member.role === "worried_customer") {
    fillCircle(buffer, width, height, headX - 24 * scale, headY - 16 * scale, 12 * scale, hair);
    fillCircle(buffer, width, height, headX, headY - 22 * scale, 10 * scale, hair);
    fillCircle(buffer, width, height, headX + 24 * scale, headY - 16 * scale, 12 * scale, hair);
  }
  if (palette.hat) {
    fillRect(buffer, width, height, headX - 34 * scale, headY - 68 * scale, 68 * scale, 24 * scale, [12, 16, 26]);
    fillRect(buffer, width, height, headX - 50 * scale, headY - 44 * scale, 100 * scale, 10 * scale, [12, 16, 26]);
  }
  const eyebrowY = headY - (18 + pose.eyebrowLift * 8) * scale;
  drawLine(buffer, width, height, headX - 18 * scale, eyebrowY + pose.eyebrowTilt * 4 * scale, headX - 3 * scale, eyebrowY - pose.eyebrowTilt * 5 * scale, 2 * scale, eye);
  drawLine(buffer, width, height, headX + 3 * scale, eyebrowY - pose.eyebrowTilt * 5 * scale, headX + 18 * scale, eyebrowY + pose.eyebrowTilt * 4 * scale, 2 * scale, eye);

  if (pose.blinkAmount > 0.65) {
    drawLine(buffer, width, height, headX - 14 * scale, headY - 2 * scale, headX - 6 * scale, headY - 2 * scale, 2 * scale, eye);
    drawLine(buffer, width, height, headX + 6 * scale, headY - 2 * scale, headX + 14 * scale, headY - 2 * scale, 2 * scale, eye);
  } else {
    fillCircle(buffer, width, height, headX - 12 * scale, headY, 6 * scale * pose.eyeScale, [255, 255, 255]);
    fillCircle(buffer, width, height, headX + 12 * scale, headY, 6 * scale * pose.eyeScale, [255, 255, 255]);
    fillCircle(buffer, width, height, headX - 10 * scale + pose.headTurn * 1.5 * scale, headY + 1, 3 * scale, eye);
    fillCircle(buffer, width, height, headX + 10 * scale + pose.headTurn * 1.5 * scale, headY + 1, 3 * scale, eye);
  }
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
  if (pose.propType === "phone" && /closeup|medium|over_shoulder/.test(shotType || "")) {
    fillRect(buffer, width, height, rightHandX + 2 * scale, rightHandY - 18 * scale, 18 * scale, 30 * scale, [31, 42, 61]);
    fillRect(buffer, width, height, rightHandX + 5 * scale, rightHandY - 14 * scale, 12 * scale, 18 * scale, [106, 225, 255], pose.phoneGlow);
  }
  if (pose.propType === "folder" && (pose.revealFolder > 0.08 || pose.propCarry > 0.18)) {
    fillRect(buffer, width, height, rightHandX + 6 * scale, rightHandY - 12 * scale, 34 * scale, 26 * scale, [230, 206, 109], 0.92);
    fillRect(buffer, width, height, rightHandX + 10 * scale, rightHandY - 8 * scale, 26 * scale, 18 * scale, [247, 236, 178], 0.9);
    fillRect(buffer, width, height, rightHandX + 14 * scale, rightHandY - 3 * scale, 18 * scale, 3 * scale, [182, 168, 104], 0.8);
  }
  if (pose.propType === "contract" && (pose.villainRaise > 0.12 || pose.contractPresent > 0.18)) {
    fillRect(buffer, width, height, rightHandX + 4 * scale, rightHandY - 10 * scale, 30 * scale, 22 * scale, [244, 238, 228], 0.95);
    fillRect(buffer, width, height, rightHandX + 8 * scale, rightHandY - 5 * scale, 18 * scale, 3 * scale, [123, 123, 123], 0.8);
  }
  if (pose.propType === "moving_box" && pose.boxCarry > 0.18) {
    fillRect(buffer, width, height, torsoCenterX - 34 * scale, torsoY + 58 * scale, 68 * scale, 44 * scale, [173, 126, 72], 0.95);
    fillRect(buffer, width, height, torsoCenterX - 28 * scale, torsoY + 64 * scale, 56 * scale, 6 * scale, [204, 168, 110], 0.85);
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
      y: index === 0 ? 0.47 : 0.57,
      scale: index === 0 ? 1.8 : 1.0
    }));
  }
  if (shotType === "low_angle_villain") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: member.role === "schemer_villain" ? 0.62 : index === 0 ? 0.26 : 0.78,
      y: member.role === "schemer_villain" ? 0.55 : 0.63,
      scale: member.role === "schemer_villain" ? 1.45 : 0.95
    }));
  }
  if (shotType === "reaction_cutaway") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.5 : 0.78,
      y: 0.58,
      scale: index === 0 ? 1.32 : 0.92
    }));
  }
  if (shotType === "over_shoulder") {
    return visibleMembers.map((member, index) => ({
      character_id: member.character_id,
      x: index === 0 ? 0.32 : 0.72,
      y: index === 0 ? 0.66 : 0.59,
      scale: index === 0 ? 1.22 : 1.18
    }));
  }
  if (shotType === "medium_two_shot") {
    return visibleMembers.map((member, index) => {
      const screenPos = positionMap.get(member.character_id) || positionMap.get(member.cast_member_id) || (index === 0 ? "left" : "right");
      return {
        character_id: member.character_id,
        x: screenPos === "left" ? 0.33 : screenPos === "center" ? 0.5 : 0.68,
        y: 0.6,
        scale: 1.1
      };
    });
  }
  if (shotType === "establishing_wide" || shotType === "wide_three_character" || shotType === "medium_three_character") {
    return visibleMembers.map((member, index) => {
      const screenPos = positionMap.get(member.character_id) || positionMap.get(member.cast_member_id) || ["left", "center", "right"][index] || "right";
      return {
        character_id: member.character_id,
        x: screenPos === "left" ? 0.25 : screenPos === "center" ? 0.5 : 0.74,
        y: 0.62,
        scale: 1.05
      };
    });
  }
  return visibleMembers.map((member, index) => {
    const screenPos = positionMap.get(member.character_id) || positionMap.get(member.cast_member_id) || ["left", "center", "right"][index] || "right";
    return {
      character_id: member.character_id,
      x: screenPos === "left" ? 0.3 : screenPos === "center" ? 0.56 : 0.78,
      y: 0.61,
      scale: index === 0 ? 1.18 : 1.04
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
