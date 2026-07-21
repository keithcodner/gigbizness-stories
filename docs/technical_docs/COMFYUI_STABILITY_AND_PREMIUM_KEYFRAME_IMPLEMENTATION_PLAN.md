# ComfyUI Stability And Premium Keyframe Implementation Plan

Last updated: July 20, 2026

## Purpose

This document is the focused implementation plan for the most important unfinished visual portions of the pipeline:

- `COMFYUI INTEGRATION ........ [PARTIAL]`
- `stable long-run shot generation ..... [UNSTABLE]`
- `IMAGE GENERATION .......... [PARTIAL]`
- `shot keyframes generate files ....... [PARTIAL]`
- `single-character lock ............... [PARTIAL]`
- `thumbnail-style match ............... [PARTIAL]`
- `identity consistency ................ [PARTIAL]`

The goal is to turn those areas from "can sometimes work" into "reliable, repeatable, premium, and safe to run overnight."

This plan is intentionally detailed. It is meant to become the working blueprint for the next major quality pass, not just a note about future ideas.

## Milestone 2 Alignment

This plan is one of the implementation plans under `Milestone 2: bricktoon_premium_quality`.

Milestone rule:

- no further implementation should be treated as "forward progress" if it does not help the pipeline reach the minimum accepted animation standard
- quality lock matters more than scale, speed, or convenience during this milestone

Milestone source of truth:

- `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md`

## Minimum Quality Constraint

This plan is not only about making ComfyUI more stable. It is also about preventing the system from graduating weak stills into expensive but disappointing motion.

The minimum accepted output standard is a **premium cut-out animatic / puppet-animation result**. Anything below that should be treated as a failed quality state even if:

- ComfyUI completed successfully
- keyframes were generated
- a preview slideshow exists
- a final MP4 was rendered

The following are specifically below spec:

- slideshow-only previews treated as final animation
- one held poster frame stretched across a narrated beat
- text-card motion passed off as character animation
- premium stills with no believable acting layer afterward

This means the "WORKING" status for the items in this document is not just about technical success. It also requires them to support the downstream motion standard.

## Option Fit Within This Plan

This document most strongly supports:

- `Option 1: Cheapest Custom Pipeline`
- `Option 2: Best Quality Hybrid Pipeline`

It does not assume a fully externalized professional finishing stack as the default. Its main job is to make the repo-side still, identity, preview, and readiness systems strong enough to support either the custom or hybrid milestone route.

## Why These Areas Are Not Working Yet

### ComfyUI integration is `PARTIAL`

The integration is real and usable, but it is still missing production hardening:

- local startup works
- provider selection works
- `.env` config works
- metadata works
- reference upload works
- but long multi-shot runs can still timeout, stall, fall back, or produce uneven results

### Long-run shot generation is `UNSTABLE`

The pipeline can generate single successful shots, but not yet with enough confidence for unattended queue-style rendering because:

- ComfyUI can fail or stall mid-batch
- the pipeline still lacks durable retry/resume behavior per shot
- the current workflow is too generic for a GTX 1080 8GB production target
- preview runs are not yet guaranteed to finish without `mock` fallback

### Shot keyframe generation is `PARTIAL`

Keyframes can be generated, but visual quality is not yet consistently premium:

- some shots still look generic instead of thumbnail-grade
- some shots drift from the intended cast identity
- some single-subject shots can still feel compositionally weak or off-model
- there is not yet a fully enforced premium benchmark gate

### Single-character lock, thumbnail-style match, and identity consistency are `PARTIAL`

Those areas improved materially, but they are not yet fully proven:

- the prompt and reference contract is stronger
- shot guidance is better
- hero refs are prioritized more intelligently
- ComfyUI denoise is more reference-friendly
- but the pipeline still does not yet have a complete premium visual lock system

## End-State Definition

These statuses should only be marked `WORKING` once the system meets all of the following conditions.

### ComfyUI integration becomes `WORKING` when

- `bricktoon:preview` completes 3 times in a row on `test_story_template`
- no shot keyframe falls back to `mock`
- failed prompts auto-retry at the shot level
- an interrupted run can resume from the failed shot without manual cleanup
- the system records enough metadata to rerun a bad shot deterministically

### Stable long-run shot generation becomes `WORKING` when

- a full preview batch runs unattended for the test fixture without timeout collapse
- the batch can survive one failed prompt and continue
- the batch can be resumed after manual ComfyUI restart
- all required keyframes are generated and approved or explicitly flagged for rerun

