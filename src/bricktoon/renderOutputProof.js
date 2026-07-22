const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runMediaCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: options.encoding ?? "utf8",
    maxBuffer: options.maxBuffer ?? 50 * 1024 * 1024
  });
}

function safeReadJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function probeMedia(renderPath) {
  const result = runMediaCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size,bit_rate",
    "-show_streams",
    "-of",
    "json",
    renderPath
  ]);

  if (result.status !== 0) {
    return {
      available: false,
      error: (result.stderr || result.stdout || "ffprobe failed").trim()
    };
  }

  try {
    const parsed = JSON.parse(result.stdout || "{}");
    const streams = safeArray(parsed.streams);
    const videoStream = streams.find((stream) => stream.codec_type === "video") || {};
    const audioStream = streams.find((stream) => stream.codec_type === "audio") || {};
    return {
      available: true,
      duration_seconds: safeNumber(parsed.format?.duration),
      file_size_bytes: safeNumber(parsed.format?.size),
      container_bitrate: safeNumber(parsed.format?.bit_rate),
      video: {
        codec_name: videoStream.codec_name || null,
        width: safeNumber(videoStream.width),
        height: safeNumber(videoStream.height),
        fps: safeNumber(String(videoStream.avg_frame_rate || "0").split("/")[1])
          ? safeNumber(String(videoStream.avg_frame_rate || "0").split("/")[0]) / safeNumber(String(videoStream.avg_frame_rate || "0").split("/")[1], 1)
          : safeNumber(videoStream.avg_frame_rate),
        bitrate: safeNumber(videoStream.bit_rate),
        frames: safeNumber(videoStream.nb_frames)
      },
      audio: {
        codec_name: audioStream.codec_name || null,
        sample_rate: safeNumber(audioStream.sample_rate),
        channels: safeNumber(audioStream.channels),
        bitrate: safeNumber(audioStream.bit_rate),
        duration_seconds: safeNumber(audioStream.duration)
      }
    };
  } catch (error) {
    return {
      available: false,
      error: `Unable to parse ffprobe JSON: ${error.message}`
    };
  }
}

function analyzeAudioLevels(renderPath) {
  const result = runMediaCommand("ffmpeg", [
    "-v",
    "error",
    "-i",
    renderPath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-"
  ]);

  const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
  const meanMatch = combined.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  const maxMatch = combined.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);

  return {
    available: result.status === 0 || Boolean(meanMatch) || Boolean(maxMatch),
    mean_volume_db: meanMatch ? Number(meanMatch[1]) : null,
    max_volume_db: maxMatch ? Number(maxMatch[1]) : null
  };
}

function buildSampleTimes(renderContract = {}, durationSeconds = 0) {
  const sceneMidpoints = safeArray(renderContract.scenes)
    .map((scene) => {
      const start = safeNumber(scene.start_seconds);
      const end = safeNumber(scene.end_seconds);
      if (end > start) {
        return Number(((start + end) / 2).toFixed(2));
      }
      return null;
    })
    .filter((seconds) => seconds !== null);

  if (sceneMidpoints.length > 0) {
    return sceneMidpoints.slice(0, 10);
  }

  if (durationSeconds <= 0) {
    return [0];
  }

  const segments = Math.min(8, Math.max(3, Math.round(durationSeconds / 30)));
  const step = durationSeconds / segments;
  const times = [];
  for (let index = 0; index < segments; index += 1) {
    times.push(Number((Math.min(durationSeconds - 0.2, (index * step) + step / 2)).toFixed(2)));
  }
  return times;
}

