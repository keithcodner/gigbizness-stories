#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  buildProfessionalHeroSceneMarkdown,
  buildProfessionalHeroSceneReport
} = require("../src/bricktoon/professionalHeroScene");

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

function nextBuildId(buildRoot) {
  ensureDir(buildRoot);
  const dirs = fs.readdirSync(buildRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^build_\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const nextNumber = dirs.length + 1;
  return `build_${String(nextNumber).padStart(3, "0")}`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_professional_hero_scene.js --workspace <workspace_path>");
    }

    const rootDir = path.resolve(__dirname, "..");
    const workspaceDir = path.resolve(args.workspace);
    const topicId = path.basename(workspaceDir);
    const buildRoot = path.join(workspaceDir, "11_external_handoff", "professional_hero_scene");
    const buildId = nextBuildId(buildRoot);
    const buildDir = path.join(buildRoot, buildId);
    ensureDir(buildDir);

    const exportLockReport = readJsonSafe(
      path.join(workspaceDir, "11_external_handoff", "professional_export_lock", "latest_export_lock_report.json"),
      {}
    );
    const toolchainMapReport = readJsonSafe(
      path.join(workspaceDir, "11_external_handoff", "professional_toolchain_map", "latest_toolchain_map_report.json"),
      {}
    );
    const hybridEditorialReport = readJsonSafe(
      path.join(workspaceDir, "08_animation", "hybrid_editorial", "hybrid_editorial_sequence_report.json"),
      {}
    );
    const hybridContract = readJsonSafe(
      path.join(workspaceDir, "08_animation", "hybrid_contract", "hybrid_animation_contract.json"),
      {}
    );
    const productionReadiness = readJsonSafe(
      path.join(workspaceDir, "10_qc", "hybrid_production_readiness_report.json"),
      {}
    );
    const musicManifestPath = path.join(workspaceDir, "04_assets", "music", "music_manifest.csv");

    const report = buildProfessionalHeroSceneReport({
      topicId,
      buildId,
      exportLockReport,
      toolchainMapReport,
      hybridEditorialReport,
      hybridContract,
      productionReadiness,
      voicePackage: {
        voiceover_clean: fs.existsSync(path.join(workspaceDir, "03_voice", "voiceover_clean.wav")),
        captions: fs.existsSync(path.join(workspaceDir, "03_voice", "captions.srt")),
        voice_timing: fs.existsSync(path.join(workspaceDir, "03_voice", "voice_timing.json"))
      },
      musicPackage: {
        music_manifest: fs.existsSync(musicManifestPath)
      }
    });

    const benchmarkSceneId = report.benchmark_scene?.scene_id;
    if (!benchmarkSceneId) {
      throw new Error("Benchmark scene is missing. Build the benchmark editorial package first.");
    }

    copyFileIfPresent(
      path.join(workspaceDir, "08_animation", "hybrid_editorial", "hybrid_editorial_sequence_report.json"),
      path.join(buildDir, "hero_scene_proof", "hybrid_editorial_sequence_report.json")
    );
    copyFileIfPresent(
      path.join(workspaceDir, "08_animation", "hybrid_editorial", "hybrid_editorial_sequence_report.md"),
      path.join(buildDir, "hero_scene_proof", "hybrid_editorial_sequence_report.md")
    );
    copyFileIfPresent(
      path.join(workspaceDir, "08_animation", "hybrid_editorial", `${benchmarkSceneId}_hybrid_editorial_sequence.mp4`),
      path.join(buildDir, "hero_scene_proof", `${benchmarkSceneId}_hybrid_editorial_sequence.mp4`)
    );
    copyFileIfPresent(
      path.join(workspaceDir, "03_voice", "voiceover_clean.wav"),
      path.join(buildDir, "audio", "voiceover_clean.wav")
    );
    copyFileIfPresent(
      path.join(workspaceDir, "03_voice", "captions.srt"),
      path.join(buildDir, "audio", "captions.srt")
    );
    copyFileIfPresent(
      path.join(workspaceDir, "03_voice", "voice_timing.json"),
      path.join(buildDir, "audio", "voice_timing.json")
    );
    copyFileIfPresent(
      musicManifestPath,
      path.join(buildDir, "audio", "music_manifest.csv")
    );

    for (const shot of report.shot_builds || []) {
      copyFileIfPresent(
        path.join(rootDir, shot.proof_clip_file || ""),
        path.join(buildDir, "shot_proofs", path.basename(shot.proof_clip_file || ""))
      );
      copyFileIfPresent(
        path.join(rootDir, shot.poster_file || ""),
        path.join(buildDir, "shot_posters", path.basename(shot.poster_file || ""))
      );
      copyFileIfPresent(
        path.join(workspaceDir, "08_animation", "hybrid_contract", "shots", `${shot.shot_id}.json`),
        path.join(buildDir, "shot_contracts", `${shot.shot_id}.json`)
      );
      copyFileIfPresent(
        path.join(workspaceDir, "07_visuals", "composition_guides", `${shot.shot_id}.json`),
        path.join(buildDir, "composition_guides", `${shot.shot_id}.json`)
      );
      copyFileIfPresent(
        path.join(workspaceDir, "07_visuals", "art_direction", `${shot.shot_id}.json`),
        path.join(buildDir, "art_direction", `${shot.shot_id}.json`)
      );
      copyFileIfPresent(
        path.join(workspaceDir, "07_visuals", "art_direction", `${shot.shot_id}.md`),
        path.join(buildDir, "art_direction", `${shot.shot_id}.md`)
      );
    }

    const manifest = {
      build_id: buildId,
      topic_id: topicId,
      created_at: report.created_at,
      benchmark_scene_id: benchmarkSceneId,
      final_sequence_file: report.hero_sequence?.final_sequence_file || null,
      shot_ids: (report.shot_builds || []).map((shot) => shot.shot_id),
      decision: report.gate?.decision || null
    };

    fs.writeFileSync(
      path.join(buildDir, "professional_hero_scene_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(buildDir, "professional_hero_scene_report.md"),
      buildProfessionalHeroSceneMarkdown(report),
      "utf8"
    );
    fs.writeFileSync(
      path.join(buildDir, "hero_scene_manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    fs.writeFileSync(
      path.join(buildRoot, "latest_professional_hero_scene_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(buildRoot, "latest_professional_hero_scene_report.md"),
      buildProfessionalHeroSceneMarkdown(report),
      "utf8"
    );
    fs.writeFileSync(
      path.join(buildRoot, "latest_professional_hero_scene_manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    console.log(`Professional hero scene build created for '${topicId}' as '${buildId}'.`);
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
