# Bricktoon ComfyUI Implementation

This document is the implementation source of truth for the ComfyUI-first bricktoon rendering path.

## Goal

Upgrade the current bricktoon system from procedural/text-heavy fallback visuals into a managed high-quality workflow that produces:

- consistent bricktoon character identity
- premium scene stills and shot keyframes
- motion-ready layers and rig contracts
- AI-assisted motion passes
- composited shot sequences the renderer can prefer automatically

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

## Implementation Status

The current implementation now includes:

- workflow-template registry in `config/visual_generation.json`
- request/result metadata for character refs, scene stills, and shot keyframes
- richer layer, rig, motion-pass, compositing, and render-contract metadata
- a dedicated audit/documentation path for ComfyUI-first rendering

The next quality leap after this foundation is improving the actual ComfyUI node graphs and motion backends, not rebuilding the pipeline structure again.
