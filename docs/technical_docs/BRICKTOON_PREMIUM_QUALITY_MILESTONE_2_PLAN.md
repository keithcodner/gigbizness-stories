# Bricktoon Premium Quality Milestone 2 Plan

Last updated: July 22, 2026

Milestone id: `bricktoon_premium_quality`

## Purpose

This document defines **Milestone 2** for the bricktoon pipeline.

Milestone 2 exists to prevent the project from moving deeper into automation, scale, or convenience work before the core animation quality reaches the minimum acceptable bar.

## Milestone Rule

The project should **not** proceed forward into broader production optimization as if the visual problem is solved until the system can reliably produce the bare minimum target quality:

`"It Sucks To Be Born As"`-level YouTube documentary animation quality as the minimum floor, not the stretch goal.

That standard applies to:

- music support
- voiceover fit
- animation readability
- facial expressions
- prop interaction
- camera angles
- pacing
- shot timing
- editorial compositing

But the most important part of this milestone is the animation layer itself.

## Core Objective

The pipeline must be able to turn a script into a believable bricktoon video where the viewer clearly sees animated performance rather than a moving slideshow.

Anything below that standard should be treated as incomplete, even if:

- a preview MP4 exists
- a render completed
- still images look good
- voiceover and music are present

## Minimum Capability Set

Milestone 2 is not considered complete unless the pipeline supports all of the following at an acceptable quality level:

- layered character parts
- keyframed poses and camera moves
- mouth movement for speech
- blink, reaction, and gesture changes
- prop interaction
- shot-based compositing and timing

## Missing Or Not Yet Locked Capabilities

These are the capability gaps still standing between the current system and the milestone target:

- stable animation-ready character part separation
- real layer extraction from approved art instead of placeholder layer outputs
- clean-plate reconstruction that is actually usable for motion compositing
- real puppet rigs with bound parts, sockets, and reusable controls instead of metadata-only rig declarations
- speaking-shot mouth systems that look intentional instead of simulated drift
- true mouth-shape / viseme playback for speaking shots
- reusable expression-state packs per character
- stronger gesture libraries for talking, reacting, pointing, typing, and revealing props
- real head-turn, nod, and pose-swap performance behavior
- prop attachment and release logic
- dependable hand-to-prop contact behavior across shots
- camera-language rules for closeups, inserts, reaction shots, and villain hero shots
- true shot-performance rendering instead of still-motion-only fallback behavior
- motion QC that judges acting quality, not just file existence
- stronger visual QC for bad hands, prop drift, weak speaking shots, and identity drift
- stronger continuity checks between still generation and animated shot output
- a dependable preview-to-finish promotion rule that proves a scene is worth overnight rendering
- stable long-run generation and overnight reliability for the premium path

## Audit-Derived Must-Haves

The latest quality audit makes the following requirement explicit:

Milestone 2 is not complete unless the chosen path delivers all of these in real output, not just in planning contracts:

- real extracted animation layers
- real puppet-performance rigs
- true mouth animation for speech
- believable gesture and reaction performance
- real prop interaction
- shot-performance rendering that reads as acting
- QC that can reject weak animation, not just missing files
- repeatable reliability on the benchmark topic

## Remaining Gaps That Still Belong To This Milestone

In addition to the animation-core gaps above, the following planning and production gaps still block a trustworthy Jay Hona-style result:

- benchmark reference pack is not yet locked tightly enough to show clear pass/fail examples
- final milestone path decision is still open between Option 1, 2, and 3
- reusable asset catalog is still too shallow for premium repeatable production
- shot-keyframe quality is still not fully locked across single-character shots, thumbnail match, and identity consistency
- continuity is not yet proven across a full animated multi-shot sequence
- scene-performance quality is not yet proven across a benchmark-quality finished scene
- preview-to-finish trust rules still need to become a dependable go/no-go gate
- audio-performance integration is still weaker than the target editorial standard
- premium cost/runtime control is still not strict enough for efficient overnight use
- full production-readiness is still not proven for premium motion output

## Secondary Operational Gaps

These are not higher priority than the animation-core blockers, but they still need to be addressed inside Milestone 2 so the finished path is trustworthy on this machine:

- model/workflow pinning is not yet strict enough to prevent benchmark-quality drift
- the benchmark fixture is not yet governed as a locked acceptance target
- fallback discipline is not yet strict enough for premium stages
- manual review burden is still heavier than it should be
- versioned quality evidence is not yet strong enough phase to phase
- portability across another machine is documented but not yet proven for premium output
- asset-library growth could become disorganized without stronger governance
- throughput expectations for preview, premium preview, and overnight finish are not yet clearly locked

## Hardware Constraint

All Milestone 2 planning assumes the current local premium path must remain workable on the existing machine:

- GPU: NVIDIA GeForce GTX 1080 8GB
- primary local premium still provider: manual ComfyUI source install
- operating requirement: a path that may be slow, but must remain feasible on this hardware

This means:

- quality is the priority
- speed is secondary
- the plan may prefer smaller batches, lower parallelism, staged approvals, and overnight runs
- any chosen path must define how it behaves on GTX 1080-class constraints before it is treated as production-trustworthy

Milestone 2 is therefore not blocked by slowness alone.

It is blocked only if the path cannot produce the required quality on this machine at all.

## Remaining Gap Expectations

Milestone 2 should not be marked complete unless these are also handled at an acceptable level:

- benchmark clarity: the team can compare output against locked examples and reject near-miss quality
- asset depth: the shared library is deep enough to reduce repeated reinvention
- continuity trust: a finished sequence keeps identity, props, and staging stable across cuts
- preview trust: preview review is reliable enough to prevent wasteful premium runs
- editorial fit: voice, music, pacing, and camera accents feel intentionally synced
- production trust: premium output can be rerun, reviewed, and trusted without fragile manual luck

