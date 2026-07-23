# Pipeline State Visual

Last updated: July 23, 2026

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
|   |-- path decision ...................... [OPTION 3 CLASSIFIED AS BENCHMARK ROUTE]
|   |-- option 1 / phase 1 status ......... [BUILD DONE, VISUAL SIGNOFF PENDING]
|   |-- option 1 / phase 2 status ......... [BUILD DONE, PREMIUM SIGNOFF PENDING]
|   |-- option 1 / phase 3 status ......... [BUILD DONE, BENCHMARK SIGNOFF PENDING]
|   |-- option 1 / phase 4 status ......... [BUILD DONE, BENCHMARK SIGNOFF PENDING]
|   |-- option 1 / phase 5 status ......... [BUILD DONE, SEQUENCE SIGNOFF PENDING]
|   |-- option 1 / phase 6 status ......... [PARTIAL, TOPIC CLEARS DRAFT GATE; GOVERNED RUN NOW REACHES FINISH]
|   |-- option 2 / phase 1 status ......... [BUILD DONE, FRESH STILL SIGNOFF PENDING]
|   |-- option 2 / phase 2 status ......... [BUILD DONE, ROUNDTRIP SIGNOFF PENDING]
|   |-- option 2 / phase 3 status ......... [BUILD DONE, SAMPLE SIGNOFF PENDING]
|   |-- option 2 / phase 4 status ......... [BUILD DONE, EDITORIAL SIGNOFF PENDING]
|   |-- option 2 / phase 5 status ......... [BUILD DONE, TOPIC-WIDE PROMOTION PROVEN ON BENCHMARK TOPIC]
|   |-- option 2 / phase 6 status ......... [BUILD DONE, DEFAULT NOT APPROVED]
|   |-- option 3 / phase 1 status ......... [BUILD DONE]
|   |-- option 3 / phase 2 status ......... [BUILD DONE]
|   |-- option 3 / phase 3 status ......... [BUILD DONE]
|   |-- option 3 / phase 4 status ......... [BUILD DONE]
|   |-- option 3 / phase 5 status ......... [BUILD DONE, ROUTE CLASSIFIED]
|   `-- proceed-past-gate approval ......... [BLOCKED]
|
|-- FOUNDATION / ORCHESTRATOR ............... [WORKING]
|   |-- stage wiring ........................ [WORKING]
|   |-- topic workspace generation .......... [WORKING]
|   |-- restart / guided / full flows ....... [WORKING]
|   `-- changelog / docs discipline ......... [WORKING]
|
|-- VOICE / DELIVERY AUDIO .................. [WORKING]
|   |-- transcript generation ............... [WORKING]
|   |-- windows tts draft narration ......... [WORKING]
|   |-- silent voice rejection .............. [WORKING]
|   |-- qc voice usability checks ........... [WORKING]
|   `-- final render voice mix .............. [WORKING]
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
|-- HYBRID HANDOFF CONTRACT ................. [PARTIAL]
|   |-- orchestrator stage .................. [WORKING]
|   |-- character contract packages ......... [WORKING]
|   |-- shot contract packages .............. [WORKING]
|   |-- layer / rig / timing handoff ........ [WORKING]
|   |-- premium fallback blocking ........... [WORKING]
|   |-- route-mismatch warnings ............. [WORKING]
|   `-- external motion roundtrip proof ..... [PENDING]
|
|-- HYBRID PERFORMANCE PROOF ............... [PARTIAL]
|   |-- proof-profile builder ............... [WORKING]
|   |-- proof-stage orchestrator wiring ..... [WORKING]
|   |-- closeup speaking proof .............. [WORKING]
|   |-- medium-single speaking proof ........ [WORKING]
|   |-- dialogue/two-shot proof ............. [WORKING]
|   |-- insert/document proof ............... [WORKING]
|   |-- topic-wide coverage mode ............ [WORKING]
|   |-- combined proof sequence ............. [WORKING]
|   `-- human signoff against quality floor . [PENDING]
|
|-- HYBRID EDITORIAL SEQUENCE .............. [PARTIAL]
|   |-- benchmark scene selection ........... [WORKING]
|   |-- editorial-role assignment ........... [WORKING]
|   |-- sequence-wide shot rendering ........ [WORKING]
|   |-- camera-language upgrade ............. [WORKING]
|   |-- benchmark editorial report .......... [WORKING]
|   `-- phase-5 benchmark input ............. [WORKING]
|
|-- HYBRID PROMOTION GATE ................... [PARTIAL]
|   |-- scene-level promotion decisions ..... [WORKING]
|   |-- benchmark-scene override ............ [WORKING]
|   |-- human checkpoint checklist .......... [WORKING]
|   |-- runtime-tier recommendation ......... [WORKING]
|   |-- orchestrator stage .................. [WORKING]
|   `-- topic-wide promotion ................ [WORKING]
|
|-- HYBRID PRODUCTION READINESS ............. [PARTIAL]
|   |-- benchmark fixture lock .............. [WORKING]
|   |-- default-use decision layer .......... [WORKING]
|   |-- asset-catalog sufficiency review .... [WORKING]
|   |-- GTX 1080 trust review ............... [WORKING]
|   |-- implementation closeout report ...... [WORKING]
|   `-- default path approval ............... [BLOCKED]
|
|-- PROFESSIONAL EXPORT LOCK ............... [PARTIAL]
|   |-- export-lock contract layer ......... [WORKING]
|   |-- versioned handoff package .......... [WORKING]
|   |-- cast/shot/composition export ....... [WORKING]
|   |-- reference/audio packaging .......... [WORKING]
|   |-- benchmark-safe guidance ............ [WORKING]
|   `-- downstream toolchain map ........... [WORKING]
|
|-- PROFESSIONAL TOOLCHAIN MAP ............. [PARTIAL]
|   |-- profile registry ................... [WORKING]
|   |-- orchestrator stage ................. [WORKING]
|   |-- capability mapping contract ........ [WORKING]
|   |-- shot-class playbook ................ [WORKING]
|   |-- repeatable operating model ......... [WORKING]
|   `-- hero-scene proof ................... [WORKING]
|
|-- PROFESSIONAL HERO SCENE ................ [PARTIAL]
|   |-- benchmark-scene package ............ [WORKING]
|   |-- shot-level acceptance checks ....... [WORKING]
|   |-- proof-sequence bundling ............ [WORKING]
|   |-- audio/timing handoff ............... [WORKING]
|   |-- orchestrator stage ................. [WORKING]
|   `-- returned external render import .... [WORKING]
|
|-- PROFESSIONAL REINTEGRATION ............. [PARTIAL]
|   |-- imported benchmark media ........... [WORKING]
|   |-- asset-manifest registration ........ [WORKING]
|   |-- render-contract alignment .......... [WORKING]
|   |-- qc-facing report ................... [WORKING]
|   |-- benchmark comparison ............... [WORKING]
|   `-- semi-automation decision ........... [WORKING]
|
|-- PROFESSIONAL SEMI-AUTOMATION ........... [PARTIAL]
|   |-- route classification ............... [WORKING]
|   |-- standardize-now list ............... [WORKING]
|   |-- operator-assisted list ............. [WORKING]
|   |-- not-ready-for-scale list ........... [WORKING]
|   |-- orchestrator stage ................. [WORKING]
|   `-- default-production approval ........ [BLOCKED]
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
|   |-- weak-motion visibility .............. [WORKING]
|   |-- scene review packet ................ [WORKING]
|   |-- review decision file ............... [WORKING]
|   |-- recovery plan stage ................. [WORKING]
|   |-- scene-scoped recovery reruns ........ [WORKING]
|   |-- promotion-gate awareness ............ [WORKING]
|   |-- resumable overnight runner .......... [WORKING]
|   |-- overnight state history ............. [WORKING]
|   |-- overnight run report ................ [WORKING]
|   |-- evidence vocabulary alignment ....... [WORKING]
|   |-- benchmark-scoped reliability ........ [WORKING]
|   |-- benchmark scene proof render ........ [WORKING]
|   |-- scene fallback spread gate .......... [WORKING]
|   |-- render output proof gate ............ [WORKING]
|   |-- static slideshow rejection .......... [WORKING]
|   |-- premium finish hard gate ............ [WORKING]
|   `-- benchmark overnight trust ........... [PARTIAL, GOVERNED RUN NOW REACHES FINISH]
|
|-- ANIMATION / MOTION ...................... [PARTIAL]
|   |-- layer extraction .................... [WORKING]
|   |-- character rig manifests ............. [WORKING]
|   |-- ai motion pass contract ............. [WORKING]
|   |-- shot compositing .................... [WORKING]
|   |-- scene assembly ...................... [WORKING]
|   |-- procedural performance routing ...... [WORKING]
|   |-- procedural fallback staging ......... [WORKING, QUALITY IMPROVED]
|   `-- premium believable motion ........... [PARTIAL, BENCHMARK DRAFT NOW PASSES RENDER PROOF]
|
|-- RENDER OUTPUT ........................... [PARTIAL]
|   |-- draft render path ................... [WORKING]
|   |-- render contract ..................... [WORKING]
|   |-- sequence outputs .................... [WORKING]
|   |-- output proof / audibility checks .... [WORKING]
|   |-- renderer-added text overlays ........ [REMOVED]
|   |-- readable document-text suppression .. [WORKING]
|   |-- no-motion slideshow blocking ........ [WORKING]
|   |-- measurable motion in final draft .... [WORKING]
|   `-- premium overnight-ready output ...... [PARTIAL, DRAFT GATE CLEARS ON BENCHMARK TOPIC]
|
`-- CURRENT REALITY
    |-- architecture ........................ [REAL]
    |-- preview checkpoint .................. [REAL]
    |-- comfy-generated art proven .......... [REAL]
    |-- premium final visual quality ........ [NOT LOCKED]
    |-- milestone 2 planning ................ [LOCKED]
    |-- known-gap documentation ............. [LOCKED]
    |-- reliability gate .................... [REAL]
    |-- render truth gate ................... [REAL]
    |-- motion-health reliability truth ..... [REAL]
    |-- professional toolchain mapping ..... [REAL]
    |-- professional hero scene package .... [REAL]
    |-- professional reintegration ......... [REAL]
    |-- option 3 route classification ...... [REAL]
    `-- unattended overnight production ..... [READY FOR GOVERNED DRAFT TRIAL, NOT YET PROVEN]
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
        |     -> bricktoon-scene-review
        |     -> bricktoon-recovery-plan
        |     -> bricktoon-scene-recovery --bucket light_rework / heavy_rework
        |     -> approve or reject review scenes
        |     -> ranked scene queue
        |     -> clear review scenes first
        |     -> rework light scenes, then heavy scenes
        |     -> rerun preview/gate/reliability
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
bricktoon-scene-review if review scenes remain
    ->
