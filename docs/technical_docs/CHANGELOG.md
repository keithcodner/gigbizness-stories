# Technical Change Log

This log tracks implementation changes, bug fixes, and incidental fixes discovered while working on the pipeline.

## 2026-07-14

### Added

- Added `scripts/startup-script/start_comfyui.ps1` plus `npm run comfy:start` so the repo can launch the manual `C:\AI\ComfyUI-GTX1080` ComfyUI install from a single project-local command.
- Added a first-class `bricktoon-auto` orchestrator stage plus `npm run bricktoon:auto` so the premium bricktoon visual pipeline can run as one automatic command while the individual manual stages remain available.
- Added `docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md` so the full manual ComfyUI startup path, `.env` settings, checkpoint location, and repo test commands are documented in one place for future reuse.
- Added `docs/technical_docs/COMFYUI_PORTABLE_SETUP.md` so the manual ComfyUI install can be recreated on another machine without retracing the full debugging trail.
- Added `docs/technical_docs/PROJECT_FULL_SETUP_GITHUB_TO_COMFY_RENDER.md` so the entire path from GitHub clone to Comfy-backed bricktoon render is documented as one repeatable setup flow.
- Added `docs/technical_docs/BRICKTOON_COMFYUI_IMPLEMENTATION.md` as the new source-of-truth implementation document for the ComfyUI-first bricktoon rendering path.
- Added `docs/technical_docs/VISUAL_REFERENCE_INTERPRETATION.md` so reference-driven quality targets are documented as style/quality matching rules instead of copy instructions.
- Added a repo-local `.env` loader so provider configuration now works from `.env` without requiring the shell to pre-export variables first.
- Added `config/visual_generation.json` so visual-provider defaults are centralized and the architecture can prefer OpenAI image generation while preserving fallback behavior.
- Added a first-class ComfyUI image provider for local asset-generation using the standard ComfyUI prompt/history/view API flow.
- Added a managed workflow-template registry, quality-tier mapping, and workflow-request/provider-report metadata layer for ComfyUI-first character refs, scene stills, and shot keyframes.
- Added a scene-sequence upgrade layer for bricktoon animation with new orchestrator stages: `scene-beats`, `shot-planner`, `bricktoon-shots`, and `scene-assembly`.
- Added `scripts/generate_scene_beats.js` so scene cards and timing data can be split into structured multi-beat visual sequences.
- Added `scripts/generate_shot_plan.js` so each scene beat becomes a concrete timed shot with framing, continuity, and camera instructions.
- Added `scripts/generate_bricktoon_shot_clips.js` so the pipeline now renders multiple procedural shot clips per scene instead of relying on one animated poster-style clip.
- Added `scripts/assemble_bricktoon_scene_sequences.js` so shot clips are concatenated into preferred scene-level assets.
- Added `src/bricktoon/proceduralSequenceRenderer.js` as the shared renderer for higher-variety shot compositions, closeups, inserts, and reaction framing.
- Added shot-level animation performance output at `08_animation/shot_performances.json`.
- Added test-story sequence outputs and preview evidence so the upgraded animation path can be inspected quickly during regression checks.
- Added the first Bricktoon 2 AI-quality pipeline layer with new orchestrator-backed stages for `visual-character-bible`, `visual-production-router`, `shot-art-direction`, `composition-guides`, `asset-generation`, `asset-consistency-validation`, `layer-extraction`, `character-rigging`, `ai-video-motion-passes`, and `shot-compositing`.
- Added `00_brief/visual_quality_profile.json` and `03_cast/visual_character_bible.json` as seeded workspace contracts for quality targeting and character continuity.
- Added provider-agnostic mock implementations for higher-quality keyframes, composition guides, layer manifests, clean plates, character rigs, AI-motion placeholders, and composited shot clips so the full architecture can run before a real external image/video provider is attached.
- Added an OpenAI image provider adapter and provider selector so character refs, scene stills, and shot keyframes can use `gpt-image-1` as the default architecture path.

### Changed