## The Three Practical Options

This project can reach the milestone through one of three practical paths.

### Option 1: Cheapest Custom Pipeline

Summary:

- keep ComfyUI for still generation
- keep the repo as the main orchestration layer
- build the cut-out motion system with repo-managed layers, rig states, scripted keyframes, and FFmpeg/compositing logic

What this means:

- lowest software cost
- highest custom engineering effort
- most control over the final architecture
- slowest route to polished character acting

Strengths:

- fits the current repo direction
- avoids hard dependency on Adobe or Toon Boom
- keeps outputs deterministic and scriptable
- can run overnight once hardened

Weaknesses:

- largest implementation surface
- hardest path for mouth sync and natural gesture quality
- requires the most iteration to make motion feel premium

Best when:

- we want full ownership of the stack
- we accept a longer build period
- we want automation-first architecture over fastest polish

### Option 2: Best Quality Hybrid Pipeline

Summary:

- use ComfyUI and repo-managed planning for stills, reference locking, and shot preparation
- use a dedicated puppet-animation toolchain for the actual acting layer where needed
- feed approved stills, layers, and audio into a hybrid finishing workflow

What this means:

- best balance of quality and control
- keeps the repo as the planning and asset-prep backbone
- uses stronger motion tooling where motion quality matters most

Strengths:

- best chance of reaching the milestone quality fastest without throwing away the current architecture
- supports better lip sync, blink logic, pose systems, and puppet performance
- lowers the risk that final motion still feels like a slideshow

Weaknesses:

- more moving parts
- requires clean contracts between repo outputs and external animation tooling
- less fully self-contained than the cheapest custom path

Best when:

- quality is more important than purity of stack
- we want the repo to stay orchestrator-first
- we are willing to use specialized animation tooling for the last critical step

### Option 3: Fastest Professional Pipeline

Summary:

- keep the repo for research, script, cast, shot planning, references, preview gates, and asset organization
- hand off motion-heavy execution to a professional animation toolchain much earlier

What this means:

- fastest route to high-end results
- least custom animation engineering inside the repo
- highest tool dependence

Strengths:

- shortest path to convincing motion quality
- strongest lip sync and puppet acting potential
- easiest route to premium editorial pacing if the right toolchain is used

Weaknesses:

- highest software and process dependency
- weakest repo-native automation story
- more manual or semi-manual steps unless heavily integrated later

Best when:

- we want results quickly
- we are comfortable with a pro-tool finishing layer
- local repo automation can remain preproduction-first for a while

## Recommendation

The current recommended path is:

`Option 2: Best Quality Hybrid Pipeline`

Reason:

- Option 1 is architecturally clean, but it carries the most risk of spending a long time building a motion system that still does not clear the target quality bar.
- Option 3 can hit quality quickly, but it weakens the value of the repo as an end-to-end production engine.
- Option 2 preserves the repo as the source of truth while admitting that premium motion quality may need stronger purpose-built animation support.

## Option Phase Tracks

The milestone now defines phase tracks for all three options so planning can continue without locking the final implementation path too early.

## Current Execution Status

Active build track:

- `Option 2: Best Quality Hybrid Pipeline`

Active implementation phase:

- `Phase 6: Benchmark Demo And Production Readiness Decision` -> `BUILD DONE, DEFAULT NOT APPROVED`

Phase 1 implementation work completed so far:

- pinned a benchmark still-generation profile for the GTX 1080 path
- added animation-safe framing rules to shot-keyframe prompt construction
- expanded character-bible outputs with animation-ready states, prop-state contracts, and benchmark review checklists
- expanded character-reference generation with additional motion-useful variants such as `emphatic`, `blink_closed`, `gesture_point`, and `hold_prop`
- added regression tests that verify the benchmark profile lock and animation-safe shot guidance

Phase 1 still needs final visual signoff because:

- it still needs proof through a real preview-generation run
- character-lock and benchmark still quality still need visual validation, not only code-level validation

Phase 2 implementation work completed so far:

- replaced placeholder-only shot layer extraction with guide-derived layer outputs built from approved keyframes
- added per-shot region contracts for character, face, arms, props, foreground, lighting, and clean-plate proxy generation
- upgraded character-rig outputs so they now reference real character-ref source assets, sockets, state assets, and extraction expectations
- verified the new layer-extraction and rigging scripts against `workspaces/test_story_template`
- added regression coverage for bounded guide-derived motion-ready layer regions

Phase 2 is now considered build-complete enough to support Phase 3 because:

- the motion layer now has real downstream proof against the test workspace instead of only metadata contracts
- shot-performance rendering is now consuming the newer motion-ready package instead of bypassing it

Phase 2 still needs final premium-quality signoff because:

- mouth-specific extraction is still represented through face-region and rig-socket targeting rather than a true isolated mouth asset
- the motion-ready package is proven for procedural cutout motion, but not yet for premium benchmark-quality puppet acting

Phase 3 implementation work completed so far:

- upgraded `src/bricktoon/proceduralSequenceRenderer.js` so shot clips now consume shot-performance contracts for mouth cycles, blink timing, head turns, body lean, reaction states, prop reveals, and camera drift/push behavior
- upgraded `scripts/generate_bricktoon_shot_clips.js` so shot clips now use `shot.cast_member_ids` as the rendering source of truth instead of the weaker scene-card character list
- added compatibility handling so older/newer shot-performance records can bind motion using either `character_id` or `actor_id` / `cast_member_id`
- tightened orchestrator animation readiness so empty placeholder animation files no longer count as "ready" for downstream stages
- regenerated `workspaces/test_story_template/08_animation/shot_performances.json` with the current premium-cutout minimum contract
- rendered refreshed shot-clip outputs for `workspaces/test_story_template` and verified a speaking closeup sample now shows visible character performance instead of background-only output
- added regression coverage for talking-closeup frame-state behavior and camera recipe behavior

