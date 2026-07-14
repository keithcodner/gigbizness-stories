#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TOPIC_ID = "test_story_template";
const WORKSPACE_DIR = path.join(ROOT, "workspaces", TOPIC_ID);
const SNAPSHOT_DIR = path.join(ROOT, "templates", "test_story_template_snapshot");
const ORCHESTRATOR_PATH = path.join(ROOT, "agents", "orchestrator.js");

function assertWorkspacePathSafe(targetPath) {
  const resolvedWorkspaceRoot = path.resolve(path.join(ROOT, "workspaces"));
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedWorkspaceRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to modify path outside workspaces root: ${resolvedTarget}`);
  }
}

function runNode(args, label) {
  const result = spawnSync(process.execPath, [ORCHESTRATOR_PATH, ...args], {
    cwd: ROOT,
    encoding: "utf8"
  });

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

function ensureStaticFixtureSnapshot() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    throw new Error(`Static test-story snapshot not found: ${SNAPSHOT_DIR}`);
  }
}

function restoreSnapshot() {
  assertWorkspacePathSafe(WORKSPACE_DIR);
  if (fs.existsSync(WORKSPACE_DIR)) {
    fs.rmSync(WORKSPACE_DIR, { recursive: true, force: true });
  }
  fs.cpSync(SNAPSHOT_DIR, WORKSPACE_DIR, { recursive: true });
}

function clearRenderOutputs() {
  const renderDir = path.join(WORKSPACE_DIR, "06_renders");
  if (!fs.existsSync(renderDir)) {
    fs.mkdirSync(renderDir, { recursive: true });
  }

  for (const fileName of ["draft_01.mp4", "draft_02.mp4", "final_1080p.mp4", "final_1440p.mp4"]) {
    const filePath = path.join(renderDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }

  const tempRenderDir = path.join(renderDir, "_tmp_render");
  if (fs.existsSync(tempRenderDir)) {
    fs.rmSync(tempRenderDir, { recursive: true, force: true });
  }
}

function main() {
  try {
    ensureStaticFixtureSnapshot();
    restoreSnapshot();
    clearRenderOutputs();
    runNode(["--topic", TOPIC_ID, "--stage", "render", "--profile", "draft"], "test story render");
    const outputPath = path.join(WORKSPACE_DIR, "06_renders", "draft_01.mp4");
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Expected render output was not created: ${outputPath}`);
    }
    const stats = fs.statSync(outputPath);
    if (stats.size <= 1024) {
      throw new Error(`Render output looks too small to trust (${stats.size} bytes): ${outputPath}`);
    }
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`Static test render ready at ${outputPath} (${sizeMb} MB)`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
