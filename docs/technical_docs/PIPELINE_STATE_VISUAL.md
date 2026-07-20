# Pipeline State Visual

Last updated: July 20, 2026

## Status Board

```text
PIPELINE STATUS
|
|-- FOUNDATION / ORCHESTRATOR ............... [WORKING]
|   |-- stage wiring ........................ [WORKING]
|   |-- topic workspace generation .......... [WORKING]
|   |-- restart / guided / full flows ....... [WORKING]
|   `-- changelog / docs discipline ......... [WORKING]
|
|-- RESEARCH -> SCRIPT CORE ................. [WORKING]
|   |-- research package .................... [WORKING]
|   |-- angle / beat sheet .................. [WORKING]
|   |-- script / scene cards ................ [WORKING]
|   `-- test story fixture .................. [WORKING]
|
|-- BRICKTOON PREPRODUCTION ................. [WORKING]
|   |-- cast package ........................ [WORKING]
|   |-- visual character bible .............. [WORKING]
|   |-- scene beats ......................... [WORKING]
|   |-- shot planner ........................ [WORKING]
|   |-- art direction / composition guides .. [WORKING]
|   `-- production routing .................. [WORKING]
|
|-- SHARED REFERENCE LIBRARY ................ [PARTIAL]
|   |-- library/reference_images ............ [WORKING]
|   |-- library/general_assets .............. [WORKING]
|   |-- library catalog index ............... [WORKING]
|   |-- reference manifest selection ........ [WORKING]
|   `-- populated reusable catalog .......... [PARTIAL]
|
|-- COMFYUI INTEGRATION ..................... [PARTIAL]
|   |-- local startup path .................. [WORKING]
|   |-- .env configuration .................. [WORKING]
|   |-- provider selection .................. [WORKING]
|   |-- request/report metadata ............. [WORKING]
|   |-- reference image upload path ......... [WORKING]
|   `-- stable long-run shot generation ..... [UNSTABLE]
|
|-- IMAGE GENERATION ........................ [PARTIAL]
|   |-- character refs generate files ....... [WORKING]
|   |-- shot keyframes generate files ....... [PARTIAL]
|   |-- placeholder rejection ............... [WORKING]
|   |-- single-character lock ............... [WEAK]
|   |-- thumbnail-style match ............... [WEAK]
|   `-- identity consistency ................ [WEAK]
|
|-- PREVIEW GATE ............................ [WORKING]
|   |-- reference-sync stage ................ [WORKING]
|   |-- bricktoon-preview stage ............. [WORKING]
|   |-- visual preview slideshow ............ [WORKING]
|   |-- scene-divided preview clips ......... [WORKING]
|   |-- voice/music aware preview ........... [WORKING]
|   `-- approval checkpoint before finish ... [WORKING]
|
|-- ANIMATION / MOTION ...................... [PARTIAL]
|   |-- layer extraction .................... [WORKING]
|   |-- character rig manifests ............. [WORKING]
|   |-- ai motion pass contract ............. [WORKING]
|   |-- shot compositing .................... [WORKING]
|   |-- scene assembly ...................... [WORKING]
|   `-- premium believable motion ........... [PARTIAL]
|
|-- RENDER OUTPUT ........................... [PARTIAL]
|   |-- draft render path ................... [WORKING]
|   |-- render contract ..................... [WORKING]
|   |-- sequence outputs .................... [WORKING]
|   `-- premium overnight-ready output ...... [NOT READY]
|
`-- CURRENT REALITY
    |-- architecture ........................ [REAL]
    |-- preview checkpoint .................. [REAL]
    |-- comfy-generated art proven .......... [REAL]
    |-- premium final visual quality ........ [NOT LOCKED]
    `-- unattended overnight production ..... [CLOSE, NOT TRUSTED]
```

## Flow View

```text
SHARED INPUTS
|
|-- library/reference_images
|-- library/general_assets
`-- workspace/<topic>/04_assets/reference_manifest.json

        |
        v

REFERENCE SYNC
|
`-- copies selected shared references/assets into:
    workspace/<topic>/04_assets/reference_images/library_sync/

        |
        v

PREPRODUCTION
|
|-- research
|-- angle
|-- script
|-- cast
|-- visual character bible
|-- scene beats
|-- shot planner
`-- art direction / composition guides

        |
        v

IMAGE GENERATION
|
|-- bricktoon-characters
|     -> character refs
|
`-- asset-generation
      -> shot keyframes
      -> approved keyframes

        |
        v

PREVIEW CHECKPOINT
|
`-- bricktoon-preview
      -> combined preview mp4
      -> scene preview mp4 files
      -> optional voice/music attached

        |
        +--> BAD PREVIEW
        |     -> fix references
        |     -> fix prompts
        |     -> fix workflow/model
        |     -> rerun preview
        |
        `--> GOOD PREVIEW
              -> continue to finish

                    |
                    v

FINISH PATH
|
|-- layer extraction
|-- rigging
|-- ai motion passes
|-- shot compositing
|-- scene assembly
|-- render contract
`-- draft render
```

## Meaning Of The Labels

```text
[WORKING]         implemented and behaves as intended most of the time
[PARTIAL]         implemented, but important quality or reliability gaps remain
[UNSTABLE]        can work, but times out or breaks often enough to block trust
[WEAK]            output exists, but quality is not yet strong enough
[NOT READY]       should not be treated as production-safe
```

## Current Best Use

```text
BEST CURRENT MODE:

shared references
    ->
reference-sync
    ->
bricktoon-preview
    ->
human review
    ->
bricktoon-finish only if approved
```

## Current Bottleneck

```text
MAIN BLOCKERS:

1. ComfyUI shot-keyframe generation is still not stable enough
   for unattended long-run preview approval.

2. The motion stage now converts approved stills into moving clips,
   but believable premium motion still depends on stronger still quality,
   tighter character lock, and a much larger reusable asset catalog.
```
