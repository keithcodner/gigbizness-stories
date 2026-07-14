# Implementation Plan — Bricktoon Visual Rendering Engine with Script-Based Test Framework

Project root:

```text
C:\xampp\htdocs\apps\gigbizness-stories
```

Primary goal:

> Upgrade the current text-card video pipeline into an image-driven Bricktoon production pipeline, then add an automated test framework that verifies the rendered video matches the input script, scene cards, asset manifest, timing plan, captions, and required visual type.

This document is intended to be implemented in phases by an AI coding agent or developer. It does not require replacing the existing research, script, voiceover, or base renderer. It adds the missing visual-generation layer and a strict test harness around the complete script-to-render flow.

---

## 1. Current State

The current system can already produce:

- A workspace.
- A research packet.
- An angle or beat sheet.
- A script.
- Voiceover.
- Scene cards.
- Caption or text cards.
- A render plan.
- An MP4 file.

The current system does not yet reliably produce:

- Reusable Bricktoon character reference images.
- One approved Bricktoon image per visual scene.
- Layered scene assets for parallax and object movement.
- Short animated Bricktoon clips.
- An asset manifest that proves which generated image was used in each scene.
- A strict renderer that rejects missing Bricktoon visuals.
- Automated tests that compare the input script with what was actually rendered.

The renderer currently treats text cards as a silent fallback. That is useful during development, but it hides missing visual assets. The updated system must support two modes:

```text
development mode  -> visual fallback allowed
production mode   -> visual fallback forbidden unless explicitly requested by the scene
```

---

## 2. Definition of Done

The Bricktoon engine is considered implemented when a test story can complete this sequence:

```text
topic
→ research
→ angle
→ cast
→ script
→ script beats
→ scene cards
→ character references
→ scene images
→ asset manifest
→ animation plan
→ render plan
→ preview render
→ automated render tests
→ QC report
```

A passing test story must satisfy all of the following:

- Every script beat maps to at least one scene.
- Every scene has a declared visual type.
- Every `bricktoon_scene` has a real image or animated clip.
- Every named character has an approved reference image.
- Every rendered scene has a traceable asset ID.
- The video duration matches the voiceover and render plan within tolerance.
- Captions appear in the correct scene and time window.
- Text-only fallback is rejected in strict mode unless the scene explicitly requests a text card.
- The renderer exports evidence frames for automated inspection.
- The test report identifies exactly which scene failed and why.

---

## 3. Target Architecture

```text
00_brief
    ↓
01_research
    ↓
02_angle
    ↓
03_cast
    ↓
04_script
    ↓
05_scene_cards
    ↓
06_voice
    ↓
07_visuals
    ├── character_refs
    ├── generated_images
    ├── generated_layers
    ├── animated_clips
    ├── source_cards
    ├── rejected_assets
    └── asset_manifest.json
    ↓
08_animation
    ├── animation_plan.json
    ├── camera_moves.json
    └── scene_motion_cache
    ↓
09_edit_plan
    ├── render_plan.json
    └── render_contract.json
    ↓
10_renders
    ├── preview.mp4
    ├── final.mp4
    ├── evidence_frames
    ├── render_report.json
    └── ffprobe.json
    ↓
13_qc
    ├── automated_test_report.json
    ├── automated_test_report.md
    ├── visual_regression_report.json
    ├── semantic_visual_report.json
    └── final_approval.md
```

---

## 4. New Core Rule: Render Contracts

Before rendering, the system must compile the script and scene cards into a deterministic `render_contract.json`.

The render contract is the expected result. The rendered video and `render_report.json` are the actual result. The test framework compares the two.

### File

```text
09_edit_plan/render_contract.json
```

### Example

```json
{
  "workspace_id": "test_story_template",
  "script_id": "script_v1",
  "render_mode": "strict_visuals",
  "resolution": {
    "width": 1080,
    "height": 1920
  },
  "fps": 30,
  "expected_duration_seconds": 64.2,
  "duration_tolerance_seconds": 0.35,
  "scenes": [
    {
      "scene_id": "S001",
      "beat_ids": ["B001"],
      "start_seconds": 0.0,
      "end_seconds": 4.2,
      "required_visual_type": "bricktoon_scene",
      "allowed_fallback_types": [],
      "required_characters": ["narrator_001"],
      "required_asset_ids": ["ASSET_S001_MAIN"],
      "caption_chunks": [
        {
          "text": "It sucks to hire fake movers",
          "start_seconds": 0.25,
          "end_seconds": 2.8
        }
      ],
      "camera_motion": "slow_push_in",
      "evidence_frame_seconds": [1.5, 3.3]
    },
    {
      "scene_id": "S002",
      "beat_ids": ["B002", "B003"],
      "start_seconds": 4.2,
      "end_seconds": 9.7,
      "required_visual_type": "bricktoon_scene",
      "allowed_fallback_types": [],
      "required_characters": ["customer_001", "customer_002"],
      "required_asset_ids": ["ASSET_S002_MAIN"],
      "caption_chunks": [
        {
          "text": "Everything looks normal",
          "start_seconds": 4.5,
          "end_seconds": 6.9
        }
      ],
      "camera_motion": "pan_right",
      "evidence_frame_seconds": [6.0, 8.5]
    }
  ]
}
```

The render contract must be generated before the video render begins. A production render must stop when the contract is invalid.

---

## 5. Updated Folder Structure

Add or update the following files:

