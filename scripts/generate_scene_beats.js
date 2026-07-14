#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");

function sceneTimingLookup(voiceTiming, sceneId, fallbackDuration) {
  const scene = (voiceTiming.scenes || []).find((entry) => (entry.scene || "").startsWith(sceneId));
  if (!scene) {
    return {
      duration_seconds: fallbackDuration || 5,
      audio_start_seconds: 0,
      audio_end_seconds: fallbackDuration || 5
    };
  }
  return {
    duration_seconds: scene.end_seconds - scene.start_seconds,
    audio_start_seconds: scene.start_seconds,
    audio_end_seconds: scene.end_seconds
  };
}

function contains(text, pattern) {
  return pattern.test((text || "").toLowerCase());
}

function proposeBeats(sceneCard, durationSeconds, sceneAssignment, propAssignments) {
  const text = `${sceneCard.narration} ${sceneCard.caption_text} ${sceneCard.visual_prompt}`.toLowerCase();
  const sceneProps = (propAssignments.props || [])
    .filter((prop) => (prop.scenes || []).includes(sceneCard.scene_id))
    .map((prop) => prop.prop_id);
  const requiredCharacters = (sceneAssignment?.cast || []).map((member) => member.cast_member_id);
  const beats = [];

  beats.push({
    purpose: "establish_location",
    description: `Establish ${sceneCard.environment} and character positions.`,
    required_characters: requiredCharacters,
    required_props: [],
    visual_change: "new_environment"
  });

  if (contains(text, /bill|price|fee|quote|invoice|leverage/)) {
    beats.push({
      purpose: "present_problem",
      description: "Introduce the paperwork, invoice, or fee pressure prop.",
      required_characters: requiredCharacters.slice(0, 2),
      required_props: sceneProps.filter((id) => /contract|folder|phone/i.test(id)).slice(0, 1),
      visual_change: "prop_reveal"
    });
    beats.push({
      purpose: "reveal_price",
      description: "Show the amount or leverage shift directly on the key document.",
      required_characters: [],
      required_props: sceneProps.filter((id) => /contract|folder|phone/i.test(id)).slice(0, 1),
      visual_change: "number_reveal"
    });
  }

  beats.push({
    purpose: "character_reaction",
    description: "Show the primary reaction from the character under pressure.",
    required_characters: requiredCharacters.slice(0, 2),
    required_props: [],
    visual_change: "expression_change"
  });

  if (contains(text, /evidence|paperwork|proof|source|public/)) {
    beats.push({
      purpose: "evidence_focus",
      description: "Push attention onto the document, evidence folder, or proof area.",
      required_characters: requiredCharacters.slice(0, 1),
      required_props: sceneProps.filter((id) => /folder|contract/i.test(id)).slice(0, 1),
      visual_change: "evidence_reveal"
    });
  }

  beats.push({
    purpose: "transition",
    description: "Create a transition visual that motivates the next beat or scene.",
    required_characters: [],
    required_props: sceneProps.slice(0, 1),
    visual_change: "transition",
    transition_to: "next_scene"
  });

  const minimumBeats = durationSeconds > 25 ? 5 : durationSeconds > 15 ? 3 : 2;
  const selected = beats.slice(0, Math.max(minimumBeats, beats.length > minimumBeats ? minimumBeats : beats.length));
  const perBeat = Number((durationSeconds / selected.length).toFixed(2));

  return selected.map((beat, index) => ({
    beat_id: `${sceneCard.scene_id}_BEAT_${String(index + 1).padStart(2, "0")}`,
    duration_seconds: index === selected.length - 1
      ? Number((durationSeconds - perBeat * (selected.length - 1)).toFixed(2))
      : perBeat,
    ...beat
  }));
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_scene_beats.js --workspace <workspace_path>");
    }

    const workspaceDir = args.workspace;
    const outputDir = path.join(workspaceDir, "06_scene_beats");
    const sceneDir = path.join(outputDir, "scenes");
    fs.mkdirSync(sceneDir, { recursive: true });

    const sceneCards = readJson(path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).scene_cards || [];
    const sceneCastMap = readJson(path.join(workspaceDir, "03_cast", "scene_cast_map.json")).scenes || [];
    const propAssignments = readJson(path.join(workspaceDir, "03_cast", "prop_assignments.json"));
    const voiceTiming = readJson(path.join(workspaceDir, "03_voice", "voice_timing.json"));

    const summaries = [];
    const validation = { passed: true, warnings: [], errors: [] };

    for (const sceneCard of sceneCards) {
      const timing = sceneTimingLookup(voiceTiming, sceneCard.scene_id, sceneCard.duration_seconds);
      const sceneAssignment = sceneCastMap.find((scene) => scene.scene_id === sceneCard.scene_id) || null;
      const beats = proposeBeats(sceneCard, timing.duration_seconds, sceneAssignment, propAssignments);
      const totalBeatSeconds = beats.reduce((sum, beat) => sum + beat.duration_seconds, 0);
      const durationDelta = Math.abs(totalBeatSeconds - timing.duration_seconds);
      if (timing.duration_seconds > 20 && beats.length < 3) {
        validation.passed = false;
        validation.errors.push(`${sceneCard.scene_id} has too few meaningful beats for a long scene.`);
      }
      if (durationDelta > 1.2) {
        validation.warnings.push(`${sceneCard.scene_id} beat duration differs from narration duration by ${durationDelta.toFixed(2)} seconds.`);
      }
      if (beats.every((beat) => beat.visual_change === "transition")) {
        validation.passed = false;
        validation.errors.push(`${sceneCard.scene_id} has no meaningful visual change before transition.`);
      }

      const payload = {
        scene_beats_version: 1,
        scene_id: sceneCard.scene_id,
        audio_start_seconds: timing.audio_start_seconds,
        audio_end_seconds: timing.audio_end_seconds,
        estimated_duration_seconds: timing.duration_seconds,
        beats
      };
      writeText(path.join(sceneDir, `${sceneCard.scene_id}_beats.json`), `${JSON.stringify(payload, null, 2)}\n`);
      summaries.push(payload);
    }

    writeText(path.join(outputDir, "scene_beats.json"), `${JSON.stringify({ scene_beats_version: 1, scenes: summaries }, null, 2)}\n`);
    writeText(path.join(outputDir, "scene_beats_validation.json"), `${JSON.stringify(validation, null, 2)}\n`);
    writeText(path.join(outputDir, "scene_beats_report.md"), [
      "# Scene Beats Report",
      "",
      ...summaries.map((scene) => `- ${scene.scene_id}: ${scene.beats.length} beats over ${scene.estimated_duration_seconds.toFixed(2)} seconds`),
      "",
      validation.warnings.length > 0 ? "## Warnings" : "## Warnings",
      "",
      ...(validation.warnings.length > 0 ? validation.warnings.map((line) => `- ${line}`) : ["- None."]),
      "",
      "## Errors",
      "",
      ...(validation.errors.length > 0 ? validation.errors.map((line) => `- ${line}`) : ["- None."]),
      ""
    ].join("\n"));

    console.log(`Scene beats generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
