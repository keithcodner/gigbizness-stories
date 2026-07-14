# Bricktoon Architecture Implementation Update

**Project:** Gigbizness Stories  
**Document type:** Architecture implementation update  
**Status:** Proposed implementation plan  
**Primary goal:** Upgrade the current procedural bricktoon system from animated scene posters into longer, multi-shot, character-driven animated sequences without replacing the existing research, legal-risk, orchestration, rendering, or QC architecture.

---

## 1. Executive Summary

The current bricktoon pipeline is structurally sound and already solves several important problems:

- research remains the source of truth
- claims pass through legal-risk controls
- the cast package preserves reusable character continuity
- scene cards convert the script into visual intent
- the animation stage produces procedural movement
- animated clips are preferred over static scenes
- render fallbacks keep the project from failing when an advanced asset is unavailable
- QC and audit stages determine whether the result is publishable

The main limitation is not the overall pipeline. The limitation is the current scene model.

Today, a scene is effectively treated as:

```text
one scene card
-> one composition
-> one generated/static visual
-> procedural motion applied to that visual
-> one animated scene clip
```

This creates movement, but it still feels like a moving poster or slideshow.

The next architecture version should treat each narrative scene as a sequence of visual beats and camera shots:

```text
one scene card
-> narrative beats
-> shot sequence
-> layered shot layouts
-> character performances
-> individual shot clips
-> assembled scene sequence
```

The recommended technical direction is a deterministic **2.5D procedural puppet-animation system** with reusable character rigs, props, backgrounds, camera layouts, timed actions, and scene continuity.

This update preserves the current orchestrator and extends it.

---

# 2. Current Architecture Baseline

The current practical flow is:

```text
format
-> research
-> angle
-> script
-> cast
-> scene-cards
-> bricktoon-characters
-> voice
-> assets
-> bricktoon-scenes
-> bricktoon-manifest
-> animation
-> bricktoon-clips
-> render-contract
-> render
-> shorts
-> qc
-> bricktoon-audit
```

Current visual asset selection priority:

```text
1. bricktoon_animated_clip
2. bricktoon_layered_scene
3. bricktoon_scene
4. source/document/chart/text fallbacks
```

Current animation capabilities include:

- camera push
- camera drift
- blink passes
- speech-energy pulses
- villain emphasis
- invoice or price jumps
- proof-folder reveals
- warning icon pulses
- typing overlays
- impact shake

The current architecture does not yet fully support:

- multiple shots within one scene
- reusable articulated character rigs
- arm and hand interaction
- prop attachment
- structured performance timelines
- scene-state continuity
- shot-to-shot screen-direction continuity
- true mouth poses
- layered depth and parallax
- structured environmental motion
- scene-level sound design
- shot-level rendering and caching

---

# 3. Problems This Update Solves

## 3.1 Scenes Feel Too Basic

The current output is readable, but visually simple because scenes commonly contain:

- flat frontal character poses
- thin stick-like limbs
- limited facial expressions
- minimal body articulation
- little foreground/background depth
- large text overlays instead of in-world props
- limited lighting and shadows
- low-resolution raster edges
- one layout held for the full duration

## 3.2 Longer Scenes Feel Stretched

Longer scenes are currently created mainly by extending camera motion, holds, or procedural effects.

This does not create new narrative information.

A longer scene should contain more visual beats, such as:

- character entering
- prop being revealed
- number changing
- another character reacting
- camera cutting closer
- secondary character showing discomfort
- transition into evidence or the next story beat

## 3.3 Character Motion Is Not Yet Performance-Based

The animation system currently chooses scene effects.

The upgraded system should schedule a performance:

```text
who acts
what action they perform
when the action starts
when it ends
how intense it is
what another character does in response
what sound or camera event accompanies it
```

## 3.4 Scene Continuity Is Not Explicit

When one scene becomes multiple shots, the system must remember:

- character screen position
- prop visibility
- current facial expression
- door state
- document state
- invoice amount
- whether a character has entered or exited
- which hand is holding a prop
- camera axis

This requires a scene-state contract.

---

# 4. Target Architecture

## 4.1 Updated High-Level Flow

The proposed production flow is:

```text
format
-> research
-> angle
-> script
-> cast
-> scene-cards
-> bricktoon-characters
-> voice
-> assets
-> scene-beats
-> shot-planner
-> bricktoon-scenes
-> bricktoon-manifest
-> animation
-> bricktoon-shots
-> scene-assembly
-> render-contract
-> render
-> shorts
-> qc
-> bricktoon-audit
```

## 4.2 Compatibility Strategy

The existing `bricktoon-clips` stage should remain temporarily as a compatibility layer.

During migration:

```text
bricktoon-clips
```

may act as an alias or wrapper around:

```text
bricktoon-shots
-> scene-assembly
```

The renderer must continue accepting older asset types.

Recommended asset priority:

```text
1. bricktoon_scene_sequence
2. bricktoon_animated_clip
3. bricktoon_layered_scene
4. bricktoon_scene
5. source_document
6. chart
7. stock/source fallback
8. text fallback
```

---

# 5. New Stage: Scene Beats

## 5.1 Purpose

The `scene-beats` stage converts one scene card into a sequence of meaningful visual and narrative actions.

It should answer:

- What changes during this scene?
- What is established?
- What is revealed?
- Who initiates the conflict?
- Who reacts?
- Which prop matters?
- What is the visual payoff?
- What motivates the transition?

## 5.2 Inputs

```text
02_script/script_v2_human_review.md
02_script/shotlist.csv
03_cast/cast.json
03_cast/scene_cast_map.json
03_cast/prop_assignments.json
05_scene_cards/scene_cards.json
03_voice/scene_timing.json
```

## 5.3 Outputs

```text
06_scene_beats/scene_beats.json
06_scene_beats/scenes/scene_001_beats.json
06_scene_beats/scenes/scene_002_beats.json
06_scene_beats/scene_beats_report.md
06_scene_beats/scene_beats_validation.json
```

## 5.4 Example Contract