Phase 3 is not marked complete yet because:

- the current speaking/reaction result is a procedural cutout proof, not yet the premium benchmark acting target
- mouth motion is still cycle-driven rather than audio-timed viseme playback
- gesture, head-turn, and prop behavior are visibly present now, but still need a stronger art layer and more premium staging polish to clear the milestone floor

Phase 4 implementation work completed so far:

- added `src/bricktoon/shotPerformanceContracts.js` so shot-performance planning now emits reusable camera recipes, timing windows, visible-character limits, focus targets, and prop-track contracts instead of relying on weaker inferred defaults
- updated `agents/animation_agent.js` so `shot_performances.json` now records `camera_recipe`, `timing_windows`, `screen_position`, `prop_ids`, and `prop_track` data for downstream motion/compositing stages
- upgraded `src/bricktoon/proceduralSequenceRenderer.js` so shot clips now consume camera-angle rules, easing rules, top-down insert framing, document push-ins, dialogue two-shot framing, and per-character prop actions during render time
- upgraded slot-layout and frame-state logic so primary-character priority, visible-cast limits, screen-position guidance, and prop-attached actions now affect the actual rendered shot instead of only existing in planning metadata
- upgraded shot rendering so folder reveals, phone checks, contract presentation, box carry states, document-emphasis timing, and warning/counter timing now appear as readable beat-level action
- updated `scripts/generate_bricktoon_shot_clips.js` so generated clip metadata and reports now record the selected camera recipe and focus target for audit/debug review
- regenerated representative benchmark samples and a full refreshed shot-clip batch for `workspaces/test_story_template`, confirming that closeups, dialogue shots, and top-down document inserts now render with distinct directing behavior instead of generic drift-only motion
- added regression coverage for camera-recipe behavior and explicit prop-track generation so Phase 4 contracts are less likely to drift silently

Phase 4 is not marked complete yet because:

- the current result now reads as directed cutout motion, but it is still a procedural proof rather than the premium acting benchmark
- prop attachment and reveal behavior are now explicit and visible, but contact polish is still simplified compared with the target YouTube-quality animation floor
- camera language is meaningfully stronger now, but sequence-level editorial polish and premium acting continuity still belong to the next phase

Phase 5 implementation work started so far:

- added `src/bricktoon/sequencePolish.js` so sequence-level caption chunking, subtitle-safe region planning, shot-role classification, continuity summaries, pacing labels, and promotion-state summaries now live in one reusable contract layer
- updated `scripts/composite_bricktoon_shots.js` so compositing reports now record shot type, sequence role, camera-angle profile, focus target, performance class, and subtitle-safe mode instead of only the winning file path
- updated `scripts/assemble_bricktoon_scene_sequences.js` so scene-sequence reports now summarize continuity strength, fallback pressure, premium-motion coverage, editorial pacing, subtitle-safe region strategy, audio-mix strategy, and promotion status per scene
- updated `src/render/compileRenderContract.js` plus `scripts/compile_render_contract.js` so render contracts now consume shot-plan and sequence-report context, split longer narration into timed caption chunks, and record continuity/promotion metadata for downstream finishing
- regenerated `workspaces/test_story_template` compositing reports, scene-sequence reports, and render-contract outputs so the new Phase 5 metadata is backed by real benchmark artifacts instead of only unit tests
- added regression coverage for sequence-summary logic and timed caption chunking

Phase 5 is still in progress because:

- scene assembly is now sequence-aware, but the actual final finish still needs stronger editorial-quality shot transitions and cross-scene polish
- subtitle-safe and audio-mix directives now exist in contract form, but they are not yet fully enforced by the final renderer as premium sequence behavior
- continuity proof is now visible in reports, but the current benchmark still shows too many fallback shots in several scenes to call the sequence premium-ready

Phase 6 implementation work started so far:

- added `config/bricktoon_runtime_profiles.json` so preview, premium-preview, and overnight-finish behavior is now pinned to explicit GTX 1080-safe runtime tiers instead of ad hoc command choices
- added `src/bricktoon/reliabilityGate.js` so preview existence, sequence health, render-contract readiness, QC approval state, fallback pressure, fragile-scene pressure, and unresolved-high-priority asset counts are now judged by one reusable reliability contract
- added `scripts/build_bricktoon_reliability_report.js` so each benchmark workspace can emit a durable `bricktoon_reliability_report.json` and markdown summary before expensive finish runs
- added `agents/bricktoon_overnight_agent.js` so the bricktoon finish path now has a resumable overnight runner with state tracking instead of depending on one-shot manual command discipline
- updated `agents/orchestrator.js` so `bricktoon-reliability` and `bricktoon-overnight` are now first-class stages, `bricktoon-finish` can enforce runtime-profile gates, and draft-only manual testing can still proceed without pretending the premium path is trusted
- fixed render-contract readiness checks so the orchestrator now validates the current render-contract shape instead of an older stale field expectation
- added regression coverage for reliability-gate decisions so fallback-heavy or hold-heavy benchmark states are blocked intentionally instead of slipping through silently

Phase 6 validation evidence so far:

- all pipeline tests currently pass, including the new reliability-gate coverage
- `workspaces/test_story_template/10_qc/bricktoon_reliability_report.md` now proves the benchmark is blocked from premium finish for concrete reasons instead of vague "not ready" language
- the current benchmark blocker set is now explicit: 5 hold-for-polish scenes, fallback ratio `0.577`, fragile scene ratio `0.714`, and 2 scenes still requiring human review before finish

Phase 6 is still in progress because:

- the gate exists and is working, but the benchmark story still fails it
- unattended finish trust is not earned until the benchmark can clear the reliability report under a premium runtime profile
- GTX 1080-safe runtime tiering is now defined, but it still needs real overnight evidence on a benchmark run that finishes without collapsing into fallback-heavy output

Option 2 Phase 1 implementation work started so far:

- added `option2_phase1_repo_side_still_identity_lock` to `config/visual_generation.json` so the hybrid still-lock path now has a pinned GTX 1080 benchmark profile with explicit approval focus, shot-class workflow expectations, and benchmark-pack requirements
- added managed shot-class workflow routing for repo-side still generation, including dedicated hybrid still templates for closeups, dialogue/two-shots, establishing frames, and document inserts before motion handoff
- updated `scripts/generate_character_bibles.js` so `visual_character_bible.json` now emits hybrid-handoff rules, benchmark-profile coverage, and per-character still-acceptance contracts instead of only animation-ready cutout guidance
- updated `scripts/generate_bricktoon_character_refs.js` so character-ref outputs now include `hybrid_identity_package.json` beside the variant manifest, giving the hybrid path a reusable identity package instead of only loose PNG references
- updated `scripts/generate_shot_keyframes.js` so approved still records now preserve shot class, hybrid handoff contract data, and the Option 2 benchmark-profile link for later motion-tool handoff
- added `scripts/build_hybrid_still_benchmark_pack.js` plus orchestrator/package integration so the repo can now build a benchmark still review pack with shot-class pass/fail guidance and example files instead of relying on informal screenshot review
- generated benchmark-pack evidence for `workspaces/test_story_template`, proving the current repo can emit 4 hybrid identity packages, 7 shot classes, and 26 approved-shot references into one reviewable pack
- added regression coverage for the new Option 2 still-lock profile and shot-class workflow routing

Option 2 Phase 1 validation evidence so far:

- all pipeline tests currently pass, including the new Option 2 still-lock profile coverage
- `workspaces/test_story_template/03_cast/visual_character_bible.json` now includes hybrid handoff rules and dual benchmark-profile coverage
- `workspaces/test_story_template/07_visuals/benchmark_pack/hybrid_still_benchmark_pack.md` now provides a generated still-review pack with pass/fail cues per shot class and linked example files

Option 2 Phase 1 is still in progress because:

- most existing approved stills in `test_story_template` were generated before the new shot-class workflow templates were introduced, so the code path is pinned but the visual benchmark still needs a fresh rerun under the new templates
- the benchmark pack now makes approval more understandable, but it does not by itself prove that the stills already clear the hybrid-quality floor
- checkpoint and workflow pinning are now explicit in the contracts, but final signoff still needs a real ComfyUI rerun on the GTX 1080 path using the new shot-class routing

Option 2 Phase 2 implementation work completed so far:

- added `src/bricktoon/hybridAnimationContract.js` as the reusable contract layer for character-package and shot-package handoff data
- added `scripts/build_hybrid_animation_contract.js` so the repo now emits a concrete external-motion handoff package instead of relying on loose still/layer/rig files
- updated the hybrid character contract so it preserves `cast_member_id` alongside `character_id`, preventing rig-binding ambiguity when shot plans are keyed to `CAST_*` ids
- added a first-class `hybrid-animation-contract` orchestrator stage plus `npm run hybrid:contract` so the handoff package is generated through the same controlled pipeline entrypoints as other bricktoon stages
- added workspace-owned output packages at `08_animation/hybrid_contract/characters/*.json`, `08_animation/hybrid_contract/shots/*.json`, and `08_animation/hybrid_contract/hybrid_animation_contract.{json,md}`
- updated the generated contract package so premium speaking shots explicitly block silent fallback when approved stills, layer manifests, rig bindings, or timing handoff are missing
- added per-shot stage warnings for route mismatches where older route heuristics still label a character-performance shot as `procedural_document` even though the hybrid handoff now correctly treats it as puppet-performance work
- registered the generated contract in `07_visuals/asset_manifest.json` as `HYBRID_ANIMATION_CONTRACT` so the handoff package is manifest-tracked and auditable
- added regression coverage for cast-member binding preservation and premium speaking-shot fallback blocking

Option 2 Phase 2 validation evidence so far:

