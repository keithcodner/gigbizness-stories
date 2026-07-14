const fs = require("fs");
const path = require("path");

function loadPropLibrary(rootDir) {
  const propDir = path.join(rootDir, "prop_library", "bricktoon", "props");
  const props = fs.readdirSync(propDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(propDir, fileName), "utf8")));

  return {
    props,
    byId: new Map(props.map((item) => [item.prop_id, item]))
  };
}

module.exports = {
  loadPropLibrary
};
