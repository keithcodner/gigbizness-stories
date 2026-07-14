function upsertAsset(manifest, asset) {
  const index = manifest.assets.findIndex((existing) => existing.asset_id === asset.asset_id);
  if (index >= 0) {
    manifest.assets[index] = asset;
    return manifest;
  }
  manifest.assets.push(asset);
  return manifest;
}

function createEmptyManifest(workspaceId) {
  return {
    workspace_id: workspaceId,
    assets: []
  };
}

module.exports = {
  createEmptyManifest,
  upsertAsset
};
