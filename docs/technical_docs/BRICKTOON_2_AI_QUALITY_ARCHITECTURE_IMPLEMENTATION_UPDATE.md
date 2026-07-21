# Bricktoon AI-Quality Architecture Implementation Update

**Project:** Gigbizness Stories  
**Document type:** Architecture implementation update  
**Status:** Proposed  
**Goal:** Upgrade the working bricktoon pipeline so finished scenes approach the production quality, polish, lighting, depth, composition, character expression, and movement quality of premium illustrated brick-style editorial artwork, while preserving deterministic story structure, continuity, legal review, rendering reliability, and overnight automation.

---

## 1. Interpretation Rule for Visual References

When a request says a scene should “look like” a reference, interpret that as matching the reference’s:

- overall production quality
- visual polish
- illustration detail
- composition strength
- lighting quality
- dimensionality and depth
- material rendering
- facial expression quality
- environmental density
- cinematic energy
- movement sophistication

Do **not** interpret it as copying the exact:

- characters
- identities
- branding
- logos
- text
- scene content
- layout
- legal claims

Add a project policy file:

```text
docs/technical_docs/VISUAL_REFERENCE_INTERPRETATION.md
```

Suggested configuration:

```json
{
  "reference_matching": {
    "match_quality": true,
    "match_polish": true,
    "match_lighting": true,
    "match_depth": true,
    "match_movement_quality": true,
    "copy_exact_composition": false,
    "copy_exact_characters": false,
    "copy_exact_branding": false,
    "copy_exact_text": false
  }
}
```

---

## 2. Current Limitation

The current pipeline now handles scene beats, multi-shot planning, animation directives, procedural rendering, scene assembly, and QC. The remaining gap is primarily **visual production quality**.

The present renderer still exposes its procedural origin through:

- flat geometric limbs
- simple heads and faces
- limited surface texture
- limited material highlights
- simplified architecture
- front-facing character lineups
- weak foreground/background separation
- minimal atmospheric effects
- basic text overlays
- limited perspective and lens language

This is not mainly a planning problem. It is an illustration, asset-generation, compositing, and motion-quality problem.

The architecture must separate:

```text
what the shot contains
```

from:

```text
how the shot is visually rendered
```

---

## 3. Target Production Model

The procedural system should remain responsible for:

- story structure
- research and legal controls
- shot timing
- character placement
- camera logic
- continuity
- prop state
- performance timing
- fallback behavior
- render scheduling
- QC

It should no longer be forced to draw every final hero frame from primitive shapes.

The target model is:

```text
procedural scene planning
+ composition guides
+ reusable visual character bibles
+ AI-generated or artist-generated keyframes
+ controlled layer extraction
+ reusable 2D rigs
+ selective image-to-video motion
+ deterministic text and prop rendering
+ professional compositing
```

The current procedural frames should become **control images and layout blueprints**, not necessarily final artwork.

---

## 3.1 Minimum Accepted Animation Standard

High-quality stills alone are not enough.

For this project, the minimum accepted final motion standard is a **premium cut-out animatic / puppet-animation look** with visible acting and editorial timing. A technically valid render should still be rejected if it is only:

- text cards with subtle camera movement
- a slideshow of stills
- a static poster composition stretched across narration
- image zooms that never become character performance

At minimum, acceptable animated scenes should include:

- scene-blocked shot changes
- blink timing
- mouth movement or talk-cycle behavior on speaking shots
- head turns, nods, or reaction changes
- arm gestures, pose changes, or prop-reveal action
- storyboarded inserts, evidence shots, and cutaways

This architecture update should therefore be interpreted as a path toward **premium illustrated cut-out storytelling**, not merely better still-image generation.

## 3.2 Research-Based Production Model

The closest practical production model for this quality target is:

```text
premium bricktoon still generation
+ approved layered character parts
+ keyframed cut-out / puppet motion
+ optional AI motion passes where they genuinely improve the shot
+ editorial compositing and timing
```

This model was selected because it matches how modern 2D documentary-style animation reaches a believable "alive" threshold without requiring full frame-by-frame animation for every shot.

Reference direction used for this conclusion:

