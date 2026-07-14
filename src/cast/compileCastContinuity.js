function compileCastContinuity(workspaceId, castMembers) {
  return {
    workspace_id: workspaceId,
    characters: castMembers.map((member) => ({
      cast_member_id: member.cast_member_id,
      hard_locks: member.blueprint.continuity_rules.hard_locks,
      allowed_scene_changes: member.blueprint.continuity_rules.allowed_scene_changes,
      forbidden_changes: member.blueprint.continuity_rules.forbidden_changes
    }))
  };
}

module.exports = {
  compileCastContinuity
};