```json
{
  "scene_beats_version": 1,
  "scene_id": "scene_007",
  "estimated_duration_seconds": 28.4,
  "beats": [
    {
      "beat_id": "scene_007_beat_01",
      "purpose": "establish_location",
      "description": "Show the storefront and introduce the three characters.",
      "duration_seconds": 3.5,
      "required_characters": [
        "customer",
        "store_owner",
        "employee"
      ],
      "required_props": [],
      "visual_change": "new_environment"
    },
    {
      "beat_id": "scene_007_beat_02",
      "purpose": "present_problem",
      "description": "The owner places a large invoice on the counter.",
      "duration_seconds": 5.0,
      "required_characters": [
        "store_owner",
        "customer"
      ],
      "required_props": [
        "invoice_standard"
      ],
      "visual_change": "prop_reveal"
    },
    {
      "beat_id": "scene_007_beat_03",
      "purpose": "reveal_price",
      "description": "The invoice total changes to $1,200.",
      "duration_seconds": 4.0,
      "required_characters": [],
      "required_props": [
        "invoice_standard"
      ],
      "visual_change": "number_reveal"
    },
    {
      "beat_id": "scene_007_beat_04",
      "purpose": "character_reaction",
      "description": "The customer reacts in disbelief while the employee becomes uncomfortable.",
      "duration_seconds": 5.0,
      "required_characters": [
        "customer",
        "employee"
      ],
      "required_props": [
        "invoice_standard"
      ],
      "visual_change": "expression_change"
    },
    {
      "beat_id": "scene_007_beat_05",
      "purpose": "villain_payoff",
      "description": "The owner smiles and gestures toward the payment terminal.",
      "duration_seconds": 5.5,
      "required_characters": [
        "store_owner"
      ],
      "required_props": [
        "payment_terminal"
      ],
      "visual_change": "character_action"
    },
    {
      "beat_id": "scene_007_beat_06",
      "purpose": "transition",
      "description": "Push into the invoice to transition to the evidence section.",
      "duration_seconds": 5.4,
      "required_characters": [],
      "required_props": [
        "invoice_standard"
      ],
      "visual_change": "transition"
    }
  ]
}
```

## 5.5 Validation Rules

The stage should fail or warn when:

- a scene has no meaningful change
- total beat duration differs materially from the narration duration
- a required prop is not assigned
- a required character is not mapped to the scene
- the same beat type is repeated without progression
- a scene longer than 20 seconds has fewer than three meaningful beats
- a transition beat has no destination or transition type

---

# 6. New Stage: Shot Planner

## 6.1 Purpose

The `shot-planner` stage converts scene beats into camera shots and layouts.

A beat may produce one shot or several shots.

Example:

```text
Beat: reveal price

Shot A: owner slides invoice
Shot B: invoice insert
Shot C: amount reaches $1,200
Shot D: customer reaction
```

## 6.2 Controlled Shot Vocabulary

The planner should choose from approved shot types:

```text
establishing_wide
wide_three_character
wide_two_character
medium_three_character
medium_two_shot
medium_single
closeup_face
extreme_closeup
over_shoulder
object_insert
document_insert
low_angle_villain
high_angle_victim
reaction_cutaway
tracking_entry
tracking_exit
push_in_document
silhouette_reveal
foreground_reveal
top_down_document
```

The planner should not generate arbitrary camera descriptions when a standard preset exists.

## 6.3 Outputs

```text
07_shot_plans/shot_plan.json
07_shot_plans/scenes/scene_001_shots.json
07_shot_plans/layout_assignments.json
07_shot_plans/shot_plan_report.md
07_shot_plans/shot_plan_validation.json
```

## 6.4 Example Shot Plan

```json
{
  "shot_plan_version": 1,
  "scene_id": "scene_007",
  "scene_duration_seconds": 30.0,
  "continuity": {
    "screen_axis": {
      "left_actor": "customer",
      "right_actor": "store_owner"
    },
    "allow_axis_crossing": false
  },
  "shots": [
    {
      "shot_id": "scene_007_shot_001",
      "beat_id": "scene_007_beat_01",
      "shot_type": "establishing_wide",
      "layout_id": "storefront_exterior_wide",
      "start": 0.0,
      "end": 3.5,
      "purpose": "Establish location and character positions.",
      "camera": {
        "movement": "push_in",
        "start_scale": 1.0,
        "end_scale": 1.07,
        "easing": "ease_in_out"
      }
    },
    {
      "shot_id": "scene_007_shot_002",
      "beat_id": "scene_007_beat_01",
      "shot_type": "tracking_entry",
      "layout_id": "small_store_entry_medium_wide",
      "start": 3.5,
      "end": 7.5,
      "purpose": "Show the customer entering the store."
    },
    {
      "shot_id": "scene_007_shot_003",
      "beat_id": "scene_007_beat_02",
      "shot_type": "over_shoulder",
      "layout_id": "counter_customer_ots",
      "start": 7.5,
      "end": 12.5,
      "purpose": "Show the owner presenting the invoice."
    },
    {
      "shot_id": "scene_007_shot_004",
      "beat_id": "scene_007_beat_03",
      "shot_type": "document_insert",
      "layout_id": "invoice_closeup",
      "start": 12.5,
      "end": 15.5,
      "purpose": "Reveal the $1,200 total."
    },
    {
      "shot_id": "scene_007_shot_005",
      "beat_id": "scene_007_beat_04",
      "shot_type": "closeup_face",
      "layout_id": "customer_reaction_closeup",
      "start": 15.5,
      "end": 19.5,
      "purpose": "Show disbelief."
    },
    {
      "shot_id": "scene_007_shot_006",
      "beat_id": "scene_007_beat_05",
      "shot_type": "low_angle_villain",
      "layout_id": "owner_low_angle",
      "start": 19.5,
      "end": 23.0,
      "purpose": "Emphasize the owner's control."
    },
    {
      "shot_id": "scene_007_shot_007",
      "beat_id": "scene_007_beat_04",
      "shot_type": "reaction_cutaway",
      "layout_id": "employee_reaction_medium",
      "start": 23.0,
      "end": 27.0,
      "purpose": "Show employee discomfort."
    },
    {
      "shot_id": "scene_007_shot_008",
      "beat_id": "scene_007_beat_06",
      "shot_type": "push_in_document",
      "layout_id": "invoice_transition",
      "start": 27.0,
      "end": 30.0,
      "purpose": "Transition to evidence."
    }
  ]
}
```

## 6.5 Shot Planning Rules

```text
Scene longer than 15 seconds:
minimum 3 shots

Scene longer than 25 seconds:
minimum 5 shots

Scene longer than 40 seconds:
minimum 7 shots or a documented continuous visual transformation

Shot longer than 8 seconds:
minimum 2 meaningful visual events

Static hold longer than 4 seconds:
must be explicitly intentional

Do not repeat the same framing twice in a row.

Establish a location before using unexplained close-ups.

Use insert shots for documents, numbers, evidence, phones, receipts, and contracts.

Do not cross the screen axis unless explicitly permitted.

Do not cut during the middle of an important hand or prop action.

Close-ups should be tied to reaction, evidence, or emphasis.
```

---

# 7. Voice Timing and Duration Control

## 7.1 Scene Length Must Come From Narration

Longer scenes must be aligned to the actual voice track.

The voice stage should produce:

```text
03_voice/voiceover_clean.wav
03_voice/captions.srt
03_voice/word_timing.json
03_voice/sentence_timing.json
03_voice/scene_timing.json
```

## 7.2 Example Scene Timing

