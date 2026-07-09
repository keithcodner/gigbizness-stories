#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, contents) {
  fs.writeFileSync(filePath, contents, "utf8");
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.input || !args.output) {
      throw new Error("Usage: node scripts/export_scene_card_assets.js --input <scene_cards.json> --output <dir>");
    }

    const sceneCards = JSON.parse(fs.readFileSync(args.input, "utf8")).scene_cards || [];
    const outDir = args.output;
    const imageDir = path.join(outDir, "image_prompts");
    const stockDir = path.join(outDir, "stock_queries");
    const captionsDir = path.join(outDir, "caption_chunks");
    const animationDir = path.join(outDir, "animation_tasks");

    [imageDir, stockDir, captionsDir, animationDir].forEach(ensureDir);

    for (const card of sceneCards) {
      writeText(path.join(imageDir, `${card.scene_id}.txt`), `${card.visual_prompt}\n`);
      writeText(path.join(stockDir, `${card.scene_id}.txt`), `${card.environment}\n${card.camera.focus}\n`);
      writeText(path.join(captionsDir, `${card.scene_id}.txt`), `${card.caption_text}\n`);
      writeText(
        path.join(animationDir, `${card.scene_id}.txt`),
        [
          `Movement: ${card.camera.movement}`,
          `Shot type: ${card.camera.shot_type}`,
          `Focus: ${card.camera.focus}`,
          `SFX: ${(card.sound_effects || []).join(", ") || "none"}`
        ].join("\n")
      );
    }

    console.log(`Exported scene card assets to ${outDir}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
