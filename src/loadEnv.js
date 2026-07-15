const fs = require("fs");
const path = require("path");

let loaded = false;

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key || process.env[key] != null) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadEnv(rootDir = path.resolve(__dirname, "..")) {
  if (loaded) {
    return;
  }

  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) {
    loaded = true;
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      process.env[parsed.key] = parsed.value;
    }
  }

  loaded = true;
}

module.exports = {
  loadEnv
};
