# Implementation Plan — Bricktoon Cast Architecture with Script-Based Test Framework

Project root:

```text
C:\xampp\htdocs\apps\gigbizness-stories
```

## 0. Scope of This File

This implementation phase creates the **data architecture, agents, schemas, libraries, CLI commands, and tests required to author Bricktoon cast files**.

It does **not** generate character images, scene images, animation clips, thumbnails, or videos.

The reference images supplied to the system are used only as **visual research samples**. The system may manually or automatically describe reusable traits from them, such as:

- character role
- silhouette
- clothing
- facial expression
- prop usage
- color relationships
- storytelling function
- pose ideas
- animation affordances
- composition style

The system must convert those observations into original, reusable Bricktoon character definitions rather than copying an exact branded toy figure, logo, package, storefront, copyrighted character, or real person.

The output of this phase is a validated cast package that a later image-generation or 3D-animation system can consume.

---

## 1. Primary Goal

Build a deterministic cast-authoring pipeline:

```text
script
+ optional visual reference samples
+ Bricktoon style vocabulary
+ reusable character/prop/environment libraries
        ↓
reference analysis
        ↓
story role extraction
        ↓
character archetype selection
        ↓
cast compilation
        ↓
continuity and scene-role mapping
        ↓
automated cast tests
        ↓
approved cast package
```

The cast package must answer:

1. Which characters exist in the story?
2. Which reusable archetype does each character use?
3. What makes each character visually distinct?
4. Which character appears in each script beat and scene?
5. Which props, expressions, poses, and wardrobe states are required?
6. Which traits are permanently locked for continuity?
7. Which traits may change by scene?
8. Which visual-reference traits inspired the design?
9. Which reference traits must not be copied literally?
10. Is the cast complete enough for the later visual-generation stage?

---

## 2. Non-Goals

Do not implement the following in this phase:

- ComfyUI integration
- Stable Diffusion integration
- cloud image-generation APIs
- character PNG generation
- reference-sheet generation
- scene-image generation
- image-to-video generation
- lip sync
- 3D modeling or rigging
- FFmpeg video rendering
- thumbnail generation

Those systems will consume the cast package later. They are not part of this implementation.

---

## 3. Core Design Principle

Separate these concepts:

```text
Reference Sample
    describes visual ideas found in an example image

Character Archetype
    reusable role template such as schemer, victim, investigator, narrator

Character Blueprint
    reusable original character identity stored in the global library

Cast Member
    story-specific use of a character blueprint

Scene Cast Assignment
    states where the cast member appears and what they do
```

Do not store every decision in one large `cast.json` file. Use a small number of linked, testable files.

---

## 4. Target Folder Structure

Add the following structure:

```text
gigbizness-stories/
│
├── references/
│   └── bricktoon/
│       ├── README.md
│       ├── reference_index.json
│       └── samples/
│           ├── REF_0001/
│           │   ├── source.png
│           │   ├── source_metadata.json
│           │   ├── manual_notes.json
│           │   ├── candidate_traits.json
│           │   ├── approved_traits.json
│           │   └── approval.json
│           └── REF_0002/
│               └── ...
│
├── styles/
│   └── bricktoon/
│       ├── style_bible.md
│       ├── visual_rules.json
│       ├── negative_prompts.md
│       └── vocabulary/
│           ├── body_shapes.json
│           ├── face_shapes.json
│           ├── eyes.json
│           ├── eyebrows.json
│           ├── mouths.json
│           ├── hairstyles.json
│           ├── facial_hair.json
│           ├── headwear.json
│           ├── wardrobe.json
│           ├── materials.json
│           ├── color_roles.json
│           ├── expressions.json
│           ├── poses.json
│           ├── motion_affordances.json
│           ├── story_roles.json
│           └── restricted_traits.json
│
├── character_library/
│   └── bricktoon/
│       ├── archetypes/
│       │   ├── narrator.json
│       │   ├── worried_customer.json
│       │   ├── schemer_villain.json
│       │   ├── hacker.json
│       │   ├── investigator.json
│       │   ├── police_officer.json
│       │   ├── business_owner.json
│       │   ├── employee.json
│       │   ├── lawyer.json
│       │   └── generic_crowd.json
│       └── characters/
│           ├── BT_CHAR_0001/
│           │   ├── character.json
│           │   ├── appearance.json
│           │   ├── wardrobe.json
│           │   ├── expression_catalog.json
│           │   ├── pose_catalog.json
│           │   ├── motion_profile.json
│           │   ├── prop_affinities.json
│           │   ├── continuity_rules.json
│           │   ├── reference_links.json
│           │   └── approval.json
│           └── BT_CHAR_0002/
│               └── ...
│
├── prop_library/
│   └── bricktoon/
│       ├── prop_index.json
│       └── props/
│           ├── PROP_TOP_HAT.json
│           ├── PROP_CURLED_MOUSTACHE.json
│           ├── PROP_PHONE.json
│           ├── PROP_LAPTOP.json
│           ├── PROP_GIANT_SCISSORS.json
│           ├── PROP_CONTRACT.json
│           ├── PROP_MOVING_BOX.json
│           ├── PROP_EVIDENCE_FOLDER.json
│           └── PROP_GENERIC_PRODUCT_BOX.json
│
├── environment_library/
│   └── bricktoon/
│       ├── environment_index.json
│       └── environments/
│           ├── ENV_GENERIC_STOREFRONT.json
│           ├── ENV_RETAIL_INTERIOR.json
│           ├── ENV_OFFICE.json
│           ├── ENV_WAREHOUSE.json
│           ├── ENV_SUBURBAN_DRIVEWAY.json
│           ├── ENV_POLICE_SCENE.json
│           └── ENV_NEWS_GRAPHIC_STAGE.json
│
├── schemas/
│   ├── reference_sample.schema.json
│   ├── reference_traits.schema.json
│   ├── character_archetype.schema.json
│   ├── character_blueprint.schema.json
│   ├── prop.schema.json
│   ├── environment.schema.json
│   ├── cast_request.schema.json
│   ├── cast.schema.json
│   ├── cast_continuity.schema.json
│   ├── scene_cast_map.schema.json
│   └── cast_test_report.schema.json
│
├── src/
│   └── cast/
│       ├── loadScript.js
│       ├── extractStoryRoles.js
│       ├── analyzeReferenceSample.js
│       ├── normalizeReferenceTraits.js
│       ├── buildReferenceIndex.js
│       ├── loadCharacterLibrary.js
│       ├── loadPropLibrary.js
│       ├── loadEnvironmentLibrary.js
│       ├── selectCharacterArchetypes.js
│       ├── createCharacterBlueprint.js
│       ├── compileCast.js
│       ├── compileCastContinuity.js
│       ├── compileSceneCastMap.js
│       ├── compilePropAssignments.js
│       ├── validateCastPackage.js
│       ├── writeCastReport.js
│       └── cli/
│           ├── castInitCli.js
│           ├── castAnalyzeReferencesCli.js
│           ├── castCreateCharacterCli.js
│           ├── castCompileCli.js
│           ├── castValidateCli.js
│           └── castReportCli.js
│
├── tests/
│   └── cast/
│       ├── fixtures/
│       │   ├── valid_story/
│       │   ├── missing_antagonist/
│       │   ├── missing_prop/
│       │   ├── invalid_reference_copy/
│       │   ├── continuity_conflict/
│       │   ├── undefined_scene_character/
│       │   └── duplicate_character_ids/
│       ├── referenceTraits.test.js
│       ├── archetypeLibrary.test.js
│       ├── characterBlueprint.test.js
│       ├── castCompilation.test.js
│       ├── scriptRoleCoverage.test.js
│       ├── sceneCastCoverage.test.js
│       ├── propCoverage.test.js
│       ├── continuityRules.test.js
│       ├── restrictedTraits.test.js
│       └── castIntegration.test.js
│
└── workspaces/
    └── <workspace_id>/
        ├── 04_script/
        │   └── script.json
        ├── 05_scene_cards/
        │   └── scene_cards.json
        └── 03_cast/
            ├── cast_request.json
            ├── role_requirements.json
            ├── cast.json
            ├── cast_continuity.json
            ├── scene_cast_map.json
            ├── prop_assignments.json
            ├── reference_usage.json
            ├── cast_validation.json
            └── cast_report.md
```