```json
{
  "scene_id": "scene_007",
  "audio_start_seconds": 72.41,
  "audio_end_seconds": 101.08,
  "duration_seconds": 28.67,
  "sentences": [
    {
      "sentence_id": "scene_007_sentence_01",
      "text": "The customer expected a routine transaction.",
      "start": 72.41,
      "end": 77.32
    },
    {
      "sentence_id": "scene_007_sentence_02",
      "text": "Instead, the owner placed a twelve-hundred-dollar invoice in front of him.",
      "start": 77.32,
      "end": 84.85
    },
    {
      "sentence_id": "scene_007_sentence_03",
      "text": "That was when the situation changed.",
      "start": 84.85,
      "end": 88.1
    }
  ]
}
```

## 7.3 Visual Synchronization

The planner should attach visual events to narration moments:

```text
Narration begins:
customer enters

“Instead”:
cut to owner

“twelve-hundred-dollar invoice”:
invoice slam and amount reveal

“the situation changed”:
customer reaction and music sting
```

---

# 8. Reusable Layered Character Rig System

## 8.1 Design Goal

Characters should no longer be treated as single flat images.

Each character becomes a layered 2D puppet.

The visual style should remain deliberately brick-like and slightly stiff, but the system should support controlled articulation.

## 8.2 Recommended Character Hierarchy

```text
character_root
├── contact_shadow
├── rear_arm
│   ├── upper_arm
│   ├── forearm
│   └── hand
├── rear_leg
│   ├── upper_leg
│   ├── lower_leg
│   └── foot
├── torso
├── front_leg
│   ├── upper_leg
│   ├── lower_leg
│   └── foot
├── front_arm
│   ├── upper_arm
│   ├── forearm
│   └── hand
├── neck
├── head
│   ├── face_base
│   ├── eyes
│   ├── eyebrows
│   ├── mouth
│   ├── facial_hair
│   ├── hair
│   └── accessory
└── foreground_accessory
```

## 8.3 Minimum Joint Set

```text
root
hips
torso
neck
head
left_shoulder
left_elbow
left_hand
right_shoulder
right_elbow
right_hand
left_hip
left_knee
left_foot
right_hip
right_knee
right_foot
```

## 8.4 Rig File Location

```text
07_visuals/character_rigs/{character_id}/rig.json
```

## 8.5 Example Rig Contract

```json
{
  "rig_version": 1,
  "character_id": "store_owner",
  "design_resolution": {
    "width": 2048,
    "height": 2048
  },
  "root_anchor": {
    "x": 1024,
    "y": 1800
  },
  "parts": [
    {
      "id": "torso",
      "asset": "parts/torso.png",
      "parent": "root",
      "pivot": {
        "x": 512,
        "y": 850
      },
      "z_index": 30
    },
    {
      "id": "head",
      "asset": "parts/head.png",
      "parent": "torso",
      "pivot": {
        "x": 512,
        "y": 930
      },
      "z_index": 50
    },
    {
      "id": "left_upper_arm",
      "asset": "parts/left_upper_arm.png",
      "parent": "torso",
      "pivot": {
        "x": 490,
        "y": 115
      },
      "z_index": 20
    },
    {
      "id": "left_forearm",
      "asset": "parts/left_forearm.png",
      "parent": "left_upper_arm",
      "pivot": {
        "x": 95,
        "y": 90
      },
      "z_index": 21
    }
  ],
  "sockets": {
    "left_hand_socket": {
      "part": "left_forearm",
      "x": 28,
      "y": 165
    },
    "right_hand_socket": {
      "part": "right_forearm",
      "x": 160,
      "y": 165
    },
    "mouth_socket": {
      "part": "head",
      "x": 512,
      "y": 585
    },
    "hat_socket": {
      "part": "head",
      "x": 512,
      "y": 95
    }
  }
}
```

## 8.6 Prop Sockets

Sockets are required for believable interaction.

When a character picks up an invoice, the invoice must attach to a hand socket.

The prop should not simply move near the character.

Required socket types:

```text
left_hand_socket
right_hand_socket
two_hand_center_socket
head_accessory_socket
mouth_socket
back_socket
waist_socket
```

---

# 9. Reusable Pose Library

The animation agent should not invent raw joint angles for every shot.

It should use a controlled pose library.

## 9.1 Recommended Poses

```text
neutral_front
neutral_three_quarter_left
neutral_three_quarter_right
hands_on_hips
arms_crossed
point_left
point_right
present_object
hold_document
read_document
shocked
angry
worried
smug
celebrating
defeated
lean_forward
lean_backward
sit_neutral
sit_nervous
```

## 9.2 Pose File Structure

```text
src/bricktoon/poses/
    neutral_front.json
    neutral_three_quarter_left.json
    point_right.json
    hold_document.json
    shocked.json
```

## 9.3 Pose Contract

```json
{
  "pose_id": "hold_document",
  "rig_compatibility": [
    "bricktoon_humanoid_v1"
  ],
  "joints": {
    "torso.rotation": -2,
    "head.rotation": 3,
    "left_upper_arm.rotation": 38,
    "left_forearm.rotation": -58,
    "right_upper_arm.rotation": -35,
    "right_forearm.rotation": 55
  },
  "required_sockets": [
    "left_hand_socket",
    "right_hand_socket"
  ]
}
```

---

# 10. Reusable Action Library

## 10.1 Recommended Actions

```text
idle_basic
idle_nervous
idle_confident
blink
talk_calm
talk_angry
talk_excited
head_nod
head_shake
look_left
look_right
point
shrug
invoice_slam
pick_up_document
hand_over_document
type_on_keyboard
walk_in
walk_out
turn_around
sit_down
stand_up
villain_grin
double_take
payment_terminal_tap
door_open
door_close
```

## 10.2 Action Contract

```json
{
  "action_id": "invoice_slam",
  "duration_seconds": 1.15,
  "tracks": [
    {
      "target": "torso.rotation",
      "keyframes": [
        {
          "time": 0,
          "value": 0
        },
        {
          "time": 0.35,
          "value": -4
        },
        {
          "time": 0.72,
          "value": 8
        },
        {
          "time": 1.15,
          "value": 0
        }
      ]
    },
    {
      "target": "right_upper_arm.rotation",
      "keyframes": [
        {
          "time": 0,
          "value": 20
        },
        {
          "time": 0.35,
          "value": -45
        },
        {
          "time": 0.72,
          "value": 55
        },
        {
          "time": 1.15,
          "value": 25
        }
      ]
    },
    {
      "target": "prop.invoice.position_y",
      "keyframes": [
        {
          "time": 0,
          "value": -220
        },
        {
          "time": 0.7,
          "value": -220
        },
        {
          "time": 0.82,
          "value": 0
        }
      ]
    },
    {
      "target": "camera.impact_shake",
      "keyframes": [
        {
          "time": 0.78,
          "value": 0
        },
        {
          "time": 0.84,
          "value": 1
        },
        {
          "time": 1.0,
          "value": 0
        }
      ]
    }
  ],
  "audio_events": [
    {
      "time": 0.82,
      "sound": "paper_slam_01.wav"
    }
  ]
}
```

## 10.3 Action Reuse Benefit

