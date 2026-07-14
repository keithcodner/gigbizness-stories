function parseBeatSheet(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- B"))
    .map((line) => line.replace(/^- /, ""))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        beat_id: parts[0],
        beat_type: parts[1] || "story",
        text: parts.slice(2).join(" | ")
      };
    });
}

function createRole(role, minimumCount) {
  return {
    role,
    minimum_count: minimumCount,
    beat_ids: [],
    required_expression_labels: [],
    required_action_intents: [],
    required_props: [],
    preferred_environments: []
  };
}

function pushUnique(array, ...values) {
  for (const value of values) {
    if (value && !array.includes(value)) {
      array.push(value);
    }
  }
}

function extractStoryRoles(input) {
  const roles = new Map();
  roles.set("narrator", createRole("narrator", 1));
  const beats = input.beatSheet || [];

  for (const beat of beats) {
    const text = `${beat.text} ${beat.beat_type}`.toLowerCase();
    const narrator = roles.get("narrator");
    pushUnique(narrator.beat_ids, beat.beat_id);
    pushUnique(narrator.required_expression_labels, "neutral", "explaining");
    pushUnique(narrator.required_action_intents, "point", "turn to camera");
    pushUnique(narrator.required_props, "PROP_EVIDENCE_FOLDER");
    pushUnique(narrator.preferred_environments, "ENV_NEWS_GRAPHIC_STAGE");

    if (/service|quote|pressure|customer|invoice|truck|move|paperwork|leverage/.test(text)) {
      if (!roles.has("worried_customer")) {
        roles.set("worried_customer", createRole("worried_customer", 1));
      }
      const customer = roles.get("worried_customer");
      pushUnique(customer.beat_ids, beat.beat_id);
      pushUnique(customer.required_expression_labels, "worried", "shocked");
      pushUnique(customer.required_action_intents, "phone in hand", "hands up");
      pushUnique(customer.required_props, "PROP_PHONE", "PROP_MOVING_BOX");
      pushUnique(customer.preferred_environments, "ENV_GENERIC_STOREFRONT", "ENV_SUBURBAN_DRIVEWAY");
    }

    if (/cheap|quote|price|deposit|cash|broker|trap|hostage|fake|scam|invoice/.test(text)) {
      if (!roles.has("schemer_villain")) {
        roles.set("schemer_villain", createRole("schemer_villain", 1));
      }
      const villain = roles.get("schemer_villain");
      pushUnique(villain.beat_ids, beat.beat_id);
      pushUnique(villain.required_expression_labels, "scheming", "angry");
      pushUnique(villain.required_action_intents, "moustache twirl", "point");
      pushUnique(villain.required_props, "PROP_CONTRACT");
      pushUnique(villain.preferred_environments, "ENV_GENERIC_STOREFRONT", "ENV_OFFICE");
    }

    if (/public|official|source|regulator|warning|evidence|checklist/.test(text)) {
      if (!roles.has("investigator")) {
        roles.set("investigator", createRole("investigator", 1));
      }
      const investigator = roles.get("investigator");
      pushUnique(investigator.beat_ids, beat.beat_id);
      pushUnique(investigator.required_expression_labels, "serious");
      pushUnique(investigator.required_action_intents, "folder reveal", "point");
      pushUnique(investigator.required_props, "PROP_EVIDENCE_FOLDER");
      pushUnique(investigator.preferred_environments, "ENV_POLICE_SCENE", "ENV_NEWS_GRAPHIC_STAGE");
    }
  }

  return {
    extraction_version: "1.0.0",
    required_roles: [...roles.values()]
  };
}

module.exports = {
  extractStoryRoles,
  parseBeatSheet
};
