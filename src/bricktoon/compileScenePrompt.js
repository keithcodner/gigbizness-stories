const fs = require("fs");

function safeRead(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "";
}

function compileScenePrompt(sceneCard, castMap, options = {}) {
  const styleBible = safeRead(options.styleBiblePath);
  const environmentRules = safeRead(options.environmentRulesPath);
  const cameraRules = safeRead(options.cameraRulesPath);
  const negativePrompts = safeRead(options.negativePromptsPath);

  const characterDescriptions = (sceneCard.characters || [])
    .map((characterId) => castMap.get(characterId))
    .filter(Boolean)
    .map((character) => `${character.name}: ${character.visual_description}`)
    .join("; ");

  const promptLines = [
    `Scene ${sceneCard.scene_id}.`,
    `Visual type: ${sceneCard.visual_type || "bricktoon_scene"}.`,
    `Characters: ${characterDescriptions || "none"}.`,
    `Environment: ${sceneCard.environment}.`,
    `Action: ${sceneCard.narration}.`,
    `Camera: ${sceneCard.camera?.shot_type || "medium wide"} with ${sceneCard.camera?.movement || "slow push in"}.`,
    "Original blocky toy cartoon style, cinematic miniature plastic world, vertical safe composition."
  ];

  if (styleBible) {
    promptLines.push(`Style context: ${styleBible.split(/\r?\n/).slice(0, 12).join(" ")}`);
  }
  if (environmentRules) {
    promptLines.push(`Environment rules: ${environmentRules.split(/\r?\n/).filter(Boolean).join(" ")}`);
  }
  if (cameraRules) {
    promptLines.push(`Camera rules: ${cameraRules.split(/\r?\n/).filter(Boolean).join(" ")}`);
  }

  return {
    prompt_text: `${promptLines.join(" ")}\n`,
    negative_prompt_text: `${sceneCard.negative_prompt || negativePrompts || ""}\n`
  };
}

module.exports = {
  compileScenePrompt
};
