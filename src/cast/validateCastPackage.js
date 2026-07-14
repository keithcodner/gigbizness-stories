const fs = require("fs");
const path = require("path");

function loadRestrictedTraits(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "styles", "bricktoon", "vocabulary", "restricted_traits.json"), "utf8")).restricted_traits;
}

function validateCastPackage(input) {
  const { rootDir, workspaceId, roleRequirements, castPackage, libraries } = input;
  const restrictedTraits = loadRestrictedTraits(rootDir);
  const errors = [];
  const warnings = [];
  const castMembers = castPackage.cast.cast_members;
  const sceneCount = castPackage.sceneCastMap.scenes.length;

  for (const requirement of roleRequirements.required_roles) {
    const matches = castMembers.filter((member) => member.role === requirement.role);
    if (matches.length < requirement.minimum_count) {
      errors.push({ code: "CAST_REQUIRED_ROLE_MISSING", message: `Missing role ${requirement.role}` });
    }
  }

  const castIds = new Set();
  for (const member of castMembers) {
    if (castIds.has(member.cast_member_id)) {
      errors.push({ code: "CAST_DUPLICATE_MEMBER_ID", message: `Duplicate cast member id ${member.cast_member_id}` });
    }
    castIds.add(member.cast_member_id);

    if (!libraries.characters.byId.has(member.role)) {
      errors.push({ code: "CAST_ARCHETYPE_NOT_FOUND", message: `Unknown archetype ${member.role}` });
    }

    const searchable = JSON.stringify(member.blueprint).toLowerCase();
    for (const restricted of restrictedTraits) {
      if (restricted.patterns.some((pattern) => searchable.includes(pattern.toLowerCase()))) {
        errors.push({ code: "CAST_RESTRICTED_BRAND_TRAIT", message: `Restricted trait detected in ${member.cast_member_id}` });
      }
    }
  }

  for (const scene of castPackage.sceneCastMap.scenes) {
    if (!libraries.environments.byId.has(scene.environment_id)) {
      errors.push({ code: "CAST_ENVIRONMENT_NOT_FOUND", message: `Unknown environment ${scene.environment_id}` });
    }

    for (const member of scene.cast) {
      const castMember = castMembers.find((item) => item.cast_member_id === member.cast_member_id);
      if (!castMember) {
        errors.push({ code: "CAST_SCENE_MEMBER_UNDEFINED", message: `Unknown cast member ${member.cast_member_id}` });
        continue;
      }

      if (!castMember.blueprint.expressions.some((item) => item.expression_id === member.expression_id)) {
        errors.push({ code: "CAST_SCENE_EXPRESSION_UNDEFINED", message: `Unknown expression ${member.expression_id}` });
      }
      if (!castMember.blueprint.poses.some((item) => item.pose_id === member.pose_id)) {
        errors.push({ code: "CAST_SCENE_POSE_UNDEFINED", message: `Unknown pose ${member.pose_id}` });
      }
      for (const propId of member.prop_ids) {
        if (!libraries.props.byId.has(propId)) {
          errors.push({ code: "CAST_PROP_NOT_FOUND", message: `Unknown prop ${propId}` });
        }
      }
    }
  }

  if (sceneCount === 0) {
    warnings.push({ code: "CAST_SCENE_MAP_EMPTY", message: "No scene cast assignments were produced." });
  }

  return {
    workspace_id: workspaceId,
    validation_version: "1.0.0",
    passed: errors.length === 0,
    summary: {
      required_roles: roleRequirements.required_roles.length,
      cast_members: castMembers.length,
      scene_assignments: sceneCount,
      props_resolved: castPackage.propAssignments.props.length,
      environments_resolved: castPackage.sceneCastMap.scenes.filter((scene) => libraries.environments.byId.has(scene.environment_id)).length,
      continuity_checks: castPackage.castContinuity.characters.length,
      restricted_trait_checks: restrictedTraits.length
    },
    errors,
    warnings,
    status: errors.length === 0 ? "passed" : "failed"
  };
}

module.exports = {
  validateCastPackage
};