Reusable actions create compounding quality improvements.

Improving `invoice_slam` once improves every story that uses it.

---

# 11. Character Performance Timeline

## 11.1 Current Model

The existing animation plan appears to describe scene-level effects.

## 11.2 Updated Model

The animation plan should become a timed performance timeline.

Example:

```json
{
  "animation_plan_version": 2,
  "scene_id": "scene_007",
  "shot_id": "scene_007_shot_003",
  "duration_seconds": 5.2,
  "performances": [
    {
      "actor_id": "store_owner",
      "actions": [
        {
          "action": "talk_confident",
          "start": 0.0,
          "end": 2.1,
          "intensity": 0.65
        },
        {
          "action": "invoice_slam",
          "start": 2.05,
          "end": 3.2
        },
        {
          "action": "villain_grin",
          "start": 3.4,
          "end": 5.2
        }
      ]
    },
    {
      "actor_id": "customer",
      "actions": [
        {
          "action": "idle_basic",
          "start": 0.0,
          "end": 2.7
        },
        {
          "action": "double_take",
          "start": 2.7,
          "end": 3.7
        },
        {
          "action": "shocked",
          "start": 3.7,
          "end": 5.2
        }
      ]
    },
    {
      "actor_id": "employee",
      "actions": [
        {
          "action": "idle_nervous",
          "start": 0.0,
          "end": 5.2
        },
        {
          "action": "look_away",
          "start": 3.1,
          "end": 4.2
        }
      ]
    }
  ]
}
```

## 11.3 Performance Rules

- characters should not all move simultaneously
- secondary characters should react after the primary event
- gestures should precede or accompany emphasis
- expressions should persist across cuts when continuity requires it
- off-screen characters should not receive unnecessary animation
- narration scenes may use pantomime rather than continuous mouth movement
- reactions should be delayed slightly after the triggering event
- action intensity should vary by role and personality

---

# 12. Mouth and Facial Animation

## 12.1 Initial Mouth System

Full phoneme lip sync is not required for the first implementation.

Start with:

```text
mouth_closed
mouth_small_open
mouth_wide_open
mouth_round
```

## 12.2 Basic Audio-Driven Mapping

```text
silence or low amplitude:
mouth_closed

normal speech:
mouth_small_open

high speech energy:
mouth_wide_open

long O or OO sound:
mouth_round
```

## 12.3 Mouth Timing Rules

- hold each mouth pose for at least two frames
- avoid changing mouth shape every frame
- close briefly between phrases
- do not animate the mouth when narration is not spoken by the visible character
- combine emphasis with head or eyebrow movement
- cap mouth changes to avoid jitter

## 12.4 Expression Library

Recommended expression states:

```text
neutral
happy
smug
worried
afraid
angry
confused
suspicious
embarrassed
shocked
sad
determined
exhausted
fake_smile
```

Each expression should control:

```text
eyebrow angle
eyelid openness
pupil direction
mouth selection
head tilt
optional forehead or cheek lines
```

---

# 13. Character Design Improvements

To preserve the simple bricktoon identity while improving production value:

- thicken torsos and limbs
- create clear shoulder width
- add elbow articulation
- add brick-claw or simplified hand shapes
- add foot blocks or shoes
- add hip and knee joints
- introduce three-quarter body poses
- vary silhouettes
- give each character a distinct stance
- keep costume and accessory continuity stable

Example body-language definitions:

```text
Store owner:
wide stance
chest forward
elbows out
slow confident gestures
small delayed smile

Employee:
narrow stance
slightly hunched shoulders
hands close to body
nervous eye movement
limited gestures

Customer:
upright before reveal
leans backward after reveal
hands rise during shock
faster reaction timing
```

---

# 14. Layered Scene Composition

## 14.1 Scene Layer Structure

A scene should be rendered from independent layers:

```text
background_far
    sky
    distant buildings
    clouds

background_middle
    storefront
    windows
    interior silhouettes
    wall signs

ground
    sidewalk
    curb
    road
    floor texture

character_rear
    rear characters
    rear limbs

character_main
    main actors

prop_layer
    counter
    invoice
    payment terminal
    furniture

foreground
    door frame
    plant
    street sign
    passing object

effects
    shadows
    light bloom
    dust
    rain
    warning pulse
```

## 14.2 Parallax

Recommended parallax multipliers:

```text
far background:
camera movement × 0.08

middle background:
camera movement × 0.25

characters:
camera movement × 0.55

foreground:
camera movement × 0.90
```

## 14.3 Stage Positioning

Characters should occupy different depths.

Example:

```json
{
  "actor_id": "customer",
  "stage_position": "foreground_left",
  "world_x": -420,
  "world_y": 180,
  "depth": 0.82,
  "scale": 1.16
}
```

Recommended staging for the invoice scene:

```text
Customer:
foreground left

Owner:
middle center behind counter

Employee:
background right, partially obscured

Invoice:
foreground center during reveal
```

---

# 15. Shadows and Lighting

## 15.1 Contact Shadows

Every character and prop that touches a surface should have a contact shadow.

Basic character shadow:

```text
shape:
soft ellipse

opacity:
20–35 percent

blur:
moderate

width:
based on stance

position:
locked to root or foot anchor
```

## 15.2 Lighting Passes

Use four simple passes:

1. ambient shading
2. contact shadows
3. rim lighting
4. environmental light overlay

For a storefront:

```text
warm light:
store windows and interior

cool light:
street ambience

additional:
awning shadow
window reflection
small display glow
```

Lighting direction must remain consistent across character parts and props.

---

# 16. Render Quality Improvements

## 16.1 Replace BMP for Final Visual Assets

Recommended formats:

```text
transparent PNG:
raster character parts and props

SVG:
geometric characters, signs, documents, simple props

PNG frame sequences:
high-quality animation intermediates
```

BMP may remain for temporary debugging only.

## 16.2 Supersampling

For final 1920×1080 output:

```text
working resolution:
3840×2160

final resolution:
1920×1080
```

For high-priority shots:

```text
working resolution:
7680×4320

final resolution:
1920×1080
```

## 16.3 Downsampling

Example:

```bash
ffmpeg -framerate 30 \
  -i frames/%06d.png \
  -vf "scale=1920:1080:flags=lanczos" \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -pix_fmt yuv420p \
  output.mp4
```

## 16.4 Intermediate Quality Rules

- use one color profile across assets
- handle premultiplied alpha consistently
- avoid JPEG intermediates
- avoid repeated lossy encoding
- validate frame rate before assembly
- validate that all transparent edges remain clean
- use high-quality intermediate settings

---

# 17. Native Aspect-Ratio Layouts

## 17.1 Longform Canvas

```json
{
  "canvas": {
    "width": 1920,
    "height": 1080,
    "safe_area": {
      "left": 96,
      "right": 96,
      "top": 72,
      "bottom": 96
    }
  }
}
```

## 17.2 Vertical Canvas

