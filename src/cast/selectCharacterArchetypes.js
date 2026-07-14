function selectCharacterArchetypes(input) {
  const { roleRequirements, libraries } = input;
  return roleRequirements.required_roles.map((requirement, index) => {
    const archetype = libraries.characters.byId.get(requirement.role);
    return {
      cast_member_id: `CAST_${String(index + 1).padStart(3, "0")}`,
      archetype_id: requirement.role,
      role: requirement.role,
      archetype
    };
  });
}

module.exports = {
  selectCharacterArchetypes
};