function buildMotionSampleWindows(renderContract = {}, durationSeconds = 0, offsetSeconds = 0.75) {
  const scenes = safeArray(renderContract.scenes);
  const windows = scenes
    .map((scene) => {
      const start = safeNumber(scene.start_seconds);
      const end = safeNumber(scene.end_seconds);
      if (end - start < 1.2) {
        return null;
      }
      const first = Number((start + Math.min(1, (end - start) / 3)).toFixed(2));
      const second = Number((Math.min(end - 0.15, first + offsetSeconds)).toFixed(2));
      if (second <= first) {
        return null;
      }
      return {
        scene_id: scene.scene_id || null,
        first,
        second
      };
    })
    .filter(Boolean);

  if (windows.length > 0) {
    return windows.slice(0, 8);
  }

  if (durationSeconds < 1.2) {
    return [];
  }

  const times = buildSampleTimes(renderContract, durationSeconds);
  return times.map((first) => ({
    scene_id: null,
    first,
    second: Number((Math.min(durationSeconds - 0.1, first + offsetSeconds)).toFixed(2))
  })).filter((window) => window.second > window.first);
}

function sampleFrameBuffer(renderPath, seconds, width = 64, height = 36) {
  const result = spawnSync("ffmpeg", [
    "-v",
    "error",
    "-ss",
    String(seconds),
    "-i",
    renderPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${width}:${height},format=rgb24`,
    "-f",
    "rawvideo",
    "-"
  ], {
    encoding: null,
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
    return {
      available: false,
      error: Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8").trim() : String(result.stderr || "ffmpeg sample failed")
    };
  }

  return {
    available: true,
    width,
    height,
    buffer: result.stdout
  };
}

function quantizedColorKey(r, g, b) {
  return `${r >> 5}-${g >> 5}-${b >> 5}`;
}

function frameFeatures(sample = {}) {
  if (!sample.available || !sample.buffer) {
    return {
      available: false,
      color_count: 0,
      edge_density: 0,
      saturation_mean: 0,
      brightness_mean: 0
    };
  }

  const { buffer, width, height } = sample;
  const colors = new Set();
  let brightnessSum = 0;
  let saturationSum = 0;
  let edgeSum = 0;
  let edgePairs = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const r = buffer[index];
      const g = buffer[index + 1];
      const b = buffer[index + 2];
      colors.add(quantizedColorKey(r, g, b));

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      brightnessSum += (r + g + b) / 3;
      saturationSum += max === 0 ? 0 : (max - min) / max;

      if (x > 0) {
        const leftIndex = index - 3;
        edgeSum += (
          Math.abs(r - buffer[leftIndex])
          + Math.abs(g - buffer[leftIndex + 1])
          + Math.abs(b - buffer[leftIndex + 2])
        ) / 3;
        edgePairs += 1;
      }
      if (y > 0) {
        const upIndex = index - (width * 3);
        edgeSum += (
          Math.abs(r - buffer[upIndex])
          + Math.abs(g - buffer[upIndex + 1])
          + Math.abs(b - buffer[upIndex + 2])
        ) / 3;
        edgePairs += 1;
      }
    }
  }

  const pixelCount = width * height;
  return {
    available: true,
    color_count: colors.size,
    edge_density: Number(((edgePairs ? edgeSum / edgePairs : 0) / 255).toFixed(4)),
    saturation_mean: Number((saturationSum / pixelCount).toFixed(4)),
    brightness_mean: Number(((brightnessSum / pixelCount) / 255).toFixed(4))
  };
}

function frameDistance(leftBuffer, rightBuffer) {
  if (!leftBuffer || !rightBuffer || leftBuffer.length !== rightBuffer.length) {
    return 1;
  }
  let diff = 0;
  for (let index = 0; index < leftBuffer.length; index += 1) {
    diff += Math.abs(leftBuffer[index] - rightBuffer[index]);
  }
  return diff / (leftBuffer.length * 255);
}

function summarizeFrameSet(samples = [], thresholds = {}) {
  const lowDetailThreshold = safeNumber(thresholds.low_detail_edge_threshold, 0.045);
  const lowColorThreshold = safeNumber(thresholds.low_color_count_threshold, 18);
  const duplicateThreshold = safeNumber(thresholds.duplicate_frame_distance_threshold, 0.055);

  const validSamples = samples.filter((sample) => sample.available);
  const features = validSamples.map((sample) => ({
    seconds: sample.seconds,
    ...frameFeatures(sample)
  }));

  let duplicateCount = 0;
  const distinctIndexes = [];
  for (let index = 0; index < validSamples.length; index += 1) {
    const current = validSamples[index];
    let duplicate = false;
    for (const distinctIndex of distinctIndexes) {
      const distance = frameDistance(current.buffer, validSamples[distinctIndex].buffer);
      if (distance <= duplicateThreshold) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) {
      duplicateCount += 1;
    } else {
      distinctIndexes.push(index);
    }
  }

  const lowDetailFrames = features.filter((feature) =>
    feature.edge_density <= lowDetailThreshold || feature.color_count <= lowColorThreshold
  ).length;

  return {
    sample_count: samples.length,
    analyzed_samples: validSamples.length,
    distinct_frames: distinctIndexes.length,
    duplicate_frames: duplicateCount,
    distinct_frame_ratio: validSamples.length ? Number((distinctIndexes.length / validSamples.length).toFixed(3)) : 0,
    duplicate_frame_ratio: validSamples.length ? Number((duplicateCount / validSamples.length).toFixed(3)) : 0,
    low_detail_frames: lowDetailFrames,
    low_detail_frame_ratio: validSamples.length ? Number((lowDetailFrames / validSamples.length).toFixed(3)) : 0,
    frame_features: features
  };
}

function summarizeMotionWindows(windows = [], thresholds = {}) {
  const staticThreshold = safeNumber(thresholds.min_motion_frame_distance, 0.012);
  const analyzed = windows.filter((window) => window.first_sample?.available && window.second_sample?.available);
  const summaries = analyzed.map((window) => ({
    scene_id: window.scene_id || null,
    first: window.first,
    second: window.second,
    motion_distance: Number(frameDistance(window.first_sample.buffer, window.second_sample.buffer).toFixed(4))
  }));
  const staticWindows = summaries.filter((window) => window.motion_distance < staticThreshold).length;

  return {
    sample_count: windows.length,
    analyzed_windows: summaries.length,
    static_windows: staticWindows,
    static_window_ratio: summaries.length ? Number((staticWindows / summaries.length).toFixed(3)) : 0,
    motion_samples: summaries
  };
}

function summarizeContractSignals(renderContract = {}, compositingReport = {}) {
  const scenes = safeArray(renderContract.scenes);
  const shots = safeArray(compositingReport.shots);
  const scenesWithFallback = scenes.filter((scene) => safeNumber(scene.shot_source_breakdown?.fallback_shots) > 0).length;
  const topSafeScenes = scenes.filter((scene) => String(scene.subtitle_safe_region?.mode || "").toLowerCase() === "top_safe").length;
  const fallbackDocumentShots = shots.filter((shot) =>
    String(shot.quality_classification || "").toLowerCase() === "fallback"
    && String(shot.performance_class || "").toLowerCase().includes("document")
  ).length;

  return {
    total_scenes: scenes.length,
    scenes_with_fallback: scenesWithFallback,
    scenes_with_fallback_ratio: scenes.length ? Number((scenesWithFallback / scenes.length).toFixed(3)) : 0,
    top_safe_scene_ratio: scenes.length ? Number((topSafeScenes / scenes.length).toFixed(3)) : 0,
    fallback_document_shots: fallbackDocumentShots,
    total_shots: shots.length,
    fallback_document_shot_ratio: shots.length ? Number((fallbackDocumentShots / shots.length).toFixed(3)) : 0
  };
}

function evaluateRenderOutputProof(runtimeProfile = {}, proof = {}) {
  const blockers = [];
  const warnings = [];
  const thresholds = runtimeProfile.render_output_proof || {};
  const media = proof.media || {};
  const audio = proof.audio_levels || {};
  const frames = proof.frame_summary || {};
  const motion = proof.motion_summary || {};
  const contract = proof.contract_signals || {};

  if (!proof.render_exists) {
    blockers.push("render output file is missing");
  }
  if (!media.available) {
    blockers.push(`render media probe failed${media.error ? `: ${media.error}` : ""}`);
  }

  if (media.available) {
    if (safeNumber(media.audio?.bitrate) < safeNumber(thresholds.min_audio_bitrate, 12000)) {
      blockers.push(`audio bitrate is too low for usable narration/music (${media.audio?.bitrate || 0} < ${safeNumber(thresholds.min_audio_bitrate, 12000)})`);
    }
    if (audio.available && audio.mean_volume_db !== null && audio.mean_volume_db < safeNumber(thresholds.min_mean_volume_db, -38)) {
      blockers.push(`audio mean volume is too quiet (${audio.mean_volume_db} dB < ${safeNumber(thresholds.min_mean_volume_db, -38)} dB)`);
    }
  }

  if (contract.scenes_with_fallback_ratio > safeNumber(thresholds.max_scenes_with_fallback_ratio, 0.75)) {
    blockers.push(`too many scenes still rely on fallback shots (${contract.scenes_with_fallback_ratio} > ${safeNumber(thresholds.max_scenes_with_fallback_ratio, 0.75)})`);
  }
  if (contract.fallback_document_shot_ratio > safeNumber(thresholds.max_fallback_document_shot_ratio, 0.3)) {
    blockers.push(`document-style fallback shots dominate too much of the sequence (${contract.fallback_document_shot_ratio} > ${safeNumber(thresholds.max_fallback_document_shot_ratio, 0.3)})`);
  }

  if (frames.analyzed_samples > 0) {
    if (frames.distinct_frame_ratio < safeNumber(thresholds.min_distinct_frame_ratio, 0.7)) {
      blockers.push(`sampled frames are too repetitive (${frames.distinct_frame_ratio} < ${safeNumber(thresholds.min_distinct_frame_ratio, 0.7)})`);
    }
    if (frames.low_detail_frame_ratio > safeNumber(thresholds.max_low_detail_frame_ratio, 0.34)) {
      blockers.push(`too many sampled frames look low-detail or placeholder-like (${frames.low_detail_frame_ratio} > ${safeNumber(thresholds.max_low_detail_frame_ratio, 0.34)})`);
    }
    if (frames.duplicate_frame_ratio > safeNumber(thresholds.max_duplicate_frame_ratio, 0.34)) {
      warnings.push(`sampled frames show repeated compositions (${frames.duplicate_frame_ratio} > ${safeNumber(thresholds.max_duplicate_frame_ratio, 0.34)})`);
    }
  } else {
    warnings.push("no valid frame samples were analyzed");
  }

  if (motion.analyzed_windows > 0) {
    if (motion.static_window_ratio > safeNumber(thresholds.max_static_motion_sample_ratio, 0.5)) {
      blockers.push(`too many motion checks look effectively static (${motion.static_window_ratio} > ${safeNumber(thresholds.max_static_motion_sample_ratio, 0.5)})`);
    }
  } else {
    warnings.push("no motion windows were analyzed");
  }

  return {
    decision: blockers.length === 0 ? "approved" : "blocked",
    blockers,
    warnings
  };
}

function buildRenderOutputProof({
  topicId,
  renderPath,
  renderContract = {},
  compositingReport = {},
  runtimeProfile = {}
}) {
  const renderExists = fs.existsSync(renderPath) && fs.statSync(renderPath).size > 0;
  const media = renderExists
    ? probeMedia(renderPath)
    : { available: false, error: "render output file is missing" };
  const sampleTimes = buildSampleTimes(renderContract, safeNumber(media.duration_seconds));
  const motionWindows = buildMotionSampleWindows(
    renderContract,
    safeNumber(media.duration_seconds),
    safeNumber(runtimeProfile.render_output_proof?.motion_probe_offset_seconds, 0.75)
  );
  const frameSamples = renderExists
    ? sampleTimes.map((seconds) => ({
      seconds,
      ...sampleFrameBuffer(renderPath, seconds)
    }))
    : [];
  const motionSamples = renderExists
    ? motionWindows.map((window) => ({
      ...window,
      first_sample: sampleFrameBuffer(renderPath, window.first),
      second_sample: sampleFrameBuffer(renderPath, window.second)
    }))
    : [];
  const audioLevels = renderExists ? analyzeAudioLevels(renderPath) : { available: false, mean_volume_db: null, max_volume_db: null };
  const frameSummary = summarizeFrameSet(frameSamples, runtimeProfile.render_output_proof || {});
  const motionSummary = summarizeMotionWindows(motionSamples, runtimeProfile.render_output_proof || {});
  const contractSignals = summarizeContractSignals(renderContract, compositingReport);

  const proof = {
    topic_id: topicId,
    created_at: new Date().toISOString(),
    render_exists: renderExists,
    render_file: renderExists ? path.relative(path.dirname(path.dirname(path.dirname(renderPath))), renderPath).replaceAll("\\", "/") : null,
    runtime_profile: {
      profile_id: runtimeProfile.profile_id || null,
      label: runtimeProfile.label || null
    },
    media,
    audio_levels: audioLevels,
    sample_times_seconds: sampleTimes,
    frame_summary: frameSummary,
    motion_summary: motionSummary,
    contract_signals: contractSignals
  };

  proof.gate = evaluateRenderOutputProof(runtimeProfile, proof);
  return proof;
}

function buildRenderOutputMarkdown(proof = {}) {
  const lines = [
    "# Bricktoon Render Output Proof",
    "",
    `- Topic: ${proof.topic_id || "n/a"}`,
    `- Decision: ${proof.gate?.decision || "n/a"}`,
    `- Generated: ${proof.created_at || "n/a"}`,
    `- Render exists: ${proof.render_exists ? "yes" : "no"}`,
    `- Render file: ${proof.render_file || "n/a"}`,
    "",
    "## Media",
    "",
    `- Duration seconds: ${proof.media?.duration_seconds ?? 0}`,
    `- Resolution: ${proof.media?.video?.width || 0}x${proof.media?.video?.height || 0}`,
    `- Video bitrate: ${proof.media?.video?.bitrate ?? 0}`,
    `- Audio bitrate: ${proof.media?.audio?.bitrate ?? 0}`,
    `- Mean volume dB: ${proof.audio_levels?.mean_volume_db ?? "n/a"}`,
    `- Max volume dB: ${proof.audio_levels?.max_volume_db ?? "n/a"}`,
    "",
    "## Visual Sample Summary",
    "",
    `- Samples analyzed: ${proof.frame_summary?.analyzed_samples ?? 0}`,
    `- Distinct frame ratio: ${proof.frame_summary?.distinct_frame_ratio ?? 0}`,
    `- Duplicate frame ratio: ${proof.frame_summary?.duplicate_frame_ratio ?? 0}`,
    `- Low-detail frame ratio: ${proof.frame_summary?.low_detail_frame_ratio ?? 0}`,
    `- Sample times: ${safeArray(proof.sample_times_seconds).join(", ") || "none"}`,
    `- Static motion-sample ratio: ${proof.motion_summary?.static_window_ratio ?? 0}`,
    "",
    "## Contract Signals",
    "",
    `- Scenes with fallback ratio: ${proof.contract_signals?.scenes_with_fallback_ratio ?? 0}`,
    `- Fallback document shot ratio: ${proof.contract_signals?.fallback_document_shot_ratio ?? 0}`,
    "",
    "## Blockers",
    ""
  ];

  if (safeArray(proof.gate?.blockers).length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of proof.gate.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  lines.push("## Warnings");
  lines.push("");

  if (safeArray(proof.gate?.warnings).length === 0) {
    lines.push("- None");
  } else {
    for (const warning of proof.gate.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function writeRenderOutputProof({ jsonPath, markdownPath, proof }) {
  ensureParentDir(jsonPath);
  ensureParentDir(markdownPath);
  fs.writeFileSync(jsonPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, buildRenderOutputMarkdown(proof), "utf8");
}

module.exports = {
  analyzeAudioLevels,
  buildRenderOutputMarkdown,
  buildRenderOutputProof,
  evaluateRenderOutputProof,
  probeMedia,
  summarizeContractSignals,
  summarizeFrameSet,
  writeRenderOutputProof
};
