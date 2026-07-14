#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, writeText } = require("../agents/common");
const { createEmptyManifest } = require("../src/bricktoon/buildAssetManifest");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_bricktoon_asset_manifest.js --workspace <workspace_path>");
    }

    const workspaceId = path.basename(args.workspace);
    const manifestPath = path.join(args.workspace, "07_visuals", "asset_manifest.json");
    const manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      : createEmptyManifest(workspaceId);

    writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Bricktoon asset manifest ready for '${workspaceId}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