- Toon Boom cut-out animation documentation
- Adobe After Effects keyframe animation guidance
- Adobe Puppet tool documentation
- Adobe Animate auto lip-sync guidance
- Adobe Character Animator behavior guidance

## 3.3 Milestone 2 Alignment

This implementation update is now part of `Milestone 2: bricktoon_premium_quality`.

That means this document should be read as quality-gate architecture, not just future ideas. The milestone requires that the project not move forward as though premium animation is solved until the minimum cut-out animatic floor is met.

Milestone source of truth:

- `docs/technical_docs/BRICKTOON_PREMIUM_QUALITY_MILESTONE_2_PLAN.md`

---

## 4. Updated High-Level Pipeline

```text
format
-> research
-> angle
-> script
-> cast
-> visual-character-bible
-> scene-cards
-> voice
-> scene-beats
-> shot-planner
-> visual-production-router
-> shot-art-direction
-> composition-guides
-> asset-generation
-> asset-consistency-validation
-> layer-extraction
-> character-rigging
-> performance-planning
-> shot-animation
-> ai-video-motion-passes
-> shot-compositing
-> scene-assembly
-> render-contract
-> final-render
-> shorts
-> qc
-> bricktoon-audit
```

The existing stages remain valid. This update adds a higher-quality visual-production layer between shot planning and final animation.

---

## 5. Production Modes

Every shot should be assigned one production mode:

```text
procedural_2d
layered_procedural_2d
layered_ai_illustration
rigged_ai_character_scene
hybrid_2d_ai
ai_image_to_video
three_dimensional_bricktoon
procedural_document
procedural_chart
source_media
stock_media
```

A single scene may combine several modes.

Example:

```text
Shot 1: layered AI establishing shot
Shot 2: rigged character entrance
Shot 3: hybrid conversation shot
Shot 4: procedural invoice close-up
Shot 5: AI-assisted reaction shot
Shot 6: rigged villain close-up
Shot 7: layered employee reaction
Shot 8: procedural document transition
```

---

## 6. New Stage: Visual Character Bible

### Purpose

Create a stable visual identity for every recurring character.

### Outputs

```text
03_cast/visual_character_bible.json
07_visuals/character_bibles/{character_id}/character_definition.json
07_visuals/character_bibles/{character_id}/front.png
07_visuals/character_bibles/{character_id}/three_quarter_left.png
07_visuals/character_bibles/{character_id}/three_quarter_right.png
07_visuals/character_bibles/{character_id}/side.png
07_visuals/character_bibles/{character_id}/back.png
07_visuals/character_bibles/{character_id}/expression_sheet.png
07_visuals/character_bibles/{character_id}/hand_sheet.png
07_visuals/character_bibles/{character_id}/outfit_sheet.png
07_visuals/character_bibles/{character_id}/palette.json
```

### Required views

- front
- three-quarter left
- three-quarter right
- side
- back
- neutral stance
- action stance
- height comparison
- expression sheet
- hand-pose sheet
- outfit reference
- accessory reference

### Example definition

```json
{
  "character_id": "store_owner",
  "role": "antagonistic business owner",
  "visual_identity": {
    "body_type": "large stylized brick-built adult figure",
    "head_shape": "square rounded brick head",
    "primary_expression": "controlled smug confidence",
    "hair": "black swept hair",
    "facial_hair": "large curled moustache",
    "hat": "black top hat",
    "outfit": "black formal coat, deep red vest, white shirt",
    "accent": "gold chain"
  },
  "locked_features": [
    "moustache shape",
    "hat silhouette",
    "red vest",
    "eyebrow design",
    "head proportions",
    "coat lapel shape"
  ]
}
```

### Validation

Reject or flag artwork when:

- locked facial features change
- costume colours drift
- accessories disappear
- height or body scale changes materially
- extra limbs appear
- hand design becomes inconsistent
- one cast member resembles another

---

## 7. Global Visual Quality Profile

Create:

```text
00_brief/visual_quality_profile.json
```

Example:

```json
{
  "profile_id": "cinematic_bricktoon_editorial",
  "production_target": {
    "detail": "high",
    "finish": "premium illustrated editorial",
    "depth": "layered cinematic depth",
    "character_expression": "strong and exaggerated",
    "material_rendering": "painted plastic with dimensional highlights",
    "lighting": "dramatic directional lighting",
    "composition": "clear focal hierarchy",
    "environment": "rich but controlled detail",
    "movement": "selective, purposeful, cinematic"
  },
  "avoid": [
    "flat vector appearance",
    "stick-figure limbs",
    "empty backgrounds",
    "uniform lighting",
    "front-facing character lineup",
    "debug overlays",
    "paragraph overlays",
    "blurry faces",
    "inconsistent costumes",
    "distorted hands",
    "extra limbs",
    "unreadable generated text",
    "floating props"
  ]
}
```

---

## 8. New Stage: Visual Production Router

### Purpose

Choose the best creation method for each shot.

### Inputs

```text
07_shot_plans/shot_plan.json
06_scene_beats/scene_beats.json
03_cast/visual_character_bible.json
03_cast/prop_assignments.json
03_voice/scene_timing.json
00_brief/visual_quality_profile.json
```

### Outputs

```text
07_visuals/production_routes/production_routes.json
07_visuals/production_routes/scenes/scene_001_routes.json
07_visuals/production_routes/production_route_report.md
07_visuals/production_routes/production_route_validation.json
```

### Example

```json
{
  "shot_id": "scene_007_shot_005",
  "production_mode": "hybrid_2d_ai",
  "quality_tier": "hero",
  "reason": "Important reaction shot requiring high facial detail.",
  "base_artwork": "ai_illustration",
  "character_motion": "layered_puppet",
  "camera_motion": "slow_push_in",
  "secondary_motion": "ai_video_pass_optional",
  "duration_seconds": 3.8,
  "precision_requirements": {
    "preserve_face": true,
    "preserve_costume": true,
    "preserve_hands": true,
    "readable_text": false
  }
}
```

### Routing rules

Use `procedural_document` when:

- exact text is required
- prices must remain readable
- evidence or contracts appear
- charts or screens must be accurate

Use `layered_ai_illustration` when:

- visual richness matters
- movement is limited
- parallax and face motion are sufficient

Use `rigged_ai_character_scene` when:

- recurring characters interact with props
- exact hand placement matters
- the shot is longer than a short AI motion pass

Use `ai_image_to_video` when:

- the shot is short
- text is not important
- movement is organic
- the shot is a reveal, close-up, or atmospheric beat

Use `three_dimensional_bricktoon` when:

- walking, turning, sitting, or dynamic cameras are required
- the environment is reused often
- complex blocking is necessary

---

## 9. New Stage: Shot Art Direction

Create one art-direction contract per shot.

Output:

```text
07_visuals/art_direction/scene_001_shot_001.json
07_visuals/art_direction/scene_001_shot_001.md
```

Example:

```json
{
  "shot_id": "scene_007_shot_006",
  "quality_tier": "hero",
  "production_mode": "hybrid_2d_ai",
  "visual_target": {
    "detail": "high",
    "composition": "cinematic low-angle character close-up",
    "lighting": "dramatic warm key with blue-purple rim",
    "depth": "foreground face with soft storefront background",
    "surface_style": "dimensional painted plastic",
    "energy": "controlled villain confidence"
  },
  "references": {
    "character_ids": ["store_owner"],
    "environment_id": "small_business_store",
    "style_profile": "cinematic_bricktoon_editorial"
  },
  "generation": {
    "required_keyframes": 2,
    "working_resolution": "3840x2160",
    "preserve_face": true,
    "preserve_costume": true,
    "preserve_accessories": true
  },
  "animation": {
    "duration_seconds": 3.5,
    "camera": "slow_push_in",
    "character_actions": [
      "head_tilt_down",
      "villain_grin",
      "payment_terminal_tap"
    ],
    "ai_video_motion_pass": true
  }
}
```

---

## 10. New Stage: Composition Guides

The current procedural renderer should generate a layout blueprint instead of only a final frame.

Outputs:

```text
07_visuals/composition_guides/scene_001_shot_001.png
07_visuals/composition_guides/scene_001_shot_001_mask.png
07_visuals/composition_guides/scene_001_shot_001.json
```

The guide should define:

- character bounding boxes
- head locations
- limb direction
- horizon
- camera angle
- foreground region
- background region
- prop position
- safe areas
- focus point
- depth labels

