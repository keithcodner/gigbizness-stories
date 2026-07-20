#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIBRARY_DIR = path.join(ROOT, "library");
const REFERENCE_DIR = path.join(LIBRARY_DIR, "reference_images");
const GENERAL_DIR = path.join(LIBRARY_DIR, "general_assets");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll("\\", "/");
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

function main() {
  const referenceFiles = listImageFiles(REFERENCE_DIR).filter((filePath) => path.basename(filePath) !== "README.md");
  const categoryTemplatePath = path.join(GENERAL_DIR, "catalog_templates.json");
  const templates = readJsonSafe(categoryTemplatePath, { categories: [] });
  const categories = templates.categories.map((category) => {
    const categoryDir = path.join(GENERAL_DIR, category.id);
    const files = listImageFiles(categoryDir);
    return {
      id: category.id,
      title: category.title,
      purpose: category.purpose,
      prompt_targets: category.prompt_targets,
      image_count: files.length,
      image_files: files.map(rel)
    };
  });

  writeJson(path.join(REFERENCE_DIR, "reference_catalog.json"), {
    generated_at: new Date().toISOString(),
    count: referenceFiles.length,
    references: referenceFiles.map((filePath, index) => ({
      reference_id: `REFCAT_${String(index + 1).padStart(3, "0")}`,
      file: rel(filePath),
      label: path.basename(filePath)
    }))
  });

  writeJson(path.join(LIBRARY_DIR, "library_catalog_index.json"), {
    generated_at: new Date().toISOString(),
    reference_image_count: referenceFiles.length,
    general_asset_category_count: categories.length,
    general_asset_image_count: categories.reduce((sum, category) => sum + category.image_count, 0),
    reference_catalog: "library/reference_images/reference_catalog.json",
    category_catalog: "library/general_assets/catalog_templates.json",
    categories
  });

  console.log("Library catalog index updated.");
}

main();