```text
gigbizness-stories/
│
├── src/
│   ├── bricktoon/
│   │   ├── compileCharacterPrompt.js
│   │   ├── compileScenePrompt.js
│   │   ├── generateCharacterRefs.js
│   │   ├── generateSceneImages.js
│   │   ├── generateSceneLayers.js
│   │   ├── validateGeneratedAsset.js
│   │   ├── buildAssetManifest.js
│   │   └── providers/
│   │       ├── comfyUiProvider.js
│   │       ├── cloudImageProvider.js
│   │       └── mockImageProvider.js
│   │
│   ├── render/
│   │   ├── compileRenderContract.js
│   │   ├── compileRenderPlan.js
│   │   ├── resolveSceneAsset.js
│   │   ├── renderScene.js
│   │   ├── renderVideo.js
│   │   ├── exportEvidenceFrames.js
│   │   └── writeRenderReport.js
│   │
│   ├── testing/
│   │   ├── validateWorkspace.js
│   │   ├── validateScriptCoverage.js
│   │   ├── validateSceneCoverage.js
│   │   ├── validateAssetCoverage.js
│   │   ├── validateRenderPlan.js
│   │   ├── validateRenderedVideo.js
│   │   ├── compareEvidenceFrames.js
│   │   ├── semanticVisualValidator.js
│   │   └── writeTestReport.js
│   │
│   └── schemas/
│       ├── script.schema.json
│       ├── cast.schema.json
│       ├── scene_cards.schema.json
│       ├── asset_manifest.schema.json
│       ├── animation_plan.schema.json
│       ├── render_plan.schema.json
│       ├── render_contract.schema.json
│       └── render_report.schema.json
│
├── scripts/
│   ├── generate_bricktoon_character_refs.js
│   ├── generate_bricktoon_scene_images.js
│   ├── build_bricktoon_asset_manifest.js
│   ├── compile_render_contract.js
│   ├── run_test_story_render.js
│   ├── run_render_tests.js
│   ├── update_visual_baselines.js
│   └── inspect_failed_render.js
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── render/
│   ├── visual/
│   ├── fixtures/
│   │   ├── test_story_template/
│   │   ├── missing_scene_asset/
│   │   ├── invalid_caption_timing/
│   │   ├── text_fallback_rejected/
│   │   └── duration_mismatch/
│   └── baselines/
│       └── test_story_template/
│
└── workspaces/
    └── test_story_template/
```

---

## 6. Data Contracts

All major stages must communicate through JSON files validated with JSON Schema or Zod.

### 6.1 Script Contract

Recommended file:

```text
04_script/script.json
```

```json
{
  "script_id": "script_v1",
  "title": "It Sucks to Hire a Fake Moving Company",
  "language": "en",
  "narration": [
    {
      "beat_id": "B001",
      "text": "It sucks to hire a fake moving company.",
      "estimated_duration_seconds": 3.1,
      "visual_intent": "narrator introduces the danger",
      "claim_ids": []
    },
    {
      "beat_id": "B002",
      "text": "Because at first, nothing feels fake.",
      "estimated_duration_seconds": 3.4,
      "visual_intent": "customers see a professional-looking website",
      "claim_ids": []
    }
  ]
}
```

Every narration segment must have a stable `beat_id`.

### 6.2 Scene Card Contract

Recommended file:

```text
05_scene_cards/scene_cards.json
```

Each scene must declare the required visual type.

```json
{
  "scene_id": "S004",
  "beat_ids": ["B004"],
  "duration_seconds": 5.0,
  "visual_type": "bricktoon_scene",
  "characters": ["customer_001", "customer_002", "mover_001"],
  "environment": "suburban driveway with boxes and a plain moving truck",
  "action": "the truck door closes while the customers look worried",
  "visual_prompt": "Vertical original blocky toy cartoon scene...",
  "negative_prompt": "logos, official toy branding, readable license plates...",
  "camera": {
    "shot_type": "medium_wide",
    "movement": "slow_push_in",
    "focus": "truck door"
  },
  "caption_text": "the real price appears after loading",
  "caption_emphasis": ["real price", "after loading"],
  "sound_effects": ["truck_door_slam_low_hit.wav"],
  "claims": ["CLAIM_004"],
  "allow_text_fallback": false
}
```

Allowed visual types:

```text
bricktoon_scene
bricktoon_layered_scene
bricktoon_animated_clip
source_card
chart
map
document_graphic
text_card
```

### 6.3 Asset Manifest Contract

Recommended file:

```text
07_visuals/asset_manifest.json
```

```json
{
  "workspace_id": "test_story_template",
  "assets": [
    {
      "asset_id": "CHAR_narrator_001_MASTER",
      "asset_type": "character_reference",
      "character_ids": ["narrator_001"],
      "file": "07_visuals/character_refs/narrator_001/master.png",
      "width": 1024,
      "height": 1024,
      "status": "approved",
      "generator": {
        "provider": "comfyui",
        "workflow": "bricktoon_character_ref_v1",
        "model": "configured-in-environment",
        "seed": 1842241
      },
      "prompt_file": "07_visuals/prompts/characters/narrator_001.txt",
      "created_at": "2026-07-13T00:00:00Z"
    },
    {
      "asset_id": "ASSET_S004_MAIN",
      "asset_type": "bricktoon_scene",
      "scene_ids": ["S004"],
      "character_ids": ["customer_001", "customer_002", "mover_001"],
      "file": "07_visuals/generated_images/S004_main.png",
      "width": 768,
      "height": 1344,
      "status": "approved",
      "generator": {
        "provider": "comfyui",
        "workflow": "bricktoon_scene_v1",
        "seed": 997440
      },
      "character_reference_assets": [
        "CHAR_customer_001_MASTER",
        "CHAR_customer_002_MASTER",
        "CHAR_mover_001_MASTER"
      ],
      "prompt_file": "07_visuals/prompts/scenes/S004.txt",
      "created_at": "2026-07-13T00:00:00Z"
    }
  ]
}
```

The renderer must resolve assets only through the manifest. It must not guess file paths.

### 6.4 Render Report Contract

Recommended file:

```text
10_renders/render_report.json
```

```json
{
  "render_id": "test_story_template_preview_001",
  "render_mode": "strict_visuals",
  "output_file": "10_renders/preview.mp4",
  "actual_duration_seconds": 64.17,
  "fps": 30,
  "resolution": {
    "width": 1080,
    "height": 1920
  },
  "scenes": [
    {
      "scene_id": "S004",
      "start_seconds": 15.2,
      "end_seconds": 20.2,
      "resolved_visual_type": "bricktoon_scene",
      "resolved_asset_id": "ASSET_S004_MAIN",
      "source_file": "07_visuals/generated_images/S004_main.png",
      "fallback_used": false,
      "caption_events": 2,
      "evidence_frames": [
        "10_renders/evidence_frames/S004_01.png",
        "10_renders/evidence_frames/S004_02.png"
      ]
    }
  ],
  "warnings": [],
  "errors": []
}
```

---

## 7. Phase 0 — Audit the Existing Pipeline

