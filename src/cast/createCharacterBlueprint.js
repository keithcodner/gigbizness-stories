function titleFromRole(role) {
  return role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function createCharacterBlueprint(selection) {
  const role = selection.role;
  const displayName = role === "schemer_villain"
    ? "Victor Vane"
    : role === "worried_customer"
      ? "Casey"
      : role === "investigator"
        ? "Inspector Dana"
        : role === "narrator"
          ? "The Gigbizness Guide"
          : titleFromRole(role);

  const visualDescriptionMap = {
    narrator: "blocky toy business narrator, navy blazer, calm face, cinematic miniature lighting",
    worried_customer: "blocky toy customer, blue hoodie, wide worried eyes, phone and moving-box ready silhouette",
    schemer_villain: "blocky toy schemer with black top hat, curled moustache, dark coat with red accent, confident grin",
    investigator: "blocky toy investigator with folder, glasses, generic badge icon, serious expression",
    business_owner: "blocky toy business owner with plain office wardrobe and neutral presentation stance"
  };
  const personalityMap = {
    narrator: "dry, sharp, explains scams clearly",
    worried_customer: "stressed, trusting, under deadline",
    schemer_villain: "pushy, charming, evasive",
    investigator: "serious, clear, evidence-driven",
    business_owner: "steady, practical, process-oriented"
  };

  return {
    character_id: `BT_CHAR_${String(selection.cast_member_id.split("_")[1]).padStart(4, "0")}`,
    version: "1.0.0",
    fictional: true,
    archetype_id: role,
    name: displayName,
    visual_description: visualDescriptionMap[role] || `blocky toy ${titleFromRole(role).toLowerCase()}`,
    personality: personalityMap[role] || "clear, readable, generic story role",
    expressions: selection.archetype.required_expression_labels.map((label, index) => ({
      expression_id: `EXP_SET_${index + 1}`,
      label
    })),
    poses: selection.archetype.required_action_intents.map((label, index) => ({
      pose_id: `POSE_SET_${index + 1}`,
      label
    })),
    motion_profile: {
      supported_action_intents: selection.archetype.required_action_intents
    },
    prop_affinities: selection.archetype.default_props,
    continuity_rules: {
      hard_locks: {
        silhouette: role,
        wardrobe: role === "schemer_villain" ? "WARDROBE_FORMAL_DARK_RED" : role === "worried_customer" ? "WARDROBE_HOODIE_BLUE" : role === "investigator" ? "WARDROBE_INVESTIGATOR_JACKET" : "WARDROBE_BLAZER_NAVY",
        facial_hair: role === "schemer_villain" ? "FH_CURLED_MOUSTACHE_LARGE" : "FH_NONE",
        headwear: role === "schemer_villain" ? "HEAD_TOP_HAT_BLACK" : "HEAD_NONE"
      },
      allowed_scene_changes: ["prop swap", "expression change", "pose change"],
      forbidden_changes: ["exact brand traits", "real person likeness", "hard lock removal"]
    }
  };
}

module.exports = {
  createCharacterBlueprint
};