```json
{
  "canvas": {
    "width": 1080,
    "height": 1920,
    "safe_area": {
      "left": 64,
      "right": 64,
      "top": 120,
      "bottom": 160
    }
  }
}
```

## 17.3 Layout Rule

Vertical scenes should be re-staged, not cropped from landscape.

Example:

```text
16:9:
customer left
owner center
employee right

9:16:
customer foreground bottom
owner center
employee behind owner
invoice high center
```

---

# 18. In-World Text and Information Design

Large text panels should not be the default presentation for prices, evidence, or business facts.

Use in-world objects:

- invoice
- receipt
- payment terminal
- hanging price board
- cash-register display
- contract
- phone screen
- laptop screen
- folder label
- chart board
- newspaper headline

Recommended reveal:

```text
owner places invoice
camera cuts closer
invoice initially shows blank or partial amount
digits animate upward
amount lands at $1,200
red underline appears
customer reacts
```

This creates a story event rather than an overlay.

---

# 19. Reusable Background Kits

Recommended environment library:

```text
small_business_storefront
small_business_interior
corporate_office
warehouse
boardroom
courtroom
bank
factory
restaurant
retail_counter
home_office
newsroom
server_room
street
parking_lot
airport
hotel_lobby
conference_room
```

Each environment should support:

```text
wide layout
medium layout
close-up layout
day lighting
night lighting
clean version
run-down version
foreground occluders
animated environmental elements
```

Example folder:

```text
assets/bricktoon/backgrounds/small_business_storefront/
    environment.json
    exterior_wide.svg
    exterior_medium.svg
    interior_wide.svg
    interior_counter.svg
    foreground_doorframe.png
    window_reflection.png
    sign.png
```

---

# 20. Reusable Prop Kits

Recommended prop library:

```text
invoice
contract
receipt
cash_register
payment_terminal
laptop
phone
folder
clipboard
briefcase
money_stack
credit_card
shipping_box
security_camera
court_document
newspaper
chart_board
warning_sign
coffee_cup
store_bag
```

Example prop contract:

```json
{
  "prop_id": "invoice_standard",
  "asset": "invoice_standard.svg",
  "interaction_points": {
    "hold_left": {
      "x": 160,
      "y": 420
    },
    "hold_right": {
      "x": 760,
      "y": 420
    },
    "slam_anchor": {
      "x": 460,
      "y": 880
    }
  },
  "dynamic_fields": [
    "company_name",
    "line_items",
    "subtotal",
    "tax",
    "total"
  ]
}
```

---

# 21. Environmental Motion

Long shots can remain visually alive through small loops.

Recommended environmental actions:

```text
window_reflection_drift
sign_sway
passing_car
cloud_drift
door_background_open
door_background_close
register_light_blink
computer_screen_change
steam_rise
paper_edge_flutter
ceiling_fan_rotate
pedestrian_silhouette_pass
monitor_glow_pulse
rain_loop
dust_particles
```

Environmental motion must remain secondary to the main action.

---

# 22. Attention Events

A meaningful visual change should generally occur every two to five seconds.

Attention events include:

- camera cut
- camera push
- gesture
- expression change
- prop reveal
- number change
- document highlight
- sound effect
- environmental movement
- foreground crossing
- text emphasis
- lighting shift
- character entry
- character exit

Example timeline:

```text
0.0:
owner begins speaking

1.2:
owner points to invoice

2.1:
employee looks toward customer

3.0:
camera begins slow push

4.1:
price changes to $1,200

5.0:
customer eyes widen

6.2:
owner smiles
```

---

# 23. Scene State and Continuity

## 23.1 Scene State Contract

```json
{
  "scene_id": "scene_007",
  "initial_state": {
    "customer_location": "outside",
    "invoice_visibility": "hidden",
    "invoice_total": 0,
    "door_state": "closed",
    "owner_expression": "neutral",
    "employee_expression": "neutral",
    "customer_expression": "neutral"
  },
  "state_changes": [
    {
      "time": 3.2,
      "set": {
        "customer_location": "inside",
        "door_state": "open"
      }
    },
    {
      "time": 4.1,
      "set": {
        "door_state": "closed"
      }
    },
    {
      "time": 13.2,
      "set": {
        "invoice_visibility": "visible"
      }
    },
    {
      "time": 16.5,
      "set": {
        "invoice_total": 1200,
        "customer_expression": "shocked",
        "owner_expression": "smug"
      }
    }
  ]
}
```

## 23.2 Continuity Responsibilities

The state system prevents:

- disappearing props
- changing hats
- characters switching sides
- expressions resetting
- doors reopening unexpectedly
- documents changing between shots
- amounts reverting
- hand attachment errors
- characters teleporting

## 23.3 Screen Direction

Example:

```json
{
  "continuity": {
    "screen_axis": {
      "left_actor": "customer",
      "right_actor": "store_owner"
    },
    "allow_axis_crossing": false
  }
}
```

---

# 24. Structured Sound Design

## 24.1 New Output

```text
08_animation/audio_events.json
```

## 24.2 Example

```json
{
  "scene_id": "scene_007",
  "room_tone": "small_store_roomtone_01.wav",
  "events": [
    {
      "time": 1.2,
      "sound": "street_car_pass_02.wav",
      "gain_db": -14
    },
    {
      "time": 4.05,
      "sound": "door_bell_01.wav",
      "gain_db": -9
    },
    {
      "time": 13.4,
      "sound": "paper_slide_02.wav",
      "gain_db": -8
    },
    {
      "time": 14.15,
      "sound": "paper_slam_01.wav",
      "gain_db": -5
    },
    {
      "time": 17.2,
      "sound": "cash_register_warning_01.wav",
      "gain_db": -11
    }
  ]
}
```

## 24.3 Sound Categories

```text
room tone
footsteps
door sounds
paper movement
cash register
keyboard
phone
cloth movement
impact
comedic stinger
tension stinger
whoosh
crowd ambience
street ambience
office ambience
store ambience
```

## 24.4 Mixing Rules

- narration remains the priority
- music ducks under narration
- music ducks slightly more for key impact sounds
- room tone remains subtle
- scene transitions use short audio handles
- no hard silence unless intentionally used for emphasis
- normalize scene loudness before final assembly

---

# 25. New Stage: Bricktoon Shots

## 25.1 Purpose

Render each shot independently.

## 25.2 Inputs

```text
07_shot_plans/shot_plan.json
08_animation/animation_plan.json
08_animation/camera_moves.json
08_animation/audio_events.json
07_visuals/character_rigs/
07_visuals/backgrounds/
07_visuals/props/
07_visuals/asset_manifest.json
```

## 25.3 Outputs

```text
08_animation/shot_clips/scene_001_shot_001.mp4
08_animation/shot_clips/scene_001_shot_002.mp4
08_animation/shot_posters/scene_001_shot_001.png
08_animation/shot_metadata/scene_001_shot_001.json
```

