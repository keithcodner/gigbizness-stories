const fs = require("fs");
const path = require("path");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null || value === "") {
    return [];
  }
  return [value];
}

function normalizeWorkspaceRelative(workspaceDir, filePath) {
  return path.relative(workspaceDir, filePath).replaceAll("\\", "/");
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listImageFiles(fullPath));
      continue;
    }
    if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function loadReferenceUsage(workspaceDir) {
  const usagePath = path.join(workspaceDir, "03_cast", "reference_usage.json");
  if (!fs.existsSync(usagePath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(usagePath, "utf8"));
    return Array.isArray(parsed.references) ? parsed.references : [];
  } catch (error) {
    return [];
  }
}

function matchesTarget(appliesTo, context) {
  const scopes = ensureArray(appliesTo).map((value) => String(value || "").trim()).filter(Boolean);
  if (scopes.length === 0) {
    return true;
  }

  const targets = new Set(["all"]);
  if (context.characterId) {
    targets.add(`character:${context.characterId}`);
  }
  if (context.sceneId) {
    targets.add(`scene:${context.sceneId}`);
  }
  if (context.shotId) {
    targets.add(`shot:${context.shotId}`);
  }

  return scopes.some((scope) => targets.has(scope));
}

function buildDefaultReferences(workspaceDir, context) {
  const refsDir = path.join(workspaceDir, "04_assets", "reference_images");
  return listImageFiles(refsDir).map((filePath, index) => ({
    reference_id: `AUTO_REF_${String(index + 1).padStart(3, "0")}`,
    type: "style_reference",
    filePath,
    relativeFile: normalizeWorkspaceRelative(workspaceDir, filePath),
    label: path.basename(filePath),
    applies_to: ["all"]
  })).filter((ref) => matchesTarget(ref.applies_to, context));
}

function buildExplicitReferences(workspaceDir, context) {
  return loadReferenceUsage(workspaceDir)
    .map((ref, index) => {
      const fileValue = ref.file || ref.file_path || ref.relative_file || ref.path;
      if (!fileValue) {
        return null;
      }
      const filePath = path.isAbsolute(fileValue)
        ? fileValue
        : path.join(workspaceDir, fileValue);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        return null;
      }
      return {
        reference_id: ref.reference_id || `REF_${String(index + 1).padStart(3, "0")}`,
        type: ref.type || "style_reference",
        filePath,
        relativeFile: normalizeWorkspaceRelative(workspaceDir, filePath),
        label: ref.label || path.basename(filePath),
        applies_to: ensureArray(ref.applies_to)
      };
    })
    .filter(Boolean)
    .filter((ref) => matchesTarget(ref.applies_to, context));
}

function collectReferenceImages(workspaceDir, context = {}) {
  const explicit = buildExplicitReferences(workspaceDir, context);
  if (explicit.length > 0) {
    return explicit;
  }
  return buildDefaultReferences(workspaceDir, context);
}

function referencePromptAddendum(references) {
  if (!references || references.length === 0) {
    return "";
  }
  return [
    "Reference image provided.",
    "Match the premium bricktoon editorial look of the reference.",
    "Use bold toy-brick characters, dramatic expressions, dense cinematic composition, and polished thumbnail-level lighting."
  ].join(" ");
}

module.exports = {
  collectReferenceImages,
  referencePromptAddendum
};
