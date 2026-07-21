const fs = require("fs");
const path = require("path");
const { getCastMembers, getCharacterBlueprint, getCharacterId } = require("./normalizeCast");

function buildShotCastMap(castPackage) {
  const byCastMemberId = new Map();
  const byCharacterId = new Map();
  for (const member of getCastMembers(castPackage)) {
    if (member?.cast_member_id) {
      byCastMemberId.set(member.cast_member_id, member);
    }
    const characterId = getCharacterId(member);
    if (characterId) {
      byCharacterId.set(characterId, member);
    }
  }
  return {
    byCastMemberId,
    byCharacterId
  };
}

function getShotCharacters(castPackage, shot) {
  const maps = buildShotCastMap(castPackage);
  return (shot.cast_member_ids || [])
    .map((id) => maps.byCastMemberId.get(id) || maps.byCharacterId.get(id) || null)
    .filter(Boolean)
    .map((member) => {
      const blueprint = getCharacterBlueprint(member);
      return {
        cast_member_id: member.cast_member_id || null,
        character_id: getCharacterId(member),
        name: member.name || blueprint.name || "Unknown",
        role: member.role || blueprint.archetype_id || blueprint.role || "supporting_character",
        visual_description: blueprint.visual_description || "",
        continuity_rules: blueprint.continuity_rules || {},
        expressions: Array.isArray(blueprint.expressions) ? blueprint.expressions : [],
        poses: Array.isArray(blueprint.poses) ? blueprint.poses : []
      };
    });
}

function shotVisibilityRule(shot) {
  const type = String(shot.shot_type || "").toLowerCase();
  if (type.includes("closeup")) {
    return {
      subject_rule: "One dominant visible character only. No duplicate faces. No extra people.",
      max_characters: 1
    };
  }
  if (type.includes("medium_single")) {
    return {
      subject_rule: "Single-character shot. Keep one readable hero subject only.",
      max_characters: 1
    };
  }
  if (type.includes("medium_two_shot")) {
    return {
      subject_rule: "Two-character composition only. No background extras.",
      max_characters: 2
    };
  }
  if (type.includes("document") || type.includes("top_down")) {
    return {
      subject_rule: "Document-led composition. If any character appears, keep to hands or partial prop interaction only.",
      max_characters: 0
    };
  }
  return {
    subject_rule: `Keep the visible cast limited to the planned shot cast. Maximum ${Math.max(1, (shot.cast_member_ids || []).length)} readable characters.`,
    max_characters: Math.max(1, (shot.cast_member_ids || []).length)
  };
}

function thumbnailStyleLine(shot, tier) {
  const type = String(shot.shot_type || "").toLowerCase();
  if (tier === "hero" || type.includes("closeup")) {
    return "Match a premium editorial bricktoon thumbnail look: bold foreground subject, strong face readability, dramatic edge lighting, dense but controlled background detail, clean silhouette separation.";
  }
  if (type.includes("document")) {
    return "Match a premium editorial explainer insert: clean evidence readability, dramatic lighting, strong focal hierarchy, no clutter over the proof area.";
  }
  return "Match a premium editorial bricktoon still: polished toy-brick materials, cinematic contrast, readable subject hierarchy, and commercial poster-level finish.";
}

function hardLockSummary(character) {
  const locks = character.continuity_rules?.hard_locks || {};
  return [
    locks.silhouette ? `silhouette ${locks.silhouette}` : null,
    locks.wardrobe ? `wardrobe ${locks.wardrobe}` : null,
    locks.facial_hair ? `facial detail ${locks.facial_hair}` : null,
    locks.headwear ? `headwear ${locks.headwear}` : null
  ].filter(Boolean).join(", ");
}

