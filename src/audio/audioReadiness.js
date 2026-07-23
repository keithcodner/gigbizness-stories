const fs = require("fs");
const { spawnSync } = require("child_process");

const SILENT_MEAN_VOLUME_DB = -70;

function fileHasContent(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath) && Number(fs.statSync(filePath).size || 0) > 0;
}

function probeMeanVolumeDb(filePath) {
  if (!fileHasContent(filePath)) {
    return null;
  }

  const result = spawnSync("ffmpeg", [
    "-i",
    filePath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "NUL"
  ], { encoding: "utf8" });

  const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
  for (const line of combined.split(/\r?\n/)) {
    if (!line.includes("mean_volume:")) {
      continue;
    }
    try {
      return Number.parseFloat(line.split("mean_volume:")[1].split("dB")[0].trim());
    } catch (error) {
      return null;
    }
  }

  return null;
}

function hasUsableVoiceAudio(filePath, thresholdDb = SILENT_MEAN_VOLUME_DB) {
  const meanDb = probeMeanVolumeDb(filePath);
  return meanDb !== null && meanDb > thresholdDb;
}

module.exports = {
  SILENT_MEAN_VOLUME_DB,
  fileHasContent,
  probeMeanVolumeDb,
  hasUsableVoiceAudio
};
