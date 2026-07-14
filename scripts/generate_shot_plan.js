#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");

function shotTypeForBeat(beat, sceneCard) {
  if (beat.purpose === "establish_location") {
    return "establishing_wide";
  }
  if (beat.purpose === "reveal_price") {
    return "document_insert";
  }
  if (beat.purpose === "character_reaction") {
    return "closeup_face";
  }
  if (beat.purpose === "evidence_focus") {
    return "top_down_document";
  }
  if (beat.purpose === "transition") {
    return "push_in_document";
  }
  if ((sceneCard.characters || []).length >= 3) {
    return "medium_three_character";
  }
  if ((sceneCard.characters || []).length === 2) {
    return "medium_two_shot";
  }
  return "medium_single";
}

function extraReactionShot(beat, sceneCard) {
  if (beat.purpose !== "character_reaction") {
    return null;
  }
  if ((sceneCard.characters || []).length < 2) {
    return null;
  }
  return "reaction_cutaway";
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/generate_shot_plan.js --workspace <workspace_path>");
    }

    const workspaceDir = args.workspace;
    const beatsIndex = readJson(path.join(workspaceDir, "06_scene_beats", "scene_beats.json")).scenes || [];
    const sceneCards = readJson(path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).scene_cards || [];
    const sceneCastMap = readJson(path.join(workspaceDir, "03_cast", "scene_cast_map.json")).scenes || [];
    const outDir = path.join(workspaceDir, "07_shot_plans");
    const sceneDir = path.join(outDir, "scenes");
    fs.mkdirSync(sceneDir, { recursive: true });

    const allShots = [];
    const layoutAssignments = [];
    const validation = { passed: true, warnings: [], errors: [] };

    for (const sceneEntry of beatsIndex) {
      const sceneCard = sceneCards.find((card) => card.scene_id === sceneEntry.scene_id);
      const sceneAssignment = sceneCastMap.find((item) => item.scene_id === sceneEntry.scene_id) || { cast: [] };
      const shots = [];
      let cursor = 0;
      let sequence = 1;
      for (const beat of sceneEntry.beats) {
        const baseShotDuration = beat.duration_seconds;
        const primaryType = shotTypeForBeat(beat, sceneCard || { characters: [] });
        const reactionType = extraReactionShot(beat, sceneCard || { characters: [] });
        const shotSpecs = reactionType
          ? [
              { shot_type: primaryType, duration: Number((baseShotDuration * 0.58).toFixed(2)) },
              { shot_type: reactionType, duration: Number((baseShotDuration * 0.42).toFixed(2)) }
            ]
          : [{ shot_type: primaryType, duration: beat.duration_seconds }];

        for (const spec of shotSpecs) {
          const shotId = `${sceneEntry.scene_id}_SHOT_${String(sequence).padStart(3, "0")}`;
          const shot = {
            shot_id: shotId,
            beat_id: beat.beat_id,
            shot_type: spec.shot_type,
            layout_id: `${sceneEntry.scene_id.toLowerCase()}_${spec.shot_type}`,
            start: Number(cursor.toFixed(2)),
            end: Number((cursor + spec.duration).toFixed(2)),
            purpose: beat.description,
            primary_character_id: (sceneCard?.characters || [])[0] || null,
            camera: {
              movement: spec.shot_type === "push_in_document" ? "push_in" : "steady_push",
              start_scale: 1,
              end_scale: spec.shot_type === "closeup_face" ? 1.12 : 1.06,
              easing: "ease_in_out"
            },
            cast_member_ids: sceneAssignment.cast.map((member) => member.cast_member_id)
          };
          shots.push(shot);
          layoutAssignments.push({
            scene_id: sceneEntry.scene_id,
            shot_id: shotId,
            layout_id: shot.layout_id,
            shot_type: shot.shot_type
          });
          cursor += spec.duration;
          sequence += 1;
        }
      }

      if (sceneEntry.estimated_duration_seconds > 15 && shots.length < 3) {
        validation.passed = false;
        validation.errors.push(`${sceneEntry.scene_id} has too few shots for scene duration.`);
      }
      const repeated = shots.some((shot, index) => index > 0 && shots[index - 1].shot_type === shot.shot_type);
      if (repeated) {
        validation.warnings.push(`${sceneEntry.scene_id} repeats the same framing in consecutive shots.`);
      }

      const scenePayload = {
        shot_plan_version: 1,
        scene_id: sceneEntry.scene_id,
        scene_duration_seconds: sceneEntry.estimated_duration_seconds,
        continuity: {
          screen_axis: {
            left_actor: sceneCard?.characters?.[0] || null,
            right_actor: sceneCard?.characters?.[1] || null
          },
          allow_axis_crossing: false
        },
        shots
      };

      writeText(path.join(sceneDir, `${sceneEntry.scene_id}_shots.json`), `${JSON.stringify(scenePayload, null, 2)}\n`);
      allShots.push(scenePayload);
    }

    writeText(path.join(outDir, "shot_plan.json"), `${JSON.stringify({ shot_plan_version: 1, scenes: allShots }, null, 2)}\n`);
    writeText(path.join(outDir, "layout_assignments.json"), `${JSON.stringify({ layout_assignments: layoutAssignments }, null, 2)}\n`);
    writeText(path.join(outDir, "shot_plan_validation.json"), `${JSON.stringify(validation, null, 2)}\n`);
    writeText(path.join(outDir, "shot_plan_report.md"), [
      "# Shot Plan Report",
      "",
      ...allShots.map((scene) => `- ${scene.scene_id}: ${scene.shots.length} shots`),
      "",
      "## Warnings",
      "",
      ...(validation.warnings.length > 0 ? validation.warnings.map((line) => `- ${line}`) : ["- None."]),
      "",
      "## Errors",
      "",
      ...(validation.errors.length > 0 ? validation.errors.map((line) => `- ${line}`) : ["- None."]),
      ""
    ].join("\n"));

    console.log(`Shot plan generated for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
