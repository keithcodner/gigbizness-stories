const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { validateCastPackage } = require("../../src/cast/validateCastPackage");
const { loadCharacterLibrary } = require("../../src/cast/loadCharacterLibrary");
const { loadPropLibrary } = require("../../src/cast/loadPropLibrary");
const { loadEnvironmentLibrary } = require("../../src/cast/loadEnvironmentLibrary");

const ROOT = path.resolve(__dirname, "../..");

test("restricted traits are rejected", () => {
  const libraries = {
    characters: loadCharacterLibrary(ROOT),
    props: loadPropLibrary(ROOT),
    environments: loadEnvironmentLibrary(ROOT)
  };
  const roleRequirements = {
    required_roles: [
      {
        role: "narrator",
        minimum_count: 1,
        beat_ids: ["B01"],
        required_expression_labels: ["neutral"],
        required_action_intents: ["point"],
        required_props: ["PROP_EVIDENCE_FOLDER"],
        preferred_environments: ["ENV_NEWS_GRAPHIC_STAGE"]
      }
    ]
  };
  const castPackage = {
    cast: {
      cast_members: [
        {
          cast_member_id: "CAST_001",
          role: "narrator",
          character_id: "BT_CHAR_0001",
          blueprint: {
            expressions: [{ expression_id: "EXP_SET_1", label: "neutral" }],
            poses: [{ pose_id: "POSE_SET_1", label: "point" }],
            continuity_rules: {
              hard_locks: { headwear: "official toy logo hat" },
              allowed_scene_changes: [],
              forbidden_changes: []
            }
          }
        }
      ]
    },
    sceneCastMap: {
      scenes: [
        {
          scene_id: "S01",
          environment_id: "ENV_NEWS_GRAPHIC_STAGE",
          cast: [
            {
              cast_member_id: "CAST_001",
              expression_id: "EXP_SET_1",
              pose_id: "POSE_SET_1",
              prop_ids: ["PROP_EVIDENCE_FOLDER"]
            }
          ]
        }
      ]
    },
    propAssignments: { props: [{ prop_id: "PROP_EVIDENCE_FOLDER" }] },
    castContinuity: { characters: [{ cast_member_id: "CAST_001" }] }
  };

  const report = validateCastPackage({
    rootDir: ROOT,
    workspaceId: "fixture",
    roleRequirements,
    castPackage,
    libraries
  });

  assert.equal(report.passed, false);
  assert.ok(report.errors.some((error) => error.code === "CAST_RESTRICTED_BRAND_TRAIT"));
});
