#!/usr/bin/env node

const path = require("path");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    topicPath: path.join(workspaceDir, "00_config", "topic.json"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    continuityPath: path.join(workspaceDir, "03_cast", "character_continuity.md"),
    rolesPath: path.join(workspaceDir, "03_cast", "scene_roles.md")
  };
}

function buildCast(topic, formatId) {
  const movingTopic = /moving|mover|relocation/i.test(`${topic.id} ${topic.working_title}`);
  const cast = [
    {
      character_id: "narrator_001",
      name: "The Gigbizness Guide",
      role: "narrator",
      visual_description: "blocky toy business narrator, navy blazer, calm face, cinematic miniature lighting",
      personality: "dry, sharp, explains scams clearly",
      use_cases: ["intro", "explainers", "checklists", "transitions"],
      legal_notes: "fictional character, not based on a real person"
    },
    {
      character_id: "regulator_001",
      name: "Inspector Dana",
      role: "regulator",
      visual_description: "blocky toy investigator with folder, glasses, generic badge icon",
      personality: "serious, clear, evidence-driven",
      use_cases: ["official sources", "enforcement", "consumer checklist"],
      legal_notes: "fictional regulator, not representing a specific agency"
    }
  ];

  if (movingTopic) {
    cast.push(
      {
        character_id: "customer_001",
        name: "Jay",
        role: "victim_customer",
        visual_description: "blocky toy customer holding moving boxes, tired expression, casual hoodie",
        personality: "stressed, trusting, under deadline",
        use_cases: ["victim story", "moving day", "reaction shots"],
        legal_notes: "composite fictional victim"
      },
      {
        character_id: "customer_002",
        name: "Maya",
        role: "victim_customer",
        visual_description: "blocky toy customer with clipboard and phone, worried expression",
        personality: "organized but overwhelmed",
        use_cases: ["quote comparison", "phone call", "reaction shots"],
        legal_notes: "composite fictional victim"
      },
      {
        character_id: "broker_001",
        name: "Slick Steve",
        role: "shady_broker",
        visual_description: "blocky toy phone broker in cheap suit, headset, fake friendly smile",
        personality: "pushy, charming, evasive",
        use_cases: ["lowball quote", "deposit request", "broker confusion"],
        legal_notes: "fictional composite, do not connect to real company without source"
      },
      {
        character_id: "mover_001",
        name: "Box Truck Guy",
        role: "rogue_operator",
        visual_description: "blocky toy mover beside plain rental-style moving truck, no logos",
        personality: "intimidating, impatient, vague",
        use_cases: ["loading scene", "price jump", "hostage goods"],
        legal_notes: "fictional composite"
      }
    );
  }

  return {
    style_id: "bricktoon",
    format_id: formatId,
    cast
  };
}

function buildContinuity(castPackage) {
  const lines = [
    "# Character Continuity",
    "",
    "- Keep costumes, colors, and props stable between scenes.",
    "- Narrator remains the cleanest-dressed and visually calmest character.",
    "- Victims should look stressed, not foolish.",
    "- Brokers and rogue operators should look generic and fictional, not like identifiable real people.",
    ""
  ];
  for (const character of castPackage.cast) {
    lines.push(`- ${character.name}: ${character.visual_description}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildSceneRoles(castPackage) {
  const lines = [
    "# Scene Roles",
    "",
    "- Narrator: hooks, transitions, checklists, proof handoffs.",
    "- Victim customers: dramatize pressure and confusion.",
    "- Shady broker / rogue operator: dramatize trap mechanics without tying visuals to a real company.",
    "- Regulator: deliver official-source proof scenes and consumer advice.",
    ""
  ];
  for (const character of castPackage.cast) {
    lines.push(`- ${character.character_id}: ${character.role} -> ${character.use_cases.join(", ")}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/character_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const formatRecipe = readJson(paths.formatRecipePath);
    const castPackage = buildCast(topic, formatRecipe.format_id || "bleak_explainer_bricktoon");

    writeText(paths.castPath, `${JSON.stringify(castPackage, null, 2)}\n`);
    writeText(paths.continuityPath, buildContinuity(castPackage));
    writeText(paths.rolesPath, buildSceneRoles(castPackage));

    console.log(`Character cast generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
