const fs = require("fs");
const path = require("path");
const { loadEnv } = require("../../loadEnv");
const mockProvider = require("./mockImageProvider");
const openaiProvider = require("./openaiImageProvider");
const comfyuiProvider = require("./comfyuiImageProvider");

const ROOT = path.resolve(__dirname, "..", "..", "..");
loadEnv(ROOT);

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value == null) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function readConfig() {
  const configPath = path.join(ROOT, "config", "visual_generation.json");
  if (!fs.existsSync(configPath)) {
    return {
      default_image_provider: "mock",
      fallback_image_provider: "mock",
      openai: { strict: false }
    };
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function requestedProviderName(config) {
  return process.env.BRICKTOON_IMAGE_PROVIDER || config.default_image_provider || "mock";
}

function fallbackProviderName(config) {
  return config.fallback_image_provider || "mock";
}

function providerByName(name) {
  if (name === "openai") {
    return openaiProvider;
  }
  if (name === "comfyui") {
    return comfyuiProvider;
  }
  return mockProvider;
}

function strictMode(config, providerName) {
  if (providerName === "openai") {
    return envFlag("OPENAI_IMAGE_STRICT", Boolean(config.openai?.strict));
  }
  if (providerName === "comfyui") {
    return envFlag("COMFYUI_STRICT", Boolean(config.comfyui?.strict));
  }
  return false;
}

function getImageProvider() {
  const config = readConfig();
  const primaryName = requestedProviderName(config);
  const fallbackName = fallbackProviderName(config);
  const primary = providerByName(primaryName);
  const fallback = providerByName(fallbackName);

  return {
    config,
    primaryName,
    fallbackName,
    strict: strictMode(config, primaryName),
    primary,
    fallback
  };
}

async function withImageProvider(taskLabel, runner) {
  const resolved = getImageProvider();
  try {
    return await runner(resolved.primary, resolved.primaryName, resolved.config);
  } catch (error) {
    if (resolved.strict || resolved.primaryName === resolved.fallbackName) {
      throw new Error(`${taskLabel} failed with provider '${resolved.primaryName}': ${error.message}`);
    }
    process.stderr.write(`[provider-fallback] ${taskLabel}: '${resolved.primaryName}' failed, using '${resolved.fallbackName}'. ${error.message}\n`);
    return runner(resolved.fallback, resolved.fallbackName, resolved.config);
  }
}

module.exports = {
  getImageProvider,
  withImageProvider
};
