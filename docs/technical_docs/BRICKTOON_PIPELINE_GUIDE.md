# Bricktoon Pipeline Guide

This is the single condensed reference for how the Gigbizness Stories bricktoon pipeline works today.

## Purpose

The system produces researched business-story videos with fictional bricktoon characters layered on top of the standard workflow.

The pipeline has two goals:

- keep the research, legal-risk, and QC workflow intact
- replace text-only placeholder visuals with reusable character-driven animated scenes

## High-Level Flow

The orchestrator is the source of truth for stage order and execution. The current practical flow is:

`format -> research -> angle -> script -> cast -> scene-cards -> bricktoon-characters -> voice -> assets -> bricktoon-scenes -> bricktoon-manifest -> animation -> bricktoon-clips -> render-contract -> render -> shorts -> qc -> bricktoon-audit`

Main orchestrator file:

- [agents/orchestrator.js](C:/xampp/htdocs/apps/gigbizness-stories/agents/orchestrator.js)

## What Each Stage Does

`format`

- Chooses the format recipe and style direction.
- Default bricktoon format is `bleak_explainer_bricktoon`.

Key files:

- `00_brief/format_recipe.json`
- `00_brief/format_brief.md`
- `00_brief/style_guide.md`

`research`

- Builds the evidence package.
- Fills approved facts, blocked claims, sources, and risk notes.
- Guided mode blocks here until research thresholds are met.

Key files:

- `01_research/sources.csv`
- `01_research/approved_facts.csv`
- `01_research/source_risk_report.md`
- `01_research/blocked_claims.md`

`angle`

- Turns research into the story angle and beat sheet.

Key files:

- `02_angle/angle.md`
- `02_angle/beat_sheet.md`

`script`

- Produces the longform script, outline, and shotlist.

Key files:

- `02_script/script_v2_human_review.md`
- `02_script/shotlist.csv`

`cast`

- Compiles the reusable bricktoon cast package from the beat sheet.
- Assigns story roles, continuity rules, scene-role mapping, and prop assignments.

Key files:

- `03_cast/cast.json`
- `03_cast/scene_cast_map.json`
- `03_cast/prop_assignments.json`
- `03_cast/cast_validation.json`
- `03_cast/cast_report.md`

Important detail:

- The modern cast package uses `cast_members`.
- The pipeline now also tolerates the older flat `cast` array for compatibility.

`scene-cards`

- Converts the script into scene-by-scene visual instructions.
- Each scene card names characters, environment, camera direction, caption text, and legal risk.

Key files:

- `05_scene_cards/scene_cards.json`
- `05_scene_cards/shot_list.md`

`bricktoon-characters`

- Generates character reference assets and prompt files.
- Current implementation uses a mock/provider layer, but the stage contract is ready for real image generation later.

Key outputs:

- `07_visuals/character_refs/...`
- `07_visuals/prompts/characters/...`

`voice`

- Produces or prepares the narration audio and captions.

Key files:

- `03_voice/voiceover_clean.wav`
- `03_voice/captions.srt`

`assets`

- Builds non-character visual support files such as stock-video planning, charts, documents, and general visual manifests.

Key files:

- `04_assets/visual_manifest.csv`
- `04_assets/visual_plan.md`
- `04_assets/visual_readiness.json`

`bricktoon-scenes`

- Generates static scene-image placeholders tied to scene cards.
- These remain useful as fallback visuals, posters, or planning assets.

Key outputs:

- `07_visuals/generated_images/*_main.bmp`
- `07_visuals/prompts/scenes/...`

`bricktoon-manifest`

- Finalizes the structured visual asset manifest.

Key file:

- `07_visuals/asset_manifest.json`

`animation`

- Produces scene-level motion directives from scene cards and cast assignments.
- This is where the system decides whether a scene should use things like blink passes, talk emphasis, invoice counters, villain emphasis, proof reveals, typing overlays, or impact shake.

Key files:

- `08_animation/animation_plan.json`
- `08_animation/camera_moves.json`
- `09_edit_plan/edit_plan.md`

`bricktoon-clips`

- Generates procedural animated scene clips from the current cast package, scene cards, and animation plan.
- This is the current bridge between static planning data and actual moving bricktoon scenes.
- The output asset type is `bricktoon_animated_clip`.

Key outputs:

- `08_animation/animated_clips/*.mp4`
- `07_visuals/generated_images/*_procedural_poster.png`
- `07_visuals/asset_manifest.json` updated with approved animated-clip assets

`render-contract`

- Resolves which approved asset each scene should use.
- Encodes fallback rules and render-mode expectations.

Key file:

- `09_edit_plan/render_contract.json`

`render`

- Builds the scene manifest and final draft/final MP4.
- If an approved `bricktoon_animated_clip` exists for a scene, the renderer now prefers it over a static `bricktoon_scene`.