Before adding image generation, add an audit script.

### Script

```text
scripts/audit_bricktoon_implementation.js
```

### The audit must check

- Required architecture files exist.
- Cast files exist and validate.
- Scene cards exist and validate.
- Every script beat appears in at least one scene card.
- `07_visuals/character_refs` exists.
- `07_visuals/generated_images` exists.
- `asset_manifest.json` exists.
- The manifest contains an approved asset for every Bricktoon scene.
- `render_plan.json` references manifest asset IDs.
- The renderer supports strict visual mode.
- The renderer produces `render_report.json`.
- Evidence frames are exported.
- Render tests are configured.

### Command

```powershell
npm run bricktoon:audit -- --workspace workspaces/test_story_template
```

### Expected output

```text
BRICKTOON IMPLEMENTATION AUDIT

PASS  cast schema
PASS  scene card schema
PASS  script beat coverage
FAIL  character references missing: 4
FAIL  scene images missing: 11
FAIL  asset_manifest.json missing
FAIL  strict visual renderer not configured
FAIL  evidence frame exporter not configured

STATUS: INCOMPLETE
```

This audit should become the first test in CI.

---

## 8. Phase 1 — Strict Visual Resolution

Implement a single function responsible for choosing the visual asset for each scene.

### File

```text
src/render/resolveSceneAsset.js
```

### Required behavior

```text
1. Read scene.visual_type.
2. Query asset_manifest.json for approved assets assigned to scene_id.
3. Prefer animated clip.
4. Then prefer layered scene.
5. Then prefer flat Bricktoon image.
6. Then use source card, chart, map, or text card only when scene.visual_type permits it.
7. In strict mode, throw an error when the required asset is missing.
8. In development mode, create a visible diagnostic fallback card.
9. Record the chosen asset in render_report.json.
```

### Resolution order

```text
bricktoon_animated_clip
→ bricktoon_layered_scene
→ bricktoon_scene
→ source_card
→ chart
→ map
→ document_graphic
→ text_card
```

The order is not permission. A scene that requires `bricktoon_scene` cannot silently resolve to `text_card` in strict mode.

### Development fallback card

The fallback must not look like a normal finished scene. It should clearly state:

```text
MISSING VISUAL
Scene: S004
Expected: bricktoon_scene
Reason: no approved asset in manifest
```

This prevents accidental publishing of placeholder videos.

---

## 9. Phase 2 — Character Reference Generation

Create a reusable reference image before generating scenes.

### Script

```text
scripts/generate_bricktoon_character_refs.js
```

### Inputs

```text
03_cast/cast.json
styles/bricktoon/style_bible.md
styles/bricktoon/character_prompt_rules.md
styles/bricktoon/negative_prompts.md
```

### Outputs

```text
07_visuals/character_refs/<character_id>/master.png
07_visuals/character_refs/<character_id>/front.png
07_visuals/character_refs/<character_id>/three_quarter.png
07_visuals/character_refs/<character_id>/side.png
07_visuals/character_refs/<character_id>/expressions/worried.png
07_visuals/character_refs/<character_id>/expressions/angry.png
07_visuals/character_refs/<character_id>/expressions/talking.png
07_visuals/prompts/characters/<character_id>.txt
```

### Character generation state

Update each character in `cast.json` or create `character_generation.json`:

```json
{
  "character_id": "broker_001",
  "master_asset_id": "CHAR_broker_001_MASTER",
  "prompt_lock": "original blocky toy cartoon broker, curled black moustache, black top hat, red vest, black suit",
  "negative_lock": "different outfit, beard, realistic human, logos, official toy branding",
  "seed": 1842241,
  "reference_strength": 0.8,
  "status": "approved"
}
```

### Validation

A character reference passes when:

- The image exists.
- The image has the expected dimensions.
- The image is not mostly transparent.
- The image is not nearly blank.
- The prompt and seed are recorded.
- The character has an approved status.
- The character file is registered in the asset manifest.

### Command

```powershell
npm run bricktoon:characters -- --workspace workspaces/test_story_template
```

---

## 10. Phase 3 — Scene Image Generation

### Script

```text
scripts/generate_bricktoon_scene_images.js
```

### Inputs

```text
03_cast/cast.json
05_scene_cards/scene_cards.json
07_visuals/asset_manifest.json
07_visuals/character_refs/
styles/bricktoon/*
```

### Outputs

```text
07_visuals/generated_images/S001_main.png
07_visuals/generated_images/S002_main.png
07_visuals/generated_images/S003_main.png
...
07_visuals/prompts/scenes/S001.txt
07_visuals/prompts/scenes/S002.txt
...
```

### Scene generation algorithm

```text
for each scene card:
    if visual_type is not a Bricktoon type:
        skip Bricktoon generation

    load the required character reference assets
    compile the scene prompt
    compile the negative prompt
    submit the request to the configured image provider
    save the candidate image
    validate the image dimensions and image content
    create a preview contact sheet
    mark the best candidate approved or pending review
    register the approved asset in asset_manifest.json
```

### Candidate strategy

Generate multiple candidates during development:

```text
S004_candidate_01.png
S004_candidate_02.png
S004_candidate_03.png
S004_candidate_04.png
```

After approval:

```text
S004_main.png
```

Rejected candidates move to:

```text
07_visuals/rejected_assets/S004/
```

### Command

```powershell
npm run bricktoon:scenes -- --workspace workspaces/test_story_template --candidates 4
```

### Dry-run command

The dry run should compile prompts without generating images:

```powershell
npm run bricktoon:scenes -- --workspace workspaces/test_story_template --dry-run
```

---

## 11. Phase 4 — Layered Motion Scenes

Do not require full AI video for every shot. Start by splitting selected scenes into layers.

### Output

```text
07_visuals/generated_layers/S004/
├── background.png
├── customer_001.png
├── customer_002.png
├── mover_001.png
├── truck.png
├── truck_door.png
├── boxes.png
└── foreground.png
```

### Animation plan

