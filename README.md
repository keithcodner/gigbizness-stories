# Business Video Docs

Phase 1 scaffolding for a business video production system.

## Phase 1

This milestone provides:

- Repository structure based on the implementation spec
- Starter config and topic files
- A topic-driven workspace generator

## Usage

Install dependencies:

```bash
npm install
```

Initialize a topic workspace:

```bash
npm run init:topic -- --topic tow_truck_dark_side
```

This creates `workspaces/tow_truck_dark_side/` with the expected folder tree and starter files.

## Bricktoon Architecture

Use the consolidated guide here:

- [docs/technical_docs/BRICKTOON_PIPELINE_GUIDE.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/BRICKTOON_PIPELINE_GUIDE.md)
- [docs/technical_docs/PIPELINE_STATE_VISUAL.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/PIPELINE_STATE_VISUAL.md)
- [docs/technical_docs/BRICKTOON_COMFYUI_IMPLEMENTATION.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/BRICKTOON_COMFYUI_IMPLEMENTATION.md)
- [docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md)
- [docs/technical_docs/COMFYUI_PORTABLE_SETUP.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_PORTABLE_SETUP.md)
- [docs/technical_docs/PROJECT_FULL_SETUP_GITHUB_TO_COMFY_RENDER.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/PROJECT_FULL_SETUP_GITHUB_TO_COMFY_RENDER.md)

That document replaces the older split architecture/implementation docs and explains the orchestrator stages, cast system, animation flow, clip generation, render path, and test commands in one place.

Useful commands:

```bash
npm run format -- --topic fake_moving_companies
npm run angle -- --topic fake_moving_companies
npm run cast -- --topic fake_moving_companies
npm run scene-cards -- --topic fake_moving_companies
npm run animation -- --topic fake_moving_companies
```

## Test Story Fixture

Use `topics/test_story_template.json` as the default regression fixture when changing agent, orchestrator, render-plan, or QC behavior.

Quick commands:

```bash
npm run test-story:init
npm run test-story:restart
npm run test-story:guided
npm run test-story:full
npm run test-story:render
npm run reference-sync -- --topic test_story_template
npm run bricktoon:preview -- --topic test_story_template
npm run bricktoon:finish -- --topic test_story_template
```

The goal is not to publish this story. It is a stable test case for the end-to-end pipeline.

`npm run test-story:render` restores a static pre-render snapshot and exports a fresh draft immediately, so visual/render changes can be checked without rerunning research, script, or asset generation first.

For the premium bricktoon path, use a cheaper preview-first flow:

- keep shared source material in `library/reference_images/` and `library/general_assets/`
- choose topic-specific picks in `workspaces/<topic>/04_assets/reference_manifest.json`
- run `npm run reference-sync -- --topic <topic>`
- `npm run bricktoon:preview -- --topic test_story_template`
- inspect `workspaces/test_story_template/06_renders/previews/visual_preview.mp4`
- inspect `workspaces/test_story_template/06_renders/previews/scenes/`
- if the stills look right, run `npm run bricktoon:finish -- --topic test_story_template`

Reference-library workflow guide:

- [docs/technical_docs/BRICKTOON_REFERENCE_LIBRARY_AND_PREVIEW_WORKFLOW.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/BRICKTOON_REFERENCE_LIBRARY_AND_PREVIEW_WORKFLOW.md)
- visual pipeline state board: [docs/technical_docs/PIPELINE_STATE_VISUAL.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/PIPELINE_STATE_VISUAL.md)

## Music Standard

Use music from the local royalty-free library:

- Prefer `C:/Users/admin/Music/royalty free music/@all/good`
- Otherwise use sorted subfolders inside `C:/Users/admin/Music/royalty free music/@all`
- Do not use files sitting directly in the root of `@all`; that root is treated as unsorted

Each workspace now seeds `04_assets/music/music_selection.md` and `04_assets/music/music_manifest.csv`, and QC expects the selected track to be documented there.

## ComfyUI Setup

For the current working local ComfyUI path and full project bootstrap:

- use [docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md) for daily startup
- use [docs/technical_docs/COMFYUI_PORTABLE_SETUP.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_PORTABLE_SETUP.md) to recreate the ComfyUI install on another machine
- use [docs/technical_docs/PROJECT_FULL_SETUP_GITHUB_TO_COMFY_RENDER.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/PROJECT_FULL_SETUP_GITHUB_TO_COMFY_RENDER.md) for the full repo-to-render setup path