---

## 5. Reference Sample Architecture

Reference images must enter the system through a controlled reference record.

A reference image is not itself a cast member. It is evidence of useful visual ideas.

### 5.1 `source_metadata.json`

```json
{
  "reference_id": "REF_0001",
  "file": "source.png",
  "reference_type": "style_and_character_sample",
  "added_by": "user",
  "added_at": "2026-07-14T00:00:00Z",
  "usage_status": "analysis_only",
  "notes": "Example of a theatrical schemer character, anxious customer, police presence, bold news-card composition."
}
```

### 5.2 `manual_notes.json`

This file records what the user wants to borrow at a high level.

```json
{
  "reference_id": "REF_0001",
  "useful_traits": [
    "large theatrical antagonist silhouette",
    "curled moustache used as a readable villain cue",
    "black top hat",
    "black coat with red waistcoat accent",
    "angular eyebrows",
    "confident grin",
    "frightened customer in blue casual clothing",
    "generic uniformed officers in the background",
    "oversized evidence props",
    "high-contrast comic-news composition"
  ],
  "do_not_copy": [
    "exact toy figure proportions",
    "exact face design",
    "official toy logos",
    "real store logos",
    "branded packaging",
    "copyrighted product artwork",
    "exact storefront architecture",
    "exact headline layout"
  ],
  "preferred_reuse": [
    "villain archetype",
    "victim/customer archetype",
    "investigator archetype",
    "evidence-scene prop ideas",
    "thumbnail composition language"
  ]
}
```

### 5.3 `candidate_traits.json`

This file may be produced manually or by a vision-capable analysis agent. It must contain descriptions only.

```json
{
  "reference_id": "REF_0001",
  "analysis_version": "1.0.0",
  "characters_observed": [
    {
      "temporary_id": "OBS_CHAR_01",
      "story_role_guess": "schemer_villain",
      "silhouette": ["tall_headwear", "wide_shoulders", "dominant_center_frame"],
      "face": {
        "eyes": "narrow_confident",
        "eyebrows": "strong_downward_angle",
        "mouth": "wide_smirk",
        "facial_hair": "large_curled_moustache"
      },
      "wardrobe": ["formal_black_coat", "red_waistcoat", "white_shirt", "dark_tie"],
      "props": ["top_hat", "moustache_gesture"],
      "emotion": ["confident", "scheming", "theatrical"],
      "animation_affordances": ["moustache_twill", "eyebrow_raise", "head_tilt", "coat_flare"]
    },
    {
      "temporary_id": "OBS_CHAR_02",
      "story_role_guess": "worried_customer",
      "silhouette": ["small_relative_scale", "rounded_hair", "raised_hands"],
      "wardrobe": ["blue_hoodie"],
      "emotion": ["fear", "confusion", "helplessness"],
      "animation_affordances": ["hand_raise", "step_back", "head_shake", "blink"]
    }
  ],
  "props_observed": [
    "evidence_box",
    "generic_product_boxes",
    "police_tape",
    "storefront_sign",
    "news_quote_panel"
  ],
  "composition_traits": [
    "central_dominant_antagonist",
    "supporting_characters_at_edges",
    "large_top_quote_panel",
    "large_bottom_headline",
    "high_saturation",
    "strong_outline",
    "foreground_evidence_props"
  ],
  "restricted_observations": [
    "official_brand_logo",
    "official_product_packaging",
    "real_business_signage"
  ]
}
```

### 5.4 `approved_traits.json`

Only approved normalized traits may flow into character creation.

```json
{
  "reference_id": "REF_0001",
  "approved_character_traits": [
    "theatrical_schemer",
    "large_curled_moustache",
    "tall_black_top_hat",
    "black_and_red_formal_wardrobe",
    "angular_confident_eyebrows",
    "wide_smirk",
    "worried_customer_blue_hoodie",
    "generic_uniformed_investigator"
  ],
  "approved_prop_traits": [
    "evidence_box",
    "generic_product_box",
    "warning_tape",
    "quote_panel"
  ],
  "approved_composition_traits": [
    "dominant_center_antagonist",
    "frightened_customer_foreground",
    "supporting_investigators_background",
    "oversized_story_props"
  ],
  "blocked_traits": [
    "official_logo",
    "brand_specific_storefront",
    "branded_product_box",
    "exact_character_copy"
  ],
  "approved_by": "user",
  "status": "approved"
}
```

---

## 6. Controlled Bricktoon Vocabulary

The system must not rely entirely on free-form prose. Store approved visual traits in controlled vocabulary files.

Example `styles/bricktoon/vocabulary/facial_hair.json`:

```json
{
  "vocabulary_version": "1.0.0",
  "traits": [
    {
      "id": "FH_NONE",
      "label": "none"
    },
    {
      "id": "FH_SMALL_MOUSTACHE",
      "label": "small moustache"
    },
    {
      "id": "FH_CURLED_MOUSTACHE_LARGE",
      "label": "large curled moustache",
      "animation_parts": ["left_curl", "right_curl"],
      "compatible_roles": ["schemer_villain", "eccentric_owner", "comic_narrator"]
    }
  ]
}
```

