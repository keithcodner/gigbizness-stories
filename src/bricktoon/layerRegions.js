function clampRegion(region, sourceWidth, sourceHeight) {
  const x = Math.max(0, Math.min(sourceWidth - 1, Math.round(region.x || 0)));
  const y = Math.max(0, Math.min(sourceHeight - 1, Math.round(region.y || 0)));
  const width = Math.max(1, Math.min(sourceWidth - x, Math.round(region.width || 1)));
  const height = Math.max(1, Math.min(sourceHeight - y, Math.round(region.height || 1)));
  return { x, y, width, height };
}

function expandRegion(region, sourceWidth, sourceHeight, scaleX = 1, scaleY = scaleX) {
  const centerX = (region.x || 0) + ((region.width || 0) / 2);
  const centerY = (region.y || 0) + ((region.height || 0) / 2);
  const width = (region.width || 1) * scaleX;
  const height = (region.height || 1) * scaleY;
  return clampRegion({
    x: centerX - (width / 2),
    y: centerY - (height / 2),
    width,
    height
  }, sourceWidth, sourceHeight);
}

function scaleGuideBox(box, sourceWidth, sourceHeight, guideWidth = 1280, guideHeight = 720) {
  return clampRegion({
    x: ((box.x || 0) / guideWidth) * sourceWidth,
    y: ((box.y || 0) / guideHeight) * sourceHeight,
    width: ((box.width || box.w || 1) / guideWidth) * sourceWidth,
    height: ((box.height || box.h || 1) / guideHeight) * sourceHeight
  }, sourceWidth, sourceHeight);
}

function unionRegions(regions, sourceWidth, sourceHeight) {
  const valid = regions.filter(Boolean);
  if (valid.length === 0) {
    return clampRegion({ x: 0, y: 0, width: sourceWidth, height: sourceHeight }, sourceWidth, sourceHeight);
  }
  const left = Math.min(...valid.map((region) => region.x));
  const top = Math.min(...valid.map((region) => region.y));
  const right = Math.max(...valid.map((region) => region.x + region.width));
  const bottom = Math.max(...valid.map((region) => region.y + region.height));
  return clampRegion({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  }, sourceWidth, sourceHeight);
}

function centeredFaceRegion(primaryRegion, sourceWidth, sourceHeight) {
  return clampRegion({
    x: primaryRegion.x + (primaryRegion.width * 0.22),
    y: primaryRegion.y + (primaryRegion.height * 0.04),
    width: primaryRegion.width * 0.56,
    height: primaryRegion.height * 0.34
  }, sourceWidth, sourceHeight);
}

function armHandRegion(primaryRegion, sourceWidth, sourceHeight) {
  return clampRegion({
    x: primaryRegion.x - (primaryRegion.width * 0.1),
    y: primaryRegion.y + (primaryRegion.height * 0.28),
    width: primaryRegion.width * 1.2,
    height: primaryRegion.height * 0.58
  }, sourceWidth, sourceHeight);
}

function inferPrimaryAndPropRegions(scaledBoxes, shotType, sourceWidth, sourceHeight) {
  if (scaledBoxes.length === 0) {
    const fallback = clampRegion({
      x: sourceWidth * 0.18,
      y: sourceHeight * 0.12,
      width: sourceWidth * 0.42,
      height: sourceHeight * 0.68
    }, sourceWidth, sourceHeight);
    return {
      primaryRegion: fallback,
      propRegion: clampRegion({
        x: sourceWidth * 0.68,
        y: sourceHeight * 0.18,
        width: sourceWidth * 0.18,
        height: sourceHeight * 0.24
      }, sourceWidth, sourceHeight)
    };
  }

  if (shotType.includes("document") || shotType.includes("top_down")) {
    return {
      primaryRegion: scaledBoxes[0],
      propRegion: scaledBoxes[1] || scaledBoxes[0]
    };
  }

  return {
    primaryRegion: scaledBoxes[0],
    propRegion: scaledBoxes[1] || scaledBoxes[0]
  };
}

function buildLayerRegions({ shot, compositionGuide = {}, sourceWidth, sourceHeight }) {
  const shotType = String(shot.shot_type || "").toLowerCase();
  const scaledBoxes = (compositionGuide.boxes || []).map((box) => scaleGuideBox(box, sourceWidth, sourceHeight));
  const { primaryRegion, propRegion } = inferPrimaryAndPropRegions(scaledBoxes, shotType, sourceWidth, sourceHeight);
  const faceRegion = centeredFaceRegion(primaryRegion, sourceWidth, sourceHeight);
  const armsRegion = armHandRegion(primaryRegion, sourceWidth, sourceHeight);
  const characterRegion = expandRegion(
    unionRegions([primaryRegion, faceRegion, armsRegion], sourceWidth, sourceHeight),
    sourceWidth,
    sourceHeight,
    1.08,
    1.05
  );
  const foregroundRegion = expandRegion(
    unionRegions([characterRegion, propRegion], sourceWidth, sourceHeight),
    sourceWidth,
    sourceHeight,
    1.12,
    1.08
  );

  return {
    extraction_mode: "guide_derived_regions_v1",
    source_size: {
      width: sourceWidth,
      height: sourceHeight
    },
    background_far: {
      type: "full_frame_blurred"
    },
    background_middle: {
      type: "full_frame_softened"
    },
    character_foreground: characterRegion,
    face_region: faceRegion,
    arm_hand_region: armsRegion,
    prop_main: propRegion,
    foreground_frame: foregroundRegion,
    fx_overlay: {
      type: "transparent_overlay"
    },
    lighting_overlay: {
      type: "full_frame_lighting_wash"
    },
    clean_plate_proxy: {
      type: "blurred_plate_proxy",
      masked_regions: [characterRegion, propRegion]
    }
  };
}

module.exports = {
  buildLayerRegions,
  clampRegion,
  scaleGuideBox,
  unionRegions
};
