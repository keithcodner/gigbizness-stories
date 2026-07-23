const fs = require("fs");
const path = require("path");
const { getFileMtimeMs } = require("./artifactFreshness");

function fileHasContent(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath) && Number(fs.statSync(filePath).size || 0) > 0;
}

function newestFileMtimeInDir(dirPath, extension = null) {
  if (!dirPath || !fs.existsSync(dirPath)) {
    return 0;
  }

  let newest = 0;
  for (const name of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, name);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      newest = Math.max(newest, newestFileMtimeInDir(filePath, extension));
      continue;
    }
    if (extension && path.extname(name).toLowerCase() !== extension.toLowerCase()) {
      continue;
    }
    newest = Math.max(newest, Number(stats.mtimeMs || 0));
  }
  return newest;
}

function hasApprovedKeyframes(approvedKeyframesDir) {
  return newestFileMtimeInDir(approvedKeyframesDir, ".png") > 0;
}

function isPreviewFresh({
  previewPath,
  previewReportPath,
  approvedKeyframesDir,
  voicePath = null,
  musicManifestPath = null
}) {
  if (!fileHasContent(previewPath) || !fileHasContent(previewReportPath)) {
    return false;
  }

  const previewMtime = Math.min(
    getFileMtimeMs(previewPath),
    getFileMtimeMs(previewReportPath)
  );

  const dependencyTimes = [
    newestFileMtimeInDir(approvedKeyframesDir, ".png"),
    fileHasContent(voicePath) ? getFileMtimeMs(voicePath) : 0,
    fileHasContent(musicManifestPath) ? getFileMtimeMs(musicManifestPath) : 0
  ];

  return dependencyTimes.every((mtime) => previewMtime >= Number(mtime || 0));
}

function resolveOvernightPreviewMode(paths = {}) {
  const previewFresh = isPreviewFresh(paths);
  if (previewFresh) {
    return "skip_existing_preview";
  }

  if (hasApprovedKeyframes(paths.approvedKeyframesDir)) {
    return "rebuild_visual_preview";
  }

  return "rebuild_full_bricktoon_preview";
}

module.exports = {
  fileHasContent,
  hasApprovedKeyframes,
  isPreviewFresh,
  newestFileMtimeInDir,
  resolveOvernightPreviewMode
};