Example `styles/bricktoon/vocabulary/restricted_traits.json`:

```json
{
  "restricted_traits": [
    {
      "id": "RESTRICT_OFFICIAL_TOY_LOGO",
      "patterns": ["official toy logo", "LEGO logo"],
      "severity": "error"
    },
    {
      "id": "RESTRICT_EXACT_MINIFIGURE_COPY",
      "patterns": ["exact minifigure", "copy exact figure"],
      "severity": "error"
    },
    {
      "id": "RESTRICT_REAL_STORE_LOGO",
      "patterns": ["real storefront logo", "7-Eleven logo"],
      "severity": "error"
    },
    {
      "id": "RESTRICT_BRANDED_PACKAGING",
      "patterns": ["official packaging", "Star Wars box"],
      "severity": "error"
    }
  ]
}
```

The validator must fail when restricted traits appear in approved character, prop, environment, or cast files.

---

## 7. Character Archetype Files

An archetype describes a story function. It is not a specific character.

### Example: `character_library/bricktoon/archetypes/schemer_villain.json`

```json
{
  "archetype_id": "schemer_villain",
  "display_name": "Theatrical Schemer",
  "story_functions": [
    "antagonist",
    "deceptive_owner",
    "shady_broker",
    "fraud_operator",
    "comic_visual_metaphor"
  ],
  "required_readability_traits": [
    "dominant_silhouette",
    "confident_expression",
    "distinctive_head_or_face_feature"
  ],
  "recommended_traits": {
    "eyebrows": ["angular_confident", "one_raised"],
    "mouths": ["smirk", "wide_grin"],
    "facial_hair": ["large_curled_moustache", "thin_moustache", "none"],
    "headwear": ["top_hat", "wide_brim_hat", "none"],
    "wardrobe": ["formal_dark_suit", "red_accent_waistcoat", "flashy_business_suit"],
    "poses": ["moustache_twill", "hands_clasped", "finger_point", "lean_forward"],
    "expressions": ["scheming", "confident", "fake_friendly", "angry_reveal"]
  },
  "required_motion_affordances": [
    "head_turn",
    "eyebrow_change",
    "arm_gesture"
  ],
  "optional_motion_affordances": [
    "moustache_twill",
    "hat_tip",
    "coat_flare"
  ],
  "restricted_traits": [
    "real_person_likeness",
    "exact_copyrighted_character",
    "official_brand_logo"
  ]
}
```

### Example: `worried_customer.json`

```json
{
  "archetype_id": "worried_customer",
  "display_name": "Worried Customer",
  "story_functions": [
    "victim",
    "consumer_proxy",
    "audience_reaction",
    "before_and_after_subject"
  ],
  "required_readability_traits": [
    "approachable_clothing",
    "clear_emotional_face",
    "smaller_or_less_dominant_silhouette_than_antagonist"
  ],
  "recommended_traits": {
    "wardrobe": ["hoodie", "casual_jacket", "simple_shirt"],
    "poses": ["hands_up", "phone_in_hand", "head_in_hand", "step_back"],
    "expressions": ["worried", "confused", "shocked", "relieved"]
  },
  "required_motion_affordances": [
    "blink",
    "head_turn",
    "hand_raise"
  ]
}
```

---

## 8. Reusable Character Blueprint

A blueprint is the stable identity from which future images or 3D models will be created.

Each blueprint must be reusable across stories.

### `character.json`

```json
{
  "character_id": "BT_CHAR_0001",
  "character_version": "1.0.0",
  "display_name": "Victor Vane",
  "internal_name": "theatrical_schemer_01",
  "style_id": "bricktoon",
  "primary_archetype_id": "schemer_villain",
  "secondary_archetype_ids": ["shady_broker"],
  "fictional": true,
  "reusable": true,
  "status": "draft",
  "created_from_references": ["REF_0001"],
  "description": "Original theatrical business schemer with a tall hat, curled moustache, dark formal coat, red waistcoat, angular eyebrows, and exaggerated confident gestures."
}
```

### `appearance.json`

```json
{
  "character_id": "BT_CHAR_0001",
  "body": {
    "shape_id": "BODY_BLOCKY_ROUNDED_MEDIUM",
    "height_class": "tall_for_bricktoon",
    "shoulder_width": "wide",
    "material_id": "MATTE_TOY_PLASTIC",
    "edge_style": "rounded"
  },
  "head": {
    "shape_id": "HEAD_ROUNDED_BLOCK",
    "skin_material": "warm_yellow_plastic",
    "distinctive_features": [
      "FH_CURLED_MOUSTACHE_LARGE",
      "BROW_ANGULAR_STRONG"
    ]
  },
  "eyes": {
    "default_id": "EYE_NARROW_CONFIDENT",
    "allowed_ids": [
      "EYE_NARROW_CONFIDENT",
      "EYE_WIDE_SURPRISED",
      "EYE_ANGRY"
    ]
  },
  "mouth": {
    "default_id": "MOUTH_WIDE_SMIRK",
    "allowed_ids": [
      "MOUTH_WIDE_SMIRK",
      "MOUTH_FAKE_FRIENDLY",
      "MOUTH_ANGRY_OPEN"
    ]
  },
  "hair": {
    "style_id": "HAIR_WAVY_BLACK_SIDE",
    "color": "black"
  },
  "headwear": {
    "default_prop_id": "PROP_TOP_HAT",
    "required_in_default_look": true
  },
  "palette": {
    "primary": "black",
    "secondary": "deep_red",
    "accent": "gold",
    "shirt": "white"
  },
  "silhouette_locks": [
    "tall_top_hat",
    "large_curled_moustache",
    "wide_dark_coat",
    "red_center_waistcoat"
  ]
}
```

### `wardrobe.json`

```json
{
  "character_id": "BT_CHAR_0001",
  "default_outfit_id": "OUTFIT_VICTOR_FORMAL_01",
  "outfits": [
    {
      "outfit_id": "OUTFIT_VICTOR_FORMAL_01",
      "name": "Formal Schemer",
      "items": [
        "black_long_coat",
        "deep_red_waistcoat",
        "white_shirt",
        "black_tie",
        "gold_chain_accent"
      ],
      "allowed_story_types": [
        "business_crime_story",
        "scam_playbook",
        "dark_comedy_explainer"
      ]
    }
  ]
}
```

### `expression_catalog.json`

