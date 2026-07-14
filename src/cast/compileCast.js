const { createCharacterBlueprint } = require("./createCharacterBlueprint");
const { compileCastContinuity } = require("./compileCastContinuity");
const { compileSceneCastMap } = require("./compileSceneCastMap");
const { compilePropAssignments } = require("./compilePropAssignments");

function compileCast(input) {
  const { workspaceId, formatId, beatSheet, roleRequirements, selections, references } = input;
  const castMembers = selections.map((selection) => {
    const blueprint = createCharacterBlueprint(selection);
    return {
      cast_member_id: selection.cast_member_id,
      character_id: blueprint.character_id,
      role: selection.role,
      name: blueprint.name,
      source: "library",
      beat_ids: roleRequirements.required_roles.find((item) => item.role === selection.role)?.beat_ids || [],
      legal_notes: "fictional composite character for dramatization",
      blueprint
    };
  });

  const legacyCast = castMembers.map((member) => ({
    character_id: member.character_id,
    name: member.name,
    role: member.role,
    visual_description: member.blueprint.visual_description,
    personality: member.blueprint.personality,
    use_cases: member.beat_ids,
    legal_notes: member.legal_notes
  }));

  const cast = {
    workspace_id: workspaceId,
    style_id: "bricktoon",
    format_id: formatId,
    status: "approved",
    cast_members: castMembers,
    cast: legacyCast
  };
  const castContinuity = compileCastContinuity(workspaceId, castMembers);
  const sceneCastMap = compileSceneCastMap(workspaceId, beatSheet, roleRequirements, castMembers);
  const propAssignments = compilePropAssignments(workspaceId, sceneCastMap);

  return {
    cast,
    castContinuity,
    sceneCastMap,
    propAssignments,
    referenceUsage: {
      workspace_id: workspaceId,
      references: (references || []).map((referenceId) => ({
        reference_id: referenceId,
        status: "analysis_only",
        approved_traits: [],
        blocked_traits: []
      }))
    }
  };
}

module.exports = {
  compileCast
};