## 25.4 Shot Metadata

```json
{
  "shot_id": "scene_001_shot_001",
  "scene_id": "scene_001",
  "duration_seconds": 3.5,
  "frame_rate": 30,
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "render_mode": "preview",
  "asset_type": "bricktoon_shot_clip",
  "approved": true,
  "warnings": []
}
```

## 25.5 Benefits

- failed shots can be regenerated independently
- scene revisions are cheaper
- rendering can be parallelized
- caching is easier
- shot-level QA is possible
- shorts can reuse individual shots
- memory use remains controlled

---

# 26. New Stage: Scene Assembly

## 26.1 Purpose

Combine individual shot clips into a finished scene sequence.

## 26.2 Responsibilities

- validate shot order
- validate duration
- add hard cuts
- add short dissolves where approved
- add motivated wipes
- preserve audio handles
- mix room tone
- mix sound effects
- align narration
- align captions
- normalize scene audio
- generate scene sequence poster
- register final sequence in the asset manifest

## 26.3 Outputs

```text
08_animation/scene_clips/scene_001_sequence.mp4
08_animation/scene_posters/scene_001_sequence.png
08_animation/scene_sequence_metadata/scene_001.json
```

## 26.4 Asset Manifest Entry

```json
{
  "asset_type": "bricktoon_scene_sequence",
  "scene_id": "scene_007",
  "approved": true,
  "path": "08_animation/scene_clips/scene_007_sequence.mp4",
  "duration_seconds": 30.0,
  "shot_count": 8
}
```

---

# 27. Render Modes

## 27.1 Draft

```text
resolution:
1280×720

frame rate:
24 fps

supersampling:
off

shadows:
basic

motion blur:
reduced

encoder:
NVENC

use:
fast iteration
```

## 27.2 Preview

```text
resolution:
1920×1080

frame rate:
30 fps

supersampling:
2× character and prop layers

shadows:
normal

environment:
standard effects

encoder:
NVENC

use:
human review and QC
```

## 27.3 Final

```text
resolution:
1920×1080

frame rate:
30 fps

supersampling:
2× or 4×

shadows:
high quality

environment:
full effects

downsampling:
Lanczos

encoder:
CPU x264 or approved high-quality final codec

use:
publication
```

---

# 28. Rendering and Worker Strategy

Target workstation:

```text
GPU:
NVIDIA GeForce GTX 1080, 8 GB

CPU:
Intel Xeon E5-2696 v4, 22 cores / 44 threads

RAM:
64 GB
```

Recommended initial worker configuration:

```text
Draft:
6–10 simultaneous shot workers
720p
NVENC

Preview:
4–8 simultaneous shot workers
1080p
NVENC

Final:
4–8 simultaneous shot workers
2× supersampled frames
CPU x264 scene encoding
```

Worker count should remain configurable because shot complexity changes memory use.

Suggested config:

```json
{
  "render_workers": {
    "draft": 8,
    "preview": 6,
    "final": 4
  },
  "max_gpu_jobs": {
    "draft": 2,
    "preview": 2,
    "final": 1
  },
  "max_memory_percent": 82
}
```

---

# 29. Frame and Asset Cache

## 29.1 Cache Targets

```text
background composites
static prop layers
character textures
contact shadows
document renders
text renders
expression sprites
mouth atlases
environment loops
```

## 29.2 Example Cache Keys

```text
background:
small_store_interior|wide|night|3840x2160|v3

character:
store_owner|outfit_01|three_quarter_left|smug|v5

invoice:
invoice_standard|total_1200|company_redacted|v2
```

## 29.3 Cache Invalidation

Invalidate when:

- source asset hash changes
- rig version changes
- expression version changes
- target resolution changes
- lighting preset changes
- prop data changes
- renderer version changes

---

# 30. Updated Folder Structure

```text
03_voice/
    voiceover_clean.wav
    captions.srt
    word_timing.json
    sentence_timing.json
    scene_timing.json

05_scene_cards/
    scene_cards.json
    shot_list.md

06_scene_beats/
    scene_beats.json
    scenes/
        scene_001_beats.json
    scene_beats_report.md
    scene_beats_validation.json

07_shot_plans/
    shot_plan.json
    scenes/
        scene_001_shots.json
    layout_assignments.json
    shot_plan_report.md
    shot_plan_validation.json

07_visuals/
    character_refs/
    character_rigs/
        store_owner/
            rig.json
            parts/
            expressions/
            mouths/
    backgrounds/
    props/
    generated_images/
    prompts/
    asset_manifest.json

08_animation/
    animation_plan.json
    camera_moves.json
    audio_events.json
    scene_state.json
    performance_timelines/
        scene_001_shot_001.json
    shot_layouts/
        scene_001_shot_001.json
    shot_clips/
        scene_001_shot_001.mp4
    shot_posters/
        scene_001_shot_001.png
    shot_metadata/
        scene_001_shot_001.json
    scene_clips/
        scene_001_sequence.mp4
    scene_posters/
        scene_001_sequence.png
    scene_sequence_metadata/
        scene_001.json
    frame_cache/

09_edit_plan/
    edit_plan.md
    render_contract.json
```

---

# 31. Required File-Level Changes

## 31.1 `agents/orchestrator.js`

Add:

```text
scene-beats
shot-planner
bricktoon-shots
scene-assembly
```

Proposed flow:

```js
[
  "format",
  "research",
  "angle",
  "script",
  "cast",
  "scene-cards",
  "bricktoon-characters",
  "voice",
  "assets",
  "scene-beats",
  "shot-planner",
  "bricktoon-scenes",
  "bricktoon-manifest",
  "animation",
  "bricktoon-shots",
  "scene-assembly",
  "render-contract",
  "render",
  "shorts",
  "qc",
  "bricktoon-audit"
]
```

Migration rule:

```text
bricktoon-clips remains available as a compatibility wrapper until all test stories use bricktoon_scene_sequence.
```

## 31.2 New Agent Files

```text
agents/scene_beats_agent.js
agents/shot_planner_agent.js
agents/scene_assembly_agent.js
```

## 31.3 `agents/animation_agent.js`

Change its responsibility from:

```text
choose scene-level motion effects
```

to:

```text
build shot-level actor, prop, environment, camera, and effect timelines
```

New inputs:

```text
scene cards
scene beats
shot plans
cast package
character rigs
voice timing
prop assignments
scene continuity state
```

## 31.4 Existing Clip Generator

Current:

```text
scripts/generate_bricktoon_animated_clips.js
```

Recommended split:

```text
scripts/generate_bricktoon_shots.js
scripts/assemble_bricktoon_scenes.js
```

Temporary compatibility:

```text
generate_bricktoon_animated_clips.js
```

may call the two new scripts internally.

## 31.5 `agents/render_plan_agent.js`

Add support for:

```text
bricktoon_scene_sequence
```

and prefer it over the older animated clip type.

## 31.6 `src/render/resolveSceneAsset.js`

