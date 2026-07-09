#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  parseCsv,
  readJson,
  toCsv,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const researchDir = path.join(workspaceDir, "01_research");
  const scriptDir = path.join(workspaceDir, "02_script");
  const rootConfigDir = path.join(path.resolve(__dirname, ".."), "config");

  return {
    topicPath: path.join(configDir, "topic.json"),
    qualityRulesPath: path.join(rootConfigDir, "quality_rules.json"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    beatSheetPath: path.join(workspaceDir, "02_angle", "beat_sheet.md"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    approvedFactsPath: path.join(researchDir, "approved_facts.csv"),
    blockedClaimsPath: path.join(researchDir, "blocked_claims.md"),
    researchDossierPath: path.join(researchDir, "research_dossier.md"),
    outlinePath: path.join(scriptDir, "outline.md"),
    scriptV1Path: path.join(scriptDir, "script_v1.md"),
    scriptV2Path: path.join(scriptDir, "script_v2_human_review.md"),
    shotlistPath: path.join(scriptDir, "shotlist.csv"),
    narratorNotesPath: path.join(scriptDir, "narrator_notes.md")
  };
}

function readApprovedFacts(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return parseCsv(fs.readFileSync(filePath, "utf8")).rows;
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

function sceneTemplates(topic) {
  if (topic.video_type === "business_crime_story") {
    const isMovingTopic = /moving|mover|relocation/i.test(`${topic.id} ${topic.working_title}`);
    const serviceLabel = isMovingTopic ? "moving company" : "business";
    const customerAsset = isMovingTopic ? "their household goods" : "what they already own";
    const workflowLabel = isMovingTopic ? "moving workflow" : "normal business workflow";
    return [
      {
        id: "S01",
        heading: "Hook And Stakes",
        visual: buildVisualNote(topic, "opening pressure montage, paperwork, fast quote contrast"),
        lines: [
          isMovingTopic
            ? "The moving scam does not begin when the truck disappears. It begins when the low quote stops being real after your life is already on the truck."
            : "The bigger problem can start after the basic service is already underway.",
          `The first number is easy to sell. The harder part is everything that can come after the customer loses the ability to walk away.`,
          `This story is not about saying every ${serviceLabel} works the same way.`,
          "It is about understanding how a normal service can turn into a high-pressure situation for the customer."
        ]
      },
      {
        id: "S02",
        heading: "The Legitimate Business Model",
        visual: buildVisualNote(topic, "normal workflow, inventory, estimate, route card"),
        lines: [
          `At the basic level, a legitimate ${serviceLabel} solves a real problem.`,
          `In the honest version of this ${workflowLabel}, the customer gets a clear estimate, clear paperwork, and a service that matches the promise.`,
          `In the legitimate version of the business, the company is selling labor, logistics, equipment, and reliability when it is needed.`,
          "That normal model matters, because you cannot understand the abuse risk until you understand the honest version first."
        ]
      },
      {
        id: "S03",
        heading: "How The Money Works",
        visual: buildVisualNote(topic, "invoice stack animation, contract terms, fee card"),
        lines: [
          isMovingTopic
            ? "The price problem does not always end with the original quote."
            : "The bill does not always end with the first advertised price.",
          isMovingTopic
            ? "There can be the original estimate, then revised volume, added packing charges, storage fees, and delivery pressure once the truck is loaded."
            : "There can be the basic service, then storage, release fees, or extra charges tied to timing and paperwork.",
          "That changes the customer's position.",
          `They are no longer choosing a service. They are trying to recover ${customerAsset}.`
        ]
      },
      {
        id: "S04",
        heading: "Where Pressure Enters",
        visual: buildVisualNote(topic, "warning signs, invoice closeups, customer deadline pressure"),
        lines: [
          "This is where the business can shift from service to pressure.",
          "If the customer has limited time, limited transportation, or a bill that grows daily, the leverage changes fast.",
          "Even before you get into any public case, the structure alone can explain why people feel trapped.",
          isMovingTopic
            ? "The key business question is simple: who has the leverage once the customer's entire home is already on the truck?"
            : "The key business question is simple: who has the leverage once the customer cannot easily reverse the situation?"
        ]
      },
      {
        id: "S05",
        heading: "Evidence Gap And Public Cases",
        visual: buildVisualNote(topic, "court document cards, regulator notices, public case wall"),
        lines: [
          "This is the point where strong sourcing matters most.",
          "If a video names a company, a person, or a public enforcement action, the wording has to match the evidence exactly.",
          "That means alleged cannot become proven, and a lawsuit claim cannot turn into narration that sounds like a conviction.",
          "In this draft, the case section stays conservative until stronger official sourcing is added."
        ]
      },
      {
        id: "S06",
        heading: "Warning Signs For Viewers",
        visual: buildVisualNote(topic, "checklist card, document highlights, red-flag recap"),
        lines: [
          "For the viewer, the practical lesson is to watch the paperwork, the fee structure, and the timing pressure.",
          "A business that stays vague about charges has more room to trap you later.",
          "A business that explains the process clearly leaves less space for surprise leverage.",
          "That difference matters more than any dramatic headline."
        ]
      },
      {
        id: "S07",
        heading: "Final Takeaway",
        visual: buildVisualNote(topic, "takeaway card, map, closing service visual"),
        lines: [
          `${capitalize(serviceLabel)} is a real service, but it is also a business built around moments when the customer has very little flexibility.`,
          "That is why the line between legitimate cost and predatory pressure matters so much.",
          "If you understand where the leverage appears, you understand the story."
        ]
      }
    ];
  }

  return [
    {
      id: "S01",
      heading: "Hook",
      visual: topic.visual_style?.join(", ") || "topic visuals",
      lines: [
        `${topic.working_title} looks simple from the outside.`,
        "The real story is in how the money moves."
      ]
    }
  ];
}

function buildVisualNote(topic, fallback) {
  const style = Array.isArray(topic.visual_style) ? topic.visual_style.slice(0, 3).join(", ") : "";
  return style ? `${style}, ${fallback}` : fallback;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getSceneSourceSupport(scene, approvedFacts) {
  if (approvedFacts.length === 0) {
    return ["No approved fact rows yet beyond topic framing."];
  }

  if (scene.id === "S02" || scene.id === "S03" || scene.id === "S04") {
    return approvedFacts.slice(0, 2).map((fact) => fact.claim);
  }

  return ["Topic framing only. Add stronger scene-specific sourcing in research."];
}

function buildScript(topic, approvedFacts, blockedClaimsText, versionLabel, formatRecipe, beatSheet, castPackage) {
  const scenes = sceneTemplates(topic);
  const castNames = castPackage?.cast?.map((character) => character.name).join(", ") || "Narrator only";
  const lines = [
    `# ${versionLabel}`,
    "",
    `Working title: ${topic.working_title}`,
    `Video type: ${topic.video_type}`,
    `Format: ${formatRecipe?.display_name || "Bricktoon documentary"}`,
    `Central question: ${topic.central_question}`,
    `Cast: ${castNames}`,
    "",
    "## Draft status",
    "",
    "- This script is conservative by design.",
    "- It only uses approved framing plus general structure from the research dossier.",
    "- Bricktoon dramatization should come from scene cards, while proof should come from official source cards.",
    "- Add stronger sourced examples before final narration.",
    ""
  ];

  for (const scene of scenes) {
    lines.push(`## ${scene.id} - ${scene.heading}`);
    lines.push("");
    const beat = beatSheet.find((item, index) => index < scenes.length && scenes[index].id === scene.id);
    if (beat) {
      lines.push(`Beat ID: ${beat.beat_id}`);
      lines.push("");
    }
    lines.push(`Visual note: ${scene.visual}`);
    lines.push("");
    for (const line of scene.lines) {
      lines.push(line);
    }
    lines.push("");
    lines.push("Source support:");
    for (const supportLine of getSceneSourceSupport(scene, approvedFacts)) {
      lines.push(`- ${supportLine}`);
    }
    lines.push("");
  }

  lines.push("## Human review focus");
  lines.push("");
  lines.push("- Strengthen the case-study scene with official sources.");
  lines.push("- Check that any numbers added later appear in approved_facts.csv first.");
  lines.push("- Replace generic placeholders with concrete examples once validated.");
  lines.push("");
  lines.push("## Blocked claims snapshot");
  lines.push("");
  lines.push("```markdown");
  lines.push(blockedClaimsText.trim());
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildShotlist(topic) {
  const scenes = sceneTemplates(topic);
  return scenes.map((scene) => ({
    scene_id: scene.id,
    section: scene.heading,
    visual_type: inferVisualType(scene.visual),
    description: scene.visual,
    source: "topic visual style + approved facts",
    notes: "Replace placeholders with specific assets during Phase 5."
  }));
}

function inferVisualType(visualDescription) {
  const text = visualDescription.toLowerCase();
  if (text.includes("document") || text.includes("headline")) {
    return "source_card";
  }
  if (text.includes("animation") || text.includes("card")) {
    return "generated_graphic";
  }
  return "b_roll";
}

function buildNarratorNotes(topic, qualityRules, approvedFacts) {
  const forbidden = qualityRules.script.forbidden_phrases || [];
  const lines = [
    "# Narrator Notes",
    "",
    `- Tone: ${topic.tone}`,
    "- Read this like a calm documentary, not a trailer.",
    "- Keep pauses around transitions where the visuals need time to land.",
    "- Do not overemphasize accusations or imply proof that is not in the sources.",
    `- Approved fact count in this draft: ${approvedFacts.length}`,
    "",
    "## Avoid",
    ""
  ];

  for (const phrase of forbidden) {
    lines.push(`- ${phrase}`);
  }

  lines.push("");
  lines.push("## Review before recording");
  lines.push("");
  lines.push("- Tighten the first 30 seconds.");
  lines.push("- Confirm legal wording in any case-study section.");
  lines.push("- Swap placeholders for sourced specifics where available.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/script_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const qualityRules = readJson(paths.qualityRulesPath);
    const formatRecipe = fs.existsSync(paths.formatRecipePath) ? readJson(paths.formatRecipePath) : null;
    const beatSheet = fs.existsSync(paths.beatSheetPath) ? parseBeatSheet(fs.readFileSync(paths.beatSheetPath, "utf8")) : [];
    const castPackage = fs.existsSync(paths.castPath) ? readJson(paths.castPath) : { cast: [] };
    const approvedFacts = readApprovedFacts(paths.approvedFactsPath);
    const blockedClaimsText = fs.existsSync(paths.blockedClaimsPath)
      ? fs.readFileSync(paths.blockedClaimsPath, "utf8")
      : "# Blocked Claims\n\n- None.\n";

    writeText(paths.scriptV1Path, buildScript(topic, approvedFacts, blockedClaimsText, "Script V1", formatRecipe, beatSheet, castPackage));
    writeText(paths.scriptV2Path, buildScript(topic, approvedFacts, blockedClaimsText, "Script V2 Human Review", formatRecipe, beatSheet, castPackage));
    writeText(paths.shotlistPath, toCsv(buildShotlist(topic), [
      "scene_id",
      "section",
      "visual_type",
      "description",
      "source",
      "notes"
    ]));
    writeText(paths.narratorNotesPath, buildNarratorNotes(topic, qualityRules, approvedFacts));

    console.log(`Script draft generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