```json
{
  "character_id": "BT_CHAR_0001",
  "expressions": [
    {
      "expression_id": "EXP_VICTOR_NEUTRAL",
      "label": "neutral confident",
      "eyes": "EYE_NARROW_CONFIDENT",
      "eyebrows": "BROW_ANGULAR_STRONG",
      "mouth": "MOUTH_SMALL_SMIRK"
    },
    {
      "expression_id": "EXP_VICTOR_SCHEMING",
      "label": "scheming grin",
      "eyes": "EYE_NARROW_CONFIDENT",
      "eyebrows": "BROW_ONE_RAISED",
      "mouth": "MOUTH_WIDE_SMIRK"
    },
    {
      "expression_id": "EXP_VICTOR_ANGRY",
      "label": "angry reveal",
      "eyes": "EYE_ANGRY",
      "eyebrows": "BROW_DOWNWARD_HARD",
      "mouth": "MOUTH_ANGRY_OPEN"
    }
  ]
}
```

### `pose_catalog.json`

```json
{
  "character_id": "BT_CHAR_0001",
  "poses": [
    {
      "pose_id": "POSE_VICTOR_MOUSTACHE_TWILL",
      "label": "twirls moustache with right hand",
      "required_parts": ["right_arm", "right_hand", "moustache"],
      "prop_ids": ["PROP_CURLED_MOUSTACHE"],
      "compatible_expressions": ["EXP_VICTOR_SCHEMING"]
    },
    {
      "pose_id": "POSE_VICTOR_POINTING",
      "label": "points toward a contract or customer",
      "required_parts": ["right_arm", "right_hand"]
    },
    {
      "pose_id": "POSE_VICTOR_HANDS_CLASPED",
      "label": "hands clasped in front while leaning forward",
      "required_parts": ["left_arm", "right_arm", "torso"]
    }
  ]
}
```

### `motion_profile.json`

No animation is generated yet. This file only defines what later animation systems should be able to move.

```json
{
  "character_id": "BT_CHAR_0001",
  "required_separable_parts": [
    "head",
    "torso",
    "left_upper_arm",
    "left_forearm",
    "left_hand",
    "right_upper_arm",
    "right_forearm",
    "right_hand",
    "left_moustache_curl",
    "right_moustache_curl",
    "top_hat"
  ],
  "required_anchor_points": [
    "neck",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "hat_center",
    "moustache_center"
  ],
  "supported_motion_intents": [
    "blink",
    "head_turn",
    "head_tilt",
    "eyebrow_raise",
    "moustache_twill",
    "hat_tip",
    "point",
    "lean_forward"
  ]
}
```

### `continuity_rules.json`

```json
{
  "character_id": "BT_CHAR_0001",
  "hard_locks": [
    "large_curled_moustache",
    "black_wavy_hair",
    "tall_black_top_hat",
    "black_coat",
    "red_waistcoat",
    "wide_shoulders"
  ],
  "soft_locks": [
    "gold_chain_accent",
    "black_tie",
    "white_shirt"
  ],
  "allowed_scene_changes": [
    "expression",
    "pose",
    "held_prop",
    "coat_open_or_closed",
    "minor_dirt_or_damage"
  ],
  "forbidden_scene_changes": [
    "moustache_removed",
    "top_hat_replaced_without_script_reason",
    "wardrobe_palette_changed",
    "body_height_changed",
    "hair_color_changed"
  ]
}
```

---

## 9. Props as First-Class Assets

Props should not be buried in free-form prompts. They require stable IDs and reusable definitions.

### Example `PROP_GIANT_SCISSORS.json`

```json
{
  "prop_id": "PROP_GIANT_SCISSORS",
  "display_name": "Oversized Red Scissors",
  "style_id": "bricktoon",
  "category": "story_metaphor",
  "description": "Oversized red-handled scissors used to communicate separation, termination, or severed ties.",
  "visual_traits": [
    "large_relative_to_character",
    "red_handles",
    "rounded_safe_cartoon_edges",
    "silver_blades"
  ],
  "story_uses": [
    "contract_termination",
    "business_separation",
    "relationship_cut",
    "franchise_dispute"
  ],
  "required_separable_parts": [
    "left_handle",
    "right_handle",
    "left_blade",
    "right_blade",
    "pivot"
  ],
  "supported_motion_intents": [
    "open",
    "close",
    "snip",
    "enter_frame"
  ],
  "restricted_branding": true,
  "status": "approved"
}
```

### Example `PROP_GENERIC_PRODUCT_BOX.json`

```json
{
  "prop_id": "PROP_GENERIC_PRODUCT_BOX",
  "display_name": "Generic Collectible Product Box",
  "style_id": "bricktoon",
  "category": "evidence",
  "description": "Fictional toy or collectible box with original graphics and no real brand, franchise, logo, or packaging layout.",
  "visual_traits": [
    "rectangular_box",
    "high_contrast_art_panel",
    "fictional_product_name",
    "generic_age_badge_optional"
  ],
  "blocked_traits": [
    "real_franchise_art",
    "real_brand_logo",
    "copied_packaging_layout",
    "copyrighted_vehicle_or_character"
  ],
  "status": "approved"
}
```

---

## 10. Cast Request File

The workspace starts cast creation with `03_cast/cast_request.json`.

```json
{
  "workspace_id": "test_story_template",
  "cast_request_version": "1.0.0",
  "script_file": "04_script/script.json",
  "scene_cards_file": "05_scene_cards/scene_cards.json",
  "style_id": "bricktoon",
  "reference_ids": [
    "REF_0001",
    "REF_0002",
    "REF_0003"
  ],
  "reuse_policy": "prefer_existing_character_blueprints",
  "new_character_policy": "create_only_when_no_suitable_character_exists",
  "required_story_roles": [
    "narrator",
    "protagonist_or_customer",
    "antagonist_or_business_actor",
    "authority_or_investigator"
  ],
  "target_platform": "youtube_and_vertical_cutdowns",
  "continuity_level": "strict",
  "legal_caution": "high",
  "status": "draft"
}
```

---

## 11. Script Role Extraction

The cast agent must not invent characters before reading the script.

`extractStoryRoles.js` reads script beats and produces `03_cast/role_requirements.json`.

### Example script beat

```json
{
  "beat_id": "B004",
  "narration": "Once the collection disappeared, the dispute became much more serious.",
  "dramatic_function": "escalation",
  "visual_intent": {
    "roles_required": [
      "worried_customer",
      "schemer_villain"
    ],
    "roles_optional": [
      "investigator"
    ],
    "props_required": [
      "evidence_box"
    ],
    "actions": [
      "customer_reacts",
      "antagonist_smiles",
      "missing_collection_reveal"
    ]
  }
}
```

### Generated `role_requirements.json`

