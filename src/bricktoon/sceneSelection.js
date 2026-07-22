function naturalCompare(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function normalizeSceneId(sceneId) {
  return String(sceneId || "").trim().toUpperCase();
}

function parseSceneIdsArg(value) {
  const tokens = Array.isArray(value)
    ? value
    : String(value || "")
      .split(/[,\s]+/);

  const sceneIds = [];
  const seen = new Set();
  for (const token of tokens) {
    const normalized = normalizeSceneId(token);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    sceneIds.push(normalized);
  }
  return sceneIds.sort(naturalCompare);
}

function hasSceneSelection(sceneIds) {
  return Array.isArray(sceneIds) && sceneIds.length > 0;
}

function filterScenes(scenes, sceneIds) {
  const rows = Array.isArray(scenes) ? scenes : [];
  if (!hasSceneSelection(sceneIds)) {
    return rows;
  }
  const selected = new Set(sceneIds.map(normalizeSceneId));
  return rows.filter((scene) => selected.has(normalizeSceneId(scene?.scene_id)));
}

function collectShotIdsFromScenes(scenes) {
  const shotIds = [];
  const seen = new Set();
  for (const scene of Array.isArray(scenes) ? scenes : []) {
    for (const shot of Array.isArray(scene?.shots) ? scene.shots : []) {
      const shotId = String(shot?.shot_id || "").trim();
      if (!shotId || seen.has(shotId)) {
        continue;
      }
      seen.add(shotId);
      shotIds.push(shotId);
    }
  }
  return shotIds.sort(naturalCompare);
}

function mergeScopedRecords(existingRecords, replacementRecords, { idField, scopedIds = [] }) {
  const replacements = Array.isArray(replacementRecords) ? replacementRecords : [];
  if (!Array.isArray(existingRecords) || !hasSceneSelection(scopedIds)) {
    return [...replacements].sort((left, right) => naturalCompare(left?.[idField], right?.[idField]));
  }

  const scoped = new Set(scopedIds.map((id) => String(id || "").trim()).filter(Boolean));
  const preserved = existingRecords.filter((record) => !scoped.has(String(record?.[idField] || "").trim()));

  return [...preserved, ...replacements]
    .sort((left, right) => naturalCompare(left?.[idField], right?.[idField]));
}

module.exports = {
  collectShotIdsFromScenes,
  filterScenes,
  hasSceneSelection,
  mergeScopedRecords,
  normalizeSceneId,
  parseSceneIdsArg
};
