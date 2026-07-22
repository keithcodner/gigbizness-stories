const fs = require("fs");

function getFileMtimeMs(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return 0;
  }

  try {
    return Number(fs.statSync(filePath).mtimeMs || 0);
  } catch (error) {
    return 0;
  }
}

function isFreshArtifact(targetPath, dependencyPaths = []) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return false;
  }

  const targetMtime = getFileMtimeMs(targetPath);
  return dependencyPaths.every((dependencyPath) =>
    Boolean(dependencyPath)
      && fs.existsSync(dependencyPath)
      && targetMtime >= getFileMtimeMs(dependencyPath)
  );
}

function getStaleDependencies(targetPath, dependencyMap = {}) {
  const targetExists = Boolean(targetPath) && fs.existsSync(targetPath);
  const targetMtime = targetExists ? getFileMtimeMs(targetPath) : 0;
  const stale = [];

  for (const [dependencyId, dependencyPath] of Object.entries(dependencyMap)) {
    if (!dependencyPath || !fs.existsSync(dependencyPath)) {
      stale.push(dependencyId);
      continue;
    }
    if (!targetExists || targetMtime < getFileMtimeMs(dependencyPath)) {
      stale.push(dependencyId);
    }
  }

  return stale;
}

function summarizeArtifactFreshness(entries = []) {
  const staleEntries = entries
    .map((entry) => ({
      artifact_id: entry.artifact_id,
      stale_dependencies: getStaleDependencies(entry.target_path, entry.dependencies || {})
    }))
    .filter((entry) => entry.stale_dependencies.length > 0);

  return {
    artifact_count: entries.length,
    stale_artifact_count: staleEntries.length,
    stale_artifacts: staleEntries
  };
}

module.exports = {
  getFileMtimeMs,
  getStaleDependencies,
  isFreshArtifact,
  summarizeArtifactFreshness
};