```json
{
  "scene_id": "S004",
  "duration_seconds": 5.0,
  "camera": {
    "type": "slow_push_in",
    "start_scale": 1.0,
    "end_scale": 1.12
  },
  "layers": [
    {
      "asset": "background.png",
      "depth": 0,
      "move_x": -12,
      "scale_end": 1.03
    },
    {
      "asset": "customer_001.png",
      "depth": 3,
      "move_x": -4,
      "scale_end": 1.08,
      "animation": "subtle_worried_bounce"
    },
    {
      "asset": "truck_door.png",
      "depth": 4,
      "animation": "slam",
      "start_seconds": 2.1
    }
  ],
  "effects": [
    {
      "type": "camera_shake",
      "start_seconds": 2.15,
      "duration_seconds": 0.25
    }
  ]
}
```

### Required basic animations

- Slow push-in.
- Pan left or right.
- Foreground/background parallax.
- Character bounce.
- Character lean.
- Head tilt.
- Blink swap.
- Mouth open/closed swap.
- Prop slide.
- Invoice number pop.
- Phone glow.
- Impact shake.
- Light flicker.

These animations should be deterministic and rendered locally.

---

## 12. Phase 5 — Optional Image-to-Video

Use image-to-video only on selected hero shots.

### Recommended use cases

- Villain twirls moustache.
- Customer steps backward.
- Truck door closes.
- Phone screen lights up.
- Boxes slide.
- Character turns toward camera.

### Output

```text
07_visuals/animated_clips/S004_v1.mp4
```

### Rules

- Keep clips short.
- Keep actions simple.
- Use the approved scene still as the first-frame reference.
- Keep generated clips muted; final audio is added by the renderer.
- Reject clips with severe character drift.
- Keep the flat or layered image as a fallback for development.
- Register accepted clips in `asset_manifest.json`.

### Manifest entry

```json
{
  "asset_id": "ASSET_S004_ANIMATED",
  "asset_type": "bricktoon_animated_clip",
  "scene_ids": ["S004"],
  "file": "07_visuals/animated_clips/S004_v1.mp4",
  "status": "approved",
  "parent_asset_id": "ASSET_S004_MAIN",
  "duration_seconds": 3.4
}
```

---

## 13. Phase 6 — Render Plan Compilation

The render plan must reference asset IDs, not only paths.

### File

```text
09_edit_plan/render_plan.json
```

### Example

```json
{
  "render_id": "test_story_preview",
  "mode": "strict_visuals",
  "output": "10_renders/preview.mp4",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "scenes": [
    {
      "scene_id": "S004",
      "start_seconds": 15.2,
      "duration_seconds": 5.0,
      "visual": {
        "required_type": "bricktoon_scene",
        "preferred_asset_ids": [
          "ASSET_S004_ANIMATED",
          "ASSET_S004_LAYERED",
          "ASSET_S004_MAIN"
        ]
      },
      "animation_plan": "08_animation/scenes/S004.json",
      "captions": [
        {
          "text": "THE PRICE CHANGES",
          "start_seconds": 16.0,
          "end_seconds": 17.8
        }
      ],
      "audio": {
        "voice_track": "06_voice/voiceover.wav",
        "sound_effects": [
          {
            "file": "assets/sfx/truck_door_slam.wav",
            "start_seconds": 17.3
          }
        ]
      }
    }
  ]
}
```

---

## 14. Test Framework Overview

Use a layered test framework because no single test can prove the video is correct.

Recommended stack:

```text
Vitest             -> JavaScript unit and integration tests
Ajv or Zod         -> JSON contract validation
FFprobe            -> duration, resolution, codec, FPS, streams
Sharp              -> image dimensions, alpha, blank-image detection
Pixelmatch         -> visual regression against approved evidence frames
Node child_process -> invoke renderer and FFmpeg
Optional VLM       -> semantic scene inspection
```

The framework must have five test levels:

```text
Level 1: schema tests
Level 2: script-to-scene coverage tests
Level 3: asset and render-plan tests
Level 4: rendered-video technical tests
Level 5: evidence-frame visual and semantic tests
```

---

## 15. Test Fixture Structure

```text
tests/fixtures/test_story_template/
├── input/
│   ├── script.json
│   ├── cast.json
│   ├── scene_cards.json
│   ├── asset_manifest.json
│   ├── animation_plan.json
│   └── expected_render_contract.json
├── assets/
│   ├── character_refs/
│   ├── scene_images/
│   ├── audio/
│   └── sound_effects/
├── expected/
│   ├── expected_render_report.json
│   ├── evidence_frames/
│   └── expected_failures.json
└── output/
    ├── preview.mp4
    ├── render_report.json
    └── evidence_frames/
```

The main fixture must use deterministic local placeholder Bricktoon images committed to the test fixture. The test suite must not call a live image-generation service during normal unit or integration tests.

Image generation should be tested separately with provider mocks and optional end-to-end tests.

---

## 16. Test Level 1 — Schema Tests

### Required tests

- Script validates against the script schema.
- Cast validates against the cast schema.
- Scene cards validate against the scene-card schema.
- Asset manifest validates.
- Animation plan validates.
- Render plan validates.
- Render contract validates.
- Render report validates.

### Example Vitest test

```js
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { validateSceneCards } from "../../src/testing/validateWorkspace.js";

describe("scene card schema", () => {
  it("accepts the test story scene cards", async () => {
    const raw = await readFile(
      "tests/fixtures/test_story_template/input/scene_cards.json",
      "utf8"
    );

    const result = validateSceneCards(JSON.parse(raw));

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
```

---

## 17. Test Level 2 — Script-to-Scene Coverage

This level verifies that the render plan represents the script.

### Required assertions

For every script beat:

- The beat has a `beat_id`.
- At least one scene references the `beat_id`.
- Scene order follows script order unless intentionally marked as a flashback or montage.
- The combined scene duration is sufficient for the beat narration.
- The scene visual intent is not empty.
- Claim IDs required by the beat appear in the scene card.

For every scene:

- The scene references at least one valid beat.
- The narration time range does not overlap incorrectly.
- The requested characters exist in the cast.
- The required visual type is declared.
- `allow_text_fallback` is explicit.

### Example test

```js
import { describe, expect, it } from "vitest";
import { loadFixture } from "../helpers/loadFixture.js";
import { validateScriptCoverage } from "../../src/testing/validateScriptCoverage.js";

describe("script-to-scene coverage", () => {
  it("maps every script beat to a rendered scene", async () => {
    const fixture = await loadFixture("test_story_template");
    const report = validateScriptCoverage({
      script: fixture.script,
      sceneCards: fixture.sceneCards
    });

    expect(report.unmappedBeatIds).toEqual([]);
    expect(report.unknownBeatIds).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
```

