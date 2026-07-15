const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const crypto = require("crypto");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value == null) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizePromptText(prompt) {
  return String(prompt || "").replace(/\s+/g, " ").trim();
}

function resizeImage(inputPath, outputPath, width, height) {
  const filter = `scale=${width}:${height}:force_original_aspect_ratio=cover,crop=${width}:${height}`;
  const result = spawnSync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    filter,
    outputPath
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `Failed to resize ComfyUI image for ${outputPath}`);
  }
}

function comfyConfig(config = {}) {
  const comfyui = config.comfyui || {};
  return {
    baseUrl: process.env.COMFYUI_BASE_URL || comfyui.base_url || "http://127.0.0.1:8188",
    checkpoint: process.env.COMFYUI_CHECKPOINT || comfyui.checkpoint || "v1-5-pruned-emaonly.safetensors",
    sampler: process.env.COMFYUI_SAMPLER || comfyui.sampler || "euler",
    scheduler: process.env.COMFYUI_SCHEDULER || comfyui.scheduler || "normal",
    steps: Number(process.env.COMFYUI_STEPS || comfyui.steps || 28),
    cfg: Number(process.env.COMFYUI_CFG || comfyui.cfg || 6.5),
    denoise: Number(process.env.COMFYUI_DENOISE || comfyui.denoise || 1),
    timeoutMs: Number(process.env.COMFYUI_TIMEOUT_MS || comfyui.timeout_ms || 240000),
    pollIntervalMs: Number(process.env.COMFYUI_POLL_INTERVAL_MS || comfyui.poll_interval_ms || 2000),
    negativePrompt: process.env.COMFYUI_NEGATIVE_PROMPT || comfyui.negative_prompt || "",
    strict: envFlag("COMFYUI_STRICT", Boolean(comfyui.strict))
  };
}

function promptForCharacter(args) {
  return normalizePromptText([
    args.prompt.prompt_text,
    `Variant: ${args.variant || "master"}.`,
    "High-quality bricktoon character turnaround sheet.",
    "Original toy-brick editorial style, clean identity lock, no text."
  ].join(" "));
}

function promptForScene(args) {
  return normalizePromptText([
    args.prompt.prompt_text,
    "High-quality bricktoon editorial scene still.",
    "Strong lighting, depth, stable faces, no captions or logos."
  ].join(" "));
}

function promptForShotKeyframe(args) {
  return normalizePromptText([
    args.prompt.prompt_text,
    `Shot ID: ${args.shotId}.`,
    `Quality tier: ${args.qualityTier}.`,
    "Premium cinematic bricktoon keyframe.",
    "No embedded text, no branding, no watermark."
  ].join(" "));
}

function buildWorkflow({ prompt, negativePrompt, width, height, config }) {
  return {
    "1": {
      inputs: {
        ckpt_name: config.checkpoint
      },
      class_type: "CheckpointLoaderSimple"
    },
    "2": {
      inputs: {
        text: prompt,
        clip: ["1", 1]
      },
      class_type: "CLIPTextEncode"
    },
    "3": {
      inputs: {
        text: negativePrompt,
        clip: ["1", 1]
      },
      class_type: "CLIPTextEncode"
    },
    "4": {
      inputs: {
        width,
        height,
        batch_size: 1
      },
      class_type: "EmptyLatentImage"
    },
    "5": {
      inputs: {
        seed: Math.floor(Math.random() * 1_000_000_000),
        steps: config.steps,
        cfg: config.cfg,
        sampler_name: config.sampler,
        scheduler: config.scheduler,
        denoise: config.denoise,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0]
      },
      class_type: "KSampler"
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2]
      },
      class_type: "VAEDecode"
    },
    "7": {
      inputs: {
        filename_prefix: "gigbizness_stories",
        images: ["6", 0]
      },
      class_type: "SaveImage"
    }
  };
}

async function apiJson(baseUrl, endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI request failed (${response.status}) at ${endpoint}: ${text}`);
  }
  return response.json();
}

async function queuePrompt(baseUrl, workflow) {
  const clientId = crypto.randomUUID();
  const json = await apiJson(baseUrl, "/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      prompt: workflow
    })
  });
  return {
    promptId: json.prompt_id,
    clientId
  };
}

async function waitForImage(baseUrl, promptId, config) {
  const deadline = Date.now() + config.timeoutMs;
  while (Date.now() < deadline) {
    const history = await apiJson(baseUrl, `/history/${promptId}`);
    const record = history[promptId];
    if (record?.outputs) {
      for (const output of Object.values(record.outputs)) {
        if (Array.isArray(output.images) && output.images.length > 0) {
          return output.images[0];
        }
      }
    }
    await sleep(config.pollIntervalMs);
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}.`);
}

async function downloadImage(baseUrl, imageInfo) {
  const params = new URLSearchParams({
    filename: imageInfo.filename,
    subfolder: imageInfo.subfolder || "",
    type: imageInfo.type || "output"
  });
  const response = await fetch(`${baseUrl}/view?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download ComfyUI image (${response.status}): ${text}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function generateImage(outputPath, { prompt, negativePrompt, width, height, providerConfig }) {
  const config = comfyConfig(providerConfig);
  const workflow = buildWorkflow({
    prompt,
    negativePrompt,
    width,
    height,
    config
  });
  const { promptId } = await queuePrompt(config.baseUrl, workflow);
  const imageInfo = await waitForImage(config.baseUrl, promptId, config);
  const buffer = await downloadImage(config.baseUrl, imageInfo);

  ensureDir(path.dirname(outputPath));
  const tempPath = path.join(os.tmpdir(), `comfyui_image_${Date.now()}_${path.basename(outputPath)}`);
  fs.writeFileSync(tempPath, buffer);
  try {
    resizeImage(tempPath, outputPath, width, height);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function isConfigured() {
  return true;
}

async function renderCharacterReference(args) {
  await generateImage(args.outputPath, {
    prompt: promptForCharacter(args),
    negativePrompt: normalizePromptText(`${args.prompt.negative_prompt_text || ""} ${(comfyConfig(args.providerConfig).negativePrompt || "")}`),
    width: args.width || 1024,
    height: args.height || 1024,
    providerConfig: args.providerConfig
  });
}

async function renderSceneImage(args) {
  await generateImage(args.outputPath, {
    prompt: promptForScene(args),
    negativePrompt: normalizePromptText(`${args.prompt.negative_prompt_text || ""} ${(comfyConfig(args.providerConfig).negativePrompt || "")}`),
    width: args.width || 1024,
    height: args.height || 1536,
    providerConfig: args.providerConfig
  });
}

async function renderShotKeyframe(args) {
  await generateImage(args.outputPath, {
    prompt: promptForShotKeyframe(args),
    negativePrompt: normalizePromptText(`${args.prompt.negative_prompt_text || ""} ${(comfyConfig(args.providerConfig).negativePrompt || "")}`),
    width: args.width || 1536,
    height: args.height || 1024,
    providerConfig: args.providerConfig
  });
}

module.exports = {
  comfyConfig,
  isConfigured,
  renderCharacterReference,
  renderSceneImage,
  renderShotKeyframe
};