- `node --test tests\\bricktoon_pipeline.test.js` now passes 24 tests, including the new hybrid-contract coverage
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-animation-contract` now completes successfully and produces a full contract package for the benchmark fixture
- the generated benchmark contract currently proves: 4 character packages, 26 shot packages, 9 hybrid-character shots that block if layers/rigs/timing are missing, and 10 insert-class shots with lighter return expectations
- the generated shot-contract files now preserve timing, captions, voiceover, camera recipe, actor tracks, prop sockets, fallback discipline, and required return metadata per shot

Option 2 Phase 2 is still in progress because:

- the repo-to-external handoff is now explicit, but the roundtrip has not yet been proven by an actual external puppet-animation or hybrid-motion consumer
- some medium-single and medium-two-shot scenes still carry older production-route labels such as `procedural_document`; the new contract flags these as warnings, but the route heuristics still need later cleanup
- the package now blocks weak fallback behavior at contract level, but this phase still needs downstream proof that the chosen motion toolchain can consume the package and return benchmark-quality acting

Option 2 Phase 3 implementation work completed so far:

- added `src/bricktoon/hybridPerformanceProof.js` so the repo now has a reusable proof-profile layer for selecting representative hybrid shots and boosting them into a controlled speaking-performance sample
- added `scripts/render_hybrid_performance_proof.js` so the hybrid contract can now be consumed into actual proof clips instead of stopping at static handoff JSON
- added a first-class `hybrid-performance-proof` orchestrator stage plus `npm run hybrid:proof` so the speaking-proof sample is generated through the main workflow rather than by ad hoc commands
- upgraded the proof selection logic so the benchmark sample deliberately includes one closeup speaking shot, one medium-single speaking shot, one dialogue/two-shot exchange, and one insert/document beat
- upgraded proof-shot performance generation so closeups use `viseme_emphasis`, dialogue shots use `talk_cycles`, readable blink/head motion is forced on, and insert/document beats stay document-focused instead of pretending to be speaking shots
- registered proof-shot assets and the assembled proof-sequence asset in `07_visuals/asset_manifest.json` so the sample is manifest-tracked and reviewable like the rest of the pipeline
- preserved route-mismatch warnings from Phase 2 inside the proof pack so the sample can expose when older route heuristics still under-classify character-performance shots
- added regression coverage for proof-shot selection order and proof-performance boosting behavior

Option 2 Phase 3 validation evidence so far:

- `node --test tests\\bricktoon_pipeline.test.js` now passes 26 tests, including the new hybrid proof-selection and proof-performance coverage
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-performance-proof` now completes successfully and produces a controlled proof package at `workspaces/test_story_template/08_animation/hybrid_shots/`
- the generated proof sequence currently includes 4 benchmark shots: `S01_SHOT_002` closeup, `S03_SHOT_002` speaking single, `S06_SHOT_002` dialogue/two-shot, and `S03_SHOT_003` document insert
- the generated proof assets now include per-shot posters, per-shot proof clips, a combined `hybrid_performance_proof_sequence.mp4`, and report files that describe the chosen mouth mode, visible-character target, and stage warnings per shot

Option 2 Phase 3 is still in progress because:

- this is a controlled repo-side proof of readable acting, not yet the final external hybrid-motion roundtrip
- the proof sequence now shows the intended acting mix, but it still needs human visual signoff against the milestone floor before Phase 4 raises sequence/editorial expectations
- route-mismatch warnings remain on some speaking shots, which means production-route cleanup still belongs to later work even though the proof stage can now surface the issue clearly

Option 2 Phase 4 implementation work completed so far:

- added `src/bricktoon/hybridEditorialProof.js` so the repo now has a reusable editorial-sequence layer for selecting the strongest benchmark scene, assigning shot roles, and upgrading shot camera language for sequence-level review
- added `scripts/render_hybrid_editorial_sequence.js` so the hybrid contract can now render a full benchmark-scene editorial sample instead of stopping at isolated proof clips
- added a first-class `hybrid-editorial-proof` orchestrator stage plus `npm run hybrid:editorial` so editorial-sequence proof generation runs through the main workflow and not through ad hoc local commands
- upgraded the hybrid stage flow so the editorial sample first refreshes scene assembly, then selects a benchmark scene using coverage plus pacing criteria, then renders every shot in that scene into a directed hybrid sequence
- upgraded sequence-level shot treatment so establishing, bridge, evidence, performance, and exit beats now receive explicit editorial roles, motion-directive bundles, and stronger camera framing expectations
- registered editorial shot assets and the assembled editorial-sequence asset in `07_visuals/asset_manifest.json` so the benchmark sequence is manifest-tracked and reviewable like the rest of the pipeline
- added regression coverage for benchmark-scene selection, sequence-aware closeup upgrades, and editorial-sequence readiness summaries

Option 2 Phase 4 validation evidence so far:

- `node --test tests\\bricktoon_pipeline.test.js` now passes 29 tests, including the new hybrid editorial scene-selection and editorial-summary coverage
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-editorial-proof` now completes successfully and produces a benchmark editorial package at `workspaces/test_story_template/08_animation/hybrid_editorial/`
- the generated editorial sequence currently selects scene `S04` (`Where Pressure Enters`) with a mixed five-shot pattern: `establishing_wide`, `medium_single`, `document_insert`, `closeup_face`, and `top_down_document`
- the generated report now marks the benchmark sequence as `editorial_benchmark_ready`, `promotion_status: ready_for_finish`, `continuity_status: locked`, `editorial_pacing: balanced`, and `fallback_shots: 0`
- the generated editorial assets now include five per-shot hybrid editorial clips, five per-shot posters, `S04_hybrid_editorial_sequence.mp4`, and `hybrid_editorial_sequence_report.{json,md}`

Option 2 Phase 4 is still in progress because:

- this is now a sequence-level proof, but it is still a repo-side editorial benchmark and not yet the final external hybrid-motion roundtrip
- the benchmark sequence now looks structured enough to become the Phase 5 promotion candidate, but it still needs human signoff before the preview gate can trust it as the quality floor
- route cleanup for older `procedural_document` heuristics still belongs to later work even though the editorial sequence no longer depends on those weaker route labels to create a coherent sample

Option 2 Phase 5 implementation work completed so far:

- added `src/bricktoon/hybridPromotionGate.js` so preview approval, benchmark-scene overrides, scene-level promotion decisions, runtime-tier recommendations, and human checkpoint language now live in one reusable contract instead of being spread across reports
- added `scripts/build_hybrid_promotion_gate.js` so each workspace can emit durable `hybrid_promotion_gate_report.{json,md}` outputs before expensive premium finishing starts
- updated `src/bricktoon/reliabilityGate.js` plus `scripts/build_bricktoon_reliability_report.js` so reliability now understands whether the hybrid promotion gate has approved a benchmark scene or full topic instead of only checking generic preview/report presence
- updated `config/bricktoon_runtime_profiles.json` so the premium-preview and overnight-finish tiers explicitly require promotion-gate approval while the lighter `gtx1080_preview` tier remains usable for early interactive review
- updated `agents/orchestrator.js` plus `package.json` so `hybrid-promotion-gate` / `npm run hybrid:gate` are first-class entrypoints and `bricktoon-auto` now routes through preview, promotion gate, and reliability in order
- added regression coverage for still-benchmark readiness, benchmark-scene override logic, selected-scene promotion decisions, and promotion-gate report language so preview-to-finish protection is test-covered and less likely to drift silently

Option 2 Phase 5 validation evidence so far:

- `node --test tests\\bricktoon_pipeline.test.js` now passes 33 tests, including the new promotion-gate coverage
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-promotion-gate --runtime-profile gtx1080_premium_preview` now completes successfully and writes `workspaces/test_story_template/10_qc/hybrid_promotion_gate_report.{json,md}`
- the generated promotion gate currently marks scene `S04` (`Where Pressure Enters`) as `promote_to_hybrid_finish` and the topic decision as `approved_for_selected_scene_promotion`
- `node agents\\orchestrator.js --topic test_story_template --stage bricktoon-reliability --runtime-profile gtx1080_premium_preview` now shows that the premium preview path recognizes the promotion gate while still blocking topic-wide finish for concrete reasons instead of vague "not ready" language