- Updated the orchestrator contract and npm scripts so the new shot-based stages are first-class workflow steps instead of side experiments.
- Updated the architecture so ComfyUI is now the default premium image provider, with repo-managed workflow ids deciding how character refs, scene stills, keyframes, and motion sources are requested.
- Updated visual-bible, layer-extraction, rigging, motion-pass, compositing, render-contract, and audit outputs so they carry richer continuity, selection-reason, and quality metadata instead of only output existence.
- Updated visual-provider configuration so ComfyUI is now the default premium image provider, OpenAI remains a supported compatibility option, and provider selection can now be controlled from `.env` as well as shell env.
- Updated render asset resolution to prefer `bricktoon_scene_sequence` over older animated and static bricktoon assets.
- Updated the bricktoon compatibility stage so `bricktoon-clips` now acts as a wrapper around the newer sequence pipeline rather than a separate legacy generator.
- Updated the condensed bricktoon technical guide so it reflects the current multi-shot animation workflow and troubleshooting path.
- Updated scene assembly and render planning so composited shot outputs can be preferred automatically while older procedural shot and scene assets remain valid fallbacks.
- Updated the bricktoon audit so the new AI-quality layer is included in implementation checks instead of living outside the existing audit path.
- Updated bricktoon image-generation scripts so they now prefer the configured OpenAI provider first and automatically fall back to mock generation when credentials are unavailable or the provider call fails.

### Fixed

- Fixed an encoding glitch in the portable ComfyUI setup doc so it now reads cleanly in plain text editors and terminal viewers.
- Fixed a workflow limitation where "animation" could still look like one held text card by introducing multiple timed shots inside a scene before final render assembly.
- Fixed a contract gap where premium image-generation stages could produce files but not the request/report metadata needed to rerun, debug, or audit a managed ComfyUI workflow stack.
- Fixed a QC/audit reliability gap where some missing premium-output artifacts could print as failures without actually affecting the final audit status.
- Fixed a ComfyUI workflow-template bug where baked-in template checkpoints could override the user-configured checkpoint from `.env`, causing valid local models to be rejected during prompt validation.
- Fixed a configuration gap where users could define image-provider settings in `.env` but the pipeline would ignore them unless the current shell session had already loaded those variables.
- Identified a local ComfyUI connectivity gap where the repo was targeting `127.0.0.1:8188` while the desktop app was configured to listen on `127.0.0.1:8000`.
- Identified an environment-layout gap where `C:\Users\admin\Documents\ComfyUI` contained models and a virtualenv but not the actual ComfyUI application entrypoint, while the installed desktop app lived under `C:\Users\admin\AppData\Local\Programs\ComfyUI`.
- Identified a local runtime compatibility gap on the GTX 1080 machine where ComfyUI could accept API requests and validate prompts but failed during execution with `CUDA error: no kernel image is available for execution on the device`, pointing to a bundled CUDA/PyTorch mismatch rather than a repo workflow bug.

### Notes

- Current recommended local ComfyUI integration path for the GTX 1080 workstation is a manual ComfyUI source install with Python 3.10 64-bit and a Pascal-friendly Torch/CUDA stack, instead of relying on the desktop bundle alone for production repo integration.
- Fixed a pipeline-readiness gap where shot generation and scene assembly could appear complete as soon as any file existed in the output folders; readiness now checks expected shot and scene coverage against planning data and approved manifest assets.
- Fixed a voice-stage gap where draft renders could contain a formal audio stream but no audible narration because the pipeline was normalizing silent placeholder WAVs; draft voice generation now attempts Windows built-in TTS first and only falls back to silence if synthesis is unavailable.
- Fixed an architecture gap where premium AI-quality visual work could be described in docs but had no orchestrator stages, seeded workspace outputs, or manifest-compatible fallback path in the executable pipeline.
- Fixed a provider gap where asset generation was still hardwired to the mock renderer even after the new AI-quality architecture introduced provider-agnostic contracts.

## 2026-07-09

### Added