```json
{
  "workspace_id": "test_story_template",
  "roles": [
    {
      "role_requirement_id": "ROLE_REQ_001",
      "role": "worried_customer",
      "required": true,
      "beat_ids": ["B001", "B004", "B006"],
      "minimum_character_count": 1,
      "maximum_character_count": 2,
      "required_expressions": ["worried", "shocked", "relieved"],
      "required_poses": ["phone_in_hand", "head_in_hand", "hands_up"],
      "required_props": ["PROP_PHONE"]
    },
    {
      "role_requirement_id": "ROLE_REQ_002",
      "role": "schemer_villain",
      "required": true,
      "beat_ids": ["B002", "B003", "B004"],
      "minimum_character_count": 1,
      "maximum_character_count": 1,
      "required_expressions": ["fake_friendly", "scheming", "angry_reveal"],
      "required_poses": ["moustache_twill", "pointing"],
      "required_props": ["PROP_TOP_HAT"]
    }
  ]
}
```

---

## 12. Final Workspace `cast.json`

`cast.json` assigns reusable character blueprints to this specific story.

```json
{
  "workspace_id": "test_story_template",
  "cast_version": "1.0.0",
  "style_id": "bricktoon",
  "source_script": "04_script/script.json",
  "reference_ids": ["REF_0001", "REF_0002", "REF_0003"],
  "cast_members": [
    {
      "cast_member_id": "CAST_001",
      "character_id": "BT_CHAR_0001",
      "story_name": "Victor Vane",
      "role": "schemer_villain",
      "story_function": "antagonist",
      "reuse_mode": "existing_blueprint",
      "first_beat_id": "B002",
      "last_beat_id": "B009",
      "required_expressions": [
        "EXP_VICTOR_NEUTRAL",
        "EXP_VICTOR_SCHEMING",
        "EXP_VICTOR_ANGRY"
      ],
      "required_poses": [
        "POSE_VICTOR_MOUSTACHE_TWILL",
        "POSE_VICTOR_POINTING"
      ],
      "default_prop_ids": [
        "PROP_TOP_HAT",
        "PROP_CURLED_MOUSTACHE"
      ],
      "continuity_profile": "strict",
      "status": "approved"
    },
    {
      "cast_member_id": "CAST_002",
      "character_id": "BT_CHAR_0002",
      "story_name": "Jay",
      "role": "worried_customer",
      "story_function": "audience_proxy",
      "reuse_mode": "existing_blueprint",
      "first_beat_id": "B001",
      "last_beat_id": "B010",
      "required_expressions": [
        "EXP_JAY_NEUTRAL",
        "EXP_JAY_WORRIED",
        "EXP_JAY_SHOCKED",
        "EXP_JAY_RELIEVED"
      ],
      "required_poses": [
        "POSE_JAY_PHONE_IN_HAND",
        "POSE_JAY_HEAD_IN_HAND",
        "POSE_JAY_HANDS_UP"
      ],
      "default_prop_ids": ["PROP_PHONE"],
      "continuity_profile": "strict",
      "status": "approved"
    }
  ],
  "cast_status": "approved"
}
```

---

## 13. Cast Continuity File

`03_cast/cast_continuity.json` gathers the locks needed by scene cards and future visual generation.

```json
{
  "workspace_id": "test_story_template",
  "continuity_version": "1.0.0",
  "characters": [
    {
      "cast_member_id": "CAST_001",
      "character_id": "BT_CHAR_0001",
      "hard_locks": [
        "tall_black_top_hat",
        "large_curled_moustache",
        "black_coat",
        "red_waistcoat",
        "black_wavy_hair"
      ],
      "allowed_variations": [
        "expression",
        "arm_pose",
        "held_prop",
        "coat_open_state"
      ],
      "scene_exceptions": []
    }
  ]
}
```

---

## 14. Scene Cast Map

`03_cast/scene_cast_map.json` is the bridge from cast architecture to scene generation.

It contains no generated assets.

```json
{
  "workspace_id": "test_story_template",
  "scene_cast_map_version": "1.0.0",
  "scenes": [
    {
      "scene_id": "S001",
      "beat_ids": ["B001"],
      "cast": [
        {
          "cast_member_id": "CAST_002",
          "character_id": "BT_CHAR_0002",
          "expression_id": "EXP_JAY_WORRIED",
          "pose_id": "POSE_JAY_PHONE_IN_HAND",
          "screen_position": "lower_left",
          "relative_scale": "medium",
          "look_direction": "phone",
          "action_intent": "reads_bad_news"
        }
      ],
      "props": [
        {
          "prop_id": "PROP_PHONE",
          "assigned_to": "CAST_002",
          "action_intent": "screen_glow"
        }
      ],
      "environment_id": "ENV_GENERIC_STOREFRONT"
    },
    {
      "scene_id": "S002",
      "beat_ids": ["B002", "B003"],
      "cast": [
        {
          "cast_member_id": "CAST_001",
          "character_id": "BT_CHAR_0001",
          "expression_id": "EXP_VICTOR_SCHEMING",
          "pose_id": "POSE_VICTOR_MOUSTACHE_TWILL",
          "screen_position": "center",
          "relative_scale": "large",
          "look_direction": "camera",
          "action_intent": "dominates_frame"
        },
        {
          "cast_member_id": "CAST_002",
          "character_id": "BT_CHAR_0002",
          "expression_id": "EXP_JAY_SHOCKED",
          "pose_id": "POSE_JAY_HANDS_UP",
          "screen_position": "lower_left",
          "relative_scale": "small",
          "look_direction": "CAST_001",
          "action_intent": "reacts_to_antagonist"
        }
      ],
      "props": [
        {
          "prop_id": "PROP_EVIDENCE_FOLDER",
          "assigned_to": null,
          "screen_position": "foreground_right"
        }
      ],
      "environment_id": "ENV_NEWS_GRAPHIC_STAGE"
    }
  ]
}
```

---

## 15. Reference Usage File

The system must document how each reference influenced the cast.

`03_cast/reference_usage.json`:

```json
{
  "workspace_id": "test_story_template",
  "references": [
    {
      "reference_id": "REF_0001",
      "used_for": [
        {
          "target_type": "character",
          "target_id": "BT_CHAR_0001",
          "abstracted_traits": [
            "theatrical_schemer_role",
            "large_curled_moustache",
            "top_hat_silhouette",
            "black_red_formal_palette",
            "dominant_center_composition"
          ],
          "explicitly_not_used": [
            "exact_face",
            "exact_figure_proportions",
            "official_logo",
            "branded_product_art"
          ]
        }
      ]
    }
  ]
}
```

---

## 16. Agent Responsibilities

### 16.1 Reference Analysis Agent

Input:

- image path
- optional user notes
- Bricktoon vocabulary
- restricted-traits list

Output:

- `candidate_traits.json`

Rules:

1. Describe rather than reproduce.
2. Separate characters, props, environments, and composition.
3. Use vocabulary IDs whenever available.
4. Flag logos, branded packaging, exact copyrighted characters, and real-person likeness.
5. Never create a character blueprint automatically from unapproved candidate traits.
6. Never generate an image.

### 16.2 Reference Normalization Agent

Input:

- `candidate_traits.json`
- `manual_notes.json`
- controlled vocabulary

Output:

- proposed `approved_traits.json`

Rules:

- merge duplicates
- replace free-form words with stable IDs
- map exact brand-specific observations to generic concepts
- reject restricted traits
- require user approval

### 16.3 Story Role Agent

Input:

- `04_script/script.json`
- optionally `05_scene_cards/scene_cards.json`

Output:

- `03_cast/role_requirements.json`

Rules:

- extract only roles supported by the script
- capture required emotions, poses, props, and relationships
- include beat IDs for traceability
- distinguish required and optional roles

### 16.4 Character Selection Agent

Input:

- role requirements
- character library
- approved reference traits

Output:

- character candidates with scores

Example score model:

```text
role compatibility                35 points
required expression coverage      15 points
required pose coverage            15 points
required motion affordances       10 points
prop compatibility                10 points
reference-trait compatibility     10 points
continuity readiness               5 points
-------------------------------------------
total                            100 points
```

Reuse an existing character when the score is at least 80.

Create a proposed new character blueprint when no existing character scores at least 80.

### 16.5 Cast Compiler

Input:

- cast request
- role requirements
- selected character blueprints
- prop library
- scene cards

Output:

- `cast.json`
- `cast_continuity.json`
- `scene_cast_map.json`
- `prop_assignments.json`
- `reference_usage.json`

The compiler must be deterministic when all inputs are unchanged.

---

## 17. CLI Commands

Add these package scripts:

```json
{
  "scripts": {
    "cast:init": "node src/cast/cli/castInitCli.js",
    "cast:analyze-references": "node src/cast/cli/castAnalyzeReferencesCli.js",
    "cast:create-character": "node src/cast/cli/castCreateCharacterCli.js",
    "cast:compile": "node src/cast/cli/castCompileCli.js",
    "cast:validate": "node src/cast/cli/castValidateCli.js",
    "cast:report": "node src/cast/cli/castReportCli.js",
    "test:cast": "vitest run tests/cast",
    "test:cast:watch": "vitest tests/cast",
    "test-story:cast": "node scripts/run_test_story_cast.js"
  }
}
```

Example usage:

```powershell
npm run cast:init -- --workspace test_story_template
```

```powershell
npm run cast:analyze-references -- --reference REF_0001
```

This command analyzes descriptors only. It does not generate an image.

```powershell
npm run cast:compile -- --workspace test_story_template
```

```powershell
npm run cast:validate -- --workspace test_story_template --strict
```

```powershell
npm run test-story:cast -- --workspace test_story_template
```

---

## 18. Required JSON Schemas

Use JSON Schema Draft 2020-12 and AJV.

Every schema must set:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false
}
```

Required schema rules:

### `reference_traits.schema.json`

- `reference_id` required
- all trait arrays must contain unique items
- restricted observations must be separated from approved traits
- approval status required before use

### `character_blueprint.schema.json`

- stable `character_id`
- semantic version
- archetype ID must exist
- fictional must be `true`
- continuity rules required
- at least one expression
- at least one pose
- motion profile required
- no restricted trait IDs

### `cast.schema.json`

- workspace ID required
- every `cast_member_id` unique
- every `character_id` must resolve to a library blueprint
- every required script role must be covered
- status must be `draft`, `review`, `approved`, or `rejected`

### `scene_cast_map.schema.json`

- every scene ID must resolve to a scene card
- every cast member must resolve to `cast.json`
- every expression and pose must exist in the character blueprint
- every prop must resolve to the prop library
- every environment must resolve to the environment library

---

## 19. Test Framework

Use Vitest for unit and integration tests.

The test framework validates what the future renderer is expected to receive based on the script. It does not inspect or generate images in this phase.

### 19.1 Test Levels

```text
Level 1 — schema tests
Level 2 — library integrity tests
Level 3 — script-to-role tests
Level 4 — role-to-cast tests
Level 5 — cast-to-scene tests
Level 6 — continuity tests
Level 7 — restricted-trait tests
Level 8 — full workspace integration test
```

---

## 20. Unit Tests

### 20.1 Reference Trait Test

`tests/cast/referenceTraits.test.js`

Must verify:

- candidate traits may include restricted observations
- approved traits may not include restricted traits
- every approved trait belongs to the controlled vocabulary or has an approved extension record
- `do_not_copy` is not empty when a reference contains brands or copyrighted material
- approval metadata exists

### 20.2 Archetype Library Test

`tests/cast/archetypeLibrary.test.js`

Must verify:

- archetype IDs are unique
- story roles are valid
- recommended trait IDs resolve
- required motion affordances resolve
- restricted traits are valid restriction IDs

### 20.3 Character Blueprint Test

`tests/cast/characterBlueprint.test.js`

Must verify:

- stable unique character ID
- required component files exist
- primary archetype exists
- all expression IDs are unique
- all pose IDs are unique
- all referenced props exist
- all hard locks describe defined traits
- no forbidden scene change conflicts with an allowed change
- required separable parts support declared motion intents

### 20.4 Cast Compilation Test

`tests/cast/castCompilation.test.js`

Must verify:

- same inputs produce identical cast output
- no duplicate cast member IDs
- every selected character exists
- required role count is satisfied
- optional roles do not become required without script evidence
- reused and newly proposed characters are clearly identified

### 20.5 Script Role Coverage Test

`tests/cast/scriptRoleCoverage.test.js`

For every beat:

- required roles are represented in role requirements
- each required role is assigned to a cast member
- each required prop is present in the prop assignments
- emotional state is available in the assigned character expression catalog
- action intent is supported by at least one pose or motion intent

### 20.6 Scene Cast Coverage Test

`tests/cast/sceneCastCoverage.test.js`

For every scene card:

- every named script character resolves to a cast member
- every scene cast member appears in `cast.json`
- expression ID exists
- pose ID exists
- prop ID exists
- environment ID exists
- screen positions are valid
- required antagonist/protagonist relationship is visible when the script calls for it

### 20.7 Continuity Test

`tests/cast/continuityRules.test.js`

Must detect:

- character loses a hard-locked trait
- clothing palette changes without exception
- hair or facial-hair identity changes
- character height class changes
- character is assigned an unsupported outfit
- scene exception is missing an explanation

### 20.8 Restricted Trait Test

`tests/cast/restrictedTraits.test.js`

Must fail for:

- official toy logos
- exact minifigure copying instructions
- real store logos in original-character definitions
- branded packaging
- exact copyrighted character names or designs
- real-person likeness unless separately approved
- invented official badges or agency logos

---

## 21. Script-Based Cast Test Contract

Add an expected cast contract to each test fixture.

`tests/cast/fixtures/valid_story/expected_cast_contract.json`:

```json
{
  "required_roles": [
    {
      "role": "schemer_villain",
      "minimum_count": 1,
      "required_expression_labels": [
        "scheming",
        "angry"
      ],
      "required_action_intents": [
        "moustache_twill",
        "point"
      ]
    },
    {
      "role": "worried_customer",
      "minimum_count": 1,
      "required_expression_labels": [
        "worried",
        "shocked"
      ],
      "required_action_intents": [
        "phone_in_hand",
        "hands_up"
      ]
    }
  ],
  "required_props": [
    "PROP_PHONE",
    "PROP_EVIDENCE_FOLDER"
  ],
  "required_environments": [
    "ENV_GENERIC_STOREFRONT"
  ],
  "forbidden_traits": [
    "official_logo",
    "branded_packaging",
    "exact_character_copy"
  ]
}
```

The integration test compares:

```text
script requirements
vs.
role_requirements.json
vs.
cast.json
vs.
scene_cast_map.json
vs.
expected_cast_contract.json
```

---

## 22. Example Vitest Integration Test

```js
import { describe, expect, test } from "vitest";
import { loadFixtureWorkspace } from "../../src/testing/loadFixtureWorkspace.js";
import { compileCast } from "../../src/cast/compileCast.js";
import { validateCastPackage } from "../../src/cast/validateCastPackage.js";


