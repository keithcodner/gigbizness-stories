#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  readJson,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const scriptDir = path.join(workspaceDir, "02_script");
  const voiceDir = path.join(workspaceDir, "03_voice");
  const scriptsDir = path.join(path.resolve(__dirname, ".."), "scripts");

  return {
    topicPath: path.join(configDir, "topic.json"),
    scriptPath: path.join(scriptDir, "script_v2_human_review.md"),
    narratorNotesPath: path.join(scriptDir, "narrator_notes.md"),
    transcriptPath: path.join(voiceDir, "transcript.txt"),
    draftVoicePath: path.join(voiceDir, "voiceover.wav"),
    cleanVoicePath: path.join(voiceDir, "voiceover_clean.wav"),
    captionsPath: path.join(voiceDir, "captions.srt"),
    voicePrepPath: path.join(voiceDir, "voice_prep.md"),
    timingPath: path.join(voiceDir, "voice_timing.json"),
    normalizeScriptPath: path.join(scriptsDir, "normalize_audio.py"),
    subtitleScriptPath: path.join(scriptsDir, "generate_subtitles.py")
  };
}

function extractNarration(scriptMarkdown) {
  const lines = scriptMarkdown.split(/\r?\n/);
  const scenes = [];
  let currentScene = null;
  let collectNarration = false;
  let ignoreSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## S")) {
      if (currentScene) {
        scenes.push(currentScene);
      }
      currentScene = {
        heading: line.replace(/^##\s+/, ""),
        lines: []
      };
      collectNarration = false;
      ignoreSection = false;
      continue;
    }

    if (!currentScene) {
      continue;
    }

    if (line.startsWith("Visual note:")) {
      collectNarration = true;
      ignoreSection = false;
      continue;
    }

    if (line === "Source support:" || line.startsWith("## Human review focus") || line.startsWith("## Blocked claims snapshot")) {
      collectNarration = false;
      ignoreSection = true;
      continue;
    }

    if (line.startsWith("```")) {
      collectNarration = false;
      ignoreSection = true;
      continue;
    }

    if (!collectNarration || ignoreSection || !line) {
      continue;
    }

    if (line.startsWith("- ")) {
      continue;
    }

    currentScene.lines.push(line);
  }

  if (currentScene) {
    scenes.push(currentScene);
  }

  return scenes.filter((scene) => scene.lines.length > 0);
}

function sceneTranscript(scene) {
  return scene.lines.join(" ");
}

function estimateSecondsForText(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 145;
  const baseSeconds = (words / wordsPerMinute) * 60;
  return Math.max(6, Math.ceil(baseSeconds + 1.5));
}

function buildTranscript(scenes) {
  return `${scenes.map((scene) => sceneTranscript(scene)).join("\n\n")}\n`;
}

function buildVoicePrep(topic, scenes, narratorNotesText) {
  const totalSeconds = scenes.reduce((sum, scene) => sum + estimateSecondsForText(sceneTranscript(scene)), 0);
  const lines = [
    "# Voice Prep",
    "",
    `- Working title: ${topic.working_title}`,
    `- Topic: ${topic.id}`,
    `- Scene count: ${scenes.length}`,
    `- Estimated narration length: ${totalSeconds} seconds`,
    "- Current audio should use draft synthesized narration when no recorded voiceover is available.",
    "- Replace `voiceover.wav` with recorded or higher-quality generated narration later, then rerun normalization and subtitles if timing changes.",
    "",
    "## Scene timing estimate",
    ""
  ];

  let cursor = 0;
  for (const scene of scenes) {
    const seconds = estimateSecondsForText(sceneTranscript(scene));
    lines.push(`- ${scene.heading}: ${cursor}s to ${cursor + seconds}s`);
    cursor += seconds;
  }

  lines.push("");
  lines.push("## Narrator notes snapshot");
  lines.push("");
  lines.push(narratorNotesText.trim());
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildTimingData(scenes) {
  const timing = [];
  let cursor = 0;
  for (const scene of scenes) {
    const transcript = sceneTranscript(scene);
    const seconds = estimateSecondsForText(transcript);
    timing.push({
      scene: scene.heading,
      start_seconds: cursor,
      end_seconds: cursor + seconds,
      estimated_seconds: seconds,
      text: transcript
    });
    cursor += seconds;
  }

  return {
    total_seconds: cursor,
    scenes: timing
  };
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/voice_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const scriptMarkdown = fs.readFileSync(paths.scriptPath, "utf8");
    const narratorNotesText = fs.existsSync(paths.narratorNotesPath)
      ? fs.readFileSync(paths.narratorNotesPath, "utf8")
      : "# Narrator Notes\n\n";

    const scenes = extractNarration(scriptMarkdown);
    if (scenes.length === 0) {
      throw new Error("No narration scenes were found in script_v2_human_review.md");
    }

    const transcript = buildTranscript(scenes);
    const timingData = buildTimingData(scenes);

    writeText(paths.transcriptPath, transcript);
    writeText(paths.voicePrepPath, buildVoicePrep(topic, scenes, narratorNotesText));
    writeText(paths.timingPath, `${JSON.stringify(timingData, null, 2)}\n`);

    runCommand("python", [
      paths.normalizeScriptPath,
      "--transcript",
      paths.transcriptPath,
      "--output",
      paths.draftVoicePath,
      "--normalized-output",
      paths.cleanVoicePath,
      "--timing",
      paths.timingPath
    ], "normalize_audio.py");

    runCommand("python", [
      paths.subtitleScriptPath,
      "--transcript",
      paths.transcriptPath,
      "--timing",
      paths.timingPath,
      "--output",
      paths.captionsPath
    ], "generate_subtitles.py");

    console.log(`Voice package generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