Option 2 Phase 5 is still in progress because:

- the benchmark scene can now advance as the trusted comparison target, but the rest of the topic still has too many review/rework scenes to claim topic-wide promotion
- the promotion gate now protects runtime cost, but it still depends on stronger topic-wide motion/still quality before overnight finishing can be trusted
- route cleanup for older `procedural_document` labels and broader scene-by-scene quality recovery still belong to later work even though the gate can now expose those problems clearly

Option 2 Phase 6 implementation work completed so far:

- added `src/bricktoon/hybridProductionReadiness.js` so the hybrid path now has a reusable production-readiness layer for benchmark fixture locking, asset-catalog sufficiency review, overnight-trial summary, GTX 1080 trust review, and default-path decisions
- added `scripts/build_hybrid_production_readiness_report.js` so each workspace can emit durable `hybrid_production_readiness_report.{json,md}` outputs instead of forcing the default-use verdict to live only in tribal knowledge
- updated `agents/orchestrator.js` plus `package.json` so `hybrid-production-readiness` / `npm run hybrid:readiness` are first-class entrypoints in the normal pipeline
- added regression coverage for benchmark-fixture governance, structural-only asset-catalog detection, benchmark-only hold behavior, and full default-approval behavior
- added `docs/technical_docs/OPTION2_PHASE6_IMPLEMENTATION_REPORT.md` so this phase now closes with a governed implementation report and explicit final assessment

Option 2 Phase 6 validation evidence so far:

- `node --test tests\\bricktoon_pipeline.test.js` now passes 37 tests, including the new production-readiness coverage
- `node agents\\orchestrator.js --topic test_story_template --stage hybrid-production-readiness --runtime-profile gtx1080_premium_preview` now completes successfully and writes `workspaces/test_story_template/10_qc/hybrid_production_readiness_report.{json,md}`
- the generated production-readiness report currently marks the benchmark fixture as locked to topic `test_story_template`, benchmark scene `S04`, and the selected reference set in `04_assets/reference_manifest.json`
- the current governed Option 2 decision is now explicit: `keep_option2_in_benchmark_mode` with default-path recommendation `hold_option2_as_benchmark_only`
- the current blocker set is also explicit: the benchmark scene is strong enough to govern, but the full topic still fails premium reliability and the shared asset catalog is still structural rather than fully populated

Option 2 Phase 6 current closeout state:

- benchmark-scene governance: locked
- default approval for Option 2: not approved
- current accepted use: benchmark-only premium path
- formal implementation closeout report: `docs/technical_docs/OPTION2_PHASE6_IMPLEMENTATION_REPORT.md`

## Option 1 Phases: Cheapest Custom Pipeline

### Phase 1: Animation-Ready Art Lock

Goal:

- make still generation reliably produce animation-ready bricktoon art instead of only attractive poster frames

Focus:

- stronger single-character lock
- stronger identity consistency
- expression-state generation
- prop-state generation
- animation-safe composition rules

Done when:

- approved stills consistently look usable for downstream cut-out motion prep

### Phase 2: Layer And Rig Foundation

Goal:

- convert approved stills into reusable layered character packages

Focus:

- real layer extraction from approved stills
- clean-plate generation from approved stills
- face zones
- mouth zones
- arm and hand zones
- prop zones
- clean plates
- real bound rig assets
- rig manifests and pose-state contracts
- prop sockets and attachment points

Done when:

- the repo can generate repeatable motion-ready packages for selected hero characters and shots
- the outputs are real animation assets, not placeholder layer files

### Phase 3: Speaking And Reaction Motion

Goal:

- make characters feel alive in the minimum required documentary-animation sense

Focus:

- mouth movement for speech
- viseme or mouth-shape playback that reads clearly on speaking shots
- blink timing
- head turns and nods
- reaction-state timing
- basic gesture changes

Done when:

- a speaking closeup no longer looks like a static still with drift
- the visible speaker reads as actually talking rather than pulsing or bobbing

### Phase 4: Prop And Camera Performance

Goal:

- make shots feel directed instead of passively animated

Focus:

- prop attachment and reveals
- hand-to-prop contact consistency
- pointing and document interaction
- camera-angle rules
- camera easing
- insert and reaction shot timing

Done when:

- scenes contain readable action beats instead of just movement

### Phase 5: Compositing And Sequence Polish

Goal:

- turn isolated shot motion into believable scene storytelling

Focus:

- shot-to-shot continuity
- editorial timing
- compositing rules
- subtitle-safe framing
- voice/music timing fit
- continuity proof across a full benchmark sequence
- audio-performance integration quality

Done when:

- one scene plays like a real animated documentary sequence, not a stitched prototype
- the sequence keeps identity, prop, and screen-direction continuity across cuts

### Phase 6: Overnight Reliability

Goal:

- make the custom path dependable enough for real use

Focus:

- rerun logic
- resume logic
- QC gates
- preview-to-finish approval rules
- unattended run trust
- stable long-run premium generation
- premium cost/runtime control
- GTX 1080-safe batch behavior
- workflow/model pinning for repeatability

Done when:

- a benchmark topic can run overnight without the output collapsing into weak or fallback-heavy motion
- the team can distinguish cheap preview, premium preview, and full premium finish without guesswork
- the run profile is slow but stable on the GTX 1080 machine
- a Phase 6 implementation closeout report is written at `docs/technical_docs/OPTION1_PHASE6_IMPLEMENTATION_REPORT.md` covering the planned scope, completed scope, missed scope, filled gaps, unexpected findings, and remaining follow-up pressure

## Option 2 Phases: Best Quality Hybrid Pipeline

### Phase 1: Repo-Side Still And Identity Lock

Goal:

- make the repo generate and approve strong reference-led stills before motion handoff

Focus:

- ComfyUI still quality
- identity lock
- expression variants
- prop continuity
- shot-class workflow selection
- benchmark still pass/fail examples
- thumbnail-style benchmark lock
- workflow/checkpoint pinning for benchmark runs
- GTX 1080-safe premium still settings

Done when:

- the repo can consistently produce approved stills that are ready for hybrid animation finishing
- the benchmark pack makes approval and rejection understandable without debate
- the pinned premium still path is repeatable on the GTX 1080 setup

### Phase 2: Hybrid Animation Contract

Goal:

- define the exact handoff between repo outputs and the external animation layer

Focus:

- layer export contracts
- real extracted layer requirements
- mouth-shape requirements
- pose-state requirements
- rig metadata
- prop socket and attachment metadata
- audio timing handoff
- shot timing handoff
- fallback discipline for premium shots
- versioned evidence requirements per handoff stage

Done when:

- there is no ambiguity about what the external motion layer receives and returns
- the handoff contract is sufficient to create actual puppet-performance animation
- weak fallback behavior is clearly blocked instead of silently accepted

### Phase 3: Minimum Viable Character Performance

Goal:

- prove that the hybrid route can clear the animation floor on a small controlled sample

Focus:

- mouth movement
- blink logic
- head reactions
- arm gesture changes
- prop reveals
- real speaking-shot acting rather than still-motion simulation

Done when:

- one sample speaking sequence clearly meets the minimum accepted animation standard

### Phase 4: Shot Language And Editorial Quality

Goal:

- elevate the sample from "animated proof" to "YouTube-quality sequence"

Focus:

- closeups
- insert shots
- reaction beats
- villain hero framing
- camera pacing
- editorial timing with voice and music
- full-sequence continuity
- sequence-level performance quality

Done when:

- one mixed shot sequence feels intentional, paced, and watchable at the target floor
- the sequence stays visually coherent from shot to shot instead of only producing isolated wins

### Phase 5: Preview Gate And Promotion Rules

Goal:

- stop weak scenes before they consume expensive motion effort

Focus:

- preview approval criteria
- still-quality pass/fail rules
- motion-worthiness rules
- rework routing
- human checkpoint language
- rejection rules for weak hands, weak mouth motion, prop drift, and identity drift
- preview-to-finish cost protection
- premium runtime tiering
- manual review checklist reduction
- throughput expectations for each run tier

Done when:

- the team can tell whether a scene should advance to hybrid finishing before the expensive step starts
- preview is trustworthy enough to protect time and cost on premium runs
- review expectations are tight enough that approval does not become vague or exhausting

### Phase 6: Benchmark Demo And Production Readiness Decision

Goal:

- prove the hybrid path on the benchmark story and decide whether it becomes the production default

Focus:

- benchmark scene
- benchmark topic
- QC review
- failure analysis
- overnight trial
- reliability under premium motion workload
- production-readiness decision
- shared asset-catalog sufficiency review
- benchmark fixture governance
- portability notes and re-run evidence
- GTX 1080 production-trust review

Done when:

- the hybrid route either becomes the default milestone path or is formally rejected in favor of Option 1 or 3
- the team can honestly say whether the path is trustworthy enough for repeated production use
- the benchmark fixture is locked as a governed acceptance target

## Option 3 Phases: Fastest Professional Pipeline

### Phase 1: Preproduction Export Lock

Goal:

- make the repo a clean upstream system for a professional animation toolchain

Focus:

- cast exports
- shot-plan exports
- composition exports
- reference packaging
- audio and timing packaging
- benchmark reference pack exports
- asset-catalog packaging
- benchmark fixture governance
- versioned export evidence

Done when:

- all required upstream materials can be exported cleanly for external finishing
- the external team/toolchain receives benchmark-safe guidance instead of vague quality intent

### Phase 2: Professional Toolchain Mapping

Goal:

- map every milestone capability to the target pro-tool workflow