### Shot keyframes generate files becomes `WORKING` when

- generated shots are not just non-placeholder, but visually usable
- hero shots consistently look premium rather than generic
- wide, medium, closeup, and document shots each use the right workflow route
- the preview output no longer needs manual explanation to show which shot is "the good one"
- the approved stills are strong enough to survive cut-out motion and close inspection during speaking shots

### Single-character lock becomes `WORKING` when

- closeups consistently show only the intended subject
- duplicate faces and extra unintended people are eliminated
- costume, silhouette, headwear, and facial-hair locks stay stable across reruns

### Thumbnail-style match becomes `WORKING` when

- hero keyframes consistently resemble the intended premium editorial benchmark
- subject readability, lighting drama, plastic-material rendering, and composition density are all strong enough to read as "thumbnail-ready"
- the stills look like viable source art for animation rather than isolated poster images

### Identity consistency becomes `WORKING` when

- the same character remains recognizably the same across scenes and reruns
- face layout, silhouette, outfit palette, and signature prop zones stay stable
- visible drift is caught automatically before approval
- expression and speaking-shot variants still read as the same person after animation prep

## Phase 0: Baseline, Metrics, And Benchmark Lock

### Objective

Define exactly what success looks like before changing the runtime further.

### Implementation

- Freeze `test_story_template` as the primary repeatable benchmark topic.
- Select 3-5 benchmark stills from the existing premium reference direction.
- Create a pass/fail rubric for:
  - single-character lock
  - thumbnail-grade composition
  - identity consistency
  - shot usefulness in preview mode
- Add a baseline report for the current system before deeper workflow changes.

### Deliverables

- `docs/technical_docs/bricktoon_quality_benchmark_rubric.md`
- `workspaces/test_story_template/10_qc/baseline_visual_benchmark.md`
- curated benchmark image references in the shared reference library

### Acceptance Criteria

- we can look at one document and know exactly why a shot passed or failed
- the team stops debating "looks good enough" without shared criteria
- the rubric explicitly distinguishes "premium still" from "animation-ready premium still"

## Phase 1: Harden ComfyUI Runtime For GTX 1080 Preview Reliability

### Objective

Make preview generation dependable enough to trust for repeated runs.

### Problems This Phase Solves

- `stable long-run shot generation ..... [UNSTABLE]`
- hidden runtime fragility
- shot loss due to timeout or stalled prompt polling

### Implementation

#### 1. Split ComfyUI operating modes

Add two explicit operating profiles:

- `preview_fast`
- `preview_premium`

Each profile should define:

- checkpoint
- steps
- sampler
- scheduler
- denoise
- max resolution
- timeout budget
- retry behavior

The GTX 1080 profile should prefer completion reliability over aggressive quality settings.

#### 2. Add shot-level retry and resume

For every generated shot:

- write a stage-local execution record before submission
- mark status as `queued`, `running`, `failed`, `completed`, or `approved`
- retry failed shots with a controlled retry count
- allow resuming from the first incomplete shot instead of rerunning the whole stage

#### 3. Add ComfyUI health checks

Before a long shot batch:

- hit the ComfyUI health endpoint
- verify the API is reachable
- verify the configured checkpoint name is present
- verify the output directory is writable
- record a preflight pass/fail report

#### 4. Add timeout classification

Distinguish:

- API unreachable
- prompt validation failure
- no output returned
- output download failure
- resize/postprocess failure
- true timeout

This matters because each failure should have a different retry strategy.

### Files Likely Affected

- `src/bricktoon/providers/comfyuiImageProvider.js`
- `src/bricktoon/providers/index.js`
- `config/visual_generation.json`
- `agents/orchestrator.js`
- new execution-state JSON in workspace shot-generation folders

### Acceptance Criteria

- preview profile completes `test_story_template` 3 times in a row
- failed shot reruns do not restart the whole preview stage
- logs clearly state why a shot failed and whether it retried
- preview reliability is good enough that a storyboard review happens before any expensive overnight motion pass

## Phase 2: Specialize Shot Workflows By Shot Class

### Objective

Stop treating all shot keyframes as the same rendering problem.

### Problems This Phase Solves

- `shot keyframes generate files ....... [PARTIAL]`
- mismatch between shot type and generation route
- weak composition in hero shots

### Implementation

#### 1. Expand shot workflow classes

At minimum:

- `closeup_hero_character`
- `medium_single_character`
- `medium_two_shot`
- `establishing_wide`
- `document_insert`
- `top_down_document`
- `villain_hero_shot`
- `reaction_closeup`