function buildCharacterLockLines(shotCharacters, shot) {
  const visibility = shotVisibilityRule(shot);
  const primary = shotCharacters.find((character) => character.character_id === shot.primary_character_id)
    || shotCharacters[0]
    || null;
  const secondary = shotCharacters.filter((character) => !primary || character.character_id !== primary.character_id);
  const lines = [];

  if (primary) {
    lines.push(`Primary character lock: ${primary.name} (${primary.character_id}), role ${primary.role}, ${primary.visual_description}.`);
    const primaryLocks = hardLockSummary(primary);
    if (primaryLocks) {
      lines.push(`Primary hard locks: ${primaryLocks}.`);
    }
  }

  if (secondary.length > 0 && visibility.max_characters > 1) {
    lines.push(`Secondary cast locks: ${secondary.map((character) => `${character.name} (${character.character_id}) ${character.visual_description}`).join("; ")}.`);
  } else if (secondary.length > 0) {
    lines.push(`Do not show the secondary cast in this shot. Keep the frame centered on ${primary ? primary.name : "the hero subject"} only.`);
  }

  for (const character of visibility.max_characters > 1 ? shotCharacters : [primary].filter(Boolean)) {
    const forbidden = Array.isArray(character.continuity_rules?.forbidden_changes)
      ? character.continuity_rules.forbidden_changes
      : [];
    if (forbidden.length > 0) {
      lines.push(`Never change ${character.name}'s hard identity anchors. Forbidden drift: ${forbidden.join(", ")}.`);
    }
  }

  lines.push(visibility.subject_rule);
  return {
    primaryCharacter: primary,
    lines
  };
}

function buildShotCompositionLines({ shot, sceneCard, compositionGuide, artDirection, tier }) {
  const lines = [];
  if (sceneCard?.narration) {
    lines.push(`Narrative moment: ${sceneCard.narration}`);
  }
  if (artDirection?.visual_target?.composition) {
    lines.push(`Composition target: ${artDirection.visual_target.composition}.`);
  }
  if (artDirection?.visual_target?.lighting) {
    lines.push(`Lighting target: ${artDirection.visual_target.lighting}.`);
  }
  if (artDirection?.visual_target?.depth) {
    lines.push(`Depth target: ${artDirection.visual_target.depth}.`);
  }
  if (compositionGuide?.focus_point) {
    lines.push(`Focus point must land near ${compositionGuide.focus_point.x}, ${compositionGuide.focus_point.y} of frame.`);
  }
  if (Array.isArray(compositionGuide?.depth_labels) && compositionGuide.depth_labels.length > 0) {
    lines.push(`Depth planes required: ${compositionGuide.depth_labels.join(", ")}.`);
  }
  lines.push(thumbnailStyleLine(shot, tier));
  return lines;
}

function buildAnimationSafetyLines({ shot, shotCharacters, sceneCard, primaryCharacter }) {
  const lines = [];
  const shotType = String(shot.shot_type || "").toLowerCase();
  const storyText = `${shot.purpose || ""} ${sceneCard?.narration || ""}`.toLowerCase();
  const primaryName = primaryCharacter?.name || "the visible speaker";
  const hasPropStoryBeat = /invoice|bill|quote|fee|contract|folder|phone|proof|document|evidence|truck/.test(storyText);

  if (shotType.includes("closeup")) {
    lines.push(`Animation-safe framing: keep ${primaryName}'s full head fully visible, keep the mouth unobstructed, and preserve clean eye and eyebrow readability for later blink and speech animation.`);
  }
  if (shotType.includes("medium")) {
    lines.push("Animation-safe framing: keep at least one full readable gesture arm visible and avoid cropping the active hands at the wrist or elbow.");
  }
  if (shotType.includes("document") || shotType.includes("top_down")) {
    lines.push("Animation-safe framing: keep the proof area clean, preserve edge separation for hands and documents, and avoid burying the action under visual clutter.");
  }
  if (shotType.includes("reaction")) {
    lines.push(`Animation-safe framing: favor readable facial reaction shapes for ${primaryName} and leave room for a pose or expression swap.`);
  }
  if (hasPropStoryBeat) {
    lines.push("Animation-safe prop rule: keep the active prop fully readable, attached to a believable hand zone when visible, and separated from the background for later motion extraction.");
  }
  if ((shotCharacters || []).length > 1 && !shotType.includes("wide")) {
    lines.push("Animation-safe cast rule: keep subject overlap low so faces, arms, and props can be separated cleanly during later puppet prep.");
  }

  lines.push("Do not crop away the exact face, hand, or prop areas needed for later puppet-style motion.");
  return lines;
}