Key outputs:

- `05_render_plan/scene_manifest.json`
- `05_render_plan/render_plan.json`
- `06_renders/draft_01.mp4`
- `06_renders/final_1080p.mp4`

`shorts`

- Produces shorts, thumbnail concepts, and publish metadata.

`qc`

- Runs quality checks and blocks final export when required fixes remain.

Key files:

- `10_qc/quality_report.md`
- `10_qc/required_fixes.md`
- `10_qc/final_approval.md`

`bricktoon-audit`

- Audits whether the bricktoon implementation produced the expected outputs and asset coverage.

## How Visual Selection Works

The renderer does not blindly trust one file type. It resolves approved scene assets in this priority order:

1. `bricktoon_animated_clip`
2. `bricktoon_layered_scene`
3. `bricktoon_scene`
4. source/document/chart/text fallbacks

That logic lives in:

- [src/render/resolveSceneAsset.js](C:/xampp/htdocs/apps/gigbizness-stories/src/render/resolveSceneAsset.js)

This means a scene can still render if only static assets exist, but the pipeline automatically upgrades to motion when animated clips are available.

## Current Animation Model

Right now the animation system is procedural, not full character rigging.

What it already supports:

- camera push and drift
- blink passes
- speech-energy pulses
- villain emphasis
- invoice/price jumps
- proof-folder reveal
- warning icon pulses
- typing overlays
- impact shake

What it does not fully support yet:

- true mouth phonemes
- articulated arm rigs
- head-turn interpolation
- detailed prop interaction
- frame-accurate brick-hand manipulation

That next layer should plug into the existing `bricktoon-clips` stage rather than replacing the orchestrator design.

## Key Data Contracts

`cast.json`

- defines reusable cast members and continuity

`scene_cards.json`

- defines scene intent, camera, characters, and caption

`animation_plan.json`

- defines motion directives for each scene

`asset_manifest.json`

- declares approved character refs, static scenes, and animated clips

`render_contract.json`

- resolves which asset each scene should actually consume

## Test and Preview Workflow

Primary regression fixture:

- `topics/test_story_template.json`

Useful commands:

```powershell
npm run test:cast
npm run test:bricktoon
npm run animation:sample
npm run animation:sample:test
npm run test-story:bricktoon-preview
npm run test-story:render
npm run audit:orchestrator
```

What they are for:

- `animation:sample` proves isolated character-layer motion works at all
- `test-story:bricktoon-preview` regenerates procedural bricktoon clips for the stable test story
- `test-story:render` produces a fresh draft render using current pipeline logic
- `audit:orchestrator` checks that new architecture work is actually wired into the orchestrator

## Where To Look When Something Breaks

If clips are not moving:

- inspect `08_animation/animation_plan.json`
- inspect `08_animation/animated_clips/`
- inspect `07_visuals/asset_manifest.json`

If render falls back to static/text visuals:

- inspect `09_edit_plan/render_contract.json`
- inspect `05_render_plan/scene_manifest.json`
- inspect [src/render/resolveSceneAsset.js](C:/xampp/htdocs/apps/gigbizness-stories/src/render/resolveSceneAsset.js)

If guided mode blocks:

- inspect `guided_status.md`
- inspect `10_qc/required_fixes.md`
- inspect `01_research/source_risk_report.md`

## Standards We Are Following

- research must clear approval thresholds before guided/full flow continues
- workspaces are generated and reset through the orchestrator
- soundtrack choices should come from the sorted local royalty-free music library
- all reusable architecture changes should be wired into orchestrator flow
- incidental fixes should be documented in `docs/technical_docs/CHANGELOG.md`

## Recommended Reading Order

If you only want one document, use this one.

If you want to trace execution after this:

1. [agents/orchestrator.js](C:/xampp/htdocs/apps/gigbizness-stories/agents/orchestrator.js)
2. [agents/animation_agent.js](C:/xampp/htdocs/apps/gigbizness-stories/agents/animation_agent.js)
3. [scripts/generate_bricktoon_animated_clips.js](C:/xampp/htdocs/apps/gigbizness-stories/scripts/generate_bricktoon_animated_clips.js)
4. [agents/render_plan_agent.js](C:/xampp/htdocs/apps/gigbizness-stories/agents/render_plan_agent.js)
5. [scripts/ffmpeg_render.py](C:/xampp/htdocs/apps/gigbizness-stories/scripts/ffmpeg_render.py)

## Bottom Line

The pipeline now works like this:

- research and scripting produce a controlled story package
- cast and scene-card stages turn that package into reusable bricktoon scene intent
- animation turns scene intent into motion directives
- `bricktoon-clips` turns those directives into real moving scene assets
- render prefers those moving assets and produces the draft video
- QC decides whether the result is publishable
