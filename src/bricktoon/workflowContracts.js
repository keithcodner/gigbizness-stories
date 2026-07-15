const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { loadEnv } = require("../loadEnv");
const { ensureDir, readJsonSafe, writeJson, relativeWorkspacePath } = require("./aiQualityPipeline");

const ROOT = path.resolve(__dirname, "..", "..");
loadEnv(ROOT);

function loadVisualGenerationConfig() {
  return readJsonSafe(path.join(ROOT, "config", "visual_generation.json"), {});
}

function sanitizeSegment(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function workflowSelectionForKind(config, kind, options = {}) {
  const selection = config.workflow_selection || {};
  if (kind === "character_reference") {
    return options.variant && options.variant !== "master"
      ? selection.character_variant || selection.character_reference
      : selection.character_reference;
  }
  if (kind === "scene_still") {
    return selection.scene_still;
  }
  if (kind === "shot_keyframe") {
    const map = selection.shot_keyframe || {};
    return map[options.qualityTier] || map.default || selection.hero_refine || "shot_keyframe_v1";
  }
  if (kind === "motion_pass_source") {
    return selection.motion_pass_source;
  }
  return selection.default || "shot_keyframe_v1";
}

function resolveWorkflowTemplate(config, kind, options = {}) {
  const workflowId = options.workflowId || workflowSelectionForKind(config, kind, options);
  const registry = config.comfyui?.workflow_templates || {};
  const template = registry[workflowId] || {};
  const profileId = template.sampler_profile || options.samplerProfile || "editorial_standard";
  const samplerProfiles = config.comfyui?.sampler_profiles || {};
  const samplerProfile = samplerProfiles[profileId] || {};
  const qualityDefaults = config.quality_tier_defaults?.[options.qualityTier || "standard"] || {};
  const configuredCheckpoint = process.env.COMFYUI_CHECKPOINT || config.comfyui?.checkpoint || null;
  const templateCheckpoint = template.checkpoint_bundle?.checkpoint || null;
  return {
    workflow_id: workflowId,
    kind,
    output: {
      width: options.width || template.output?.width || qualityDefaults.width || 1536,
      height: options.height || template.output?.height || qualityDefaults.height || 1024,
      aspect_ratio: template.output?.aspect_ratio || qualityDefaults.aspect_ratio || "16:9",
      filename_pattern: template.output?.filename_pattern || "{id}.png"
    },
    checkpoint_bundle: {
      ...(template.checkpoint_bundle || {}),
      checkpoint: configuredCheckpoint || templateCheckpoint || "v1-5-pruned-emaonly.safetensors",
      loras: template.checkpoint_bundle?.loras || []
    },
    sampler_profile: {
      id: profileId,
      steps: Number(samplerProfile.steps || config.comfyui?.steps || 28),
      cfg: Number(samplerProfile.cfg || config.comfyui?.cfg || 6.5),
      sampler: samplerProfile.sampler || config.comfyui?.sampler || "euler",
      scheduler: samplerProfile.scheduler || config.comfyui?.scheduler || "normal",
      denoise: Number(samplerProfile.denoise || config.comfyui?.denoise || 1),
      detailer_strength: Number(samplerProfile.detailer_strength || 0.35)
    },
    required_inputs: template.required_inputs || [],
    optional_inputs: template.optional_inputs || [],
    pass_plan: template.pass_plan || ["generate"],
    prompt_additions: template.prompt_additions || [],
    negative_prompt_additions: template.negative_prompt_additions || [],
    execution: {
      quality_tier: options.qualityTier || "standard",
      strict: Boolean(options.strict),
      provider: options.providerName || config.default_image_provider || "mock"
    }
  };
}

function stageFolderForKind(kind) {
  if (kind === "character_reference") {
    return "characters";
  }
  if (kind === "scene_still") {
    return "scenes";
  }
  if (kind === "motion_pass_source") {
    return "motion";
  }
  return "shots";
}

function buildStyleLocks(context = {}) {
  const profile = context.visualQualityProfile || {};
  return {
    material_finish: profile.production_target?.material_rendering || "painted plastic with dimensional highlights",
    lighting_behavior: profile.production_target?.lighting || "dramatic directional lighting",
    face_rules: [
      "stable eye spacing",
      "clean bricktoon face geometry",
      "avoid malformed mouths"
    ],
    hand_arm_rules: [
      "no extra fingers",
      "avoid fused hands",
      "preserve readable arm silhouettes"
    ],
    environment_density: profile.production_target?.environment || "rich but controlled detail",
    never_generate: profile.avoid || [
      "blurry faces",
      "distorted hands",
      "extra limbs",
      "unreadable generated text",
      "floating props"
    ]
  };
}

function buildWorkflowRequest(options) {
  const config = options.config || loadVisualGenerationConfig();
  const workflowTemplate = resolveWorkflowTemplate(config, options.kind, {
    workflowId: options.workflowId,
    qualityTier: options.qualityTier,
    width: options.width,
    height: options.height,
    providerName: options.providerName,
    strict: options.strict,
    samplerProfile: options.samplerProfile,
    variant: options.variant
  });

  const requestId = options.requestId || crypto.randomUUID();
  const basePrompt = String(options.promptText || "").trim();
  const promptText = [basePrompt, ...workflowTemplate.prompt_additions].filter(Boolean).join(" ");
  const negativePromptText = [options.negativePromptText || "", ...workflowTemplate.negative_prompt_additions].filter(Boolean).join(" ");

  return {
    request_id: requestId,
    created_at: new Date().toISOString(),
    provider: options.providerName,
    kind: options.kind,
    workflow_template_id: workflowTemplate.workflow_id,
    workflow_template: workflowTemplate,
    quality_tier: options.qualityTier || "standard",
    selection_reason: options.selectionReason || `Managed workflow selection for ${options.kind}.`,
    output_contract: {
      output_file: options.outputFile,
      width: workflowTemplate.output.width,
      height: workflowTemplate.output.height,
      stage: options.stage,
      workspace_topic: path.basename(options.workspaceDir)
    },
    prompt_contract: {
      prompt_text: promptText,
      negative_prompt_text: negativePromptText,
      prompt_components: options.promptComponents || [],
      style_locks: buildStyleLocks(options.context),
      continuity_source_refs: options.continuitySourceRefs || []
    },
    references: options.references || [],
    pass_plan: workflowTemplate.pass_plan,
    context: {
      topic_id: path.basename(options.workspaceDir),
      scene_id: options.sceneId || null,
      shot_id: options.shotId || null,
      character_id: options.characterId || null,
      variant: options.variant || null,
      production_mode: options.productionMode || null
    }
  };
}

function writeWorkflowRequest(workspaceDir, request) {
  const stageFolder = stageFolderForKind(request.kind);
  const filePath = path.join(workspaceDir, "07_visuals", "workflow_requests", stageFolder, `${sanitizeSegment(request.request_id)}.json`);
  writeJson(filePath, request);
  return relativeWorkspacePath(workspaceDir, filePath);
}

function buildExecutionResult(request, details = {}) {
  return {
    request_id: request.request_id,
    provider: request.provider,
    workflow_template_id: request.workflow_template_id,
    quality_tier: request.quality_tier,
    execution_mode: details.executionMode || "primary",
    status: details.status || "completed",
    output_file: request.output_contract.output_file,
    prompt_id: details.promptId || null,
    pass_results: details.passResults || request.pass_plan.map((passName) => ({ pass: passName, status: "planned" })),
    warnings: details.warnings || [],
    metrics: details.metrics || {},
    created_at: new Date().toISOString()
  };
}

function writeExecutionReport(workspaceDir, request, result) {
  const stageFolder = stageFolderForKind(request.kind);
  const filePath = path.join(workspaceDir, "07_visuals", "generation_reports", stageFolder, `${sanitizeSegment(request.request_id)}.json`);
  writeJson(filePath, {
    request,
    result
  });
  return relativeWorkspacePath(workspaceDir, filePath);
}

function qualityClassificationForAsset(assetType) {
  if (["bricktoon_composited_shot_sequence", "stabilized_motion_pass", "composited_shot_clip"].includes(assetType)) {
    return "premium_motion";
  }
  if (["bricktoon_scene_sequence", "bricktoon_animated_clip", "ai_motion_pass"].includes(assetType)) {
    return "motion_ready";
  }
  if (["approved_keyframe", "character_reference", "bricktoon_scene", "generated_keyframe"].includes(assetType)) {
    return "premium_still";
  }
  return "fallback";
}

function inferMotionRecipe(route = {}, performance = {}) {
  const purpose = String(route.reason || performance.purpose || "").toLowerCase();
  const shotType = String(route.shot_type || performance.shot_type || "").toLowerCase();
  if (purpose.includes("typing") || shotType.includes("over_shoulder")) {
    return "typing_action_insert";
  }
  if (purpose.includes("reaction") || shotType.includes("closeup")) {
    return "reaction_emphasis";
  }
  if (purpose.includes("villain")) {
    return "villain_hero";
  }
  if (purpose.includes("reveal") || purpose.includes("proof")) {
    return "pressure_reveal";
  }
  if (purpose.includes("talk") || purpose.includes("dialogue")) {
    return "talking_character";
  }
  return "static_plus_drift";
}

module.exports = {
  buildExecutionResult,
  buildWorkflowRequest,
  inferMotionRecipe,
  loadVisualGenerationConfig,
  qualityClassificationForAsset,
  resolveWorkflowTemplate,
  writeExecutionReport,
  writeWorkflowRequest
};