This preserves deterministic staging while allowing AI or an artist to create a much richer final frame.

---

## 11. AI-Assisted Keyframe Generation

Each shot should begin with one or more approved keyframes.

Recommended count:

```text
simple camera shot: 1
expression or gesture shot: 2
major body action: 3
complex interaction: 3+ or use rigged/3D production
```

Example invoice interaction:

```text
A: owner holds invoice
B: owner leans forward and lowers invoice
C: invoice is on counter and customer reacts
```

Outputs:

```text
07_visuals/generated_keyframes/
07_visuals/approved_keyframes/
```

Each generation request should include:

- visual quality profile
- character-bible references
- outfit reference
- expression target
- composition guide
- environment reference
- lighting profile
- prop location
- negative constraints

Reject a keyframe when:

- character identity changes
- extra limbs appear
- hands are unusable
- prop location is wrong
- camera angle changes materially
- costume changes
- lighting direction conflicts
- unintended generated text appears

---

## 12. New Stage: Asset Consistency Validation

Outputs:

```text
07_visuals/consistency_reports/scene_007_shot_003.json
07_visuals/consistency_reports/consistency_summary.md
```

Checks:

- face identity
- costume
- accessories
- body proportions
- limb count
- hand count
- prop presence
- prop placement
- environment identity
- camera angle
- lighting direction
- forbidden branding
- unreadable generated text

Example:

```json
{
  "shot_id": "scene_007_shot_003",
  "status": "requires_regeneration",
  "checks": {
    "character_identity": "pass",
    "costume": "pass",
    "moustache_shape": "fail",
    "hand_count": "pass",
    "invoice_presence": "pass",
    "camera_angle": "pass"
  },
  "required_fixes": [
    "Restore the approved curled moustache silhouette."
  ]
}
```

---

## 13. New Stage: Layer Extraction

Approved artwork should be separated into animation-ready layers.

Typical hero-shot layers:

```text
background_far
background_middle
environment_signage
window_reflections
owner_body
owner_head
owner_eyes
owner_eyebrows
owner_mouth
owner_rear_arm
owner_front_arm
customer_body
customer_head
customer_eyes
customer_arms
employee
counter
invoice
payment_terminal
foreground_boxes
foreground_frame
atmosphere
lighting_overlay
```

Output:

```text
07_visuals/shot_layers/scene_007_shot_003/
```

Also create a clean plate:

```text
07_visuals/clean_plates/scene_007_shot_003_background.png
```

The clean plate reconstructs what was hidden behind moving characters or props.

---

## 14. Hybrid Character Rigging

Use high-quality generated character artwork inside deterministic rigs.

A rig may contain:

```text
body
head
eyes
eyebrows
mouth
rear upper arm
rear forearm
rear hand
front upper arm
front forearm
front hand
clothing overlay
shadow layer
```

Benefits:

- stable identity
- controlled gestures
- accurate prop interaction
- reusable actions
- predictable rendering
- less AI-video distortion

---

## 15. Selective AI Image-to-Video

Appropriate uses:

- dramatic close-ups
- short head turns
- villain grin
- coat or hair movement
- environmental motion
- smoke, rain, dust, steam
- cinematic reveal
- limited camera orbit

Avoid for:

- invoices
- prices
- contracts
- charts
- interfaces
- long conversations
- precise object exchange
- long continuous actions

Recommended duration:

```text
2–5 seconds
```

Recommended motion-pass flow:

```text
approved keyframe
-> AI motion pass
-> stabilize
-> restore approved face
-> restore approved hands
-> restore exact prop
-> restore procedural text
-> final composite
```

---

## 16. Pose-to-Pose Generation

For complex actions, generate multiple approved visual targets.

Example:

```text
Pose A: owner holds invoice
Pose B: owner leans forward
Pose C: invoice rests on counter
```

Interpolate:

- root position
- torso lean
- arm rotation
- head angle
- camera position
- prop trajectory
- expression
- shadow shape

Use this when one keyframe is insufficient but full 3D is unnecessary.

---

## 17. Optional 3D Layer

A stylized 3D system is useful for:

- walking
- turning
- sitting
- entering rooms
- hand-to-prop contact
- dynamic cameras
- recurring environments
- multi-character blocking

Target style:

- stylized brick proportions
- large expressive heads
- toon outlines
- painted textures
- plastic highlights
- dramatic lighting

Recommended hybrid:

```text
3D controls geometry, contact, camera, and shadows
illustration/compositing controls texture richness, face detail, atmosphere, and grade
```

3D should be optional and introduced after the hybrid 2D workflow is stable.

---

## 18. New Stage: Shot Compositing

Responsibilities:

- depth of field
- motion blur
- contact shadows
- ambient occlusion
- rim light
- light wrap
- environmental glow
- atmospheric particles
- colour grading
- vignette
- film grain
- sharpening
- final downsampling

Outputs:

```text
08_animation/raw_shot_clips/
08_animation/composited_shot_clips/
08_animation/compositing_reports/
```

Example contract:

```json
{
  "shot_id": "scene_007_shot_006",
  "depth_of_field": {
    "enabled": true,
    "focus_depth": 0.62,
    "foreground_blur": 0.15,
    "background_blur": 0.35
  },
  "lighting": {
    "rim_light": true,
    "light_wrap": true,
    "contact_shadow": true
  },
  "grade": {
    "profile": "cinematic_bricktoon_editorial",
    "contrast": 1.08,
    "saturation": 1.03,
    "shadow_tint": "blue-purple",
    "highlight_tint": "warm"
  }
}
```

---

## 19. Lighting Architecture

Each shot should define:

- key light
- fill light
- rim light
- environment colour
- shadow direction
- highlight strength
- atmosphere

Brick-character materials should use:

- broad plastic highlights
- subtle scratches
- roughness variation
- dark seams
- soft reflections
- cast shadows
- edge highlights
- coloured rim lighting

Avoid flat fills in final hero shots.

---

## 20. Expression Architecture

An expression should control:

- eyebrows
- eyelids
- pupils
- mouth
- cheek shape
- head angle
- neck angle
- shoulders
- hand pose

A villain grin should affect the full pose, not only the mouth.

Reject or warn when:

- expression conflicts with story intent
- identity changes
- eyebrows reset between shots
- body posture contradicts the face
- eye direction ignores the focal action

---

## 21. Text and Document Accuracy

AI-generated text must not be trusted.

For invoices, receipts, prices, contracts, charts, signs, and screens:

```text
AI or artist creates the blank object and lighting
-> procedural renderer adds exact text and numbers
-> procedural animation controls changes
-> QC validates readability
```

Example:

```text
AI creates invoice paper, folds, shadows, and hand contact
procedural renderer adds subtotal, tax, and $1,200 total
```

---

## 22. Quality Tiers

### Utility

```text
1920×1080 working resolution
5–8 layers
basic rigging
no AI video
```

Use for documents, transitions, and minor explanatory shots.

### Standard

```text
3840×2160 working resolution
8–12 layers
normal rigging
optional AI motion
```

Use for most narrative shots.

### Hero

```text
3840×2160 or higher
12–20 layers
advanced rigging
optional AI motion pass
manual review required
```

Use for hooks, reveals, confrontations, climax, ending payoff, and thumbnail-source frames.

---

## 23. Recommended Production Distribution

For a normal business-story video:

```text
50–60% layered AI illustrations with controlled motion
15–25% fully rigged character interactions
10–15% short AI image-to-video hero shots
10–15% documents, charts, screenshots, maps, and evidence
```

Do not make every shot equally expensive.

---

## 24. Updated Folder Structure

```text
00_brief/
    visual_quality_profile.json

03_cast/
    visual_character_bible.json

07_visuals/
    style_profiles/
    character_bibles/
    environment_bibles/
    production_routes/
    art_direction/
    composition_guides/
    generated_keyframes/
    approved_keyframes/
    consistency_reports/
    shot_layers/
    clean_plates/
    props/
    character_rigs/
    asset_manifest.json

08_animation/
    performance_timelines/
    raw_ai_video/
    stabilized_ai_video/
    puppet_shots/
    hybrid_shots/
    raw_shot_clips/
    composited_shot_clips/
    compositing_reports/
    scene_clips/
```

---

## 25. Required File-Level Changes

