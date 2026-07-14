const fs = require("fs");

function loadScript(scriptPath) {
  const markdown = fs.readFileSync(scriptPath, "utf8");
  const sceneBlocks = markdown.match(/## S\d{2}[\s\S]*?(?=\n## S\d{2}\s-\s|\n## Human review focus|\n## Blocked claims snapshot|$)/g) || [];
  const scenes = sceneBlocks.map((block) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    const titleLine = lines[0].replace(/^##\s+/, "");
    const sceneId = titleLine.split(" - ")[0];
    const beatLine = lines.find((line) => line.startsWith("Beat ID:")) || "";
    const beatId = beatLine.replace("Beat ID:", "").trim();
    const narration = [];
    let collect = false;
    for (const line of lines.slice(1)) {
      if (line.startsWith("Visual note:")) {
        collect = true;
        continue;
      }
      if (line === "Source support:" || line.startsWith("## ")) {
        collect = false;
      }
      if (collect && line && !line.startsWith("- ")) {
        narration.push(line);
      }
    }
    return {
      scene_id: sceneId,
      beat_id: beatId,
      title: titleLine.split(" - ")[1] || sceneId,
      narration: narration.join(" "),
      markdown: block
    };
  });

  return {
    script_id: "script_v2_human_review",
    markdown,
    scenes
  };
}

module.exports = {
  loadScript
};
