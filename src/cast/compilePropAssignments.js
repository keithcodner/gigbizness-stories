function compilePropAssignments(workspaceId, sceneCastMap) {
  const propMap = new Map();

  for (const scene of sceneCastMap.scenes) {
    for (const member of scene.cast) {
      for (const propId of member.prop_ids) {
        if (!propMap.has(propId)) {
          propMap.set(propId, {
            prop_id: propId,
            scenes: [],
            assigned_to: []
          });
        }
        const entry = propMap.get(propId);
        if (!entry.scenes.includes(scene.scene_id)) {
          entry.scenes.push(scene.scene_id);
        }
        if (!entry.assigned_to.includes(member.cast_member_id)) {
          entry.assigned_to.push(member.cast_member_id);
        }
      }
    }
  }

  return {
    workspace_id: workspaceId,
    props: [...propMap.values()]
  };
}

module.exports = {
  compilePropAssignments
};
