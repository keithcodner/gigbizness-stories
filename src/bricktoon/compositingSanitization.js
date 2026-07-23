function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function shouldSanitizeReadableText(shot = {}, clipInfo = {}) {
  const shotType = normalize(shot.shot_type);
  const focusTarget = normalize(clipInfo.focus_target);
  const performanceClass = normalize(clipInfo.performance_class);

  return focusTarget === "document"
    || performanceClass === "document_insert_motion"
    || shotType === "document_insert"
    || shotType === "top_down_document"
    || shotType === "push_in_document";
}

module.exports = {
  shouldSanitizeReadableText
};
