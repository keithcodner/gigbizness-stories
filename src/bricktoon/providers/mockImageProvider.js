const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

module.exports = {
  renderCharacterReference,
  renderSceneImage
};
