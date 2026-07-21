# Bricktoon Premium Quality Milestone 2 Plan

Last updated: July 21, 2026

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