### Failure example

```text
FAIL script-to-scene coverage

Unmapped beat:
B006 — "If you refuse, your belongings do not move."

Expected:
at least one scene card with beat_ids containing B006
```

---

## 18. Test Level 3 — Asset Coverage and Render Plan

### Required asset tests

For every scene requiring Bricktoon visuals:

- At least one approved matching asset exists.
- The asset type is compatible with the scene requirement.
- The asset file exists.
- The asset file is readable.
- The image or video dimensions are valid.
- The asset is not empty or nearly blank.
- Required character reference IDs are registered.
- The approved asset is referenced by the render plan.

### Blank-image detection

Use Sharp to sample pixel statistics.

A basic image should fail when:

- More than 99 percent of pixels are the same value.
- The image is almost fully transparent.
- Width or height is below the configured minimum.
- File size is suspiciously small.

### Strict visual test

```js
import { describe, expect, it } from "vitest";
import { resolveSceneAsset } from "../../src/render/resolveSceneAsset.js";

describe("strict visual resolution", () => {
  it("rejects a text fallback for a Bricktoon scene", () => {
    const scene = {
      scene_id: "S004",
      visual_type: "bricktoon_scene",
      allow_text_fallback: false
    };

    const manifest = {
      assets: [
        {
          asset_id: "TEXT_S004",
          asset_type: "text_card",
          scene_ids: ["S004"],
          status: "approved"
        }
      ]
    };

    expect(() =>
      resolveSceneAsset(scene, manifest, { mode: "strict_visuals" })
    ).toThrow(/S004.*bricktoon_scene.*missing/i);
  });
});
```

---

## 19. Test Level 4 — Technical Video Validation

After rendering, run FFprobe and compare the result with the render contract.

### Required checks

- Output MP4 exists.
- Output file size exceeds the minimum.
- Video stream exists.
- Audio stream exists when voiceover is expected.
- Width and height match.
- FPS matches within tolerance.
- Duration matches within tolerance.
- No scene extends beyond the output duration.
- Audio duration is not unexpectedly shorter than the video.
- Render report scene count matches render contract scene count.
- No strict-mode fallback was used.

### FFprobe command

```powershell
ffprobe -v error -show_format -show_streams -of json workspaces/test_story_template/10_renders/preview.mp4
```

### Example test

```js
import { describe, expect, it } from "vitest";
import { probeVideo } from "../../src/testing/validateRenderedVideo.js";

describe("rendered video", () => {
  it("matches the required dimensions and duration", async () => {
    const report = await probeVideo(
      "tests/fixtures/test_story_template/output/preview.mp4"
    );

    expect(report.width).toBe(1080);
    expect(report.height).toBe(1920);
    expect(report.fps).toBeCloseTo(30, 1);
    expect(report.durationSeconds).toBeGreaterThan(60);
    expect(report.durationSeconds).toBeLessThan(65);
  });
});
```

---

## 20. Test Level 5 — Evidence Frames

The renderer must export frames at deterministic points in every scene.

### Output

```text
10_renders/evidence_frames/
├── S001_01.png
├── S001_02.png
├── S002_01.png
├── S002_02.png
└── ...
```

### Evidence timing

Use scene-relative positions instead of arbitrary global timestamps:

```text
25 percent of scene duration
60 percent of scene duration
85 percent of scene duration when a reveal occurs
```

The render contract may override these positions.

### Why evidence frames are required

The MP4 metadata can prove that a video exists, but it cannot prove what was visible. Evidence frames allow the test framework to inspect the actual rendered scene.

### Required evidence-frame checks

- The frame exists.
- The frame dimensions match the video.
- The frame is not blank.
- The frame differs sufficiently from the previous scene.
- The frame is not the missing-visual diagnostic card in strict mode.
- The frame approximately matches the approved baseline when visual regression is enabled.

---

## 21. Visual Regression Testing

Use approved evidence frames as baselines.

### Baseline location

```text
tests/baselines/test_story_template/S004_01.png
```

### Comparison strategy

- Resize both images to the same dimensions.
- Ignore a configurable safe margin around kinetic captions when needed.
- Use a tolerant pixel difference.
- Produce a difference image on failure.
- Do not require perfect pixel equality when the renderer includes subtle motion.

### Failure output

```text
13_qc/visual_diffs/S004_01_diff.png
```

### Example test

```js
import { describe, expect, it } from "vitest";
import { compareFrames } from "../../src/testing/compareEvidenceFrames.js";

describe("visual regression", () => {
  it("keeps scene S004 within the approved visual threshold", async () => {
    const result = await compareFrames({
      actual: "tests/fixtures/test_story_template/output/evidence_frames/S004_01.png",
      expected: "tests/baselines/test_story_template/S004_01.png",
      diffOutput: "tests/fixtures/test_story_template/output/diffs/S004_01.png",
      threshold: 0.12
    });

    expect(result.differenceRatio).toBeLessThanOrEqual(0.12);
  });
});
```

### Updating baselines

Baseline updates must be explicit:

```powershell
npm run test:visual:update -- --workspace test_story_template
```

Never automatically overwrite baselines during a normal test run.

---

## 22. Semantic Visual Testing

Pixel comparison does not prove that the correct characters and action are shown. Add an optional semantic validator.

### Semantic input

For each evidence frame, provide:

- Scene ID.
- Required characters.
- Required environment.
- Required action.
- Forbidden elements.
- The rendered evidence frame.

### Example request

```json
{
  "scene_id": "S004",
  "image": "10_renders/evidence_frames/S004_02.png",
  "expected": {
    "characters": ["two worried customers", "one mover"],
    "environment": "suburban driveway",
    "objects": ["moving boxes", "plain box truck"],
    "action": "truck door is closing",
    "forbidden": [
      "official LEGO logo",
      "real company logo",
      "readable license plate",
      "photorealistic human"
    ]
  }
}
```

### Expected semantic response

