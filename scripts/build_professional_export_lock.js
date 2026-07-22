#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  buildProfessionalExportLockMarkdown,
  buildProfessionalExportLockReport
} = require("../src/bricktoon/professionalExportLock");

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

function copyFileIfPresent(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function copyDirectoryRecursive(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  const copiedFiles = [];
  ensureDir(targetDir);
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copiedFiles.push(...copyDirectoryRecursive(sourcePath, targetPath));
    } else {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
      copiedFiles.push(targetPath);
    }
  }
  return copiedFiles;
}

function listRelativeFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        files.push(path.relative(rootDir, fullPath).replace(/\\/g, "/"));
      }
    }
  }
  files.sort();
  return files;
}

function nextExportId(exportRoot) {
  ensureDir(exportRoot);
  const dirs = fs.readdirSync(exportRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^export_\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const nextNumber = dirs.length + 1;
  return `export_${String(nextNumber).padStart(3, "0")}`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_professional_export_lock.js --workspace <workspace_path>");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const exportRoot = path.join(workspaceDir, "11_external_handoff", "professional_export_lock");
    const exportId = nextExportId(exportRoot);
    const exportDir = path.join(exportRoot, exportId);
    ensureDir(exportDir);

    const sourcePaths = {
      castJson: path.join(workspaceDir, "03_cast", "cast.json"),
      visualCharacterBible: path.join(workspaceDir, "03_cast", "visual_character_bible.json"),
      sceneCastMap: path.join(workspaceDir, "03_cast", "scene_cast_map.json"),
      propAssignments: path.join(workspaceDir, "03_cast", "prop_assignments.json"),
      shotPlan: path.join(workspaceDir, "07_shot_plans", "shot_plan.json"),
      script: path.join(workspaceDir, "02_script", "script_v2_human_review.md"),
      transcript: path.join(workspaceDir, "03_voice", "transcript.txt"),
      captions: path.join(workspaceDir, "03_voice", "captions.srt"),
      voiceTiming: path.join(workspaceDir, "03_voice", "voice_timing.json"),
      voiceoverClean: path.join(workspaceDir, "03_voice", "voiceover_clean.wav"),
      voiceoverRaw: path.join(workspaceDir, "03_voice", "voiceover.wav"),
      referenceManifest: path.join(workspaceDir, "04_assets", "reference_manifest.json"),
      benchmarkPackJson: path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.json"),
      benchmarkPackMd: path.join(workspaceDir, "07_visuals", "benchmark_pack", "hybrid_still_benchmark_pack.md"),
      productionReadinessJson: path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.json"),
      productionReadinessMd: path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.md"),
      hybridContractJson: path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"),
      hybridContractMd: path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.md"),
      libraryCatalogIndex: path.join(rootDir, "library", "library_catalog_index.json"),
      libraryReferenceCatalog: path.join(rootDir, "library", "reference_images", "reference_catalog.json"),
      libraryCategoryCatalog: path.join(rootDir, "library", "general_assets", "catalog_templates.json"),
      compositionGuidesDir: path.join(workspaceDir, "07_visuals", "composition_guides"),
      artDirectionDir: path.join(workspaceDir, "07_visuals", "art_direction"),
      characterRefsDir: path.join(workspaceDir, "07_visuals", "character_refs"),
      hybridContractDir: path.join(workspaceDir, "08_animation", "hybrid_contract")
    };

    const copiedArtifacts = [];
    const fileCopies = [
      [sourcePaths.castJson, path.join(exportDir, "cast", "cast.json")],
      [sourcePaths.visualCharacterBible, path.join(exportDir, "cast", "visual_character_bible.json")],
      [sourcePaths.sceneCastMap, path.join(exportDir, "cast", "scene_cast_map.json")],
      [sourcePaths.propAssignments, path.join(exportDir, "cast", "prop_assignments.json")],
      [sourcePaths.shotPlan, path.join(exportDir, "shots", "shot_plan.json")],
      [sourcePaths.script, path.join(exportDir, "script", "script_v2_human_review.md")],
      [sourcePaths.transcript, path.join(exportDir, "audio", "transcript.txt")],
      [sourcePaths.captions, path.join(exportDir, "audio", "captions.srt")],
      [sourcePaths.voiceTiming, path.join(exportDir, "audio", "voice_timing.json")],
      [sourcePaths.voiceoverClean, path.join(exportDir, "audio", "voiceover_clean.wav")],
      [sourcePaths.voiceoverRaw, path.join(exportDir, "audio", "voiceover.wav")],
      [sourcePaths.referenceManifest, path.join(exportDir, "references", "reference_manifest.json")],
      [sourcePaths.benchmarkPackJson, path.join(exportDir, "benchmark", "hybrid_still_benchmark_pack.json")],
      [sourcePaths.benchmarkPackMd, path.join(exportDir, "benchmark", "hybrid_still_benchmark_pack.md")],
      [sourcePaths.productionReadinessJson, path.join(exportDir, "benchmark", "hybrid_production_readiness_report.json")],
      [sourcePaths.productionReadinessMd, path.join(exportDir, "benchmark", "hybrid_production_readiness_report.md")],
      [sourcePaths.hybridContractJson, path.join(exportDir, "hybrid_contract", "hybrid_animation_contract.json")],
      [sourcePaths.hybridContractMd, path.join(exportDir, "hybrid_contract", "hybrid_animation_contract.md")],
      [sourcePaths.libraryCatalogIndex, path.join(exportDir, "library", "library_catalog_index.json")],
      [sourcePaths.libraryReferenceCatalog, path.join(exportDir, "library", "reference_catalog.json")],
      [sourcePaths.libraryCategoryCatalog, path.join(exportDir, "library", "catalog_templates.json")]
    ];

    for (const [source, target] of fileCopies) {
      if (copyFileIfPresent(source, target)) {
        copiedArtifacts.push(path.relative(exportDir, target).replace(/\\/g, "/"));
      }
    }

    const referenceManifest = readJsonSafe(sourcePaths.referenceManifest, {});
    const selectedReferenceTargets = [];
    for (const referenceFile of (referenceManifest.selected_references || [])) {
      const sourceFile = path.resolve(rootDir, referenceFile);
      const targetFile = path.join(exportDir, "references", "selected", path.basename(referenceFile));
      if (copyFileIfPresent(sourceFile, targetFile)) {
        const rel = path.relative(exportDir, targetFile).replace(/\\/g, "/");
        copiedArtifacts.push(rel);
        selectedReferenceTargets.push(rel);
      }
    }

    copiedArtifacts.push(
      ...copyDirectoryRecursive(sourcePaths.compositionGuidesDir, path.join(exportDir, "composition_guides"))
        .map((file) => path.relative(exportDir, file).replace(/\\/g, "/"))
    );
    copiedArtifacts.push(
      ...copyDirectoryRecursive(sourcePaths.artDirectionDir, path.join(exportDir, "art_direction"))
        .map((file) => path.relative(exportDir, file).replace(/\\/g, "/"))
    );
    copiedArtifacts.push(
      ...copyDirectoryRecursive(sourcePaths.characterRefsDir, path.join(exportDir, "character_refs"))
        .map((file) => path.relative(exportDir, file).replace(/\\/g, "/"))
    );
    copiedArtifacts.push(
      ...copyDirectoryRecursive(sourcePaths.hybridContractDir, path.join(exportDir, "hybrid_contract", "package"))
        .map((file) => path.relative(exportDir, file).replace(/\\/g, "/"))
    );

    const report = buildProfessionalExportLockReport({
      topicId,
      exportId,
      castPackage: readJsonSafe(sourcePaths.castJson, {}),
      shotPlan: readJsonSafe(sourcePaths.shotPlan, {}),
      compositionGuideFiles: listRelativeFiles(sourcePaths.compositionGuidesDir),
      artDirectionFiles: listRelativeFiles(sourcePaths.artDirectionDir),
      referenceManifest,
      voicePackage: {
        transcript: fs.existsSync(sourcePaths.transcript),
        captions: fs.existsSync(sourcePaths.captions),
        voice_timing: fs.existsSync(sourcePaths.voiceTiming),
        voiceover_clean: fs.existsSync(sourcePaths.voiceoverClean)
      },
      benchmarkPack: readJsonSafe(sourcePaths.benchmarkPackJson, {}),
      libraryIndex: readJsonSafe(sourcePaths.libraryCatalogIndex, {}),
      productionReadiness: readJsonSafe(sourcePaths.productionReadinessJson, {}),
      hybridContract: readJsonSafe(sourcePaths.hybridContractJson, {})
    });

    const exportManifest = {
      export_id: exportId,
      topic_id: topicId,
      created_at: report.created_at,
      export_dir: exportDir,
      selected_reference_exports: selectedReferenceTargets,
      artifact_count: copiedArtifacts.length,
      artifacts: copiedArtifacts.sort()
    };

    fs.writeFileSync(
      path.join(exportDir, "export_manifest.json"),
      `${JSON.stringify(exportManifest, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(exportDir, "export_lock_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(exportDir, "export_lock_report.md"),
      buildProfessionalExportLockMarkdown(report),
      "utf8"
    );

    fs.writeFileSync(
      path.join(exportRoot, "latest_export_lock_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(exportRoot, "latest_export_lock_report.md"),
      buildProfessionalExportLockMarkdown(report),
      "utf8"
    );
    fs.writeFileSync(
      path.join(exportRoot, "latest_export_manifest.json"),
      `${JSON.stringify(exportManifest, null, 2)}\n`,
      "utf8"
    );

    console.log(`Professional export lock created for '${topicId}' as '${exportId}' with decision '${report.gate.decision}'.`);
    console.log(`Artifacts exported: ${exportManifest.artifact_count}.`);
    if (report.gate.blockers.length > 0) {
      console.log(`Blockers: ${report.gate.blockers.join("; ")}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
