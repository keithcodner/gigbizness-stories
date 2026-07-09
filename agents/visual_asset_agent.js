#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  parseCsv,
  readJson,
  toCsv,
  writeText
} = require("./common");

function getPaths(workspaceDir) {
  const configDir = path.join(workspaceDir, "00_config");
  const scriptDir = path.join(workspaceDir, "02_script");
  const voiceDir = path.join(workspaceDir, "03_voice");
  const assetsDir = path.join(workspaceDir, "04_assets");
  const scriptsDir = path.join(path.resolve(__dirname, ".."), "scripts");

  return {
    topicPath: path.join(configDir, "topic.json"),
    shotlistPath: path.join(scriptDir, "shotlist.csv"),
    outlinePath: path.join(scriptDir, "outline.md"),
    scriptPath: path.join(scriptDir, "script_v2_human_review.md"),
    timingPath: path.join(voiceDir, "voice_timing.json"),
    visualManifestPath: path.join(assetsDir, "visual_manifest.csv"),
    licensesPath: path.join(assetsDir, "licenses.csv"),
    assetGapsPath: path.join(assetsDir, "asset_gaps.md"),
    visualPlanPath: path.join(assetsDir, "visual_plan.md"),
    visualReadinessPath: path.join(assetsDir, "visual_readiness.json"),
    summaryPath: path.join(assetsDir, "visual_manifest_summary.md"),
    chartSpecPath: path.join(assetsDir, "charts", "chart_specs.json"),
    factCardSpecPath: path.join(assetsDir, "charts", "fact_card_specs.json"),
    chartScriptPath: path.join(scriptsDir, "generate_charts.py"),
    factCardScriptPath: path.join(scriptsDir, "create_fact_cards.py"),
    chartsDir: path.join(assetsDir, "charts"),
    documentsDir: path.join(assetsDir, "documents")
  };
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function inferAssetRows(topic, shotRows, timingData) {
  const rows = [];
  const visualKeywords = topic.asset_keywords || [];

  for (const shot of shotRows) {
    const sceneId = shot.scene_id;
    const sceneTiming = timingData.scenes?.find((scene) => scene.scene.startsWith(sceneId)) || null;
    const description = shot.description || "";
    const baseKeyword = visualKeywords[0] || "business documentary";
    const durationNote = sceneTiming
      ? `${sceneTiming.start_seconds}s-${sceneTiming.end_seconds}s`
      : "timing pending";

    rows.push({
      scene_id: sceneId,
      asset_type: mapVisualType(shot.visual_type),
      search_query: buildSearchQuery(topic, shot, baseKeyword),
      filename: inferFilename(sceneId, shot.visual_type, "01", shot.visual_type === "generated_graphic" ? "svg" : "mp4"),
      source_url: "",
      license: "manual-source-needed",
      usage: `${shot.section} primary visual (${durationNote})`,
      priority: isHighPriorityScene(sceneId) ? "high" : "medium",
      status: needsGeneratedStatus(shot.visual_type)
    });

      rows.push({
        scene_id: sceneId,
        asset_type: "generated_graphic",
        search_query: `${topic.id} ${shot.section} explainer card`,
        filename: inferFilename(sceneId, "fact_card", "01", "png"),
        source_url: "local-generated",
        license: "project-original",
        usage: `${shot.section} explainer card`,
        priority: "high",
        status: "generated"
    });

    if (description.toLowerCase().includes("map")) {
      rows.push({
        scene_id: sceneId,
        asset_type: "map",
        search_query: `${topic.id} city map graphic`,
        filename: inferFilename(sceneId, "map", "01", "png"),
        source_url: "",
        license: "manual-source-needed",
        usage: `${shot.section} location context`,
        priority: "medium",
        status: "planned"
      });
    }

    if (sceneId === "S05") {
      rows.push({
        scene_id: sceneId,
        asset_type: "document",
        search_query: `${topic.id} regulator complaint court filing`,
        filename: inferFilename(sceneId, "public_doc", "01", "png"),
        source_url: "",
        license: "source-required",
        usage: "public case evidence card",
        priority: "high",
        status: "missing_source"
      });
    }
  }

  rows.push({
    scene_id: "ALL",
    asset_type: "chart",
    search_query: `${topic.id} scene timing overview`,
    filename: "narration_timing_overview.png",
    source_url: "local-generated",
    license: "project-original",
    usage: "editing reference",
    priority: "medium",
    status: "generated"
  });

  return rows;
}

function mapVisualType(visualType) {
  if (visualType === "b_roll") {
    return "stock_video";
  }
  if (visualType === "source_card") {
    return "document";
  }
  if (visualType === "generated_graphic") {
    return "generated_graphic";
  }
  return "b_roll";
}

function buildSearchQuery(topic, shot, fallbackKeyword) {
  const base = `${topic.id.replaceAll("_", " ")} ${shot.section}`.toLowerCase();
  if (shot.visual_type === "b_roll") {
    return `${fallbackKeyword} ${base} documentary b-roll`;
  }
  if (shot.visual_type === "source_card") {
    return `${base} official document headline card`;
  }
  return `${base} explainer graphic`;
}

function inferFilename(sceneId, label, sequence, extension) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${sceneId.toLowerCase()}_${normalized}_${sequence}.${extension}`;
}

function isHighPriorityScene(sceneId) {
  return ["S01", "S03", "S05", "S06"].includes(sceneId);
}

function needsGeneratedStatus(visualType) {
  if (visualType === "source_card") {
    return "planned";
  }
  if (visualType === "generated_graphic") {
    return "planned";
  }
  return "manual_needed";
}

function buildLicenseRows(manifestRows) {
  return manifestRows.map((row) => ({
    asset_name: row.filename,
    asset_type: row.asset_type,
    source_url: row.source_url,
    license: row.license,
    status: row.status,
    notes: row.source_url ? "Generated locally or source recorded." : "Add source URL or license details before final edit."
  }));
}

function buildAssetGaps(topic, manifestRows) {
  const missing = manifestRows.filter((row) => ["manual_needed", "missing_source", "planned"].includes(row.status));
  const lines = [
    "# Asset Gaps",
    "",
    `Topic: ${topic.working_title}`,
    "",
    "## High-priority follow-up",
    ""
  ];

  const highPriority = missing.filter((row) => row.priority === "high");
  if (highPriority.length === 0) {
    lines.push("- None.");
  } else {
    for (const row of highPriority) {
      lines.push(`- ${row.scene_id}: ${row.asset_type} -> ${row.search_query} (${row.status})`);
    }
  }

  lines.push("");
  lines.push("## Manual review notes");
  lines.push("");
  lines.push("- Replace any placeholder public-document slots with actual sourced screenshots or filings.");
  lines.push("- Keep business crime visuals serious and readable, not sensational.");
  lines.push("- Confirm every non-generated asset has a real source URL before final edit.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildSummary(topic, manifestRows, timingData) {
  const generated = manifestRows.filter((row) => row.status === "generated").length;
  const manual = manifestRows.filter((row) => row.status !== "generated").length;
  const lines = [
    "# Visual Manifest Summary",
    "",
    `- Topic: ${topic.working_title}`,
    `- Scene count: ${timingData.scenes?.length || 0}`,
    `- Manifest rows: ${manifestRows.length}`,
    `- Generated assets: ${generated}`,
    `- Manual/source-needed assets: ${manual}`,
    "",
    "## Package intent",
    "",
    "- This is a manual-first asset plan with generated helper graphics for editing and review.",
    "- B-roll and public-document slots still need real sourcing before a publishable cut.",
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function resolveAssetPath(assetsDir, row) {
  if (/\.(svg|png|jpg|jpeg|webp|bmp)$/i.test(row.filename || "")) {
    return path.join(assetsDir, "charts", row.filename);
  }
  if ((row.asset_type || "").toLowerCase() === "document") {
    return path.join(assetsDir, "documents", row.filename);
  }
  if ((row.asset_type || "").toLowerCase() === "stock_video") {
    return path.join(assetsDir, "stock_videos", row.filename);
  }
  return path.join(assetsDir, row.filename || "");
}

function collectVisualReadiness(manifestRows, assetsDir) {
  const rowsWithFiles = manifestRows.map((row) => ({
    ...row,
    asset_path: resolveAssetPath(assetsDir, row),
    exists: fs.existsSync(resolveAssetPath(assetsDir, row))
  }));

  const generatedExisting = rowsWithFiles.filter((row) => row.status === "generated" && row.exists);
  const realExisting = rowsWithFiles.filter((row) => row.status !== "generated" && row.exists);
  const existingStock = realExisting.filter((row) => row.asset_type === "stock_video");
  const existingDocuments = realExisting.filter((row) => row.asset_type === "document");
  const unresolvedHighPriority = rowsWithFiles.filter((row) =>
    row.priority === "high" && row.status !== "generated" && !row.exists
  );

  return {
    generated_existing_count: generatedExisting.length,
    real_existing_count: realExisting.length,
    stock_video_count: existingStock.length,
    document_count: existingDocuments.length,
    unresolved_high_priority_count: unresolvedHighPriority.length,
    unresolved_high_priority: unresolvedHighPriority.map((row) => ({
      scene_id: row.scene_id,
      asset_type: row.asset_type,
      filename: row.filename,
      status: row.status
    }))
  };
}

function buildVisualPlan(topic, manifestRows, readiness) {
  const lines = [
    "# Visual Plan",
    "",
    `Topic: ${topic.working_title}`,
    "",
    "## Ready now",
    "",
    `- Generated helper graphics available: ${readiness.generated_existing_count}`,
    `- Real non-generated local assets available: ${readiness.real_existing_count}`,
    `- Stock video clips available: ${readiness.stock_video_count}`,
    `- Document/source visuals available: ${readiness.document_count}`,
    "",
    "## Missing for a strong final cut",
    ""
  ];

  const missingRows = manifestRows.filter((row) => row.status !== "generated");
  if (missingRows.length === 0) {
    lines.push("- None.");
  } else {
    for (const row of missingRows) {
      lines.push(`- ${row.scene_id}: ${row.asset_type} -> ${row.filename} (${row.status})`);
    }
  }

  lines.push("");
  lines.push("## Workflow rule");
  lines.push("");
  lines.push("- Draft renders may use generated fallback graphics.");
  lines.push("- Final renders should include real stock footage, sourced screenshots, or real document visuals for the key scenes.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function reconcileManifestRows(manifestRows, assetsDir) {
  return manifestRows.map((row) => {
    const expectedPath = path.join(assetsDir, "charts", row.filename);
    const existsInCharts = fs.existsSync(expectedPath);

    if (row.source_url === "local-generated" && existsInCharts) {
      return {
        ...row,
        license: "project-original",
        status: "generated"
      };
    }

    if (row.asset_type === "generated_graphic" && row.source_url !== "local-generated") {
      return {
        ...row,
        status: "planned"
      };
    }

    return row;
  });
}

function buildChartSpec(topic, timingData) {
  return {
    title: `${topic.working_title} Scene Timing Overview`,
    subtitle: "Estimated narration timing by scene",
    output_filename: "narration_timing_overview.png",
    scenes: (timingData.scenes || []).map((scene) => ({
      label: scene.scene,
      seconds: scene.estimated_seconds
    }))
  };
}

function buildFactCardSpec(topic, shotRows, timingData) {
  return {
    topic_id: topic.id,
    cards: shotRows.map((shot) => {
      const timing = timingData.scenes?.find((scene) => scene.scene.startsWith(shot.scene_id));
      return {
        scene_id: shot.scene_id,
        title: shot.section,
        subtitle: timing
          ? `${timing.start_seconds}s-${timing.end_seconds}s`
          : "timing pending",
        body: shot.description,
        output_filename: inferFilename(shot.scene_id, "fact_card", "01", "png")
      };
    })
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.topic || !args.workspace) {
      throw new Error("Usage: node agents/visual_asset_agent.js --topic <topic_id> --workspace <workspace_path>");
    }

    const paths = getPaths(args.workspace);
    const topic = readJson(paths.topicPath);
    const shotRows = parseCsv(fs.readFileSync(paths.shotlistPath, "utf8")).rows;
    const timingData = readJsonIfExists(paths.timingPath, { total_seconds: 0, scenes: [] });

    let manifestRows = inferAssetRows(topic, shotRows, timingData);
    writeText(paths.visualManifestPath, toCsv(manifestRows, [
      "scene_id",
      "asset_type",
      "search_query",
      "filename",
      "source_url",
      "license",
      "usage",
      "priority",
      "status"
    ]));
    writeText(paths.licensesPath, toCsv(buildLicenseRows(manifestRows), [
      "asset_name",
      "asset_type",
      "source_url",
      "license",
      "status",
      "notes"
    ]));
    writeText(paths.assetGapsPath, buildAssetGaps(topic, manifestRows));
    writeText(paths.summaryPath, buildSummary(topic, manifestRows, timingData));
    let readiness = collectVisualReadiness(manifestRows, path.join(args.workspace, "04_assets"));
    writeText(paths.visualPlanPath, buildVisualPlan(topic, manifestRows, readiness));
    writeText(paths.visualReadinessPath, `${JSON.stringify(readiness, null, 2)}\n`);

    const chartSpec = buildChartSpec(topic, timingData);
    const factCardSpec = buildFactCardSpec(topic, shotRows, timingData);
    writeText(paths.chartSpecPath, `${JSON.stringify(chartSpec, null, 2)}\n`);
    writeText(paths.factCardSpecPath, `${JSON.stringify(factCardSpec, null, 2)}\n`);

    runCommand("python", [
      paths.chartScriptPath,
      "--spec",
      paths.chartSpecPath,
      "--output-dir",
      paths.chartsDir
    ], "generate_charts.py");

    runCommand("python", [
      paths.factCardScriptPath,
      "--spec",
      paths.factCardSpecPath,
      "--output-dir",
      paths.chartsDir
    ], "create_fact_cards.py");

    manifestRows = reconcileManifestRows(manifestRows, path.join(args.workspace, "04_assets"));
    writeText(paths.visualManifestPath, toCsv(manifestRows, [
      "scene_id",
      "asset_type",
      "search_query",
      "filename",
      "source_url",
      "license",
      "usage",
      "priority",
      "status"
    ]));
    writeText(paths.licensesPath, toCsv(buildLicenseRows(manifestRows), [
      "asset_name",
      "asset_type",
      "source_url",
      "license",
      "status",
      "notes"
    ]));
    writeText(paths.assetGapsPath, buildAssetGaps(topic, manifestRows));
    writeText(paths.summaryPath, buildSummary(topic, manifestRows, timingData));
    readiness = collectVisualReadiness(manifestRows, path.join(args.workspace, "04_assets"));
    writeText(paths.visualPlanPath, buildVisualPlan(topic, manifestRows, readiness));
    writeText(paths.visualReadinessPath, `${JSON.stringify(readiness, null, 2)}\n`);

    console.log(`Visual asset package generated for topic '${topic.id}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