### `agents/orchestrator.js`

Add:

```text
visual-character-bible
visual-production-router
shot-art-direction
composition-guides
asset-consistency-validation
layer-extraction
character-rigging
ai-video-motion-passes
shot-compositing
```

Suggested sequence:

```js
[
  "format",
  "research",
  "angle",
  "script",
  "cast",
  "visual-character-bible",
  "scene-cards",
  "voice",
  "assets",
  "scene-beats",
  "shot-planner",
  "visual-production-router",
  "shot-art-direction",
  "composition-guides",
  "asset-generation",
  "asset-consistency-validation",
  "layer-extraction",
  "character-rigging",
  "animation",
  "bricktoon-shots",
  "ai-video-motion-passes",
  "shot-compositing",
  "scene-assembly",
  "render-contract",
  "render",
  "shorts",
  "qc",
  "bricktoon-audit"
]
```

### New agents

```text
agents/visual_character_bible_agent.js
agents/visual_production_router_agent.js
agents/shot_art_direction_agent.js
agents/composition_guide_agent.js
agents/asset_consistency_agent.js
agents/layer_extraction_agent.js
agents/character_rigging_agent.js
agents/ai_video_motion_agent.js
agents/shot_compositing_agent.js
```

### New scripts

```text
scripts/generate_character_bibles.js
scripts/generate_composition_guides.js
scripts/generate_shot_keyframes.js
scripts/validate_generated_assets.js
scripts/extract_shot_layers.js
scripts/build_character_rigs.js
scripts/generate_ai_motion_passes.js
scripts/stabilize_ai_motion.js
scripts/composite_bricktoon_shots.js
```

### Asset manifest types

```text
character_bible
composition_guide
generated_keyframe
approved_keyframe
shot_layer
clean_plate
ai_motion_pass
stabilized_motion_pass
composited_shot_clip
bricktoon_composited_shot_sequence
```

---

## 26. QC Expansion

Add checks for:

- character identity consistency
- outfit consistency
- accessory consistency
- limb and hand count
- face deformation
- prop readability
- text accuracy
- background continuity
- lighting direction
- perspective
- layer-edge quality
- motion warping
- frame flicker
- camera stability
- face drift
- prop drift
- colour consistency
- depth quality

Example rejection reasons:

```text
moustache changed shape
top hat disappeared
invoice became unreadable
extra arm appeared
background windows changed
face flickers
payment terminal merged into hand
lighting changed during shot
coat colour changed
```

---

## 27. First Regression Scene

Use the store/invoice scene.

Recommended shot distribution:

```text
1. layered AI establishing shot
2. rigged character entrance
3. hybrid conversation shot
4. procedural invoice close-up
5. AI-assisted customer reaction
6. hero villain close-up
7. layered employee reaction
8. procedural document transition
```

Acceptance criteria:

```text
duration: 20–30 seconds
shot count: 6–8
hero shots: at least 2
procedural precision shots: at least 1
AI motion passes: maximum 2 for first test
character identity: stable
document accuracy: fully readable
foreground depth: at least 3 shots
environmental motion: at least 3 shots
motivated transition: at least 1
```

---

## 28. Provider-Agnostic Generation

AI generation must not lock the architecture to one provider.

Supported provider modes:

```text
mock
local
remote_api
manual_import
```

Example request:

```json
{
  "request_id": "scene_007_shot_006_keyframe_A",
  "provider": "remote_api",
  "task_type": "image_generation",
  "references": [
    "store_owner_three_quarter_left.png",
    "small_business_store_reference.png",
    "scene_007_shot_006_composition_guide.png"
  ],
  "art_direction_file": "scene_007_shot_006.json",
  "output_resolution": {
    "width": 3840,
    "height": 2160
  },
  "expected_outputs": 4,
  "manual_approval_required": true
}
```

All generated assets must pass through the same manifest, validation, approval, and fallback system.

---

## 29. Hardware Strategy

Target workstation:

```text
GTX 1080 8 GB
Xeon E5-2696 v4, 22 cores / 44 threads
64 GB RAM
```

Recommended use:

```text
CPU:
layer extraction
clean-plate generation
frame compositing
image processing
final encoding
parallel shot jobs

GPU:
preview encoding
local image processing
small local generation tasks
AI motion tasks that fit VRAM
```

