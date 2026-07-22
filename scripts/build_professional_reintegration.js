#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeText } = require("../agents/common");
const { compileRenderContract } = require("../src/render/compileRenderContract");
const {
  buildProfessionalReintegrationMarkdown,
  buildProfessionalReintegrationReport
} = require("../src/bricktoon/professionalReintegration");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileIfPresent(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function nextReintegrationId(rootDir) {
  ensureDir(rootDir);
  const dirs = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^reintegration_\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const nextNumber = dirs.length + 1;
  return `reintegration_${String(nextNumber).padStart(3, "0")}`;
}

function upsertAsset(assets, asset) {
  const nextAssets = Array.isArray(assets) ? [...assets] : [];
  const index = nextAssets.findIndex((entry) => entry.asset_id === asset.asset_id);
  if (index >= 0) {
    nextAssets[index] = asset;
  } else {
    nextAssets.push(asset);
  }
  return nextAssets;
}

function getContractPaths(workspaceDir) {
  return {
    sceneCardsPath: path.join(workspaceDir, "05_scene_cards", "scene_cards.json"),
    sceneManifestPath: path.join(workspaceDir, "05_render_plan", "scene_manifest.json"),
    assetManifestPath: path.join(workspaceDir, "07_visuals", "asset_manifest.json"),
    shotPlanPath: path.join(workspaceDir, "07_shot_plans", "shot_plan.json"),
    compositingReportPath: path.join(workspaceDir, "08_animation", "compositing_reports", "compositing_report.json"),
    sceneSequenceReportPath: path.join(workspaceDir, "08_animation", "scene_sequences", "scene_sequence_report.json"),
    renderContractPath: path.join(workspaceDir, "09_edit_plan", "render_contract.json")
  };
}

function profileToContractDimensions(profileName) {
  if (profileName === "draft") {
    return { width: 1280, height: 720, fps: 30 };
  }
  if (profileName === "youtube_1080p") {
    return { width: 1920, height: 1080, fps: 30 };
  }
  return { width: 1280, height: 720, fps: 30 };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_professional_reintegration.js --workspace <workspace_path> [--profile draft] [--mode development]");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const heroSceneReportPath = path.join(workspaceDir, "11_external_handoff", "professional_hero_scene", "latest_professional_hero_scene_report.json");
    const heroSceneReport = readJson(heroSceneReportPath);
    if (!heroSceneReport.benchmark_scene?.scene_id) {
      throw new Error("Professional hero-scene report is missing. Run professional-hero-scene first.");
    }
    if (heroSceneReport.gate?.decision !== "hero_scene_build_locked") {
      throw new Error("Professional hero-scene build is not locked yet.");
    }

    const reintegrationRoot = path.join(workspaceDir, "11_external_handoff", "professional_reintegration");
    const reintegrationId = nextReintegrationId(reintegrationRoot);
    const reintegrationDir = path.join(reintegrationRoot, reintegrationId);
    ensureDir(reintegrationDir);

    const benchmarkSceneId = heroSceneReport.benchmark_scene.scene_id;
    const professionalImportsDir = path.join(workspaceDir, "08_animation", "professional_imports");
    const professionalImportShotsDir = path.join(professionalImportsDir, "shots");
    ensureDir(professionalImportShotsDir);

    const sourceSequencePath = path.join(workspaceDir, heroSceneReport.hero_sequence.final_sequence_file || "");
    const importedSequenceRelative = path.join("08_animation", "professional_imports", `${benchmarkSceneId}_professional_hero_sequence.mp4`).replace(/\\/g, "/");
    const importedSequencePath = path.join(workspaceDir, importedSequenceRelative);
    if (!copyFileIfPresent(sourceSequencePath, importedSequencePath)) {
      throw new Error(`Missing hero-scene sequence file: ${sourceSequencePath}`);
    }

    const importedShotAssets = [];
    for (const shot of heroSceneReport.shot_builds || []) {
      const sourceShotPath = path.join(workspaceDir, shot.proof_clip_file || "");
      const importedShotRelative = path.join("08_animation", "professional_imports", "shots", path.basename(shot.proof_clip_file || "")).replace(/\\/g, "/");
      const importedShotPath = path.join(workspaceDir, importedShotRelative);
      if (copyFileIfPresent(sourceShotPath, importedShotPath)) {
        importedShotAssets.push({
          asset_id: `PROHSHOT_${shot.shot_id}`,
          asset_type: "professional_hero_shot",
          scene_ids: [benchmarkSceneId],
          shot_ids: [shot.shot_id],
          file: importedShotRelative,
          status: "approved",
          generator: {
            provider: "professional_handoff",
            workflow: "professional_reintegration_v1"
          },
          quality_classification: "premium_motion",
          created_at: new Date().toISOString()
        });
      }
    }

    const assetManifestPath = path.join(workspaceDir, "07_visuals", "asset_manifest.json");
    const assetManifest = readJson(assetManifestPath);
    const importedSceneAsset = {
      asset_id: `PROHEROSEQ_${benchmarkSceneId}_MAIN`,
      asset_type: "professional_hero_scene_sequence",
      scene_ids: [benchmarkSceneId],
      shot_ids: (heroSceneReport.shot_builds || []).map((shot) => shot.shot_id),
      file: importedSequenceRelative,
      width: 768,
      height: 1344,
      fps: 30,
      status: "approved",
      generator: {
        provider: "professional_handoff",
        workflow: "professional_reintegration_v1"
      },
      selection_reason: "Returned professional hero-scene benchmark asset imported into the repo workflow.",
      quality_classification: "premium_motion",
      related_files: [
        "11_external_handoff/professional_hero_scene/latest_professional_hero_scene_report.json",
        "11_external_handoff/professional_toolchain_map/latest_toolchain_map_report.json"
      ],
      continuity_source_refs: [
        "11_external_handoff/professional_hero_scene/latest_professional_hero_scene_report.json",
        "08_animation/hybrid_editorial/hybrid_editorial_sequence_report.json"
      ],
      created_at: new Date().toISOString()
    };

    let nextAssets = upsertAsset(assetManifest.assets || [], importedSceneAsset);
    for (const shotAsset of importedShotAssets) {
      nextAssets = upsertAsset(nextAssets, shotAsset);
    }
    assetManifest.assets = nextAssets;
    writeText(assetManifestPath, `${JSON.stringify(assetManifest, null, 2)}\n`);

    const contractPaths = getContractPaths(workspaceDir);
    const sceneCards = readJson(contractPaths.sceneCardsPath).scene_cards || [];
    const sceneManifest = readJson(contractPaths.sceneManifestPath);
    const shotPlan = readJson(contractPaths.shotPlanPath);
    const compositingReport = readJson(contractPaths.compositingReportPath);
    const sceneSequenceReport = readJson(contractPaths.sceneSequenceReportPath);
    const profile = profileToContractDimensions(args.profile || "draft");
    const renderContract = compileRenderContract({
      workspaceId: topicId,
      renderMode: args.mode || "development",
      profile,
      sceneCards,
      sceneManifest,
      assetManifest,
      shotPlan,
      compositingReport,
      sceneSequenceReport
    });
    writeText(contractPaths.renderContractPath, `${JSON.stringify(renderContract, null, 2)}\n`);

    const benchmarkSceneRecord = (renderContract.scenes || []).find((scene) => scene.scene_id === benchmarkSceneId) || {};
    const reintegrationReport = buildProfessionalReintegrationReport({
      topicId,
      reintegrationId,
      heroSceneReport,
      renderContract,
      benchmarkSceneRecord,
      importedSceneAsset,
      professionalShotAssets: importedShotAssets
    });

    const manifest = {
      reintegration_id: reintegrationId,
      topic_id: topicId,
      created_at: reintegrationReport.created_at,
      benchmark_scene_id: benchmarkSceneId,
      imported_scene_asset_id: importedSceneAsset.asset_id,
      imported_shot_asset_ids: importedShotAssets.map((asset) => asset.asset_id),
      render_contract_path: "09_edit_plan/render_contract.json",
      decision: reintegrationReport.gate.decision
    };

    writeText(path.join(reintegrationDir, "professional_reintegration_report.json"), `${JSON.stringify(reintegrationReport, null, 2)}\n`);
    writeText(path.join(reintegrationDir, "professional_reintegration_report.md"), buildProfessionalReintegrationMarkdown(reintegrationReport));
    writeText(path.join(reintegrationDir, "professional_reintegration_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    writeText(path.join(reintegrationRoot, "latest_professional_reintegration_report.json"), `${JSON.stringify(reintegrationReport, null, 2)}\n`);
    writeText(path.join(reintegrationRoot, "latest_professional_reintegration_report.md"), buildProfessionalReintegrationMarkdown(reintegrationReport));
    writeText(path.join(reintegrationRoot, "latest_professional_reintegration_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    const qcJsonPath = path.join(workspaceDir, "10_qc", "professional_reintegration_report.json");
    const qcMdPath = path.join(workspaceDir, "10_qc", "professional_reintegration_report.md");
    writeText(qcJsonPath, `${JSON.stringify(reintegrationReport, null, 2)}\n`);
    writeText(qcMdPath, buildProfessionalReintegrationMarkdown(reintegrationReport));

    console.log(`Professional reintegration created for '${topicId}' as '${reintegrationId}'.`);
    console.log(`Decision: ${reintegrationReport.gate.decision}.`);
    if (reintegrationReport.gate.blockers.length > 0) {
      console.log(`Blockers: ${reintegrationReport.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
