# Pipeline State Visual

Last updated: July 21, 2026

## Status Board

```text
PIPELINE STATUS
|
|-- MILESTONE 2: BRICKTOON PREMIUM QUALITY . [ACTIVE GATE]
|   |-- milestone name ...................... [LOCKED]
|   |-- minimum quality floor .............. [LOCKED]
|   |-- implementation options ............. [LOCKED]
|   |-- phased option tracks ............... [LOCKED]
|   |-- known gap capture .................. [LOCKED]
|   |-- path decision ...................... [OPTION 2 ACTIVE]
|   |-- option 1 / phase 1 status ......... [BUILD DONE, VISUAL SIGNOFF PENDING]
|   |-- option 1 / phase 2 status ......... [BUILD DONE, PREMIUM SIGNOFF PENDING]
|   |-- option 1 / phase 3 status ......... [BUILD DONE, BENCHMARK SIGNOFF PENDING]
|   |-- option 1 / phase 4 status ......... [BUILD DONE, BENCHMARK SIGNOFF PENDING]
|   |-- option 1 / phase 5 status ......... [BUILD DONE, SEQUENCE SIGNOFF PENDING]
|   |-- option 1 / phase 6 status ......... [PARTIAL]
|   |-- option 2 / phase 1 status ......... [IN PROGRESS]
|   `-- proceed-past-gate approval ......... [BLOCKED]
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
|   |-- single-character lock ............... [PARTIAL]
|   |-- thumbnail-style match ............... [PARTIAL]
|   `-- identity consistency ................ [PARTIAL]
|
|-- HYBRID STILL LOCK ....................... [PARTIAL]
|   |-- option2 benchmark profile ........... [WORKING]
|   |-- shot-class workflow routing ......... [WORKING]
|   |-- hybrid identity packages ............ [WORKING]
|   |-- still benchmark pack stage .......... [WORKING]
|   |-- pass/fail review cues ............... [WORKING]
|   `-- fresh still rerun signoff ........... [PENDING]
|
|-- PREVIEW GATE ............................ [WORKING]
|   |-- reference-sync stage ................ [WORKING]
|   |-- bricktoon-preview stage ............. [WORKING]
|   |-- visual preview slideshow ............ [WORKING]
|   |-- scene-divided preview clips ......... [WORKING]
|   |-- voice/music aware preview ........... [WORKING]
|   `-- approval checkpoint before finish ... [WORKING]
|
|-- RELIABILITY / OVERNIGHT ................. [PARTIAL]
|   |-- runtime profiles .................... [WORKING]
|   |-- reliability gate .................... [WORKING]
|   |-- reliability report .................. [WORKING]
|   |-- resumable overnight runner .......... [WORKING]
|   |-- premium finish hard gate ............ [WORKING]
|   `-- benchmark overnight trust ........... [BLOCKED]
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
    |-- milestone 2 planning ................ [LOCKED]
    |-- known-gap documentation ............. [LOCKED]
    |-- reliability gate .................... [REAL]
    `-- unattended overnight production ..... [BLOCKED BY REPORT]
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
              -> continue to reliability gate

                    |
                    v

RELIABILITY GATE
|
|-- bricktoon-reliability
|     -> preview exists?
|     -> sequence reports ready?
|     -> render contract ready?
|     -> fallback pressure acceptable?
|     -> fragile-scene pressure acceptable?
|     -> hold / review scenes cleared?
|
        |
        +--> BLOCKED
        |     -> polish scenes
        |     -> reduce fallback usage
        |     -> clear hold/review states
        |     -> rerun preview/reliability
        |
        `--> PASS
              -> continue to finish / overnight

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
[PENDING]         planned validation or signoff step still needs to happen
[BLOCKED]         intentionally stopped by a quality or reliability gate
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
bricktoon-reliability
    ->
bricktoon-finish only if approved
```

## Current Bottleneck

```text
MAIN BLOCKERS:

1. ComfyUI shot-keyframe generation is still not stable enough
   for unattended long-run preview approval.

2. Character-lock and thumbnail-match contracts are now stronger,
   and the new Option 2 still benchmark pack now exists, but they still
   need visual re-validation through a fresh rerun under the new shot-class
   workflows before we can treat premium still quality as locked.

3. The sequence stage now produces usable continuity, subtitle-safe,
   pacing, and promotion metadata, but several benchmark scenes still
   fall back too often to procedural shots to call the sequence
   premium-ready.

4. The new reliability report is working, and it is currently blocking
   `test_story_template` for concrete reasons: 5 hold-for-polish scenes,
   fallback ratio `0.577`, fragile-scene ratio `0.714`, and 2 scenes
   still marked for review before finish.

5. Milestone 2 is now the active gate, so the project should not
   treat scale, automation, or production readiness as the next win
   until the minimum animation floor is actually met.
```

## Milestone 2 Gate

```text
ACTIVE QUALITY GATE:

bricktoon_premium_quality

Minimum floor before proceeding:
- layered character parts
- keyframed poses and camera moves
- mouth movement for speech
- blink / reaction / gesture changes
- prop interaction
- shot-based compositing and timing

Audit-confirmed missing pieces now folded into milestone planning:
- real layer extraction
- real puppet rigs
- true speech mouth animation
- believable gesture / reaction acting
- dependable prop attachment / interaction
- stronger animation QC
- overnight premium reliability

Additional milestone blockers now folded into planning:
- benchmark reference pack lock
- reusable asset-catalog depth
- full-sequence continuity proof
- preview-to-finish trust
- audio / pacing editorial fit
- premium cost/runtime control
- final production-readiness decision
- workflow/model pinning
- benchmark fixture governance
- fallback discipline
- manual review burden
- versioned quality evidence
- portability proof
- asset-library governance
- throughput expectations
- GTX 1080 feasibility for the accepted path

Path options currently documented:
1. Cheapest custom pipeline
2. Best quality hybrid pipeline
3. Fastest professional pipeline

Phase tracks:
- Option 1: 6 phases
- Option 2: 6 phases
- Option 3: 5 phases

Recommended path:
2. Best quality hybrid pipeline

Known gap capture:
- complete for currently known issues as of July 21, 2026

Current active build:
- Option 2
- Phase 1: Repo-Side Still And Identity Lock
- completion status: in progress
```
