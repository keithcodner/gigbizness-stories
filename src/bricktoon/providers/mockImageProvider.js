const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { createPlaceholderPng } = require("../aiQualityPipeline");

function runPythonMock(specPath, outputPath, label) {
  const scriptPath = path.join(path.resolve(__dirname, "..", "..", ".."), "scripts", "generate_mock_bricktoon_bmp.py");
  const result = spawnSync("python", [scriptPath, "--spec", specPath, "--output", outputPath], {
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

function writeSpec(tempDir, fileName, spec) {
  const specPath = path.join(tempDir, fileName);
  fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  return specPath;
}

function renderCharacterReference(args) {
  if (path.extname(args.outputPath).toLowerCase() === ".png") {
    createPlaceholderPng(args.outputPath, {
      width: args.width || 1024,
      height: args.height || 1024,
      color: "0x1e293b",
      boxes: [
        { x: 300, y: 140, w: 420, h: 720, color: "0xf59e0b@0.9" },
        { x: 390, y: 70, w: 240, h: 120, color: "0x38bdf8@0.85" }
      ]
    });
    return;
  }
  const specPath = writeSpec(args.tempDir, `${args.character.character_id}_character.json`, {
    kind: "character",
    character_id: args.character.character_id,
    name: args.character.name,
    role: args.character.role,
    visual_description: args.character.visual_description,
    prompt_text: args.prompt.prompt_text,
    width: args.width,
    height: args.height
  });

  runPythonMock(specPath, args.outputPath, `mock character render ${args.character.character_id}`);
}

function renderSceneImage(args) {
  if (path.extname(args.outputPath).toLowerCase() === ".png") {
    createPlaceholderPng(args.outputPath, {
      width: args.width || 768,
      height: args.height || 1344,
      color: "0x0f172a",
      boxes: [
        { x: 90, y: 180, w: 260, h: 720, color: "0xf59e0b@0.9" },
        { x: 390, y: 220, w: 210, h: 620, color: "0x38bdf8@0.85" }
      ]
    });
    return;
  }
  const specPath = writeSpec(args.tempDir, `${args.sceneCard.scene_id}_scene.json`, {
    kind: "scene",
    scene_id: args.sceneCard.scene_id,
    caption_text: args.sceneCard.caption_text,
    environment: args.sceneCard.environment,
    character_ids: args.sceneCard.characters,
    prompt_text: args.prompt.prompt_text,
    width: args.width,
    height: args.height
  });

  runPythonMock(specPath, args.outputPath, `mock scene render ${args.sceneCard.scene_id}`);
}

function renderShotKeyframe(args) {
  createPlaceholderPng(args.outputPath, {
    width: args.width || 1536,
    height: args.height || 1024,
    color: args.qualityTier === "hero" ? "0x172554" : "0x1f2937",
    boxes: [
      { x: 220, y: 120, w: 620, h: 760, color: "0xf8fafc@0.9" },
      { x: 920, y: 210, w: 420, h: 560, color: "0xf59e0b@0.88" }
    ]
  });
}

module.exports = {
  renderCharacterReference,
  renderSceneImage,
  renderShotKeyframe
};