Each class should map to a managed workflow profile, not just generic prompt changes.

#### 2. Create workflow-selection rules

Workflow selection should use:

- `shot_type`
- `quality_tier`
- `production_mode`
- `preserve_face`
- `preserve_hands`
- whether the shot is single-character or multi-character

#### 3. Separate preview and premium render requests

Preview should optimize for:

- fast validation
- composition truth
- identity truth

Premium render should optimize for:

- detail
- polish
- final shot quality

### Files Likely Affected

- `config/visual_generation.json`
- `scripts/generate_shot_keyframes.js`
- `src/bricktoon/workflowContracts.js`
- possibly provider-specific workflow request construction

### Acceptance Criteria

- closeups visibly differ in render strategy from wides
- document inserts stop competing with character-shot prompting
- hero shots use a visibly stronger route than standard supporting shots

## Phase 3: Build A Real Character Identity Lock Layer

### Objective

Make character identity deterministic enough that the same cast stays stable across scenes.

### Problems This Phase Solves

- `single-character lock ............... [PARTIAL]`
- `identity consistency ................ [PARTIAL]`

### Implementation

#### 1. Upgrade character identity package

Every character should have a reusable identity package containing:

- master portrait
- front view
- three-quarter view
- expression refs
- outfit/prop continuity refs
- hard-lock metadata

#### 2. Build shot-time character reference selection rules

Single-subject shot:

- only primary character refs should dominate the request

Two-shot:

- primary character gets strongest weight
- secondary character gets limited but explicit supporting refs

Document shot:

- character refs should be minimized or excluded unless hands/partial presence are intentionally required

#### 3. Add identity drift checks

Before approving a shot:

- compare shot metadata against the expected cast
- check whether wrong headwear, wrong facial-hair pattern, or wrong wardrobe drift is likely
- mark the shot for rerender if identity lock fails

#### 4. Add rerender reasons

Rerender reasons should be explicit:

- wrong subject count
- wrong subject identity
- wrong wardrobe
- wrong expression energy
- identity drift from master ref

### Files Likely Affected

- `scripts/generate_bricktoon_character_refs.js`
- `scripts/generate_shot_keyframes.js`
- `src/bricktoon/shotKeyframeGuidance.js`
- `src/bricktoon/validateGeneratedAsset.js`
- `03_cast/visual_character_bible.json`

### Acceptance Criteria

- closeup shots consistently keep one intended subject
- reruns do not randomly reinvent the main character
- multi-scene previews keep the cast recognizably stable

## Phase 4: Lock The Premium Thumbnail Style

### Objective

Make the generated hero stills feel intentionally premium and visually close to the desired editorial bricktoon benchmark.

### Problems This Phase Solves

- `thumbnail-style match ............... [PARTIAL]`
- weak hero-shot polish
- generic AI look instead of branded house look

### Implementation

#### 1. Define the premium bricktoon house style explicitly

The style contract should cover:

- subject readability
- silhouette clarity
- dramatic edge/rim lighting
- dimensional plastic material rendering
- facial expression intensity
- foreground/background density balance
- bright but controlled commercial-color finish

#### 2. Add hero-shot benchmark examples

For each hero shot class:

- one benchmark image
- one failure example
- a short explanation of what match means

#### 3. Route hero shots through stronger refinement

This may require:

- different sampler profile
- lower denoise
- additional reference usage
- optional second pass or refine pass

#### 4. Add style-failure classification

Reject or reroute if the shot is:

- too flat
- too empty
- too washed out
- too soft
- too generic
- not visually dense enough

### Files Likely Affected

- `config/visual_generation.json`
- `docs/technical_docs/VISUAL_REFERENCE_INTERPRETATION.md`
- `scripts/generate_shot_keyframes.js`
- premium validation logic

### Acceptance Criteria

- hero shots consistently read as premium editorial bricktoon stills
- the preview no longer feels like "placeholder art that happened to render"

## Phase 5: Add Multi-Level Visual QC Before Approval

### Objective

Make approval depend on visual quality, not only output existence and size.

### Problems This Phase Solves

- weak shots passing because they technically exist
- inconsistent approval behavior

### Implementation

#### 1. Add keyframe QC categories

Each shot should be checked for:

- subject count correctness
- identity correctness
- costume/prop continuity
- composition strength
- thumbnail-style match
- background density
- hand/face safety
- document readability where required

#### 2. Add shot-level approval reports

Per shot:

- pass/fail summary
- failed category list
- rerender recommendation
- provider/workflow/seed/settings trace

