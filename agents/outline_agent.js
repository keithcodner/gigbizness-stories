#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  parseCsv,
  readJson,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const researchDir = path.join(workspaceDir, "01_research");
  const scriptDir = path.join(workspaceDir, "02_script");

  return {
    topicPath: path.join(configDir, "topic.json"),
    approvedFactsPath: path.join(researchDir, "approved_facts.csv"),
    blockedClaimsPath: path.join(researchDir, "blocked_claims.md"),
    researchDossierPath: path.join(researchDir, "research_dossier.md"),
    outlinePath: path.join(scriptDir, "outline.md"),
    storyMapPath: path.join(scriptDir, "story_map.md")
  };
}

function buildScenePlan(topic, approvedFacts) {
  const typeToScenePlan = {
    business_crime_story: [
      {
        title: "Hook And Stakes",
        purpose: "Open with the viewer-facing problem and the tension around getting a vehicle back.",
        narrationGoal: "Make the viewer feel the stakes without making unsourced accusations.",
        retentionDevice: "The bill problem starts after the tow, not before.",
        visualPool: ["tow trucks", "parking lots", "invoice graphics"]
      },
      {
        title: "What Legitimate Towing Looks Like",
        purpose: "Explain the normal roadside or impound workflow before discussing abuse.",
        narrationGoal: "Build trust by showing what the honest version of the business is supposed to do.",
        retentionDevice: "Set up the contrast between normal service and high-pressure edge cases.",
        visualPool: ["tow trucks", "city map graphics", "parking lots"]
      },
      {
        title: "How The Money Works",
        purpose: "Break down tow fees, storage, and why charges can grow over time.",
        narrationGoal: "Show how incentives change once the car is already in the lot.",
        retentionDevice: "Reveal how a small first charge can turn into a much larger final bill.",
        visualPool: ["fee stack animation", "invoice graphics", "court/legal document cards"]
      },
      {
        title: "Where Pressure Enters",
        purpose: "Describe the conditions where viewers can feel trapped, while keeping language conservative.",
        narrationGoal: "Frame risk as a business and incentive problem, not a blanket accusation.",
        retentionDevice: "Answer the central question directly.",
        visualPool: ["parking lots", "invoice graphics", "court/legal document cards"]
      },
      {
        title: "Evidence And Public Cases",
        purpose: "Reserve space for sourced examples and official actions once they are added.",
        narrationGoal: "Keep this scene obviously evidence-driven and easy to strengthen later.",
        retentionDevice: "Move from explanation into proof.",
        visualPool: ["court/legal document cards", "city map graphics", "tow trucks"]
      },
      {
        title: "Consumer Warning Signs",
        purpose: "Give viewers practical signs to watch for when dealing with towing or impound situations.",
        narrationGoal: "End the documentary portion with useful action-oriented takeaways.",
        retentionDevice: "Turn the story into a practical viewer checklist.",
        visualPool: ["invoice graphics", "parking lots", "city map graphics"]
      },
      {
        title: "Final Takeaway",
        purpose: "Leave the viewer with the legitimate-versus-predatory distinction and the bigger lesson.",
        narrationGoal: "Close clearly, not dramatically.",
        retentionDevice: "Reframe the whole topic in one sentence the viewer can remember.",
        visualPool: ["tow trucks", "fee stack animation", "city map graphics"]
      }
    ]
  };

  const defaultPlan = [
    {
      title: "Hook",
      purpose: "Open with the main viewer question.",
      narrationGoal: "State why the topic matters right away.",
      retentionDevice: "Promise a concrete answer.",
      visualPool: topic.visual_style || []
    },
    {
      title: "Business Model",
      purpose: "Explain how the business works.",
      narrationGoal: "Make the model easy to understand.",
      retentionDevice: "Show the hidden mechanic behind the surface story.",
      visualPool: topic.visual_style || []
    },
    {
      title: "Takeaway",
      purpose: "Close with the lesson for the viewer.",
      narrationGoal: "Turn explanation into value.",
      retentionDevice: "Make the answer stick.",
      visualPool: topic.visual_style || []
    }
  ];

  const scenePlan = typeToScenePlan[topic.video_type] || defaultPlan;
  return scenePlan.map((scene, index) => ({
    id: `S${String(index + 1).padStart(2, "0")}`,
    ...scene,
    sourceRefs: approvedFacts.length > 0
      ? approvedFacts.slice(0, 3).map((_, factIndex) => factIndex + 1)
      : []
  }));
}