- Created `docs/technical_docs/` as the home for technical change tracking and workflow notes.
- Added a repo-level `.gitignore` so generated workspace output is ignored by default.
- Added a persistent guided-pipeline status file per workspace via `guided_status.md`.
- Added guided orchestration commands `--guided` and `--full`.
- Added a topic restart command that wipes and recreates a workspace from its topic JSON.
- Added publishing-loop support for analytics review, topic scoring, and next-week planning.
- Added a QC stage that writes `quality_report.md`, `required_fixes.md`, `optional_improvements.md`, and `final_approval.md`.
- Added overnight queue processing with locking, resume support, and morning reports.
- Added a repo-level `config/music_policy.json` so music sourcing rules are centralized instead of living only in ad hoc notes.
- Added seeded workspace music-planning files in `04_assets/music/` so every topic documents its soundtrack choice before QC.
- Added the first bricktoon architecture layer with format recipes, style rules, schemas, and reusable character scaffolds.
- Added a dedicated `test_story_template` topic fixture plus npm shortcuts so pipeline changes can be regression-tested against a stable story.
- Added seeded research notes for `test_story_template` so guided-mode regression runs start with realistic input instead of an empty stub.
- Added seeded source rows and fact-table rows for `test_story_template` so the research stage can clear approval thresholds after a reset.
- Added a static pre-render snapshot plus `npm run test-story:render` so the regression fixture can restore known-good inputs and draft-render immediately.
- Added first-class bricktoon image-generation scripts for character refs, scene images, asset-manifest assembly, render-contract compilation, and implementation auditing.
- Added the first structured Bricktoon cast-architecture layer with reusable role vocabulary, archetype libraries, prop/environment libraries, cast-package schemas, deterministic cast compilation, and cast regression tests.
- Added the first real Bricktoon reference-intake records for user-supplied thumbnails, including approved trait abstractions and blocked-copy rules for future compliant asset generation.
- Added an orchestrator-integration contract plus an audit command so future architecture changes have an explicit checklist and do not get stranded outside guided/stage orchestration.
- Added an isolated procedural Bricktoon animation sample path so character-layer motion can be proven independently of placeholder generated scene art.

### Changed

- Standardized workspace generation to include publish analytics seed files and QC support files.
- Updated the orchestrator so guided/full mode can resume work and surface clear blockers.
- Updated the orchestrator so a topic can be reset back to a clean workspace and queue state.
- Updated the fake movers research package with official and regulator-backed sources so it can pass the research gate.
- Advanced `fake_moving_companies` through refreshed script, assets, render-plan, QC, and final 1080p export.
- Updated the render-plan stage to carry a selected music bed into scene metadata and audio planning notes.
- Updated repo guidance so the default soundtrack source is the local sorted royalty-free library, preferring `@all/good`.
- Updated the orchestrator to support format, angle, cast, scene-card, and animation/edit-plan stages on top of the legacy workflow.
- Updated the script, visual, render-plan, and QC stages so they can consume bricktoon preproduction files when present.
- Updated repo docs so the test-story fixture is the standard quick-check path after workflow changes.
- Updated workspace initialization so topic-specific fixture content can be backfilled into older test workspaces automatically.
- Updated `research_agent` so the test-story fixture loads template research CSVs instead of regenerating weak placeholder rows.
- Updated the test-story workflow so render checks can skip dynamic upstream generation and use a fixed snapshot for faster visual verification.
- Tightened the static test-render command so it verifies the produced draft file is non-trivial instead of only trusting the renderer exit code.
- Updated the orchestrator so bricktoon character generation, scene-image generation, manifest assembly, render-contract compilation, and bricktoon auditing are all callable as native stages and are included in guided/render flow.
- Updated the character and scene-card pipeline so `03_cast` now produces and consumes a real cast package: `cast_request.json`, `role_requirements.json`, `cast_continuity.json`, `scene_cast_map.json`, `prop_assignments.json`, `reference_usage.json`, `cast_validation.json`, and `cast_report.md`.
- Updated orchestrator readiness rules so guided mode now treats cast as a post-script package stage, requires a passing `cast_validation.json`, and automatically invalidates stale scene cards when cast data changes.
- Updated the reference system so branded thumbnail examples can be stored as analysis-only records with reusable trait extraction instead of being treated like directly copyable assets.
- Updated project skill guidance so orchestrator wiring is part of the definition of done for reusable pipeline architecture changes.
- Updated animation architecture direction to support a procedural proof layer first, so later AI-generated character parts can slot into a tested animation engine instead of hiding behind text-card renders.

### Fixed

