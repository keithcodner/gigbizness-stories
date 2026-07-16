# Bricktoon Reference Library And Preview Workflow

This document defines the practical production path for building bricktoon stories from reusable references, approved stills, and preview review checkpoints.

## Goal

Make the system usable for overnight runs without wasting hours on bad downstream renders.

The flow is:

1. keep a shared organized reference/asset library
2. sync only the references a topic needs into the workspace
3. generate character refs and shot keyframes from those references
4. review a scene-divided preview with available voice/music
5. only after approval continue into motion or manual editorial finishing

## Shared Library Structure

Repo-level reusable folders:

- `library/reference_images/`
- `library/general_assets/`

Reference library is for:

- premium thumbnail examples
- style references
- lighting references
- composition references

General assets library is for reusable organized subject buckets such as:

- `people`
- `workers`
- `office_workers`
- `villains_men`
- `villains_women`
- `facial_expressions`
- `pets`
- `cars`
- `trucks`
- `police`
- `police_rooms`
- `prisons`
- `hospitals`
- `hospital_rooms`
- `buildings`
- `houses`
- `offices`
- `rooms`
- `interiors`

## Workspace-Level Selection

Each topic workspace now has:

- `04_assets/reference_manifest.json`
- `04_assets/reference_images/`

`reference_manifest.json` is the workspace selection file.

It can name:

- exact library images to copy
- broad asset categories to copy

Example:

```json
{
  "mode": "selected",
  "selected_references": [
    "library/reference_images/Screenshot_29.png"
  ],
  "selected_asset_categories": [
    "police",
    "buildings"
  ]
}
```

## Sync Stage

Use:

```powershell
npm run reference-sync -- --topic test_story_template
```

This copies selected library assets into:

- `workspaces/<topic>/04_assets/reference_images/library_sync/`

It also writes:

- `04_assets/reference_images/reference_sync_report.json`

## Generation Strategy

The current Phase 1 behavior is:

- reference images are passed into the ComfyUI provider path
- character-ref generation can use a reference-driven image workflow
- shot-keyframe generation can use a reference-driven image workflow
- placeholder-like PNG outputs are now rejected instead of silently accepted

This means the system now distinguishes between:

- successful provider execution
- valid premium output

## Preview Gate

Use:

```powershell
npm run bricktoon:preview -- --topic test_story_template
```

This runs:

1. `reference-sync`
2. `bricktoon-characters`
3. `asset-generation`
4. `visual-preview`

Outputs:

- combined preview:
  - `06_renders/previews/visual_preview.mp4`
- scene-divided preview clips:
  - `06_renders/previews/scenes/S01_preview.mp4`
  - `06_renders/previews/scenes/S02_preview.mp4`
  - etc
- preview report:
  - `06_renders/previews/visual_preview_report.json`

If available, the combined preview can include:

- `03_voice/voiceover_clean.wav`
- a selected track from `04_assets/music/music_manifest.csv`

## Finish Stage

After preview approval, continue with:

```powershell
npm run bricktoon:finish -- --topic test_story_template
```

This continues into:

- layer extraction
- rigging
- motion passes
- shot compositing
- scene assembly
- render contract
- draft render

## Overnight Use

Recommended overnight path:

1. curate `reference_manifest.json`
2. confirm voice/music inputs exist if desired
3. run `bricktoon:preview`
4. inspect the preview in the morning
5. only then run `bricktoon:finish`

## Test Story Purpose

`test_story_template` should stay small and generic.

Its job is:

- prove the process works
- catch regressions quickly
- avoid wasting time on a full production story while the architecture is still evolving
