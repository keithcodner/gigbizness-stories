function getCastMembers(castPackage) {
  if (Array.isArray(castPackage?.cast_members)) {
    return castPackage.cast_members;
  }
  if (Array.isArray(castPackage?.cast?.cast_members)) {
    return castPackage.cast.cast_members;
  }
  if (Array.isArray(castPackage?.cast)) {
    return castPackage.cast;
  }
  return [];
}

function getCharacterBlueprint(member) {
  return member?.blueprint || member || {};
}

function getCharacterId(member) {
  return member?.character_id || getCharacterBlueprint(member)?.character_id || null;
}

function buildCharacterMap(castPackage) {
  return new Map(
    getCastMembers(castPackage)
      .map((member) => [getCharacterId(member), member])
      .filter(([characterId]) => Boolean(characterId))
  );
}

module.exports = {
  buildCharacterMap,
  getCastMembers,
  getCharacterBlueprint,
  getCharacterId
};
