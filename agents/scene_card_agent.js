#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, parseCsv, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    topicPath: path.join(workspaceDir, "00_config", "topic.json"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    beatSheetPath: path.join(workspaceDir, "02_angle", "beat_sheet.md"),
    approvedFactsPath: path.join(workspaceDir, "01_research", "approved_facts.csv"),
    scriptPath: path.join(workspaceDir, "02_script", "script_v2_human_review.md"),
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    shotListPath: path.join(workspaceDir, "05_scene_cards", "shot_list.md"),
    visualPromptsPath: path.join(workspaceDir, "05_scene_cards", "visual_prompts.md")
  };
}

function parseBeatSheet(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- B"))
    .map((line) => line.replace(/^- /, ""))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        beat_id: parts[0],
        beat_type: parts[1] || "story",
        text: parts.slice(2).join(" | ")
      };
    });
}

function extractSceneNarration(scriptMarkdown) {
  const scenes = new Map();
  const blocks = scriptMarkdown.match(/## S\d{2}[\s\S]*?(?=\n## S\d{2}\s-\s|\n## Human review focus|\n## Blocked claims snapshot|$)/g) || [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    const header = lines[0].replace(/^##\s+/, "");
    const sceneId = header.split(" - ")[0];
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
    scenes.set(sceneId, narration.join(" "));
  }
  return scenes;
}

function roleToCharacterId(role, castPackage) {
  const match = castPackage.cast.find((character) => character.role === role);
  return match ? match.character_id : castPackage.cast[0]?.character_id || "narrator_001";
}

function buildCard(topic, beat, index, castPackage, narrationMap, approvedFacts, formatRecipe) {
  const sceneId = `S${String(index + 1).padStart(2, "0")}`;
  const movingTopic = /moving|mover|relocation/i.test(`${topic.id} ${topic.working_title}`);
  const lower = beat.text.toLowerCase();
  const roles = ["narrator"];
  if (movingTopic && /quote|truck|invoice|cash|deposit|customer|move/.test(lower)) {
    roles.push("victim_customer");
  }
  if (movingTopic && /quote|broker|review|phone/.test(lower)) {
    roles.push("shady_broker");
  }
  if (movingTopic && /truck|invoice|cash|hostage|price/.test(lower)) {
    roles.push("rogue_operator");
  }
  if (/regulator|official|source|warning|red flag/.test(lower)) {
    roles.push("regulator");
  }

  const characters = [...new Set(roles.map((role) => roleToCharacterId(role, castPackage)))];
  const claimRefs = approvedFacts.slice(0, 3).map((_, claimIndex) => `CLAIM_${String(claimIndex + 1).padStart(3, "0")}`);
  const claimForBeat = claimRefs[index % Math.max(claimRefs.length, 1)] || "CLAIM_PENDING";
  const environment = movingTopic
    ? inferMovingEnvironment(lower)
    : "miniature plastic documentary set";

  return {
    scene_id: sceneId,
    beat_id: beat.beat_id,
    duration_seconds: 5,
    narration: narrationMap.get(sceneId) || beat.text,
    characters,
    environment,
    visual_prompt: `Vertical 9:16 cinematic blocky toy cartoon scene, miniature plastic world, ${characters.join(", ")} in ${environment}, ${beat.text.toLowerCase()}, dramatic but clean lighting, high contrast, simple readable composition, space for large captions in center, original toy-brick-inspired characters, no official toy branding, no logos, no readable private information, no real company names.`,
    negative_prompt: "LEGO logo, real brand logos, copyrighted characters, readable license plates, real company names, fake legal documents, private information",
    camera: {
      shot_type: index === 0 ? "medium wide" : (beat.beat_type === "source_proof" ? "overhead desk" : "medium close"),
      movement: beat.beat_type === "price_jump" ? "quick zoom" : "slow push in",
      focus: inferFocus(lower)
    },
    caption_text: buildCaptionText(beat.text, formatRecipe),
    caption_emphasis: (formatRecipe.caption_rules?.emphasis_words || []).filter((word) => lower.includes(word)),
    sound_effects: inferSoundEffects(lower),
    claims: [claimForBeat],
    legal_risk: beat.beat_type === "source_proof" ? "medium" : "low"
  };
}

function inferMovingEnvironment(lower) {
  if (lower.includes("truck")) {
    return "suburban driveway with moving boxes and a plain white box truck";
  }
  if (lower.includes("quote") || lower.includes("phone")) {
    return "miniature phone quote scene with clipboard, stars, and moving boxes";
  }
  if (lower.includes("invoice") || lower.includes("cash")) {
    return "close-up invoice desk with oversized paperwork and stressed customers";
  }
  if (lower.includes("regulator") || lower.includes("official")) {
    return "fictional regulator desk with source folders and consumer-protection documents";
  }
  return "miniature plastic moving-day scene with boxes and paperwork";
}

function inferFocus(lower) {
  if (lower.includes("truck")) {
    return "truck door closing";
  }
  if (lower.includes("invoice") || lower.includes("price")) {
    return "invoice jump";
  }
  if (lower.includes("phone") || lower.includes("quote")) {
    return "phone quote screen";
  }
  return "character reaction";
}

function inferSoundEffects(lower) {
  const sounds = [];
  if (lower.includes("truck")) sounds.push("truck_door_slam_low_hit.wav");
  if (lower.includes("phone") || lower.includes("quote")) sounds.push("phone_notification_pop.wav");
  if (lower.includes("invoice") || lower.includes("price")) sounds.push("paper_stamp_hit.wav");
  return sounds;
}

function buildCaptionText(text, formatRecipe) {
  const words = text.replace(/[.]/g, "").split(/\s+/).slice(0, 7);
  if (words.length === 0) {
    return "watch the pressure shift";
  }
  return words.join(" ").toLowerCase();
}

function buildShotList(sceneCards) {
  const lines = ["# Shot List", ""];
  for (const card of sceneCards) {
    lines.push(`- ${card.scene_id}: ${card.camera.shot_type}, ${card.camera.movement}, focus on ${card.camera.focus}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildVisualPrompts(sceneCards) {
  const lines = ["# Visual Prompts", ""];
  for (const card of sceneCards) {
    lines.push(`## ${card.scene_id}`);
    lines.push("");
    lines.push(card.visual_prompt);
    lines.push("");
    lines.push(`Negative prompt: ${card.negative_prompt}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/scene_card_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const castPackage = readJson(paths.castPath);
    const formatRecipe = readJson(paths.formatRecipePath);
    const beatSheet = fs.readFileSync(paths.beatSheetPath, "utf8");
    const approvedFacts = fs.existsSync(paths.approvedFactsPath)
      ? parseCsv(fs.readFileSync(paths.approvedFactsPath, "utf8")).rows
      : [];
    const scriptMarkdown = fs.existsSync(paths.scriptPath)
      ? fs.readFileSync(paths.scriptPath, "utf8")
      : "";

    const beats = parseBeatSheet(beatSheet);
    const narrationMap = extractSceneNarration(scriptMarkdown);
    const sceneCards = beats.map((beat, index) =>
      buildCard(topic, beat, index, castPackage, narrationMap, approvedFacts, formatRecipe)
    );

    const payload = {
      style_id: "bricktoon",
      format_id: formatRecipe.format_id || "bleak_explainer_bricktoon",
      scene_cards: sceneCards
    };

    writeText(paths.sceneCardsPath, `${JSON.stringify(payload, null, 2)}\n`);
    writeText(paths.shotListPath, buildShotList(sceneCards));
    writeText(paths.visualPromptsPath, buildVisualPrompts(sceneCards));

    console.log(`Scene cards generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