- Fixed npm guided/full argument parsing so commands like `npm run guided -- --topic fake_moving_companies` work correctly.
- Fixed guided mode so partially-built topics resume instead of always forcing users back to empty manual notes.
- Fixed guided mode to save blocked/ready state to `guided_status.md`.
- Identified cross-topic contamination in crime-story outline/script generation where towing-specific language leaked into other topics.
- Identified a render-plan pacing bug where long scenes could never satisfy the 8-second visual-change rule because only 3 visuals were selected.
- Identified a research-seeding bug where manual-note title ideas and planning bullets were being treated as factual claims, inflating blocked-claim counts.
- Fixed crime-story outline generation to use topic-aware generic language instead of towing-specific copy.
- Fixed crime-story script generation so moving topics no longer inherit tow-truck narration and visuals.
- Fixed research seeding to ignore title ideas, search queries, and other planning bullets that are not factual claims.
- Fixed visual-asset generation to create draft-safe generated support cards for every scene.
- Fixed render-plan pacing to select enough visuals for longer scenes and duplicate safe fallbacks when needed for draft timing.
- Fixed QC visual checks to allow unresolved manual placeholders when a scene already has generated draft fallback assets.
- Fixed source validation so general scam-context statistics are not treated like legal accusations just because they contain words like `scam` or `fraud`.
- Fixed the malformed Canada regulator fact row in `fake_moving_companies` research data.
- Fixed the `fake_moving_companies` workspace so research, visuals, and QC now pass end to end.
- Fixed the renderer itself so it now attempts to render actual scene assets before falling back to text cards.
- Added workflow enforcement that final export requires a visual plan plus minimum real visual/stock asset counts.
- Added guided-mode blocking for missing stock footage and weak real-visual coverage.
- Switched generated chart/fact-card outputs from SVG-only to PNG assets so the renderer can use them reliably on this machine.
- Fixed Windows FFmpeg concat path handling in the visual-first renderer.
- Re-ran `fake_moving_companies` under the stricter visual rules so it is now correctly blocked on missing real footage instead of falsely appearing complete.
- Fixed a workflow gap where music selection had no standard location, no approved-library rule, and no QC validation.
- Fixed future-topic drift by teaching QC to reject tracks chosen from outside the approved library or directly from the unsorted root of `@all`.
- Fixed the architecture gap where character-driven cartoon storytelling existed only in planning docs but not in the executable pipeline.
- Fixed a workflow gap where the new bricktoon visual scripts existed but were not yet attached to orchestrator stage dispatch, guided sequencing, or render preparation.
- Fixed a long-term architecture gap where cast creation only wrote a flat `cast.json`, leaving no deterministic role extraction, continuity rules, prop mapping, scene cast assignments, or testable validation contract for future visual generation.
- Fixed an orchestrator mismatch where the new cast architecture could still run in the old order and be marked ready by a thin `cast.json` check even when script-driven cast outputs were stale or incomplete.
- Fixed a future asset-safety gap by documenting brand/logo/storefront elements from user-supplied references as explicit `do_not_copy` and `blocked_traits` data before those examples reach prompt generation.
- Fixed a process gap where architecture changes could be implemented in code or docs but forgotten in orchestrator integration because there was no persistent contract or audit reminder.
- Fixed a core validation gap where “animation” could appear successful even when the output was just text or placeholder art, by creating a sample that must animate independently controlled character layers and produce inspectable evidence frames.

- Fixed a cast-schema drift bug where bricktoon visual-generation scripts could still read only the legacy flat `cast` array and silently miss the newer `cast_members` package format.
- Added a first-class `bricktoon-clips` orchestrator stage that generates approved procedural `bricktoon_animated_clip` assets from the current cast package, scene cards, and animation plan so render planning can prefer moving character scenes over static placeholders.
- Fixed a workspace-bloat gap by cleaning up per-scene temporary frame folders after procedural clip encoding completes.
- Consolidated the split bricktoon architecture and implementation docs into a single condensed guide at `docs/technical_docs/BRICKTOON_PIPELINE_GUIDE.md`.
- Removed the now-redundant top-level bricktoon architecture/implementation markdown files so there is one primary technical reference instead of parallel docs drifting apart.

### Process

- Any fix discovered while working, even if incidental to the main request, must be documented in this change log.
