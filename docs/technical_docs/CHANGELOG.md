# Technical Change Log

This log tracks implementation changes, bug fixes, and incidental fixes discovered while working on the pipeline.

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

### Process

- Any fix discovered while working, even if incidental to the main request, must be documented in this change log.
