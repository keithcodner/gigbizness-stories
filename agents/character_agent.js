#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText, ROOT } = require("./common");
const { loadScript } = require("../src/cast/loadScript");
const { extractStoryRoles, parseBeatSheet } = require("../src/cast/extractStoryRoles");
const { loadCharacterLibrary } = require("../src/cast/loadCharacterLibrary");
const { loadPropLibrary } = require("../src/cast/loadPropLibrary");
const { loadEnvironmentLibrary } = require("../src/cast/loadEnvironmentLibrary");
const { selectCharacterArchetypes } = require("../src/cast/selectCharacterArchetypes");
const { compileCast } = require("../src/cast/compileCast");
const { validateCastPackage } = require("../src/cast/validateCastPackage");
const { writeCastReport } = require("../src/cast/writeCastReport");

function getPaths(workspaceDir) {
  return {
    topicPath: path.join(workspaceDir, "00_config", "topic.json"),
    formatRecipePath: path.join(workspaceDir, "00_brief", "format_recipe.json"),
    beatSheetPath: path.join(workspaceDir, "02_angle", "beat_sheet.md"),
    scriptPath: path.join(workspaceDir, "02_script", "script_v2_human_review.md"),
    castRequestPath: path.join(workspaceDir, "03_cast", "cast_request.json"),
    roleRequirementsPath: path.join(workspaceDir, "03_cast", "role_requirements.json"),
    castPath: path.join(workspaceDir, "03_cast", "cast.json"),
    castContinuityPath: path.join(workspaceDir, "03_cast", "cast_continuity.json"),
    sceneCastMapPath: path.join(workspaceDir, "03_cast", "scene_cast_map.json"),
    propAssignmentsPath: path.join(workspaceDir, "03_cast", "prop_assignments.json"),
    referenceUsagePath: path.join(workspaceDir, "03_cast", "reference_usage.json"),
    validationPath: path.join(workspaceDir, "03_cast", "cast_validation.json"),
    reportPath: path.join(workspaceDir, "03_cast", "cast_report.md"),
    continuityMdPath: path.join(workspaceDir, "03_cast", "character_continuity.md"),
    rolesMdPath: path.join(workspaceDir, "03_cast", "scene_roles.md")
  };
}

function ensureCastRequest(topic, workspaceDir, filePath) {
  if (fs.existsSync(filePath)) {
    return readJson(filePath);
  }

  const request = {
    workspace_id: topic.id,
    style_id: "bricktoon",
    script_file: path.relative(workspaceDir, path.join(workspaceDir, "02_script", "script_v2_human_review.md")).replaceAll("\\", "/"),
    scene_cards_file: path.relative(workspaceDir, path.join(workspaceDir, "05_scene_cards", "scene_cards.json")).replaceAll("\\", "/"),
    reference_ids: []
  };
  writeText(filePath, `${JSON.stringify(request, null, 2)}\n`);
  return request;
}

function buildContinuityMarkdown(castContinuity, castMembers) {
  const lines = ["# Character Continuity", ""];
  for (const item of castContinuity.characters) {
    const member = castMembers.find((entry) => entry.cast_member_id === item.cast_member_id);
    lines.push(`- ${member ? member.name : item.cast_member_id}: ${Object.values(item.hard_locks).join(", ")}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildRoleMarkdown(roleRequirements) {
  const lines = ["# Scene Roles", ""];
  for (const role of roleRequirements.required_roles) {
    lines.push(`- ${role.role}: beats ${role.beat_ids.join(", ")} | expressions ${role.required_expression_labels.join(", ")} | actions ${role.required_action_intents.join(", ")}`);
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
    const castRequest = ensureCastRequest(topic, args.workspace, paths.castRequestPath);
    const beatSheet = parseBeatSheet(fs.readFileSync(paths.beatSheetPath, "utf8"));
    const script = loadScript(paths.scriptPath);
    const roleRequirements = extractStoryRoles({ beatSheet, script, topic });
    const libraries = {
      characters: loadCharacterLibrary(ROOT),
      props: loadPropLibrary(ROOT),
      environments: loadEnvironmentLibrary(ROOT)
    };
    const selections = selectCharacterArchetypes({ roleRequirements, libraries });
    const castPackage = compileCast({
      workspaceId: topic.id,
      formatId: formatRecipe.format_id || "bleak_explainer_bricktoon",
      beatSheet,
      roleRequirements,
      selections,
      references: castRequest.reference_ids || []
    });
    const validation = validateCastPackage({
      rootDir: ROOT,
      workspaceId: topic.id,
      roleRequirements,
      castPackage,
      libraries
    });

    writeText(paths.roleRequirementsPath, `${JSON.stringify(roleRequirements, null, 2)}\n`);
    writeText(paths.castPath, `${JSON.stringify(castPackage.cast, null, 2)}\n`);
    writeText(paths.castContinuityPath, `${JSON.stringify(castPackage.castContinuity, null, 2)}\n`);
    writeText(paths.sceneCastMapPath, `${JSON.stringify(castPackage.sceneCastMap, null, 2)}\n`);
    writeText(paths.propAssignmentsPath, `${JSON.stringify(castPackage.propAssignments, null, 2)}\n`);
    writeText(paths.referenceUsagePath, `${JSON.stringify(castPackage.referenceUsage, null, 2)}\n`);
    writeText(paths.validationPath, `${JSON.stringify(validation, null, 2)}\n`);
    writeText(paths.reportPath, writeCastReport(topic.id, roleRequirements, castPackage, validation));
    writeText(paths.continuityMdPath, buildContinuityMarkdown(castPackage.castContinuity, castPackage.cast.cast_members));
    writeText(paths.rolesMdPath, buildRoleMarkdown(roleRequirements));

    if (!validation.passed) {
      throw new Error(`Cast validation failed for topic '${topic.id}'`);
    }

    console.log(`Character cast generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
