# Bricktoon ComfyUI Implementation

This document is the implementation source of truth for the ComfyUI-first bricktoon rendering path.

## Goal

Upgrade the current bricktoon system from procedural/text-heavy fallback visuals into a managed high-quality workflow that produces:

- consistent bricktoon character identity
- premium scene stills and shot keyframes
- motion-ready layers and rig contracts
- AI-assisted motion passes
- composited shot sequences the renderer can prefer automatically

## Milestone 2 Alignment

This document is governed by `Milestone 2: bricktoon_premium_quality`.

Primary rule:

- do not treat premium still generation as the end goal
- do not treat preview completion as milestone success
- do not move forward as if the visual problem is solved until the pipeline reaches the minimum accepted animation bar

The milestone source of truth is:

- `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md`

## Managed Workflow Stack

The repo-managed default workflow stack is:

1. `character_ref_v1`
2. `character_variant_v1`
3. `scene_still_v1`
4. `shot_keyframe_v1`
5. `hero_refine_v1`
6. `motion_pass_source_v1`

These workflow ids are selected by config and filled by the orchestrator/scripts. The repo owns the selection logic, prompt contract, quality tier mapping, and output contracts.

## Core Contracts

Every generation-capable stage should now emit:

- workflow request JSON in `07_visuals/workflow_requests/`
- provider execution report JSON in `07_visuals/generation_reports/`
- manifest assets with provider, workflow, quality tier, and continuity refs

Motion stages should emit:

- motion-pass report JSON in `08_animation/raw_ai_video/`
- stabilization report JSON in `08_animation/stabilized_ai_video/`
- compositing report JSON in `08_animation/compositing_reports/`

## Stage Expectations

`bricktoon-characters`

- generate canonical identity refs
- generate expression/variant refs
- emit identity-package metadata for continuity

`bricktoon-scenes`

- generate scene-level planning stills or fallback scenic compositions
- consume visual style locks and character refs when available

`asset-generation`

- generate planned shot keyframes
- use shot plan, art direction, production route, and composition context
- record workflow id, provider, and quality tier

`layer-extraction`

- produce motion-ready layer manifests
- separate foreground, face, hand/arm, prop, clean plate, and FX zones

`character-rigging`

- emit hybrid rig manifests with blink, talk, head, arm, and prop state support

`ai-video-motion-passes`

- define shot class and motion recipe
- prefer AI motion for selected routes
- fall back explicitly when only procedural source footage exists

`shot-compositing`

- choose the best source per shot
- record winning source, selection reason, and quality classification

## Default Operating Rules

- ComfyUI is the primary premium provider.
- OpenAI and mock remain compatibility/fallback providers.
- Text overlays and evidence graphics should remain composited after generation whenever practical.
- The orchestrator remains the owner of stage order, readiness, manifest updates, and fallback policy.
- Any future workflow change must also update orchestrator-facing metadata and the changelog.

## Minimum Accepted Animation Standard

The minimum accepted animation quality for premium output is a **premium cut-out animatic / puppet-animation look** comparable in motion readability to modern faceless YouTube documentary channels that use storyboarded 2D character animation.

For this project, the following are below the minimum bar and should be treated as failure even if a valid MP4 exists:

- text cards with camera drift
- slideshow-only motion
- still-image zooms presented as full animation
- one held pose for an entire narrated beat

### What The Minimum Bar Must Include

At minimum, acceptable scene animation should include:

- scene-blocked character staging, not just moving stills
- blink timing
- talk-cycle or viseme-based mouth movement on speaking shots
- head turns, nods, and reaction changes
- arm gesture swaps or keyed arm motion
- prop interaction when the shot requires it
- composition-aware camera movement with easing
- inserts and cutaways that feel intentionally storyboarded

### Current Gap

The current pipeline can already produce:

- character refs
- shot keyframes
- procedural shot clips
- keyframe-derived motion clips
- shot compositing and scene assembly

But it does not yet guarantee the full minimum cut-out animatic standard above on every run. Reaching and then exceeding that standard remains one of the most important implementation goals.

## Research-Based Production Model

Based on current format analysis and official animation-tool documentation, the production model we should target is:

1. digital cut-out / puppet animation
2. keyframed camera and character motion
3. layered puppet deformation or part rotation where needed
4. auto-generated or audio-driven lip sync for speaking shots
5. scene-by-scene compositing and editorial timing

### Why This Model Fits

This model best matches the minimum accepted bar because:

- cut-out animation is designed around separated character parts and keyed poses instead of redrawing every frame
- keyframed animation supports readable acting, camera moves, and shot blocking
- puppet deformation supports more believable limb and facial motion without requiring full frame-by-frame production
- lip-sync systems help speaking shots clear the "alive" threshold that still-image motion cannot reach on its own

## Research Notes

The target model above is informed by the following official documentation:

- Toon Boom describes digital cut-out animation as puppet-based animation where parts are moved and keyframed rather than redrawn each frame.
- Adobe documents keyframes as the primary method for animation in After Effects.
- Adobe documents Puppet tools as a way to animate artwork with pins and deformation controls.
- Adobe Animate documents auto lip-sync using mapped mouth shapes and imported audio.
- Adobe Character Animator documents Lip Sync, Auto Blink, Face, Body, and Head & Body Turner behaviors for bringing puppets to life.

Reference links:

- https://learn.toonboom.com/modules/animation-workflow/topic/cut-out-animation
- https://docs.toonboom.com/help/harmony-25/premium/getting-started/cut-out.html
- https://www.adobe.com/learn/after-effects/web/keyframe-animation
- https://helpx.adobe.com/ie/after-effects/using/animating-puppet-tools.html
- https://www.adobe.com/learn/animate/web/auto-lip-sync-animation
- https://helpx.adobe.com/adobe-character-animator/desktop/behaviors/behaviors.html

## Implementation Consequence

Because of that research, the repo should treat the current visual stack in this order:

1. reference-driven character and scene still generation
2. approval of animation-ready stills before expensive motion work
3. cut-out / puppet-style motion on approved stills and layers
4. optional AI motion passes only when they improve the shot
5. final compositing and render selection

In other words, better still generation is necessary, but it is not the final goal. The final goal is premium, believable bricktoon motion built on top of approved stills.

## Milestone 2 Missing Capabilities

From the ComfyUI-first side of the pipeline, the milestone-critical missing or not-yet-locked capabilities are:

- stronger animation-ready character part extraction
- more dependable speaking-shot mouth motion support
- reusable expression-state variants that survive motion prep
- gesture and prop-state variants that can feed keyframed animation
- continuity validation between approved stills and animated shot outputs
- promotion rules that stop weak stills from graduating into expensive motion passes

## Implementation Status

The current implementation now includes:

- workflow-template registry in `config/visual_generation.json`
- request/result metadata for character refs, scene stills, and shot keyframes
- richer layer, rig, motion-pass, compositing, and render-contract metadata
- a dedicated audit/documentation path for ComfyUI-first rendering

The next quality leap after this foundation is improving the actual motion-performance backend so the pipeline consistently reaches the minimum cut-out animatic standard, then surpasses it.
