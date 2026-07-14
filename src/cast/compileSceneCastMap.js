function pickEnvironment(requirement) {
  return requirement.preferred_environments[0] || "ENV_NEWS_GRAPHIC_STAGE";
}

function labelToExpressionId(member, label) {
  return member.blueprint.expressions.find((item) => item.label === label)?.expression_id
    || member.blueprint.expressions[0]?.expression_id
    || "EXP_SET_1";
}

function labelToPoseId(member, label) {
  return member.blueprint.poses.find((item) => item.label === label)?.pose_id
    || member.blueprint.poses[0]?.pose_id
    || "POSE_SET_1";
}

function compileSceneCastMap(workspaceId, beatSheet, roleRequirements, castMembers) {
  const requirementMap = new Map(roleRequirements.required_roles.map((item) => [item.role, item]));
  return {
    workspace_id: workspaceId,
    scenes: beatSheet.map((beat, index) => {
      const sceneId = `S${String(index + 1).padStart(2, "0")}`;
      const sceneCast = castMembers
        .filter((member) => requirementMap.get(member.role)?.beat_ids.includes(beat.beat_id))
        .map((member, memberIndex) => {
          const requirement = requirementMap.get(member.role);
          const expressionLabel = requirement.required_expression_labels[0] || "neutral";
          const actionLabel = requirement.required_action_intents[0] || "point";
          return {
            cast_member_id: member.cast_member_id,
            expression_id: labelToExpressionId(member, expressionLabel),
            pose_id: labelToPoseId(member, actionLabel),
            action_intent: actionLabel,
            screen_position: memberIndex === 0 ? "center" : memberIndex === 1 ? "left" : "right",
            prop_ids: requirement.required_props.slice(0, 2)
          };
        });

      const environmentId = sceneCast.length > 0
        ? pickEnvironment(requirementMap.get(castMembers.find((member) => member.cast_member_id === sceneCast[0].cast_member_id)?.role))
        : "ENV_NEWS_GRAPHIC_STAGE";

      return {
        scene_id: sceneId,
        beat_id: beat.beat_id,
        environment_id: environmentId,
        cast: sceneCast
      };
    })
  };
}

module.exports = {
  compileSceneCastMap
};
