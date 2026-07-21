#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("../agents/common");
const {
  assetTimestamp,
  loadManifest,
  readJsonSafe,
  saveManifest,
  upsertAsset,
  writeJson,
  writeMarkdown
} = require("../src/bricktoon/aiQualityPipeline");
const { loadVisualGenerationConfig } = require("../src/bricktoon/workflowContracts");

function shotClassCriteria(shotClass) {
  const criteria = {
    closeup_face: {
      pass: [
        "face reads clearly at thumbnail size",
        "mouth zone is unobstructed for future lip sync",
        "identity is locked to approved character refs",
        "eyes and brows are clean enough for puppet acting"
      ],
      fail: [
        "soft or drifting face identity",
        "mouth hidden by props, hands, or framing",
        "weak expression",
        "off-model hair, hat, or costume"
      ]
    },
    medium_single: {
      pass: [
        "single subject remains clearly dominant",
        "one readable gesture arm is visible",
        "prop zone is separable when story props matter",
        "screen direction feels stable"
      ],
      fail: [
        "secondary cast noise enters the frame",
        "arms are cropped or merged into the body",
        "prop contact is ambiguous",
        "identity or outfit drift"
      ]
    },
    medium_two_shot: {
      pass: [
        "both characters remain on-model",
        "screen-side relationship is clear",
        "faces and gesture zones remain separable",
        "the composition can support dialogue animation later"
      ],
      fail: [
        "faces merge together",
        "subject overlap blocks puppet separation",
        "one actor drifts off-model",
        "focal priority becomes muddy"
      ]
    },
    establishing_wide: {
      pass: [
        "environment is rich but readable",
        "subject silhouettes remain distinct",
        "the frame feels premium rather than empty",
        "staging is stable enough for later camera-based motion"
      ],
      fail: [
        "empty background",
        "weak focal hierarchy",
        "muddy silhouette separation",
        "characters too small to confirm identity"
      ]
    },
    top_down_document: {
      pass: [
        "document or proof area is clean and dominant",
        "hands and props are separable from the page",
        "insert framing supports later editorial compositing"
      ],
      fail: [
        "proof area is buried",
        "hands merge into the document",
        "prop readability is weak"
      ]
    },
    document_insert: {
      pass: [
        "the proof object is the focal point",
        "supporting hand or prop contact is readable",
        "later motion handoff can isolate the insert cleanly"
      ],
      fail: [
        "proof object is lost in clutter",
        "contact zones are muddy",
        "the frame reads like generic filler instead of evidence"
      ]
    },
    push_in_document: {
      pass: [
        "the insert has a clear push target",
        "the proof object is readable and cleanly framed",
        "the image can support later camera emphasis"
      ],
      fail: [
        "no clear push target",
        "low readability in the proof zone",
        "the shot feels generic instead of directed"
      ]
    }
  };
  return criteria[shotClass] || {
    pass: ["identity and focal hierarchy remain clear"],
    fail: ["identity drift or weak focal hierarchy"]
  };
}

function toRel(workspaceDir, targetPath) {
  return path.relative(workspaceDir, targetPath).replaceAll("\\", "/");
}