```json
{
  "scene_id": "S004",
  "pass": true,
  "confidence": 0.88,
  "observed": {
    "characters": "two worried toy-like customers and one mover",
    "environment": "driveway beside a moving truck",
    "action": "rear truck door appears partly closed"
  },
  "missing": [],
  "forbidden_detected": [],
  "notes": []
}
```

### Important rule

Semantic visual testing should be advisory at first. Deterministic contract, asset, and technical failures should block the build. Semantic failures should be recorded for review until the validator is proven reliable.

Later, high-confidence semantic failures can block production renders.

---

## 23. Caption Testing

Captions must be tested from renderer data rather than OCR whenever possible.

The renderer should write caption events to the render report:

```json
{
  "scene_id": "S004",
  "caption_events": [
    {
      "text": "THE PRICE CHANGES",
      "start_seconds": 16.0,
      "end_seconds": 17.8,
      "position": "center",
      "safe_area_pass": true
    }
  ]
}
```

### Required caption tests

- Every required caption appears in the render report.
- Caption start and end times are within the scene.
- Caption duration exceeds the configured minimum.
- Caption text is not empty.
- Caption does not cover declared face-safe regions.
- Caption chunk length follows style rules.
- No caption remains on screen after its scene ends.

Optional image inspection may verify caption visibility, but the primary test should use renderer event data.

---

## 24. Character Continuity Testing

Character continuity must be tested through asset metadata and optional visual inspection.

### Deterministic checks

For each rendered character:

- A master reference exists.
- The scene asset lists the master reference asset ID.
- The scene prompt uses the character prompt lock.
- The scene asset records the configured seed or reference workflow.
- The character outfit ID is stable.

### Example continuity record

```json
{
  "scene_id": "S004",
  "character_id": "broker_001",
  "master_reference_asset_id": "CHAR_broker_001_MASTER",
  "outfit_id": "broker_black_suit_red_vest_v1",
  "prompt_lock_hash": "sha256:...",
  "reference_workflow": "ip_adapter_character_v1"
}
```

### Optional visual continuity test

A semantic or embedding-based validator may compare scene crops against the master reference. This should begin as an advisory score.

---

## 25. Negative Test Fixtures

Create fixtures that must fail.

### Fixture: missing scene asset

```text
tests/fixtures/missing_scene_asset/
```

Expected failure:

```text
Scene S004 requires bricktoon_scene but no approved compatible asset exists.
```

### Fixture: text fallback rejected

```text
tests/fixtures/text_fallback_rejected/
```

Expected failure:

```text
Scene S004 resolved to text_card while strict visuals were enabled.
```

### Fixture: invalid caption timing

```text
tests/fixtures/invalid_caption_timing/
```

Expected failure:

```text
Caption ends after scene S006.
```

### Fixture: duration mismatch

```text
tests/fixtures/duration_mismatch/
```

Expected failure:

```text
Expected duration 64.2 seconds, actual duration 61.9 seconds.
```

### Fixture: unmapped script beat

```text
tests/fixtures/unmapped_script_beat/
```

Expected failure:

```text
Script beat B008 is not represented by any scene card.
```

These failure fixtures are essential because they prove the test suite actually catches problems.

---

## 26. Test Runner

### Main script

```text
scripts/run_render_tests.js
```

### Responsibilities

```text
1. Load workspace paths.
2. Validate schemas.
3. Validate script-to-scene coverage.
4. Validate cast references.
5. Validate asset coverage.
6. Compile or load render_contract.json.
7. Optionally run the renderer.
8. Validate render_report.json.
9. Run FFprobe checks.
10. Validate evidence frames.
11. Run visual regression when enabled.
12. Run optional semantic visual checks.
13. Write JSON and Markdown reports.
14. Exit with code 1 on blocking failures.
```

### Main command

```powershell
npm run test:render-script -- --workspace workspaces/test_story_template
```

### Render and test in one command

```powershell
npm run test:render-script -- `
  --workspace workspaces/test_story_template `
  --render `
  --strict-visuals `
  --visual-regression
```

### Fast mode

```powershell
npm run test:render-script -- `
  --workspace workspaces/test_story_template `
  --render `
  --preview-width 360 `
  --preview-height 640 `
  --fps 15 `
  --skip-semantic
```

---

## 27. Test Runner Pseudocode

```js
async function runRenderTests(options) {
  const workspace = await loadWorkspace(options.workspace);
  const failures = [];
  const warnings = [];

  const schemaReport = await validateWorkspace(workspace);
  failures.push(...schemaReport.failures);

  const coverageReport = validateScriptCoverage({
    script: workspace.script,
    sceneCards: workspace.sceneCards
  });
  failures.push(...coverageReport.failures);

  const assetReport = await validateAssetCoverage({
    sceneCards: workspace.sceneCards,
    cast: workspace.cast,
    manifest: workspace.assetManifest,
    strictVisuals: options.strictVisuals
  });
  failures.push(...assetReport.failures);

  const contract = await compileRenderContract(workspace, options);

  if (failures.length > 0) {
    return writeTestReport({ failures, warnings, contract });
  }

  if (options.render) {
    await renderVideo({ workspace, contract, options });
  }

  const technicalReport = await validateRenderedVideo({
    contract,
    renderReport: workspace.renderReport,
    videoFile: workspace.outputVideo
  });
  failures.push(...technicalReport.failures);

  const evidenceReport = await validateEvidenceFrames({
    contract,
    renderReport: workspace.renderReport
  });
  failures.push(...evidenceReport.failures);

  if (options.visualRegression) {
    const visualReport = await compareEvidenceFrames({
      workspace,
      contract
    });
    failures.push(...visualReport.failures);
    warnings.push(...visualReport.warnings);
  }

  if (!options.skipSemantic) {
    const semanticReport = await validateSemanticVisuals({
      workspace,
      contract
    });
    warnings.push(...semanticReport.warnings);
  }

  const report = await writeTestReport({
    failures,
    warnings,
    contract
  });

  process.exitCode = failures.length > 0 ? 1 : 0;
  return report;
}
```

---

## 28. Package Scripts

Update `package.json` with scripts similar to:

