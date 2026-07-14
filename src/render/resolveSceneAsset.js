function rankAssetType(assetType) {
  const order = [
    "bricktoon_animated_clip",
    "bricktoon_layered_scene",
    "bricktoon_scene",
    "source_card",
    "chart",
    "map",
    "document_graphic",
    "text_card"
  ];
  const index = order.indexOf(assetType);
  return index >= 0 ? index : order.length + 1;
}

function resolveSceneAsset(sceneCard, assetManifest, options = {}) {
  const renderMode = options.render_mode || "development";
  const requiredType = sceneCard.visual_type || "bricktoon_scene";
  const allowedFallbackTypes = sceneCard.allowed_fallback_types || [];
  const sceneAssets = (assetManifest.assets || [])
    .filter((asset) => asset.status === "approved" && Array.isArray(asset.scene_ids) && asset.scene_ids.includes(sceneCard.scene_id))
    .sort((a, b) => rankAssetType(a.asset_type) - rankAssetType(b.asset_type));

  const exact = sceneAssets.find((asset) => asset.asset_type === requiredType);
  if (exact) {
    return { asset: exact, fallback_used: false };
  }

  const allowed = sceneAssets.find((asset) => allowedFallbackTypes.includes(asset.asset_type));
  if (allowed) {
    return { asset: allowed, fallback_used: true };
  }

  if (renderMode === "strict_visuals") {
    throw new Error(`Missing required visual for ${sceneCard.scene_id}: expected ${requiredType}`);
  }

  return {
    asset: {
      asset_id: `DIAGNOSTIC_${sceneCard.scene_id}`,
      asset_type: "text_card",
      file: null,
      diagnostic_text: [
        "MISSING VISUAL",
        `Scene: ${sceneCard.scene_id}`,
        `Expected: ${requiredType}`,
        "Reason: no approved asset in manifest"
      ].join("\n")
    },
    fallback_used: true
  };
}

module.exports = {
  resolveSceneAsset
};
