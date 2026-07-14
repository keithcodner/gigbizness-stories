const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadScript } = require("../../src/cast/loadScript");
const { extractStoryRoles, parseBeatSheet } = require("../../src/cast/extractStoryRoles");
const { loadCharacterLibrary } = require("../../src/cast/loadCharacterLibrary");
const { loadPropLibrary } = require("../../src/cast/loadPropLibrary");
const { loadEnvironmentLibrary } = require("../../src/cast/loadEnvironmentLibrary");
const { selectCharacterArchetypes } = require("../../src/cast/selectCharacterArchetypes");
const { compileCast } = require("../../src/cast/compileCast");
const { validateCastPackage } = require("../../src/cast/validateCastPackage");

const ROOT = path.resolve(__dirname, "../..");

test("valid cast package compiles for test story template", () => {
  const workspace = path.join(ROOT, "workspaces", "test_story_template");
  const script = loadScript(path.join(workspace, "02_script", "script_v2_human_review.md"));
  const beatSheet = parseBeatSheet(require("fs").readFileSync(path.join(workspace, "02_angle", "beat_sheet.md"), "utf8"));
  const roleRequirements = extractStoryRoles({ beatSheet });
  const libraries = {
    characters: loadCharacterLibrary(ROOT),
    props: loadPropLibrary(ROOT),
    environments: loadEnvironmentLibrary(ROOT)
  };
  const selections = selectCharacterArchetypes({ roleRequirements, libraries });
  const castPackage = compileCast({
    workspaceId: "test_story_template",
    formatId: "bleak_explainer_bricktoon",
    beatSheet,
    roleRequirements,
    selections,
    references: []
  });
  const report = validateCastPackage({
    rootDir: ROOT,
    workspaceId: "test_story_template",
    roleRequirements,
    castPackage,
    libraries
  });

  assert.equal(report.passed, true);
  assert.ok(castPackage.cast.cast_members.some((member) => member.role === "narrator"));
  assert.ok(castPackage.cast.cast_members.some((member) => member.role === "worried_customer"));
  assert.equal(script.scenes.length >= 1, true);
});