describe("Bricktoon cast integration", () => {
  test("compiles a complete cast from the script", async () => {
    const workspace = await loadFixtureWorkspace("valid_story");
    const result = await compileCast(workspace);
    const report = await validateCastPackage({
      workspace,
      castPackage: result,
      strict: true,
    });

    expect(report.passed).toBe(true);
    expect(report.errors).toEqual([]);
    expect(result.cast.cast_members.length).toBeGreaterThanOrEqual(2);

    const roles = result.cast.cast_members.map((member) => member.role);
    expect(roles).toContain("schemer_villain");
    expect(roles).toContain("worried_customer");
  });

  test("fails when a script-required antagonist is missing", async () => {
    const workspace = await loadFixtureWorkspace("missing_antagonist");
    const result = await compileCast(workspace);
    const report = await validateCastPackage({
      workspace,
      castPackage: result,
      strict: true,
    });

    expect(report.passed).toBe(false);
    expect(report.errors).toContainEqual(
      expect.objectContaining({ code: "CAST_REQUIRED_ROLE_MISSING" })
    );
  });
});
```

---

## 23. Validation Error Codes

Use stable error codes so the coding agent and UI can respond predictably.

```text
CAST_SCHEMA_INVALID
CAST_REFERENCE_NOT_APPROVED
CAST_REFERENCE_TRAIT_RESTRICTED
CAST_ARCHETYPE_NOT_FOUND
CAST_CHARACTER_NOT_FOUND
CAST_REQUIRED_ROLE_MISSING
CAST_REQUIRED_EXPRESSION_MISSING
CAST_REQUIRED_POSE_MISSING
CAST_REQUIRED_MOTION_MISSING
CAST_PROP_NOT_FOUND
CAST_ENVIRONMENT_NOT_FOUND
CAST_DUPLICATE_MEMBER_ID
CAST_SCENE_MEMBER_UNDEFINED
CAST_SCENE_EXPRESSION_UNDEFINED
CAST_SCENE_POSE_UNDEFINED
CAST_CONTINUITY_HARD_LOCK_VIOLATION
CAST_CONTINUITY_CONFLICT
CAST_RESTRICTED_BRAND_TRAIT
CAST_EXACT_COPY_RISK
CAST_REFERENCE_USAGE_MISSING
```

---

## 24. Cast Validation Output

`03_cast/cast_validation.json`:

```json
{
  "workspace_id": "test_story_template",
  "validation_version": "1.0.0",
  "passed": true,
  "summary": {
    "script_beats": 10,
    "required_roles": 4,
    "cast_members": 5,
    "scene_assignments": 18,
    "props_resolved": 8,
    "environments_resolved": 5,
    "continuity_checks": 42,
    "restricted_trait_checks": 31
  },
  "errors": [],
  "warnings": [
    {
      "code": "CAST_OPTIONAL_POSE_MISSING",
      "message": "CAST_004 does not yet define an optional folder-close pose."
    }
  ],
  "status": "passed"
}
```

---

## 25. Human-Readable Cast Report

`03_cast/cast_report.md` should show:

```md
# Cast Report — test_story_template

## Status
PASS

## Story Roles
- Narrator: assigned
- Worried customer: assigned
- Schemer villain: assigned
- Investigator: assigned

## Characters
### Victor Vane
- Character ID: BT_CHAR_0001
- Role: Schemer villain
- Hard locks: top hat, curled moustache, black coat, red waistcoat
- Required expressions: neutral, scheming, angry
- Required poses: moustache twirl, pointing
- Reference inspiration: REF_0001
- Exact-copy restrictions: passed

## Script Coverage
- 10 of 10 beats have required cast coverage
- 8 of 8 required props resolve
- 5 of 5 environments resolve

## Continuity
- 0 hard-lock conflicts
- 0 wardrobe conflicts
- 0 undefined expressions

