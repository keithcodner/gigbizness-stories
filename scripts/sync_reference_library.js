#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const ROOT = path.resolve(__dirname, "..");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function relativeWorkspacePath(workspaceDir, absolutePath) {
  return path.relative(workspaceDir, absolutePath).replaceAll("\\", "/");
}

function listImagesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listImagesRecursive(fullPath));
      continue;
    }
    if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function sanitizeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "misc";
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/sync_reference_library.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const config = readJsonSafe(path.join(ROOT, "config", "asset_library.json"), {});
    const manifestPath = path.join(workspaceDir, "04_assets", "reference_manifest.json");
    const manifest = readJsonSafe(manifestPath, {
      mode: "selected",
      selected_references: [],
      selected_asset_categories: []
    });
    const outputRoot = path.join(workspaceDir, config.workspace_reference_target || "04_assets/reference_images");
    const syncedDir = path.join(outputRoot, "library_sync");
    const reportPath = path.join(outputRoot, "reference_sync_report.json");
    const copied = [];

    ensureDir(outputRoot);
    ensureDir(syncedDir);

    for (const ref of Array.isArray(manifest.selected_references) ? manifest.selected_references : []) {
      const sourcePath = path.join(ROOT, ref);
      if (!fs.existsSync(sourcePath)) {
        continue;
      }
      const category = sanitizeSegment(path.basename(path.dirname(sourcePath)));
      const targetDir = path.join(syncedDir, category);
      const targetPath = path.join(targetDir, path.basename(sourcePath));
      ensureDir(targetDir);
      fs.copyFileSync(sourcePath, targetPath);
      copied.push({
        mode: "selected_reference",
        source: path.relative(ROOT, sourcePath).replaceAll("\\", "/"),
        target: relativeWorkspacePath(workspaceDir, targetPath)
      });
    }

    for (const categoryName of Array.isArray(manifest.selected_asset_categories) ? manifest.selected_asset_categories : []) {
      const categoryPath = path.join(ROOT, config.general_asset_library_root || "library/general_assets", categoryName);
      for (const sourcePath of listImagesRecursive(categoryPath)) {
        const targetDir = path.join(syncedDir, sanitizeSegment(categoryName));
        const targetPath = path.join(targetDir, path.basename(sourcePath));
        ensureDir(targetDir);
        fs.copyFileSync(sourcePath, targetPath);
        copied.push({
          mode: "asset_category",
          source: path.relative(ROOT, sourcePath).replaceAll("\\", "/"),
          target: relativeWorkspacePath(workspaceDir, targetPath)
        });
      }
    }

    fs.writeFileSync(reportPath, `${JSON.stringify({
      created_at: new Date().toISOString(),
      copied_count: copied.length,
      copied
    }, null, 2)}\n`, "utf8");

    console.log(`Reference library sync completed for '${path.basename(workspaceDir)}' with ${copied.length} copied files.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