function buildOutline(topic, scenePlan, blockedClaimsText) {
  const lines = [
    "# Outline",
    "",
    `## Opening hook`,
    "",
    buildHook(topic),
    "",
    "## Viewer question",
    "",
    topic.central_question,
    ""
  ];

  for (const scene of scenePlan) {
    lines.push(`## ${scene.id} - ${scene.title}`);
    lines.push("");
    lines.push("Purpose:");
    lines.push(scene.purpose);
    lines.push("");
    lines.push("Narration goal:");
    lines.push(scene.narrationGoal);
    lines.push("");
    lines.push("Visuals:");
    for (const visual of scene.visualPool.slice(0, 4)) {
      lines.push(`- ${visual}`);
    }
    lines.push("");
    lines.push("Sources:");
    if (scene.sourceRefs.length > 0) {
      lines.push(`- approved_facts.csv rows ${scene.sourceRefs.join(", ")}`);
    } else {
      lines.push("- No approved fact rows yet beyond topic-level framing. Add research before tightening this scene.");
    }
    lines.push("");
    lines.push("Retention device:");
    lines.push(scene.retentionDevice);
    lines.push("");
  }

  lines.push("## Research guardrails");
  lines.push("");
  lines.push("Keep blocked or unsourced claims out of the script draft.");
  lines.push("");
  lines.push("```markdown");
  lines.push(blockedClaimsText.trim());
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildStoryMap(topic, scenePlan, approvedFacts) {
  const lines = [
    "# Story Map",
    "",
    `- Working title: ${topic.working_title}`,
    `- Video type: ${topic.video_type}`,
    `- Central question: ${topic.central_question}`,
    `- Approved fact count: ${approvedFacts.length}`,
    ""
  ];

  for (const scene of scenePlan) {
    lines.push(`## ${scene.id}`);
    lines.push("");
    lines.push(`- Scene title: ${scene.title}`);
    lines.push(`- Purpose: ${scene.purpose}`);
    lines.push(`- Viewer payoff: ${scene.narrationGoal}`);
    lines.push(`- Retention risk: ${inferRetentionRisk(scene, approvedFacts.length)}`);
    lines.push(`- Visual spine: ${scene.visualPool.slice(0, 3).join(", ")}`);
    lines.push(`- Source support: ${scene.sourceRefs.length > 0 ? `approved_facts.csv rows ${scene.sourceRefs.join(", ")}` : "Needs stronger sourcing"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function inferRetentionRisk(scene, approvedFactCount) {
  if (approvedFactCount < 3 && /Evidence|How The Money Works/.test(scene.title)) {
    return "high until more sourced detail is added";
  }
  if (/Final Takeaway|Takeaway/.test(scene.title)) {
    return "low if the lesson is concrete";
  }
  return "medium if visuals stay specific";
}

function buildHook(topic) {
  if (topic.video_type === "business_crime_story") {
    return "Your car can disappear in minutes, but the bill problem can start after the tow is already over.";
  }
  return `${topic.working_title} looks simple from the outside. The real story is in how the money moves.`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/outline_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const approvedFacts = fs.existsSync(paths.approvedFactsPath)
      ? parseCsv(fs.readFileSync(paths.approvedFactsPath, "utf8")).rows
      : [];
    const blockedClaimsText = fs.existsSync(paths.blockedClaimsPath)
      ? fs.readFileSync(paths.blockedClaimsPath, "utf8")
      : "# Blocked Claims\n\n- None.\n";

    const scenePlan = buildScenePlan(topic, approvedFacts);
    writeText(paths.outlinePath, buildOutline(topic, scenePlan, blockedClaimsText));
    writeText(paths.storyMapPath, buildStoryMap(topic, scenePlan, approvedFacts));

    console.log(`Outline generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