Update priority:

```js
const ASSET_PRIORITY = [
  "bricktoon_scene_sequence",
  "bricktoon_animated_clip",
  "bricktoon_layered_scene",
  "bricktoon_scene",
  "source_document",
  "chart",
  "stock_video",
  "text_fallback"
];
```

## 31.7 `scripts/ffmpeg_render.py`

Add support for:

- scene-sequence clips
- shot handles
- hard cuts
- crossfades
- sound-effect mixing
- room tone
- music ducking
- scene loudness normalization
- frame-rate validation
- duration correction
- caption synchronization

---

# 32. Proposed Module Structure

```text
src/bricktoon/
    rig/
        loadRig.js
        validateRig.js
        resolveSocket.js
        composeCharacter.js

    poses/
        loadPose.js
        applyPose.js
        interpolatePose.js

    actions/
        loadAction.js
        applyAction.js
        blendActions.js

    performance/
        compilePerformanceTimeline.js
        resolveActorState.js
        validatePerformance.js

    scenes/
        loadSceneState.js
        applyStateChange.js
        resolveShotState.js
        validateContinuity.js

    camera/
        cameraPresets.js
        cameraCurves.js
        parallax.js
        impactShake.js

    props/
        loadProp.js
        attachProp.js
        renderDynamicFields.js

    backgrounds/
        loadBackgroundKit.js
        composeEnvironment.js
        environmentLoops.js

    render/
        renderShotFrames.js
        renderShotClip.js
        renderSceneSequence.js
        renderPoster.js

    audio/
        buildAudioEvents.js
        mixSceneAudio.js
        duckMusic.js

    cache/
        buildCacheKey.js
        readCache.js
        writeCache.js
        invalidateCache.js
```

---

# 33. Example 30-Second Regression Scene

The first implementation target should recreate the invoice/store scene as a full sequence.

## Shot 1: Storefront Establishing

```text
Duration:
3.5 seconds

Visuals:
wide storefront
customer walking toward entrance
owner visible through window
employee behind counter

Motion:
slow push
sign sway
small background movement

Sound:
street ambience
light traffic pass
```

## Shot 2: Customer Enters

```text
Duration:
4.0 seconds

Visuals:
interior medium-wide
door opens
customer enters foreground
owner turns
employee glances up

Sound:
door bell
door close
footsteps
```

## Shot 3: Initial Conversation

```text
Duration:
5.0 seconds

Visuals:
customer over-the-shoulder
owner gestures
customer nods
employee shifts nervously
owner reaches below counter

Motion:
subtle camera drift
eye direction changes
```

## Shot 4: Invoice Reveal

```text
Duration:
4.0 seconds

Visuals:
owner raises invoice
invoice slides across counter
camera reacts on contact

Sound:
paper movement
paper slap
```

## Shot 5: Price Insert

```text
Duration:
3.0 seconds

Visuals:
invoice close-up
amount counts upward
$1,200 lands
red underline appears

Audio:
brief music drop
warning sound
```

## Shot 6: Customer Reaction

```text
Duration:
4.0 seconds

Visuals:
customer close-up
eyes widen
head moves backward
hand rises

Camera:
slight push
background softened
```

## Shot 7: Owner Reaction

```text
Duration:
3.5 seconds

Visuals:
low-angle owner close-up
small smug smile
hat brim shadow
payment terminal tap
```

## Shot 8: Employee Reaction and Transition

```text
Duration:
3.0 seconds

Visuals:
employee looks between owner and customer
subtle head shake
camera pushes toward invoice
invoice fills frame

Transition:
invoice becomes the evidence document in the next scene
```

## Scene Acceptance Target

```text
Total duration:
30 seconds

Shot count:
8

Characters:
3

Prop interactions:
minimum 2

Reaction shots:
minimum 2

Number reveal:
1

Environmental loops:
minimum 2

Motivated transition:
1
```

---

# 34. Quality Control Expansion

The `bricktoon-audit` stage must check production quality, not only output existence.

## 34.1 New Audit Checks

```text
shot coverage
character continuity
prop continuity
visual change frequency
longest unchanged period
scene duration versus narration
caption safe area
character clipping
layer ordering
duplicate composition
missing sound effects
missing room tone
missing reactions
unsupported actions
unresolved props
invalid sockets
screen-axis violations
unexpected expression resets
```

## 34.2 Example QC Result

```json
{
  "scene_id": "scene_007",
  "duration_seconds": 30,
  "shot_count": 8,
  "meaningful_visual_events": 15,
  "longest_unchanged_period_seconds": 2.7,
  "characters_present": 3,
  "characters_with_reactions": 3,
  "prop_interactions": 2,
  "continuity_errors": [],
  "warnings": [
    "Shot 5 caption overlaps invoice total."
  ],
  "status": "requires_minor_fix"
}
```

## 34.3 Automatic Failure Conditions

```text
scene clip is more than 0.25 seconds shorter than narration

scene longer than 20 seconds has fewer than 3 shots

character costume or accessory changes unexpectedly

speaking visible character has no mouth or gesture activity

foreground character is clipped outside the safe area

text appears outside the safe area

required shot asset is missing

prop socket cannot be resolved

screen axis changes without approval

scene begins in a state inconsistent with the previous shot

final sequence frame rate differs from render contract
```

---

# 35. New Tests and Commands

Recommended package scripts:

```json
{
  "scripts": {
    "test:scene-beats": "node tests/scene_beats.test.js",
    "test:shot-planner": "node tests/shot_planner.test.js",
    "test:bricktoon-rigs": "node tests/bricktoon_rigs.test.js",
    "test:bricktoon-actions": "node tests/bricktoon_actions.test.js",
    "test:scene-continuity": "node tests/scene_continuity.test.js",
    "test:scene-assembly": "node tests/scene_assembly.test.js",
    "test:bricktoon-sequence": "node tests/bricktoon_sequence.test.js",
    "bricktoon:shots:test": "node scripts/generate_bricktoon_shots.js --topic test_story_template --preview",
    "bricktoon:assemble:test": "node scripts/assemble_bricktoon_scenes.js --topic test_story_template --preview",
    "test-story:bricktoon-sequence": "npm run bricktoon:shots:test && npm run bricktoon:assemble:test",
    "audit:bricktoon-v2": "node scripts/audit_bricktoon_v2.js"
  }
}
```

Existing commands should continue to work:

```powershell
npm run test:cast
npm run test:bricktoon
npm run animation:sample
npm run animation:sample:test
npm run test-story:bricktoon-preview
npm run test-story:render
npm run audit:orchestrator
```

---

# 36. Implementation Phases

## Phase 1: Immediate Visual Quality

### Goal

Improve the existing one-clip-per-scene system before adding multi-shot complexity.

### Tasks