```json
{
  "scripts": {
    "bricktoon:audit": "node scripts/audit_bricktoon_implementation.js",
    "bricktoon:characters": "node scripts/generate_bricktoon_character_refs.js",
    "bricktoon:scenes": "node scripts/generate_bricktoon_scene_images.js",
    "bricktoon:manifest": "node scripts/build_bricktoon_asset_manifest.js",
    "bricktoon:contract": "node scripts/compile_render_contract.js",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:render": "vitest run tests/render",
    "test:visual": "vitest run tests/visual",
    "test:visual:update": "node scripts/update_visual_baselines.js",
    "test:render-script": "node scripts/run_render_tests.js",
    "test:bricktoon": "npm run test:unit && npm run test:integration && npm run test:render",
    "test-story:guided": "node scripts/run_test_story_guided.js",
    "test-story:render": "node scripts/run_test_story_render.js --strict-visuals",
    "test-story:full": "npm run bricktoon:contract && npm run test-story:render && npm run test:render-script -- --workspace workspaces/test_story_template"
  }
}
```

---

## 29. Recommended Dependencies

Install only what is required by the implementation.

```powershell
npm install -D vitest pixelmatch pngjs
npm install ajv sharp zod execa
```

Use existing FFmpeg and FFprobe installations through child processes.

Optional semantic visual validation may use a provider adapter and should not be required for basic tests.

---

## 30. Mock Image Provider for Tests

Normal tests must not depend on live image generation.

### File

```text
src/bricktoon/providers/mockImageProvider.js
```

### Behavior

- Reads fixture images from `tests/fixtures/.../assets/scene_images`.
- Copies them to the requested workspace output location.
- Returns deterministic metadata.
- Supports configured failure modes.

### Example

```js
export class MockImageProvider {
  constructor({ fixtureRoot }) {
    this.fixtureRoot = fixtureRoot;
  }

  async generateSceneImage({ sceneId, outputFile }) {
    const source = `${this.fixtureRoot}/scene_images/${sceneId}.png`;
    await fs.copyFile(source, outputFile);

    return {
      provider: "mock",
      workflow: "fixture-copy",
      seed: 1,
      outputFile
    };
  }
}
```

This allows the complete pipeline to be tested without waiting for AI image generation.

---

## 31. Provider Interface

All image-generation providers must implement the same interface.

```js
export class BricktoonImageProvider {
  async generateCharacterReference(input) {
    throw new Error("Not implemented");
  }

  async generateSceneImage(input) {
    throw new Error("Not implemented");
  }

  async generateLayer(input) {
    throw new Error("Not implemented");
  }

  async generateAnimatedClip(input) {
    throw new Error("Not implemented");
  }
}
```

Provider selection must come from configuration:

```text
BRICKTOON_IMAGE_PROVIDER=mock
BRICKTOON_IMAGE_PROVIDER=comfyui
BRICKTOON_IMAGE_PROVIDER=cloud
```

The renderer must remain independent of the generation provider.

---

## 32. ComfyUI Adapter Responsibilities

### File

```text
src/bricktoon/providers/comfyUiProvider.js
```

### Responsibilities

- Load a versioned workflow JSON.
- Replace prompt placeholders.
- Attach character references.
- Set width, height, seed, and output prefix.
- Submit the workflow.
- Poll for completion.
- Copy generated output into the workspace.
- Record workflow, model configuration, seed, and source references.
- Retry recoverable failures.
- Timeout cleanly.
- Never mark an asset approved without validation.

### Suggested workflows

```text
workflows/comfyui/bricktoon_character_ref_v1.json
workflows/comfyui/bricktoon_scene_v1.json
workflows/comfyui/bricktoon_layer_v1.json
workflows/comfyui/bricktoon_image_to_video_v1.json
```

Keep workflow IDs in the manifest so scenes can be regenerated.

---

## 33. Test Story Requirements

The first automated test story should be intentionally small.

### Recommended test story

```text
Title: The Fake Moving Quote
Duration: 25–40 seconds
Scenes: 6
Characters: 3
Visuals:
- 5 Bricktoon scenes
- 1 source card
Motion:
- 3 pan/zoom scenes
- 1 layered invoice animation
- 1 truck-door impact scene
```

### Required scene sequence

```text
S001 — Narrator introduces the warning.
S002 — Customer sees a professional-looking quote.
S003 — Broker gives a suspiciously cheap price.
S004 — Boxes are loaded into the truck.
S005 — Invoice price jumps.
S006 — Source card and consumer warning.
```

This fixture should remain stable and act as the main regression test.

---

## 34. Script-Based Rendering Test

The central test must start from the script file, not from a manually assembled render plan.

### Command

```powershell
npm run test:render-script -- `
  --script workspaces/test_story_template/04_script/script.json `
  --workspace workspaces/test_story_template `
  --render `
  --strict-visuals
```

### Pipeline under test

```text
script.json
→ beat validation
→ scene-card lookup
→ visual requirement lookup
→ asset resolution
→ render contract
→ render plan
→ MP4 render
→ render report
→ evidence frames
→ automated assertions
```

### Core test assertion

For every script beat, the test report must answer:

```text
What did the script say?
Which scene rendered it?
Which visual asset was shown?
Which characters were expected?
Which characters were declared in the asset metadata?
Which caption was displayed?
What was the scene time range?
Was a fallback used?
Which evidence frames prove it?
```

### Example report entry

```json
{
  "beat_id": "B004",
  "script_text": "The price changes after your belongings are loaded.",
  "scene_id": "S005",
  "scene_time": {
    "start": 14.4,
    "end": 19.3
  },
  "required_visual_type": "bricktoon_layered_scene",
  "actual_visual_type": "bricktoon_layered_scene",
  "asset_id": "ASSET_S005_LAYERED",
  "required_characters": ["customer_001", "mover_001"],
  "caption_text": "THE PRICE JUMPS",
  "fallback_used": false,
  "evidence_frames": [
    "10_renders/evidence_frames/S005_01.png",
    "10_renders/evidence_frames/S005_02.png"
  ],
  "status": "pass"
}
```

---

## 35. Automated Test Report

### JSON output

```text
13_qc/automated_test_report.json
```

### Markdown output

```text
13_qc/automated_test_report.md
```

### Example Markdown report

