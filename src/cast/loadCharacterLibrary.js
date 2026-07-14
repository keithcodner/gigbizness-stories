const fs = require("fs");
const path = require("path");

function loadCharacterLibrary(rootDir) {
  const archetypeDir = path.join(rootDir, "character_library", "bricktoon", "archetypes");
  const archetypes = fs.readdirSync(archetypeDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(archetypeDir, fileName), "utf8")));

  return {
    archetypes,
    byId: new Map(archetypes.map((item) => [item.archetype_id, item]))
  };
}

module.exports = {
  loadCharacterLibrary
};