function buildDerivedIdentityPackage(workspaceDir, character) {
  const baseDir = path.join(workspaceDir, "07_visuals", "character_refs", character.character_id);
  const packagePath = path.join(baseDir, "hybrid_identity_package.json");
  const packageData = {
    character_id: character.character_id,
    benchmark_profile: "option2_phase1_repo_side_still_identity_lock",
    continuity_source_refs: [`03_cast/visual_character_bible.json#${character.character_id}`],
    master_reference: `07_visuals/character_refs/${character.character_id}/master.png`,
    turnaround_refs: [
      `07_visuals/character_refs/${character.character_id}/front.png`,
      `07_visuals/character_refs/${character.character_id}/three_quarter.png`,
      `07_visuals/character_refs/${character.character_id}/side.png`
    ],
    expression_refs: [
      `07_visuals/character_refs/${character.character_id}/expressions/talking.png`,
      `07_visuals/character_refs/${character.character_id}/expressions/worried.png`,
      `07_visuals/character_refs/${character.character_id}/expressions/emphatic.png`,
      `07_visuals/character_refs/${character.character_id}/expressions/blink_closed.png`
    ],
    gesture_refs: [
      `07_visuals/character_refs/${character.character_id}/expressions/gesture_point.png`,
      `07_visuals/character_refs/${character.character_id}/expressions/hold_prop.png`
    ],
    prop_continuity: {
      hold_prop_variant: `07_visuals/character_refs/${character.character_id}/expressions/hold_prop.png`
    },
    hybrid_handoff_targets: [
      "mouth",
      "eyes",
      "eyebrows",
      "gesture_arm",
      "prop_contact_zone"
    ]
  };
  writeJson(packagePath, packageData);
  return toRel(workspaceDir, packagePath);
}