The pipeline should support remote generation for tasks too large for the GTX 1080 while retaining local deterministic animation and compositing.

---

## 30. Failure and Fallback Rules

### AI keyframe fails

```text
regenerate
-> alternate approved keyframe
-> layered procedural shot
-> static illustrated shot
-> existing animated clip
```

### Layer extraction fails

```text
flattened image with camera motion
```

### AI motion fails

```text
puppet motion
-> parallax only
-> static keyframe with camera motion
```

### Character consistency fails

```text
approved rigged character asset
```

### Generated text fails

```text
remove it and replace procedurally
```

---

## 31. Implementation Phases

### Phase 1: One high-quality still

- create visual quality profile
- create one character bible
- create one environment bible
- generate composition guide
- generate one hero keyframe
- validate character consistency
- remove debug overlays
- add cinematic lighting and foreground depth

**Done when:** the frame can serve as a thumbnail-quality still.

### Phase 2: Layered hero shot

- extract background
- build clean plate
- isolate characters, heads, arms, prop, foreground, atmosphere
- create layer manifest
- add parallax

**Done when:** the camera can move without exposing holes or broken edges.

### Phase 3: Controlled character motion

- rig head, eyes, eyebrows, mouth, one arm
- attach invoice
- add blink, gesture, expression, and environmental motion

**Done when:** the character performs one deliberate action without losing quality.

### Phase 4: AI motion pass

- generate a 2–5 second motion pass
- stabilize it
- restore face, hands, prop, and procedural text
- compare with puppet-only result

**Done when:** AI motion is selected only when it improves the shot.

### Phase 5: Multi-shot quality sequence

- route 6–8 shots
- assign quality tiers
- generate and approve keyframes
- add one procedural document shot
- add one or two AI motion passes
- composite and assemble scene

**Done when:** the 20–30 second regression scene passes continuity and quality audit.

### Phase 6: Scale across full videos

- reusable environment kits
- multiple character bibles
- automated validation
- shot-level regeneration
- caching
- vertical layouts
- manual review for hero shots

---

## 32. Definition of Done

This update is implemented when:

- visual references are treated as quality and movement benchmarks
- each recurring character has a visual bible
- each shot receives a production route
- hero shots receive art-direction contracts
- procedural frames can become composition guides
- generated keyframes enter the asset manifest
- generated keyframes pass consistency checks
- approved artwork can be separated into layers
- high-quality layers can be animated deterministically
- AI image-to-video is used selectively
- exact documents and numbers remain procedural
- shots receive a unified compositing pass
- QC detects identity drift, flicker, hand errors, prop drift, and text errors
- one 20–30 second mixed-method scene passes audit
- full videos can mix production methods without breaking the renderer

---

## 33. Immediate Implementation Order

```text
1. Add VISUAL_REFERENCE_INTERPRETATION.md
2. Add visual_quality_profile.json
3. Add visual-character-bible stage
4. Build one complete character bible
5. Add visual-production-router stage
6. Add shot-art-direction stage
7. Convert procedural shot into composition guide
8. Generate one approved hero keyframe
9. Add consistency validation
10. Add layer extraction and clean-plate generation
11. Add shot compositing
12. Animate one layered hero shot
13. Add one optional AI motion pass
14. Build the 6–8 shot regression scene
15. Extend bricktoon audit
16. Add provider-agnostic generation interface
17. Scale to additional stories
```

---

## 34. Final Target

Current visual model:

```text
procedural animation engine
that also draws the final artwork
```

Target visual model:

```text
procedural directing and animation engine
+ premium generated or illustrated artwork
+ reusable character bibles
+ deterministic character and prop motion
+ selective AI video
+ professional shot compositing
```

The goal is not to make every video frame as dense as a thumbnail. The goal is to use premium illustrated references as benchmarks for:

- character quality
- lighting
- surface detail
- environmental richness
- depth
- visual hierarchy
- expression
- cinematic energy
- movement quality

The first milestone is one polished hero shot. The second is one polished 20–30 second mixed-method scene. After those pass quality and continuity review, the architecture can be expanded across the full production pipeline.