Focus:

- mouth sync
- blink and gesture systems
- puppet setup
- prop interaction
- shot compositing
- camera control
- exact mapping for extracted layers, mouth assets, and prop sockets

Done when:

- the external production flow is documented as a repeatable operating model

### Phase 3: Hero Scene Build

Goal:

- produce one premium hero scene at the target quality floor

Focus:

- full character acting
- prop interaction
- shot coverage
- editorial pacing
- voice/music fit

Done when:

- one scene is clearly at or above the minimum target bar

### Phase 4: Repo Reintegration

Goal:

- reintegrate the external output back into the repo workflow cleanly

Focus:

- import contracts
- asset manifests
- render-contract compatibility
- QC compatibility
- benchmark comparison

Done when:

- the professional route can still fit inside the repo's render and audit model

### Phase 5: Semi-Automation Decision

Goal:

- decide how much of the pro-tool path can be standardized versus kept manual

Focus:

- repeatability
- operator burden
- overnight viability
- handoff cost
- scale tradeoffs
- preview-to-finish trust
- production-readiness threshold
- manual review burden
- throughput expectations
- portability and repeatability evidence

Done when:

- the team knows whether this path is a permanent solution, a temporary accelerator, or only a benchmark route
- the team also knows whether it can be scaled without hiding fragile manual work

## Common Milestone Gates Across All Options

No option should be treated as successful unless it passes these shared gates:

### Gate 1: Still Quality Gate

- character identity is readable
- composition is strong enough for animation
- props and expressions are usable
- benchmark still comparison is clear enough to make approval objective

### Gate 2: Performance Gate

- speaking shots visibly animate
- reactions feel intentional
- gestures support the narration
- mouth motion is readable as speech, not drift
- prop handling looks attached and deliberate

### Gate 3: Scene Storytelling Gate

- shots cut with purpose
- camera language feels directed
- scene pacing does not feel padded
- continuity survives across the full sequence
- voice/music timing supports the scene instead of merely accompanying it

### Gate 4: Production Gate

- the workflow can be repeated on the benchmark topic
- outputs are auditable
- weak scenes are blocked before expensive finishing
- long-run premium output is stable enough to trust overnight
- asset-catalog depth is sufficient for the benchmark
- preview-to-finish cost control is trustworthy
- workflow/model pinning is locked for the accepted benchmark path
- the accepted path is feasible on the GTX 1080 machine, even if slow

## Phase Governance Rules

To keep this milestone focused and realistic, every option phase should be treated with the following rules:

- only one active implementation phase should be treated as the main focus at a time
- each phase must have evidence, not only code or docs
- a phase is not complete because a file exists; it is complete because the target behavior is visible and reviewable
- if the GTX 1080 machine cannot complete the phase path at acceptable quality, the phase is not done
- slow but correct is acceptable during this milestone
- fast but weak is not acceptable during this milestone
- when a phase is completed, a phase implementation report must be written before the phase is treated as fully closed; for the current active phase this report path is `docs/technical_docs/OPTION1_PHASE6_IMPLEMENTATION_REPORT.md`
- each phase implementation report must explain: what was planned, what was completed, what was missed, what gaps were discovered and filled, what expectations held true, what surprised us, and what follow-up pressure remains for the next phase

## Gap Coverage Status

Status as of July 21, 2026:

- all currently known Milestone 2 quality gaps have been documented
- all currently known Milestone 2 operational gaps have been documented
- all currently known blockers discussed during planning are now represented either as:
  - required capabilities
  - missing capabilities
  - remaining gaps
  - secondary operational gaps
  - option phases
  - shared milestone gates

This does **not** mean the milestone is complete.

It means the planning coverage is now considered complete enough to begin execution once a path is chosen.

If new gaps are discovered during implementation, they must be added to this document, the pipeline state board, and the technical change log before they are treated as resolved.

## Milestone 2 Acceptance Standard

Milestone 2 should only be marked complete when the test path proves all of the following:

- a sample story renders with real bricktoon characters, not text-card fallback
- scenes are broken into readable storyboarded shots
- speaking shots visibly animate mouth movement
- characters blink and react at believable times
- gestures or pose changes support the narration
- props are revealed, held, or changed when the shot calls for it
- camera angles and cuts feel intentional
- scene timing feels editorial rather than padded
- the result clears the minimum quality floor described above

## What Must Not Happen Before This Milestone Is Met

The team should not treat the following as the next main priority until this milestone is passed:

- scaling unattended overnight production as if quality is already solved
- expanding to large topic batches
- spending major effort on downstream polish while acting quality is still weak
- claiming the pipeline is production-ready because previews or stills look good

## Related Implementation Documents

This milestone should govern the planning direction of:

- `docs/technical_docs/BRICKTOON_COMFYUI_IMPLEMENTATION.md`
- `docs/technical_docs/COMFYUI_STABILITY_AND_PREMIUM_KEYFRAME_IMPLEMENTATION_PLAN.md`
- `docs/technical_docs/BRICKTOON_ARCHITECTURE_IMPLEMENTATION_UPDATE.md`
- `docs/technical_docs/BRICKTOON_2_AI_QUALITY_ARCHITECTURE_IMPLEMENTATION_UPDATE.md`
- `docs/technical_docs/PIPELINE_STATE_VISUAL.md`

## Current Decision State

Current status:

- milestone created
- objective locked
- minimum capability set locked
- implementation options documented
- phased option tracks documented
- recommendation documented
- no further JS implementation should be treated as approved by this milestone document alone

The next step after planning is to choose Option 1, 2, or 3 and then promote that option's phase track into the active execution plan without changing the milestone standard.
