const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value == null) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function supportedSize(width, height) {
  if (width === height) {
    return "1024x1024";
  }
  return width > height ? "1536x1024" : "1024x1536";
}

function normalizePromptText(prompt) {
  return String(prompt || "")
    .replace(/\s+/g, " ")
    .trim();
}

function promptForCharacter(args) {
  if (args.workflowRequest?.prompt_contract?.prompt_text) {
    return normalizePromptText(args.workflowRequest.prompt_contract.prompt_text);
  }
  return normalizePromptText([
    args.prompt.prompt_text,
    `Variant: ${args.variant || "master"}.`,
    "Return a single clean reusable production-ready character image.",
    "No embedded captions or text."
  ].join(" "));
}

function promptForScene(args) {
  if (args.workflowRequest?.prompt_contract?.prompt_text) {
    return normalizePromptText(args.workflowRequest.prompt_contract.prompt_text);
  }
  return normalizePromptText([
    args.prompt.prompt_text,
    "Return a single polished editorial bricktoon still.",
    "No embedded captions or text."
  ].join(" "));
}

function promptForShotKeyframe(args) {
  if (args.workflowRequest?.prompt_contract?.prompt_text) {
    return normalizePromptText(args.workflowRequest.prompt_contract.prompt_text);
  }
  return normalizePromptText([
    args.prompt.prompt_text,
    `Shot ID: ${args.shotId}.`,
    `Quality tier: ${args.qualityTier}.`,
    "Generate one clean cinematic keyframe for later animation and compositing.",
    "No logos. No readable fake text. No watermarks."
  ].join(" "));
}

async function requestImage({ apiKey, model, prompt, size, quality, background }) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      background,
      output_format: "png"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image request failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const item = json.data?.[0];
  if (!item) {
    throw new Error("OpenAI image request returned no image data.");
  }

  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item.url) {
    const download = await fetch(item.url);
    if (!download.ok) {
      throw new Error(`OpenAI image download failed (${download.status}).`);
    }
    return Buffer.from(await download.arrayBuffer());
  }

  throw new Error("OpenAI image request returned neither b64_json nor url.");
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
    throw new Error(result.stderr || `Failed to resize generated image for ${outputPath}`);
  }
}

async function writeImage(outputPath, request, width, height) {
  ensureDir(path.dirname(outputPath));
  const buffer = await requestImage(request);
  const tempPath = path.join(os.tmpdir(), `openai_image_${Date.now()}_${path.basename(outputPath)}`);
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
  return Boolean(process.env.OPENAI_API_KEY);
}

function getConfig(config = {}) {
  const openai = config.openai || {};
  return {
    model: process.env.OPENAI_IMAGE_MODEL || openai.model || "gpt-image-1",
    quality: process.env.OPENAI_IMAGE_QUALITY || openai.quality || "high",
    background: process.env.OPENAI_IMAGE_BACKGROUND || openai.background || "opaque",
    strict: envFlag("OPENAI_IMAGE_STRICT", Boolean(openai.strict))
  };
}

async function renderCharacterReference(args) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const config = getConfig(args.providerConfig);
  await writeImage(args.outputPath, {
    apiKey,
    model: config.model,
    prompt: promptForCharacter(args),
    size: supportedSize(args.width || 1024, args.height || 1024),
    quality: config.quality,
    background: config.background
  }, args.width || 1024, args.height || 1024);
  return {
    passResults: (args.providerConfig.workflowTemplate?.pass_plan || ["generate"]).map((passName) => ({
      pass: passName,
      status: "completed"
    })),
    metrics: {
      model: config.model,
      quality: config.quality
    }
  };
}

async function renderSceneImage(args) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const config = getConfig(args.providerConfig);
  await writeImage(args.outputPath, {
    apiKey,
    model: config.model,
    prompt: promptForScene(args),
    size: supportedSize(args.width || 1024, args.height || 1536),
    quality: config.quality,
    background: config.background
  }, args.width || 1024, args.height || 1536);
  return {
    passResults: (args.providerConfig.workflowTemplate?.pass_plan || ["generate"]).map((passName) => ({
      pass: passName,
      status: "completed"
    })),
    metrics: {
      model: config.model,
      quality: config.quality
    }
  };
}

async function renderShotKeyframe(args) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const config = getConfig(args.providerConfig);
  await writeImage(args.outputPath, {
    apiKey,
    model: config.model,
    prompt: promptForShotKeyframe(args),
    size: supportedSize(args.width || 1536, args.height || 1024),
    quality: config.quality,
    background: config.background
  }, args.width || 1536, args.height || 1024);
  return {
    passResults: (args.providerConfig.workflowTemplate?.pass_plan || ["generate"]).map((passName) => ({
      pass: passName,
      status: "completed"
    })),
    metrics: {
      model: config.model,
      quality: config.quality
    }
  };
}

module.exports = {
  getConfig,
  isConfigured,
  renderCharacterReference,
  renderSceneImage,
  renderShotKeyframe
};