## Result
Cast package is ready for scene prompt compilation or future visual generation.
```

---

## 26. `run_test_story_cast.js`

Add:

```text
scripts/run_test_story_cast.js
```

Responsibilities:

1. Resolve workspace path.
2. Validate `cast_request.json`.
3. Validate the script.
4. Extract story roles.
5. Load approved reference traits.
6. Load character, prop, and environment libraries.
7. Select or propose characters.
8. Compile cast files.
9. Validate the complete package.
10. Write JSON and Markdown reports.
11. Exit with code `0` on pass.
12. Exit with code `1` on failure.

Pseudo-code:

```js
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = resolveWorkspace(args.workspace);

  const request = await loadCastRequest(workspace);
  const script = await loadScript(request.script_file);
  const sceneCards = await loadSceneCards(request.scene_cards_file);

  const roleRequirements = await extractStoryRoles({ script, sceneCards });
  const references = await loadApprovedReferences(request.reference_ids);
  const libraries = await loadCastLibraries();

  const selections = await selectCharacterArchetypes({
    roleRequirements,
    references,
    libraries,
  });

  const castPackage = await compileCast({
    workspace,
    request,
    script,
    sceneCards,
    roleRequirements,
    selections,
    libraries,
  });

  const report = await validateCastPackage({
    workspace,
    castPackage,
    strict: args.strict !== false,
  });

  await writeCastPackage(workspace, castPackage);
  await writeCastReport(workspace, report);

  process.exit(report.passed ? 0 : 1);
}
```

---

## 27. Implementation Phases

### Phase 1 — Schemas and Vocabulary

Create:

```text
schemas/reference_sample.schema.json
schemas/reference_traits.schema.json
schemas/character_archetype.schema.json
schemas/character_blueprint.schema.json
schemas/prop.schema.json
schemas/environment.schema.json
schemas/cast_request.schema.json
schemas/cast.schema.json
schemas/cast_continuity.schema.json
schemas/scene_cast_map.schema.json
styles/bricktoon/vocabulary/*.json
```

Acceptance criteria:

- all schemas compile with AJV
- duplicate vocabulary IDs fail tests
- restricted traits are centrally defined

### Phase 2 — Reference Intake

Create:

```text
references/bricktoon/reference_index.json
src/cast/analyzeReferenceSample.js
src/cast/normalizeReferenceTraits.js
src/cast/buildReferenceIndex.js
```

Acceptance criteria:

- a sample image can be registered
- user notes can be recorded
- candidate descriptors can be produced
- approved traits require explicit approval
- no image output is created

### Phase 3 — Archetype, Character, Prop, and Environment Libraries

Create the first reusable set:

```text
schemer_villain
worried_customer
investigator
narrator
hacker
police_officer
business_owner
employee
```

Create first props:

```text
top hat
curled moustache
phone
laptop
giant scissors
contract
evidence folder
generic product box
warning tape
moving box
```

Create first environments:

```text
generic storefront
retail interior
office
warehouse
suburban driveway
police scene
news graphic stage
```

Acceptance criteria:

- every library entry validates
- every cross-reference resolves
- no restricted brand traits exist

### Phase 4 — Script Role Extraction

Implement:

```text
loadScript.js
extractStoryRoles.js
```

Acceptance criteria:

- role requirements include beat IDs
- emotions, poses, props, and action intents are extracted
- required and optional roles remain distinct

### Phase 5 — Cast Selection and Compilation

Implement:

```text
selectCharacterArchetypes.js
createCharacterBlueprint.js
compileCast.js
compileCastContinuity.js
compileSceneCastMap.js
compilePropAssignments.js
```

Acceptance criteria:

- reuse existing characters where suitable
- propose new characters when necessary
- same inputs produce stable output
- cast files contain no image paths

### Phase 6 — Test Framework

Implement all tests under:

```text
tests/cast/
```

Acceptance criteria:

- valid story passes
- every negative fixture fails for the intended reason
- integration command exits non-zero on failure

### Phase 7 — Pipeline Integration

Update the main orchestrator:

```text
format
→ research
→ angle
→ script
→ cast:init
→ cast:compile
→ cast:validate
→ scene cards
```

The scene-card agent must consume:

```text
03_cast/cast.json
03_cast/cast_continuity.json
03_cast/scene_cast_map.json
03_cast/prop_assignments.json
```

Acceptance criteria:

- scene cards cannot reference undefined cast members
- later image-generation stages can consume the package without modifying it

---

## 28. Recommended Initial Characters Based on the Supplied Samples

These are architecture targets only. No images are generated.

### Character 1 — Theatrical Schemer

```text
Archetype: schemer_villain
Distinctive traits:
- large curled moustache
- tall black top hat
- black formal coat
- red waistcoat
- angular eyebrows
- confident grin
- dominant posture
Motion-ready traits:
- moustache twirl
- hat tip
- eyebrow raise
- pointing arm
- forward lean
```

### Character 2 — Worried Customer

```text
Archetype: worried_customer
Distinctive traits:
- rounded dark or brown hair
- blue or green casual hoodie
- expressive wide eyes
- small relative silhouette
- phone frequently in hand
Motion-ready traits:
- head in hand
- hands raised
- step backward
- phone check
- blink and worried glance
```

### Character 3 — Generic Investigator

```text
Archetype: investigator
Distinctive traits:
- dark blue generic uniform or plain investigator jacket
- blank shield-shaped badge symbol
- stern eyebrows
- evidence folder
Motion-ready traits:
- folder open
- point to evidence
- arms crossed
- head turn
```

### Character 4 — Hooded Hacker

```text
Archetype: hacker
Distinctive traits:
- black hooded outfit
- narrow mischievous expression
- generic laptop
- no real criminal-group branding
Motion-ready traits:
- typing
- screen glow
- hood tilt
- glance over shoulder
```

### Character 5 — Business Narrator

```text
Archetype: narrator
Distinctive traits:
- clean dark blazer
- neutral shirt
- calm face
- presentation pointer or source folder
Motion-ready traits:
- point to graphic
- turn to camera
- hold document
- small hand gestures
```

---

## 29. Definition of Done

The cast architecture is implemented when:

```text
✓ Reference images can be registered without generating new images
✓ Each reference has manual notes, candidate traits, approved traits, and restrictions
✓ A controlled Bricktoon vocabulary exists
✓ Character archetypes exist independently of specific stories
✓ Reusable character blueprints exist independently of cast assignments
✓ Props and environments use stable IDs
✓ A script produces role requirements with beat traceability
✓ Cast compilation selects or proposes appropriate characters
✓ cast.json contains every required story role
✓ cast_continuity.json locks stable character traits
✓ scene_cast_map.json assigns expressions, poses, props, and actions per scene
✓ reference_usage.json documents abstracted inspiration and blocked copying
✓ Every cast and scene reference resolves
✓ Restricted brand and exact-copy traits fail validation
✓ Valid fixtures pass
✓ Negative fixtures fail for the expected reason
✓ No character, scene, or animation image is generated in this phase
```

---

## 30. Immediate Build Order

Implement in this exact order:

```text
1. JSON schemas
2. controlled visual vocabulary
3. reference intake folders and index
4. reference analysis descriptor format
5. archetype library
6. prop library
7. environment library
8. first reusable character blueprints
9. script role extraction
10. cast selection
11. cast compiler
12. continuity compiler
13. scene cast map compiler
14. strict validator
15. Vitest fixtures and tests
16. test-story cast CLI
17. orchestrator integration
```

Do not begin the image-generation backend until this cast package passes the strict integration test.

---

## 31. Final Architecture Summary

The cast system should convert scripts and reference samples into a **structured, original, reusable character package** containing archetypes, character identities, props, expressions, poses, motion affordances, continuity locks, scene assignments, and validation reports.

The supplied images are inspiration and analysis inputs only. The output of this implementation is JSON and Markdown cast data—not generated artwork.