function buildMarkdown(pack) {
  const lines = [
    "# Hybrid Still Benchmark Pack",
    "",
    `- Generated: ${pack.generated_at}`,
    `- Benchmark profile: ${pack.benchmark_profile.profile_id}`,
    `- Hardware target: ${pack.benchmark_profile.hardware_target}`,
    `- Image provider: ${pack.benchmark_profile.image_provider}`,
    "",
    "## Purpose",
    "",
    "This pack is the Option 2 Phase 1 repo-side still evidence set for hybrid motion handoff.",
    "",
    "## Coverage Summary",
    "",
    `- Character identity packages: ${pack.coverage.character_identity_packages}`,
    `- Shot classes covered: ${pack.coverage.shot_classes_covered}`,
    `- Total planned shots: ${pack.coverage.total_shots}`,
    `- Shot approvals with keyframes: ${pack.coverage.shots_with_approved_keyframes}`,
    "",
    "## Approval Focus",
    ""
  ];

  for (const item of pack.benchmark_profile.approval_focus || []) {
    lines.push(`- ${item}`);
  }

  lines.push("", "## Character Identity Packages", "");
  for (const item of pack.character_identity_packages) {
    lines.push(`- ${item.character_id}: ${item.package_file || "missing package file"}`);
  }

  lines.push("", "## Shot-Class Review Guide", "");
  for (const [shotClass, entry] of Object.entries(pack.shot_class_examples)) {
    lines.push(`### ${shotClass}`);
    lines.push("");
    lines.push(`- Workflow: ${entry.workflow_id || "n/a"}`);
    lines.push(`- Examples: ${entry.examples.length}`);
    lines.push("- Pass cues:");
    for (const cue of entry.criteria.pass) {
      lines.push(`  - ${cue}`);
    }
    lines.push("- Fail cues:");
    for (const cue of entry.criteria.fail) {
      lines.push(`  - ${cue}`);
    }
    lines.push("- Example files:");
    for (const file of entry.examples.slice(0, 4)) {
      lines.push(`  - ${file.approved_file}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.workspace) {
      throw new Error("Usage: node scripts/build_hybrid_still_benchmark_pack.js --workspace <workspace_path>");
    }

    const workspaceDir = path.resolve(args.workspace);
    const visualConfig = loadVisualGenerationConfig();
    const benchmarkProfile = visualConfig.benchmark_profiles?.option2_phase1_repo_side_still_identity_lock || {};
    const visualBible = readJsonSafe(path.join(workspaceDir, "03_cast", "visual_character_bible.json"), {});
    const shotPlan = readJsonSafe(path.join(workspaceDir, "07_shot_plans", "shot_plan.json"), {});
    const productionRoutes = readJsonSafe(path.join(workspaceDir, "07_visuals", "production_routes", "production_routes.json"), {});
    const manifest = loadManifest(workspaceDir);
    const benchmarkDir = path.join(workspaceDir, "07_visuals", "benchmark_pack");
    const benchmarkJsonPath = path.join(benchmarkDir, "hybrid_still_benchmark_pack.json");
    const benchmarkMdPath = path.join(benchmarkDir, "hybrid_still_benchmark_pack.md");

    const characterIdentityPackages = (visualBible.characters || []).map((character) => {
      const packagePath = path.join(workspaceDir, "07_visuals", "character_refs", character.character_id, "hybrid_identity_package.json");
      const existingMaster = path.join(workspaceDir, "07_visuals", "character_refs", character.character_id, "master.png");
      const packageFile = fs.existsSync(packagePath)
        ? toRel(workspaceDir, packagePath)
        : (fs.existsSync(existingMaster) ? buildDerivedIdentityPackage(workspaceDir, character) : null);
      return {
        character_id: character.character_id,
        package_file: packageFile,
        continuity_anchors: character.continuity_anchors || [],
        reference_slots: character.reference_slots || {}
      };
    });

    const shotClassExamples = {};
    let totalShots = 0;
    let shotsWithApprovedKeyframes = 0;

    for (const scene of shotPlan.scenes || []) {
      for (const shot of scene.shots || []) {
        totalShots += 1;
        const approvalPath = path.join(workspaceDir, "07_visuals", "art_direction", `${shot.shot_id}_approval.json`);
        const approval = readJsonSafe(approvalPath, {});
        const route = (productionRoutes.routes || []).find((item) => item.shot_id === shot.shot_id) || {};
        const shotClass = approval.shot_class || String(shot.shot_type || "unknown");
        const approvedKeyframes = Array.isArray(approval.approved_keyframes) ? approval.approved_keyframes : [];
        if (approvedKeyframes.length > 0) {
          shotsWithApprovedKeyframes += 1;
        }
        if (!shotClassExamples[shotClass]) {
          shotClassExamples[shotClass] = {
            workflow_id: approval.workflow_template_id || benchmarkProfile.shot_class_workflows?.[shotClass] || null,
            criteria: shotClassCriteria(shotClass),
            examples: []
          };
        }
        for (const keyframe of approvedKeyframes) {
          shotClassExamples[shotClass].examples.push({
            scene_id: scene.scene_id,
            shot_id: shot.shot_id,
            production_mode: route.production_mode || null,
            quality_tier: approval.quality_tier || route.quality_tier || null,
            approved_file: keyframe.approved_file,
            workflow_request_file: keyframe.workflow_request_file || null,
            provider_report_file: keyframe.provider_report_file || null
          });
        }
      }
    }

    const pack = {
      generated_at: assetTimestamp(),
      benchmark_profile: {
        profile_id: "option2_phase1_repo_side_still_identity_lock",
        hardware_target: benchmarkProfile.hardware_target || "gtx1080_8gb",
        image_provider: benchmarkProfile.image_provider || "comfyui",
        approval_focus: benchmarkProfile.approval_focus || [],
        benchmark_pack_requirements: benchmarkProfile.benchmark_pack_requirements || []
      },
      coverage: {
        character_identity_packages: characterIdentityPackages.filter((item) => item.package_file).length,
        shot_classes_covered: Object.keys(shotClassExamples).length,
        total_shots: totalShots,
        shots_with_approved_keyframes: shotsWithApprovedKeyframes
      },
      character_identity_packages: characterIdentityPackages,
      shot_class_examples: shotClassExamples
    };

    writeJson(benchmarkJsonPath, pack);
    writeMarkdown(benchmarkMdPath, buildMarkdown(pack));

    upsertAsset(manifest, {
      asset_id: "HYBRID_STILL_BENCHMARK_PACK",
      asset_type: "benchmark_pack",
      file: toRel(workspaceDir, benchmarkJsonPath),
      status: "approved",
      quality_tier: "hero",
      created_at: assetTimestamp(),
      related_files: [toRel(workspaceDir, benchmarkMdPath)]
    });
    saveManifest(workspaceDir, manifest);

    console.log(`Hybrid still benchmark pack created for '${path.basename(workspaceDir)}'.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
