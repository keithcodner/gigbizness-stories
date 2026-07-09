#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const { parseArgs, readJson, writeText } = require("./common");

function getPaths(workspaceDir) {
  return {
    topicPath: path.join(workspaceDir, "00_config", "topic.json"),
    researchPath: path.join(workspaceDir, "01_research", "research_dossier.md"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    anglePath: path.join(workspaceDir, "02_angle", "angle.md"),
    beatSheetPath: path.join(workspaceDir, "02_angle", "beat_sheet.md")
  };
}

function buildMovingBeats() {
  return [
    "B01 | cold_open | It sucks to hire a fake moving company.",
    "B02 | false_safety | At first everything looks normal: website, reviews, friendly quote.",
    "B03 | trap_mechanism | The low quote feels like a win before moving day.",
    "B04 | leverage_shift | The trap starts once the belongings are already on the truck.",
    "B05 | price_jump | The invoice changes after the customer loses leverage.",
    "B06 | pressure | Refusing the new bill can delay release or delivery.",
    "B07 | source_proof | Regulators describe hostage-style household-goods complaints.",
    "B08 | why_it_works | The trick works because moving day creates urgency and dependency.",
    "B09 | red_flags | Phone-only quote, large deposit, cash demand, vague paperwork, broker confusion.",
    "B10 | closing_warning | The cheapest quote can become the most expensive move."
  ];
}

function buildGenericBeats(topic) {
  return [
    `B01 | cold_open | The problem with ${topic.working_title} starts earlier than people expect.`,
    "B02 | false_safety | At first the service can look normal and even convenient.",
    "B03 | trap_mechanism | The business model creates pressure after commitment.",
    "B04 | source_proof | Public evidence matters more than rumor.",
    "B05 | why_it_works | The leverage point explains why customers get stuck.",
    "B06 | red_flags | Show the warning signs viewers can actually use.",
    "B07 | closing_warning | End on the practical takeaway."
  ];
}

function buildAngle(topic, recipe) {
  return [
    "# Angle",
    "",
    `Working title: ${topic.working_title}`,
    `Format: ${recipe.display_name}`,
    "",
    "## Core angle",
    "",
    "Treat the video like a researched business story performed by fictional bricktoon characters.",
    "Use official source cards for proof and cartoon dramatization for pressure, leverage, and process.",
    "",
    "## Promise",
    "",
    `${topic.value_promise || topic.central_question}`,
    ""
  ].join("\n");
}

function buildBeatSheet(topic, recipe) {
  const movingTopic = /moving|mover|relocation/i.test(`${topic.id} ${topic.working_title}`);
  const beats = movingTopic ? buildMovingBeats() : buildGenericBeats(topic);
  const lines = [
    "# Beat Sheet",
    "",
    `Topic: ${topic.working_title}`,
    `Format: ${recipe.display_name}`,
    "",
    "## Beats",
    ""
  ];
  for (const beat of beats) {
    lines.push(`- ${beat}`);
  }
  lines.push("");
  lines.push("## Visual Rule");
  lines.push("");
  lines.push("- Each beat should be dramatized with bricktoon characters or an official source card.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/angle_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const recipe = fs.existsSync(paths.formatRecipePath)
      ? readJson(paths.formatRecipePath)
      : { display_name: "Bleak Explainer - Bricktoon" };

    writeText(paths.anglePath, `${buildAngle(topic, recipe)}\n`);
    writeText(paths.beatSheetPath, buildBeatSheet(topic, recipe));

    console.log(`Angle package generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