- replace final BMP assets with PNG or SVG
- render at 2× resolution
- downsample with Lanczos
- add contact shadows
- add separate far, middle, character, prop, and foreground layers
- add three-quarter character poses
- add initial facial expressions
- add separate mouth sprites
- move price and evidence text into props
- add environmental loops
- improve layer ordering
- use native 16:9 layouts
- add vertical-specific layouts

### Completion Criteria

- character edges are clean at 1080p
- no major object appears pasted onto the background
- every standing character has a contact shadow
- at least three expression states work
- invoice total renders inside an invoice or terminal
- camera push creates visible parallax

---

## Phase 2: Longer Scene Support

### Goal

Convert one scene into multiple timed shots.

### Tasks

- add `scene-beats`
- add `shot-planner`
- generate voice timing files
- render shots independently
- add `scene-assembly`
- create scene-state contract
- add screen-direction rules
- add `bricktoon_scene_sequence`
- update asset resolution priority
- add sequence-aware QC

### Completion Criteria

- 30-second regression scene renders as 6–8 shots
- shot durations match narration
- prop state remains consistent
- actor screen positions remain consistent
- final renderer prefers scene sequence
- old animated clips still work as fallback

---

## Phase 3: Puppet Character System

### Goal

Replace flat character bodies with reusable articulated rigs.

### Tasks

- split body parts
- define pivots
- define sockets
- build pose library
- build action library
- add four mouth shapes
- add eye direction
- add expression sets
- add simple walk cycles
- add reaction actions
- add prop attachment
- add rig validation

### Completion Criteria

- character can point
- character can hold an invoice
- character can place invoice on counter
- character can walk into frame
- character can turn head
- facial expression can change without regenerating the whole character

---

## Phase 4: Cinematic Polish

### Goal

Improve staging, atmosphere, sound, and visual pacing.

### Tasks

- add parallax
- add foreground occlusion
- add environmental lighting
- add depth blur where appropriate
- add structured sound design
- add room tone
- add secondary movement
- add prop impact effects
- add motivated transitions
- improve camera continuity
- add scene-specific environmental loops

### Completion Criteria

- every long scene has background life
- important actions have sound support
- no shot feels visually static for too long
- transitions are motivated by props, camera motion, or story
- lighting remains consistent across layers

---

## Phase 5: Advanced Automation

### Goal

Allow the system to choose higher-quality visual pacing automatically.

### Tasks

- automatic shot selection from narration
- automatic keyword emphasis
- automatic reaction assignment
- action variation seeds
- shot duplication detection
- animation quality scoring
- visual pacing reports
- automatic layout choice for 16:9 and 9:16
- automatic fallback when a rig action is unavailable
- automatic overnight worker scheduling

### Completion Criteria

- system produces a complete multi-shot scene without manual timing
- QC identifies visually repetitive shots
- vertical layout is generated independently
- missing advanced actions fall back cleanly
- overnight render completes without exhausting memory

---

# 37. Migration Strategy

## Step 1

Keep the current renderer and animated clips working.

## Step 2

Add new schemas and stages behind feature flags.

Example:

```json
{
  "bricktoon_v2": {
    "enabled": true,
    "multi_shot_scenes": true,
    "layered_rigs": false,
    "scene_sequences": true
  }
}
```

## Step 3

Use the stable test story only.

## Step 4

Create one approved 30-second regression scene.

## Step 5

Enable `bricktoon_scene_sequence` resolution.

## Step 6

Move additional stories to the new flow.

## Step 7

Retire the compatibility wrapper only after:

- all tests pass
- guided mode works
- render fallback works
- scene audit works
- final export works

---

# 38. Risks and Controls

## Risk: Complexity Increases Too Quickly

Control:

```text
build multi-shot scenes before full character rigging
```

## Risk: Rigs Become Too Generic

Control:

```text
keep character-specific posture, expression, clothing, and accessory definitions in cast.json and rig metadata
```

## Risk: Rendering Takes Too Long

Control:

```text
shot-level caching
parallel workers
preview mode
supersampling only for final
```

## Risk: Shot Planner Produces Random Cinematography

Control:

```text
controlled shot vocabulary
shot rules
screen-axis validation
layout presets
```

## Risk: Props Teleport or Disappear

Control:

```text
scene-state contract
socket-based attachment
continuity audit
```

## Risk: Vertical Output Looks Cropped

Control:

```text
separate layout planning for each aspect ratio
```

## Risk: AI-Generated Assets Break Character Consistency

Control:

```text
use image generation for references, backgrounds, and textures
use deterministic layered assets for recurring characters and continuity-sensitive props
```

---

# 39. Architecture Principle

AI-generated flat images should not become the foundation of the animation system.

They are appropriate for:

- concept art
- environment references
- background plates
- textures
- one-off poster images
- static fallback scenes

Deterministic layered assets should control:

- recurring characters
- costumes
- expressions
- hands
- mouths
- props
- important interactions
- continuity-sensitive shots

The recommended foundation is:

```text
2.5D procedural puppet animation
+ generated background support
+ reusable scene kits
+ timed performance data
+ deterministic rendering
```

---

# 40. Definition of Done

The architecture update is considered successfully implemented when:

- a scene card can be expanded into narrative beats
- beats can be expanded into a shot plan
- shot duration is derived from voice timing
- characters use reusable rigs
- props attach through sockets
- actions come from a reusable action library
- multiple shot clips are rendered independently
- shot clips assemble into a scene sequence
- scene state remains consistent
- the renderer prefers `bricktoon_scene_sequence`
- the old animated clip remains a valid fallback
- QC measures motion, continuity, pacing, and coverage
- a 30-second test scene renders with 6–8 purposeful shots
- a full story can render overnight without manual assembly

---

# 41. Immediate Next Implementation Order

Recommended order:

```text
1. Add scene_timing.json to voice stage
2. Add scene-beats stage
3. Add shot-planner stage
4. Add shot-plan schemas and validation
5. Split shot rendering from scene assembly
6. Add bricktoon_scene_sequence asset type
7. Update resolveSceneAsset.js
8. Add scene continuity state
9. Add contact shadows and layered parallax
10. Add first character rig
11. Add invoice prop with hand sockets
12. Build the 30-second regression scene
13. Extend bricktoon audit
14. Move additional stories to the new architecture
```

---

# 42. Final Target

Current system:

```text
research-driven slideshow
+ reusable characters
+ procedural camera motion
+ limited animated effects
```

Target system:

```text
research-driven animated story
+ reusable character puppets
+ reusable background and prop kits
+ scene beats
+ multiple shots per scene
+ timed character performances
+ narration synchronization
+ continuity state
+ structured sound design
+ deterministic rendering
```

The first milestone is not a full television-quality animation engine.

The first milestone is one polished, repeatable, thirty-second bricktoon sequence with:

- 6–8 shots
- three reusable characters
- one environment kit
- one interactive invoice prop
- one number reveal
- two reaction shots
- environmental motion
- sound effects
- a motivated transition
- complete continuity
- successful renderer fallback
- passing QC and bricktoon audit