bricktoon-recovery-plan if blocked
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
   rely on procedural fallback shots that now look materially better,
   but still do not yet equal the intended premium AI/editorial route.

4. The new Option 2 hybrid animation contract is now real and generated,
   but the external motion layer has not yet been proven to consume it
   and return benchmark-quality puppet performance.

5. The new Option 2 hybrid performance proof stage now generates a
   controlled acting sample, but it is still a repo-side proof layer
   rather than the final external hybrid-motion roundtrip.

6. The new Option 2 hybrid editorial sequence stage now generates a
   coherent benchmark-scene sample, and the new promotion gate can now
   promote that benchmark scene even while holding the rest of the
   topic back.

7. The older medium-single and medium-two-shot route mismatch has now
   been cleaned up at the contract layer:
   `S03_SHOT_002`, `S04_SHOT_002`, `S05_SHOT_002`, `S06_SHOT_002`, and
   `S07_SHOT_002` now resolve as `hybrid_2d_ai` inside the refreshed
   hybrid animation contract, and the refreshed compositing report now
   selects stabilized motion for those bridge shots instead of leaving
   them stuck behind stale fallback metadata.

8. The hybrid performance proof stage is no longer only a 4-shot sample.
    It now supports topic-wide coverage and has been proven live on
    `test_story_template` with 19 proof shots:
    closeups -> 4
    medium singles -> 4
    dialogue/two-shot -> 1
    insert/document shots -> 10