```md
# Automated Render Test Report

Workspace: test_story_template
Mode: strict_visuals
Status: FAILED

## Summary

- Script beats: 8
- Covered beats: 8
- Scenes: 7
- Approved visual assets: 6
- Missing visual assets: 1
- Text fallbacks used: 1
- Evidence frames: 14
- Blocking failures: 2
- Warnings: 1

## Blocking Failures

### S004 — Missing Bricktoon visual

Expected visual type: bricktoon_scene
Actual visual type: text_card
Required characters: customer_001, customer_002, mover_001

Evidence:
10_renders/evidence_frames/S004_01.png

### B006 — Caption timing mismatch

Caption ends 0.4 seconds after scene S006.

## Warnings

### S003 — Character continuity score below preferred threshold

Character: broker_001
Score: 0.71
Preferred: 0.80
```

---

## 36. Guided Inspection Page

Add an optional local HTML inspection report.

### Output

```text
13_qc/render_inspection/index.html
```

### The page should show

- Script text.
- Beat ID.
- Scene ID.
- Expected visual type.
- Actual asset.
- Character references.
- Evidence frames.
- Caption text.
- Timing.
- Pass/fail status.
- Regenerate button command text.

This allows fast manual review without opening every folder.

---

## 37. Failure Recovery Commands

### Regenerate one character

```powershell
npm run bricktoon:characters -- `
  --workspace workspaces/test_story_template `
  --character broker_001 `
  --overwrite
```

### Regenerate one scene

```powershell
npm run bricktoon:scenes -- `
  --workspace workspaces/test_story_template `
  --scene S004 `
  --candidates 4 `
  --overwrite
```

### Re-render one scene preview

```powershell
node scripts/render_single_scene.js `
  --workspace workspaces/test_story_template `
  --scene S004
```

### Re-run only the failed tests

```powershell
npm run test:render-script -- `
  --workspace workspaces/test_story_template `
  --failed-only
```

---

## 38. Implementation Phases

### Phase A — Contracts and audit

Implement:

```text
schemas
workspace audit
script beat validation
scene coverage validation
asset manifest schema
render contract compiler
```

Acceptance criteria:

```text
The audit correctly reports that current Bricktoon images are missing.
The test fixture schemas pass.
The negative fixtures fail for the intended reason.
```

### Phase B — Strict renderer

Implement:

```text
resolveSceneAsset
strict_visuals mode
development fallback card
render_report.json
```

Acceptance criteria:

```text
A missing Bricktoon image stops a strict render.
A development render produces a clearly marked diagnostic card.
Every rendered scene records its asset ID.
```

### Phase C — Deterministic fixture rendering

Implement:

```text
mock image provider
fixture images
full test story render
evidence frame export
FFprobe validation
```

Acceptance criteria:

```text
The test story renders from script to MP4 without a live AI provider.
All technical and coverage tests pass.
```

### Phase D — Character references

Implement:

```text
character prompt compiler
provider adapter
character reference generator
manifest registration
character validation
```

Acceptance criteria:

```text
Every test-story character has an approved master reference.
The generation is reproducible through recorded metadata.
```

### Phase E — Scene image generation

Implement:

```text
scene prompt compiler
character-reference attachment
candidate generation
approval state
manifest registration
```

Acceptance criteria:

```text
Every Bricktoon scene has an approved scene image.
The renderer no longer uses text fallbacks.
```

### Phase F — Motion and layered scenes

Implement:

```text
layer manifests
parallax renderer
object animations
caption-safe zones
camera motion presets
```

Acceptance criteria:

```text
At least three scenes visibly move without AI video.
Motion is deterministic and regression-testable.
```

### Phase G — Optional image-to-video

Implement:

```text
short clip provider
clip validation
manifest registration
animated clip preference
```

Acceptance criteria:

```text
At least one hero shot uses an approved animated clip.
The flat or layered fallback remains available.
```

### Phase H — Semantic QC and overnight queue

Implement:

```text
semantic visual validator
queue state
retry rules
preview generation
QC summary
manual approval gate
```

Acceptance criteria:

```text
The overnight pipeline creates a preview, evidence frames, and QC report.
The final publish step still requires explicit approval.
```

---

## 39. CI Strategy

Run these on every code change:

```text
schema tests
script coverage tests
asset resolution tests
negative fixture tests
mock-provider integration render
FFprobe validation
small evidence-frame regression set
```

Do not run live image generation on every code change.

Run these manually or nightly:

```text
real provider smoke test
character continuity review
full-resolution render
semantic visual validation
image-to-video generation
```

---

## 40. Production Safety Rules

- Use an original Bricktoon or blocky-toy visual style.
- Do not depend on official LEGO branding.
- Do not generate official toy logos, packaging, sets, or copyrighted characters.
- Do not show real private addresses or license plates.
- Do not use a real victim’s likeness without permission.
- Keep fictional dramatizations clearly separated from proof scenes.
- Use source cards for factual claims.
- Record prompts, seeds, source claims, and asset lineage.
- Never publish a strict render with a missing-visual diagnostic card.

---

## 41. Recommended First Implementation Sprint

Implement the following in this order:

```text
1. render_contract.json compiler
2. asset_manifest.json schema and loader
3. resolveSceneAsset strict mode
4. render_report.json writer
5. evidence frame exporter
6. script-to-scene coverage tests
7. asset coverage tests
8. FFprobe technical tests
9. mock image provider
10. one six-scene deterministic test story
11. visual regression baselines
12. real character-reference generator
13. real scene-image generator
```

The first sprint is complete when this command passes:

```powershell
npm run test-story:full
```

Expected result:

```text
PASS schema validation
PASS script beat coverage
PASS scene coverage
PASS character references
PASS asset coverage
PASS strict visual resolution
PASS render contract
PASS MP4 render
PASS duration
PASS resolution
PASS audio stream
PASS evidence frames
PASS visual regression

BRICKTOON TEST STORY: PASSED
```

---

## 42. Final Architecture Summary

The updated system must no longer treat a successful MP4 export as proof that a Bricktoon video was produced.

A successful build now requires four things:

```text
1. The script is represented by scene cards.
2. The scene cards resolve to approved Bricktoon assets.
3. The renderer records what it actually displayed.
4. The automated test framework compares the expected render contract with the actual video, render report, and evidence frames.
```

The key engineering principle is:

> Test the story from script beat to rendered evidence frame, not merely from command execution to MP4 file existence.
