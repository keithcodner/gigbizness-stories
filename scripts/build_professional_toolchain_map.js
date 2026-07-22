#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  buildProfessionalToolchainMapMarkdown,
  buildProfessionalToolchainMapReport
} = require("../src/bricktoon/professionalToolchainMap");

function readJsonSafe(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nextMapId(mapRoot) {
  ensureDir(mapRoot);
  const dirs = fs.readdirSync(mapRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^map_\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const nextNumber = dirs.length + 1;
  return `map_${String(nextNumber).padStart(3, "0")}`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_professional_toolchain_map.js --workspace <workspace_path> [--toolchain-profile <profile_id>]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const profilesConfig = readJsonSafe(path.join(rootDir, "config", "professional_toolchain_profiles.json"), {});
    const profileId = args["toolchain-profile"] || profilesConfig.default_profile;
    const toolchainProfile = profilesConfig.profiles?.[profileId];
    if (!toolchainProfile) {
      throw new Error(`Unknown professional toolchain profile: ${profileId}`);
    }

    const mapRoot = path.join(workspaceDir, "11_external_handoff", "professional_toolchain_map");
    const mapId = nextMapId(mapRoot);
    const mapDir = path.join(mapRoot, mapId);
    ensureDir(mapDir);

    const exportLockReport = readJsonSafe(
      path.join(workspaceDir, "11_external_handoff", "professional_export_lock", "latest_export_lock_report.json"),
      {}
    );
    const exportManifest = readJsonSafe(
      path.join(workspaceDir, "11_external_handoff", "professional_export_lock", "latest_export_manifest.json"),
      {}
    );
    if (!exportManifest.export_id) {
      throw new Error("Professional export lock manifest is missing. Run professional-export-lock first.");
    }

    const hybridContract = readJsonSafe(
      path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"),
      {}
    );
    const productionReadiness = readJsonSafe(
      path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.json"),
      {}
    );

    const report = buildProfessionalToolchainMapReport({
      topicId,
      mapId,
      toolchainProfileId: profileId,
      toolchainProfile,
      exportLockReport,
      exportManifest,
      hybridContract,
      productionReadiness
    });

    const manifest = {
      map_id: mapId,
      topic_id: topicId,
      created_at: report.created_at,
      source_export_id: exportManifest.export_id || null,
      toolchain_profile_id: profileId,
      report_files: {
        json: path.join(mapDir, "professional_toolchain_map_report.json"),
        markdown: path.join(mapDir, "professional_toolchain_map_report.md")
      }
    };

    fs.writeFileSync(
      path.join(mapDir, "toolchain_profile.json"),
      `${JSON.stringify(toolchainProfile, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(mapDir, "professional_toolchain_map_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(mapDir, "professional_toolchain_map_report.md"),
      buildProfessionalToolchainMapMarkdown(report),
      "utf8"
    );
    fs.writeFileSync(
      path.join(mapDir, "toolchain_map_manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    fs.writeFileSync(
      path.join(mapRoot, "latest_toolchain_map_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(mapRoot, "latest_toolchain_map_report.md"),
      buildProfessionalToolchainMapMarkdown(report),
      "utf8"
    );
    fs.writeFileSync(
      path.join(mapRoot, "latest_toolchain_map_manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    console.log(`Professional toolchain map created for '${topicId}' as '${mapId}' using profile '${profileId}'.`);
    console.log(`Decision: ${report.gate.decision}.`);
    if (report.gate.blockers.length > 0) {
      console.log(`Blockers: ${report.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
