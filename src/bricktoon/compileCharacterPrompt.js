const fs = require("fs");

function safeRead(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "";
}

function compileCharacterPrompt(character, options = {}) {
  const styleBible = safeRead(options.styleBiblePath);
  const characterRules = safeRead(options.characterRulesPath);
  const negativePrompts = safeRead(options.negativePromptsPath);

  const prompt = [
    `Create a reusable character reference for ${character.name}.`,
    `Role: ${character.role}.`,
    `Visual description: ${character.visual_description}.`,
    `Personality: ${character.personality}.`,
    "Style: original blocky toy cartoon character, miniature plastic world, rounded edges, simple expressive face.",
    "Views required: front, three-quarter, side.",
    "Keep outfit, colors, and silhouette stable for future scene continuity."
  ];

  if (styleBible) {
    prompt.push(`Style bible context: ${styleBible.split(/\r?\n/).slice(0, 10).join(" ")}`);
  }
  if (characterRules) {
    prompt.push(`Character rules: ${characterRules.split(/\r?\n/).filter(Boolean).join(" ")}`);
  }

  return {
    prompt_text: `${prompt.join(" ")}\n`,
    negative_prompt_text: `${negativePrompts}\n`
  };
}

module.exports = {
  compileCharacterPrompt
};
