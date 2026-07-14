# Bricktoon Pipeline Guide

This is the single condensed reference for how the Gigbizness Stories bricktoon pipeline works today.

## Purpose

The system produces researched business-story videos with fictional bricktoon characters layered on top of the standard workflow.

The pipeline has two goals:

- keep the research, legal-risk, and QC workflow intact
- replace text-only placeholder visuals with reusable character-driven animated scenes

## High-Level Flow

The orchestrator is the source of truth for stage order and execution. The current practical flow is:

`format -> research -> angle -> script -> cast -> scene-cards -> scene-beats -> shot-planner -> bricktoon-characters -> voice -> assets -> bricktoon-scenes -> bricktoon-manifest -> animation -> bricktoon-shots -> scene-assembly -> bricktoon-clips -> render-contract -> render -> shorts -> qc -> bricktoon-audit`

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

`scene-beats`

- Breaks each scene into smaller visual story beats so a single scene no longer has to live inside one static poster composition.
- Creates the first structured bridge from narration timing into multi-shot animation planning.

Key files:

- `06_scene_beats/scene_beats.json`
- `06_scene_beats/scenes/*_beats.json`
- `06_scene_beats/scene_beats_report.md`

`shot-planner`

- Converts scene beats into concrete shots with framing, timing, camera movement, and continuity rules.
- This is where one scene becomes a sequence of wides, mediums, inserts, reactions, and closeups.

Key files:

- `07_shot_plans/shot_plan.json`
- `07_shot_plans/scenes/*_shots.json`
- `07_shot_plans/layout_assignments.json`
- `07_shot_plans/shot_plan_report.md`

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

- Produces motion directives from scene cards, cast assignments, and shot plans.
- The current implementation now includes shot-level performance timing in addition to scene-level motion intent.
- This is where the system decides whether a scene should use things like blink passes, talk emphasis, invoice counters, villain emphasis, proof reveals, typing overlays, or impact shake.

Key files:

- `08_animation/animation_plan.json`
- `08_animation/shot_performances.json`
- `08_animation/camera_moves.json`
- `09_edit_plan/edit_plan.md`

`bricktoon-shots`

- Generates procedural animated shot clips from the current cast package, shot plan, and animation plan.
- This is the first stage that turns planning into actual moving bricktoon footage.

Key outputs:

- `08_animation/shot_clips/*.mp4`
- `07_visuals/generated_images/shot_posters/*.png`

`scene-assembly`

- Concatenates shot clips into per-scene motion sequences.
- Writes the preferred scene-level animated asset used by render planning.
- The primary output asset type is now `bricktoon_scene_sequence`.

Key outputs:

- `08_animation/scene_sequences/*_sequence.mp4`
- `08_animation/scene_sequences/scene_sequence_report.json`
- `07_visuals/asset_manifest.json` updated with approved scene-sequence assets

`bricktoon-clips`

- Compatibility wrapper stage.
- Ensures scene beats, shot plans, animation, shot clips, and scene assembly are complete.
- Keeps older commands and habits working while the internals use the newer shot-based sequence system.

Key outputs:

- `08_animation/scene_sequences/*_sequence.mp4`
- `07_visuals/asset_manifest.json` updated with approved `bricktoon_scene_sequence` and compatibility `bricktoon_animated_clip` entries

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

1. `bricktoon_scene_sequence`
2. `bricktoon_animated_clip`
3. `bricktoon_shot_clip`
4. `bricktoon_layered_scene`
5. `bricktoon_scene`
6. source/document/chart/text fallbacks

That logic lives in:

- [src/render/resolveSceneAsset.js](C:/xampp/htdocs/apps/gigbizness-stories/src/render/resolveSceneAsset.js)

This means a scene can still render if only static assets exist, but the pipeline automatically upgrades to motion when animated clips are available.

## Current Animation Model

Right now the animation system is procedural, not full character rigging. The important upgrade is that it is now shot-based, so each scene can cut between multiple compositions instead of holding on one text-heavy frame.

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

`shot_plan.json`

- defines the shots, framing, and timing inside each scene

`shot_performances.json`

- defines shot-level character performance cues

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
npm run scene-beats -- --topic test_story_template
npm run shot-planner -- --topic test_story_template
npm run bricktoon:shots -- --topic test_story_template
npm run scene:assembly -- --topic test_story_template
npm run animation:sample
npm run animation:sample:test
npm run test-story:bricktoon-preview
npm run test-story:sequence
npm run test-story:render
npm run audit:orchestrator
```

What they are for:

- `animation:sample` proves isolated character-layer motion works at all
- `bricktoon:shots` regenerates shot-level motion clips from the current test-story shot plan
- `scene:assembly` assembles those shot clips into per-scene animated sequences
- `test-story:bricktoon-preview` runs the compatibility wrapper for the full animated-sequence path
- `test-story:render` produces a fresh draft render using current pipeline logic
- `audit:orchestrator` checks that new architecture work is actually wired into the orchestrator

## Where To Look When Something Breaks

If clips are not moving:

- inspect `08_animation/animation_plan.json`
- inspect `08_animation/shot_performances.json`
- inspect `08_animation/shot_clips/`
- inspect `08_animation/scene_sequences/`
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
3. [scripts/generate_scene_beats.js](C:/xampp/htdocs/apps/gigbizness-stories/scripts/generate_scene_beats.js)
4. [scripts/generate_shot_plan.js](C:/xampp/htdocs/apps/gigbizness-stories/scripts/generate_shot_plan.js)
5. [scripts/generate_bricktoon_shot_clips.js](C:/xampp/htdocs/apps/gigbizness-stories/scripts/generate_bricktoon_shot_clips.js)
6. [scripts/assemble_bricktoon_scene_sequences.js](C:/xampp/htdocs/apps/gigbizness-stories/scripts/assemble_bricktoon_scene_sequences.js)
7. [agents/render_plan_agent.js](C:/xampp/htdocs/apps/gigbizness-stories/agents/render_plan_agent.js)
8. [scripts/ffmpeg_render.py](C:/xampp/htdocs/apps/gigbizness-stories/scripts/ffmpeg_render.py)

## Bottom Line

The pipeline now works like this:

- research and scripting produce a controlled story package
- cast and scene-card stages turn that package into reusable bricktoon scene intent
- scene-beats and shot-planner turn each scene into a multi-shot sequence design
- animation turns that sequence design into motion directives and shot performances
- `bricktoon-shots` generates the moving shot footage
- `scene-assembly` turns those shots into real per-scene animated assets
- render prefers those moving assets and produces the draft video
- QC decides whether the result is publishable
