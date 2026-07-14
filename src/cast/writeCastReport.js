function writeCastReport(workspaceId, roleRequirements, castPackage, validation) {
  const lines = [
    `# Cast Report - ${workspaceId}`,
    "",
    "## Status",
    validation.passed ? "PASS" : "FAIL",
    "",
    "## Story Roles"
  ];

  for (const requirement of roleRequirements.required_roles) {
    const assigned = castPackage.cast.cast_members.some((member) => member.role === requirement.role) ? "assigned" : "missing";
    lines.push(`- ${requirement.role}: ${assigned}`);
  }

  lines.push("", "## Characters");
  for (const member of castPackage.cast.cast_members) {
    lines.push(`### ${member.name}`);
    lines.push(`- Character ID: ${member.character_id}`);
    lines.push(`- Role: ${member.role}`);
    lines.push(`- Hard locks: ${Object.values(member.blueprint.continuity_rules.hard_locks).join(", ")}`);
    lines.push(`- Required expressions: ${member.blueprint.expressions.map((item) => item.label).join(", ")}`);
    lines.push(`- Required poses: ${member.blueprint.poses.map((item) => item.label).join(", ")}`);
    lines.push("");
  }

  lines.push("## Script Coverage");
  lines.push(`- ${castPackage.sceneCastMap.scenes.length} scenes have cast assignments`);
  lines.push(`- ${castPackage.propAssignments.props.length} required props resolve`);
  lines.push("");
  lines.push("## Result");
  lines.push(validation.passed
    ? "Cast package is ready for scene prompt compilation or future visual generation."
    : "Cast package needs fixes before it is safe to continue.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

module.exports = {
  writeCastReport
};