#### 3. Add scene-level preview approval summaries

A preview run should produce:

- approved hero shots
- weak shots needing rerender
- fallback shots still being tolerated temporarily

### Files Likely Affected

- `src/bricktoon/validateGeneratedAsset.js`
- new QC helper modules
- preview report generation
- `10_qc/` outputs

### Acceptance Criteria

- weak outputs are blocked earlier
- preview review becomes faster because failure reasons are pre-labeled

## Phase 6: Build A Reusable Asset And Reference Catalog That Supports Better Shots

### Objective

Reduce the amount of improvisation in scene generation by expanding reusable premium reference inputs.

### Problems This Phase Solves

- weak style support
- weak environment continuity
- limited asset coverage

### Implementation

#### 1. Populate `library/general_assets`

Priority categories:

- people
- workers
- office workers
- villains men
- villains women
- police
- police rooms
- hospitals
- hospital rooms
- offices
- rooms
- interiors
- buildings
- houses
- cars
- trucks
- facial expressions

#### 2. Add curated high-value starter references

Each category should eventually contain:

- reference stills
- quality labels
- prompt-target metadata
- optional "best for" notes

#### 3. Make shot planning consume the catalog better

The planner and generation layer should know:

- which category refs match the shot
- whether the category is missing
- whether a missing category should trigger generation of a new reusable ref pack

### Acceptance Criteria

- the catalog index is not just structural; it contains enough visual matter to improve generation
- new topics can reuse premium reference material instead of starting from zero

## Phase 7: Prove Overnight Trustworthiness

### Objective

Turn the preview pipeline into something safe enough to run unattended.

### Problems This Phase Solves

- `unattended overnight production ..... [CLOSE, NOT TRUSTED]`

### Implementation

#### 1. Add an overnight-safe preview command profile

This profile should:

- use the stable Comfy profile
- retry failed shots
- checkpoint progress after each shot
- write a morning-ready summary report

#### 2. Add failure recovery rules

If the run stops:

- resume incomplete shots
- skip already-approved shots
- classify failures by cause

#### 3. Add output trust summary

At the end of a run:

- total planned shots
- shots completed
- shots retried
- shots failed
- any fallback usage
- final trust rating

### Acceptance Criteria

- an overnight preview run can finish or fail cleanly without leaving the workspace in a confusing state
- the user can tell exactly what to rerun the next morning

## Recommended Build Order

Implement in this order:

1. Phase 0: baseline and benchmark lock
2. Phase 1: ComfyUI runtime hardening
3. Phase 2: shot workflow specialization
4. Phase 3: identity lock layer
5. Phase 4: premium thumbnail style lock
6. Phase 5: visual QC before approval
7. Phase 6: reusable asset catalog population
8. Phase 7: overnight trust hardening

This order matters because:

- runtime stability must improve before style tuning can be trusted
- workflow specialization must exist before quality evaluation becomes meaningful
- character lock must improve before final style lock can be judged fairly

## Verification Commands

Use these commands as the core repeatable checks:

```powershell
npm run reference-sync -- --topic test_story_template
npm run bricktoon:preview -- --topic test_story_template
npm run ai-motion -- --topic test_story_template
npm run shot:compositing -- --topic test_story_template
npm run library:catalog
node --test tests/bricktoon_pipeline.test.js
```

Additional stability validation:

```powershell
npm run bricktoon:preview -- --topic test_story_template
npm run bricktoon:preview -- --topic test_story_template
npm run bricktoon:preview -- --topic test_story_template
```

Only after repeated preview stability should any status be promoted from `PARTIAL` or `UNSTABLE` to `WORKING`.

## Status Promotion Rules

Do not mark the following as `WORKING` until these thresholds are met:

### `stable long-run shot generation`

- 3 successful repeated preview runs
- no `mock` fallback
- rerun and resume behavior proven

### `shot keyframes generate files`

- all planned test-story keyframes generated
- hero shots visually usable
- no placeholder approvals

### `single-character lock`

- closeups and medium singles consistently show only the intended subject

### `thumbnail-style match`

- hero shots clearly resemble the premium benchmark style

### `identity consistency`

- the cast looks stable across the whole preview sequence

## Final Note

This plan is intentionally not a "quick fix" document.

If we want the visual side of the system to be worth trusting, we need:

- stronger runtime stability
- stronger shot specialization
- stronger identity lock
- stronger premium-style lock
- stronger QC
- stronger reusable reference support

That is the path from a promising prototype to a dependable bricktoon production pipeline.