9. The compositing stack now promotes the strongest available motion
    source per shot instead of blindly favoring procedural clips.
    Current winner mix on `test_story_template`:
    professional imports -> 5
    hybrid proof shots -> 15
    stabilized motion passes -> 6
    procedural fallback clips -> 0

10. The latest render-output proof is now approved on Thursday, July 23, 2026:
    `distinct_frame_ratio` -> `0.857`
    `duplicate_frame_ratio` -> `0.143`
    `low_detail_frame_ratio` -> `0.286`
    `static_window_ratio` -> `0.143`
    `scenes_with_fallback_ratio` -> `0`
    `fallback_document_shot_ratio` -> `0`

11. The reliability layer now makes motion health visible directly instead
    of hiding it in `ai_motion_report.json`:
    attempted weak-motion scenes -> `S02`, `S04`
    selected weak-motion scenes -> none
    selected weak-motion scene ratio -> `0`

12. The continuity-status and visual-readiness truth has now been
    corrected for the benchmark topic:
    all scenes are promoted
    all scenes are `ready_for_finish`
    `fragile_scene_ratio` -> `0`
    `scenes_with_fallback_ratio` -> `0`
    unresolved high-priority assets -> `1`
    reliability decision -> `ready_for_overnight_finish`

13. The remaining overnight-draft gap is no longer a blocked
    reliability gate on `test_story_template`.
    The governed overnight run now skips fresh preview rebuilds,
    clears reliability, and reaches `bricktoon-finish`.
    The next missing proof is the completed overnight-run record
    under the GTX 1080 draft profile.

14. Milestone 2 is now the active gate, so the project should not
    treat scale, automation, or production readiness as the next win
    until the minimum animation floor is actually met.

15. The procedural fallback renderer has now been upgraded for the
    `legit_front_office` scene family and for minifig character
    construction, so fallback winners in `S02` no longer read like
    flat stick-figure placeholders.
    That is a meaningful improvement, but it is still a fallback-quality
    safety route rather than the final premium look we are aiming for.
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
- Option 1
- Phase 6: Overnight Reliability
- completion status: partial, benchmark proof path, render-output proof approval, motion-health-aware reliability, continuity/promotion truth correction, overnight preview fast-pathing, and full-topic overnight-draft gate clearance are working; the next missing proof is the completed governed overnight-run record
```
