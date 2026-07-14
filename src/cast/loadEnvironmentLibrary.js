const fs = require("fs");
const path = require("path");

function loadEnvironmentLibrary(rootDir) {
  const envDir = path.join(rootDir, "environment_library", "bricktoon", "environments");
  const environments = fs.readdirSync(envDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(envDir, fileName), "utf8")));

  return {
    environments,
    byId: new Map(environments.map((item) => [item.environment_id, item]))
  };
}

module.exports = {
  loadEnvironmentLibrary
};
