#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  parseArgs,
  readJson,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const renderPlanDir = path.join(workspaceDir, "05_render_plan");
  const publishDir = path.join(workspaceDir, "09_publish");

  return {
    topicPath: path.join(configDir, "topic.json"),
    sceneManifestPath: path.join(renderPlanDir, "scene_manifest.json"),
    titlesPath: path.join(publishDir, "title_options.txt"),
    descriptionPath: path.join(publishDir, "description.txt"),
    tagsPath: path.join(publishDir, "tags.txt"),
    chaptersPath: path.join(publishDir, "chapters.txt"),
    pinnedCommentPath: path.join(publishDir, "pinned_comment.txt")
  };
}

function buildTitles(topic) {
  return [
    topic.working_title,
    "How Tow Truck Fees Turn Into Big Bills",
    "Why Towing Can Feel Like A Trap",
    "The Fee Stack Behind Towing"
  ].join("\n") + "\n";
}

function buildDescription(topic, sceneManifest) {
  const sceneTitles = sceneManifest.scenes.map((scene) => `- ${scene.title}`).join("\n");
  return [
    `${topic.working_title}`,
    "",
    `${topic.value_promise}`,
    "",
    "In this video:",
    sceneTitles,
    "",
    "This draft is structured as a business documentary and uses conservative legal wording where sourcing is still being strengthened.",
    "Always check local rules, paperwork, and official sources when dealing with towing or impound disputes."
  ].join("\n") + "\n";
}

function buildTags(topic) {
  return [
    "tow truck business",
    "towing fees",
    "impound lot",
    "business documentary",
    "consumer protection",
    topic.id.replaceAll("_", " ")
  ].join("\n") + "\n";
}

function formatChapter(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function buildChapters(sceneManifest) {
  return sceneManifest.scenes.map((scene) => `${formatChapter(scene.start)} ${scene.title}`).join("\n") + "\n";
}

function buildPinnedComment(topic) {
  return [
    "What part of the towing business do you want broken down next?",
    "",
    `This video on "${topic.working_title}" is built to explain the business model first, then the pressure points.`
  ].join("\n") + "\n";
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/metadata_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const sceneManifest = readJson(paths.sceneManifestPath);

    writeText(paths.titlesPath, buildTitles(topic));
    writeText(paths.descriptionPath, buildDescription(topic, sceneManifest));
    writeText(paths.tagsPath, buildTags(topic));
    writeText(paths.chaptersPath, buildChapters(sceneManifest));
    writeText(paths.pinnedCommentPath, buildPinnedComment(topic));

    console.log(`Metadata package generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