function existingCharacterRef(filePath) {
  return filePath && fs.existsSync(filePath) ? filePath : null;
}

function selectCharacterRefPaths(workspaceDir, visualBible, shotCharacters, shot) {
  const visibility = shotVisibilityRule(shot);
  const primary = shotCharacters.find((character) => character.character_id === shot.primary_character_id)
    || shotCharacters[0]
    || null;
  const targetCharacters = visibility.max_characters <= 1 && primary
    ? [primary]
    : shotCharacters;
  const refs = [];
  const seenFiles = new Set();

  for (const character of targetCharacters) {
    const bibleEntry = (visualBible.characters || []).find((entry) => entry.character_id === character.character_id) || {};
    const baseDir = path.join(workspaceDir, "07_visuals", "character_refs", character.character_id);
    const expressionDir = path.join(baseDir, "expressions");
    const preferredFiles = [];

    const slotValues = bibleEntry.reference_slots || {};
    if (slotValues.neutral_turnaround) {
      preferredFiles.push(path.join(baseDir, path.basename(slotValues.neutral_turnaround)));
    }
    preferredFiles.push(path.join(baseDir, "master.png"));
    preferredFiles.push(path.join(baseDir, "front.png"));
    preferredFiles.push(path.join(baseDir, "three_quarter.png"));

    if (primary && primary.character_id === character.character_id) {
      preferredFiles.push(path.join(expressionDir, "talking.png"));
      preferredFiles.push(path.join(expressionDir, "worried.png"));
    }

    const existing = preferredFiles
      .map(existingCharacterRef)
      .filter(Boolean)
      .filter((filePath) => {
        if (seenFiles.has(filePath)) {
          return false;
        }
        seenFiles.add(filePath);
        return true;
      })
      .slice(0, primary && primary.character_id === character.character_id ? 4 : 1);

    for (const filePath of existing) {
      refs.push({
        reference_id: `CHARREF_${character.character_id}_${path.basename(filePath, path.extname(filePath)).toUpperCase()}`,
        type: "character_identity_reference",
        filePath,
        relativeFile: path.relative(workspaceDir, filePath).replaceAll("\\", "/"),
        label: `${character.name} ${path.basename(filePath, path.extname(filePath))}`,
        priority: primary && primary.character_id === character.character_id ? 100 : 50,
        character_id: character.character_id
      });
    }
  }

  return refs.sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
}

function buildShotNegativePrompt(shotCharacters, shot) {
  const terms = [
    "duplicate characters",
    "extra people",
    "wrong costume",
    "wrong hat",
    "wrong facial hair",
    "identity drift",
    "off-model face",
    "photoreal human skin",
    "flat lighting",
    "empty background",
    "unreadable text",
    "malformed hands",
    "extra limbs",
    "logo duplication"
  ];
  const visibility = shotVisibilityRule(shot);
  if (visibility.max_characters <= 1) {
    terms.push("multiple visible characters");
  }
  for (const character of shotCharacters) {
    const locks = character.continuity_rules?.hard_locks || {};
    if (locks.headwear && locks.headwear !== "HEAD_NONE") {
      terms.push(`missing ${character.name} headwear`);
    }
  }
  return [...new Set(terms)].join(", ");
}

module.exports = {
  buildAnimationSafetyLines,
  buildCharacterLockLines,
  buildShotCompositionLines,
  buildShotNegativePrompt,
  getShotCharacters,
  selectCharacterRefPaths
};
