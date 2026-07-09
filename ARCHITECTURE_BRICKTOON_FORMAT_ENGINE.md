# Architecture Update — Brick Cartoon Character Video System

Project:
`C:\xampp\htdocs\apps\gigbizness-stories`

Topic example:
`fake_moving_companies`

Goal:
Update the Gigbizness Stories architecture so videos can use repeatable **brick-toy cartoon characters** as the main visual storytelling style, while still keeping the research, claims, script, and render pipeline serious enough for business crime, scams, documentaries, comparisons, and tips.

Important creative/legal note:
Use a **toy-brick / blocky cartoon / mini-figure-inspired style**, not official LEGO branding. Avoid LEGO logos, exact minifigure copying, official sets, branded studs, copyrighted characters, or packaging. Internally, call the style `bricktoon` or `blocky_toy_cartoon`.

---

## 1) Main Architecture Change

Old pipeline:

```text
topic
→ research
→ script
→ voiceover
→ images
→ render
```

Updated pipeline:

```text
topic
→ format recipe
→ research packet
→ angle
→ character cast
→ script beats
→ scene cards
→ voiceover
→ bricktoon visuals
→ animation plan
→ edit plan
→ render
→ QC
```

The biggest new layer is:

```text
Character Cast + Scene Cards
```

This lets the system reuse the same recognizable cartoon characters across videos.

---

## 2) New Creative Identity

Instead of generic stock footage or random AI images, every video can feel like a small animated business story.

Example style:

```text
A darkly funny brick-toy cartoon business world.
Characters look like small plastic block figures in cinematic miniature sets.
The tone is playful visually, but serious in facts.
```

This works well for scams and business stories because it lets you dramatize events without using real victim faces or risky real company imagery.

---

## 3) Updated Folder Structure

Add character and scene-card folders to each workspace.

```text
gigbizness-stories/
│
├── formats/
│   ├── bleak_explainer.json
│   ├── bleak_explainer_bricktoon.json
│   ├── scam_playbook.json
│   ├── business_crime_story.json
│   ├── business_comparison.json
│   ├── business_documentary.json
│   ├── business_tip_video.json
│   ├── rise_and_fall.json
│   └── hidden_costs.json
│
├── styles/
│   └── bricktoon/
│       ├── style_bible.md
│       ├── visual_rules.json
│       ├── character_prompt_rules.md
│       ├── environment_prompt_rules.md
│       ├── camera_rules.md
│       └── negative_prompts.md
│
├── character_library/
│   └── bricktoon/
│       ├── narrator/
│       │   ├── character_card.json
│       │   ├── poses.md
│       │   └── expressions.md
│       ├── victim_customer/
│       ├── shady_broker/
│       ├── rogue_operator/
│       ├── legit_business_owner/
│       ├── regulator/
│       ├── investigator/
│       ├── lawyer/
│       ├── accountant/
│       └── generic_crowd/
│
├── agents/
│   ├── format_agent/
│   ├── research_agent/
│   ├── angle_agent/
│   ├── character_agent/
│   ├── script_agent/
│   ├── scene_card_agent/
│   ├── voice_agent/
│   ├── visual_agent/
│   ├── animation_agent/
│   ├── edit_plan_agent/
│   ├── render_agent/
│   ├── thumbnail_agent/
│   └── qc_agent/
│
└── workspaces/
    └── fake_moving_companies/
        ├── 00_brief/
        ├── 01_research/
        ├── 02_angle/
        ├── 03_cast/
        │   ├── cast.json
        │   ├── character_continuity.md
        │   └── scene_roles.md
        ├── 04_script/
        ├── 05_scene_cards/
        │   ├── scene_cards.json
        │   ├── shot_list.md
        │   └── visual_prompts.md
        ├── 06_voice/
        ├── 07_visuals/
        │   ├── generated_images/
        │   ├── character_refs/
        │   ├── backgrounds/
        │   ├── overlays/
        │   ├── source_cards/
        │   └── asset_manifest.json
        ├── 08_animation/
        │   ├── animation_plan.json
        │   ├── camera_moves.json
        │   └── animated_clips/
        ├── 09_edit_plan/
        ├── 10_renders/
        ├── 11_thumbnail/
        ├── 12_publish/
        └── 13_qc/
            ├── fact_check_report.md
            ├── legal_risk_report.md
            ├── visual_safety_report.md
            └── final_approval.md
```

---

## 4) New Agent: Character Agent

The character agent creates a reusable cast for each video.

### Input

```json
{
  "topic_id": "fake_moving_companies",
  "format": "bleak_explainer",
  "style": "bricktoon",
  "target_platform": "shorts_vertical",
  "legal_caution": "high",
  "research_packet": "01_research/research_packet.md",
  "beat_sheet": "02_angle/beat_sheet.md"
}
```

### Output

`03_cast/cast.json`

```json
{
  "style_id": "bricktoon",
  "cast": [
    {
      "character_id": "narrator_001",
      "name": "The Gigbizness Guide",
      "role": "narrator",
      "visual_description": "blocky toy business narrator, navy blazer, simple plastic face, confident but calm",
      "personality": "dry, sharp, explains scams clearly",
      "use_cases": ["intro", "explainers", "checklists", "transitions"],
      "legal_notes": "fictional character, not based on a real person"
    },
    {
      "character_id": "customer_001",
      "name": "Jay",
      "role": "victim_customer",
      "visual_description": "blocky toy customer holding moving boxes, tired expression, casual hoodie",
      "personality": "stressed, trusting, under deadline",
      "use_cases": ["victim story", "moving day", "reaction shots"],
      "legal_notes": "composite fictional victim"
    },
    {
      "character_id": "customer_002",
      "name": "Maya",
      "role": "victim_customer",
      "visual_description": "blocky toy customer with clipboard and phone, worried expression",
      "personality": "organized but overwhelmed",
      "use_cases": ["quote comparison", "phone call", "reaction shots"],
      "legal_notes": "composite fictional victim"
    },
    {
      "character_id": "broker_001",
      "name": "Slick Steve",
      "role": "shady_broker",
      "visual_description": "blocky toy phone broker in cheap suit, headset, fake friendly smile",
      "personality": "pushy, charming, evasive",
      "use_cases": ["lowball quote", "deposit request", "broker confusion"],
      "legal_notes": "fictional composite, do not connect to real company without source"
    },
    {
      "character_id": "mover_001",
      "name": "Box Truck Guy",
      "role": "rogue_operator",
      "visual_description": "blocky toy mover beside plain rental-style moving truck, no logos",
      "personality": "intimidating, impatient, vague",
      "use_cases": ["loading scene", "price jump", "hostage goods"],
      "legal_notes": "fictional composite"
    },
    {
      "character_id": "regulator_001",
      "name": "Inspector Dana",
      "role": "regulator",
      "visual_description": "blocky toy investigator with folder, badge-like generic icon, glasses",
      "personality": "serious, clear, evidence-driven",
      "use_cases": ["official sources", "enforcement", "consumer checklist"],
      "legal_notes": "fictional regulator, not representing a specific agency"
    }
  ]
}
```

---

## 5) New Agent: Scene Card Agent

The scene card agent turns each script beat into a visual production card.

The script says what the narrator says.

The scene card says:
- which characters appear
- where they are
- what the camera sees
- what text appears on screen
- what source claim supports the beat
- what sound effect plays
- what animation happens

This keeps the video from becoming random AI images.

### Example scene card

```json
{
  "scene_id": "S04",
  "beat_id": "B04",
  "duration_seconds": 5,
  "narration": "The quote sounds cheap. Almost too cheap. That is because the real price does not show up until your entire life is already inside the truck.",
  "characters": ["customer_001", "customer_002", "mover_001"],
  "environment": "suburban driveway with moving boxes and a plain white box truck",
  "visual_prompt": "Vertical 9:16 cinematic blocky toy cartoon scene, stressed toy-brick couple watching a plain moving truck door close, no logos, no readable license plates, dramatic lighting, miniature plastic world, consumer protection documentary style, space in center for captions",
  "negative_prompt": "LEGO logo, real brand logos, copyrighted characters, readable license plates, real company names, gore, photorealistic humans",
  "camera": {
    "shot_type": "medium wide",
    "movement": "slow push in",
    "focus": "truck door closing"
  },
  "caption_text": "the real price shows up after your life is inside the truck",
  "caption_emphasis": ["real price", "inside the truck"],
  "sound_effects": ["truck_door_slam_low_hit.wav"],
  "claims": ["CLAIM_FMCSA_HOSTAGE_001"],
  "legal_risk": "low"
}
```

---

## 6) Style Bible: Bricktoon Visual Rules

Create:
`styles/bricktoon/style_bible.md`

Recommended contents:

```md
# Bricktoon Style Bible

## Core Look
- Blocky toy cartoon characters.
- Miniature plastic world.
- Expressive but simple faces.
- Oversized props for readability.
- Cinematic lighting.
- 9:16 safe composition for Shorts/Reels/TikTok.
- No official LEGO branding.
- No copyrighted characters.
- No real company logos unless cleared or official source use is intentional.

## Character Design
- Short blocky bodies.
- Rounded plastic edges.
- Simple dot eyes or expressive cartoon eyes.
- Clear costumes that communicate role quickly.
- Avoid exact LEGO minifigure proportions.
- Use fictional characters for victims and scammers.
- Use generic badges or folders for regulators.

## Business Crime Visual Language
- Documents, invoices, receipts, phone screens, boxes, trucks, maps, storage units.
- Use fictional company names like “Budget Move Pros” only if clearly fictional.
- Do not show real addresses, phone numbers, or license plates.
- Use source cards for official claims instead of fake court documents.

## Camera Style
- Slow push-ins for tension.
- Quick zoom on price jumps.
- Overhead desk shots for documents.
- Wide shots for moving day.
- Close-ups for phone calls and invoice reveals.

## Caption Style
- Big, bold, centered captions.
- 3–7 words per caption chunk.
- Highlight scary words: “hostage,” “deposit,” “cash,” “too late,” “fake reviews.”
- Avoid covering character faces.
```

---

## 7) Format Recipe Example: Bleak Explainer + Bricktoon

Create:
`formats/bleak_explainer_bricktoon.json`

```json
{
  "format_id": "bleak_explainer_bricktoon",
  "display_name": "Bleak Explainer — Bricktoon",
  "description": "A dark, dramatic, slightly sarcastic short-form explainer using blocky toy cartoon characters.",
  "best_for": [
    "business scams",
    "consumer traps",
    "hidden costs",
    "industry abuse",
    "small business horror stories"
  ],
  "target_lengths_seconds": [45, 60, 75, 90],
  "hook_rules": {
    "first_line_templates": [
      "It sucks to {experience}.",
      "The worst part about {topic} is not what you think.",
      "This scam does not start when they steal your money. It starts when you trust the quote.",
      "By the time you realize what happened, your stuff is already gone."
    ],
    "max_first_sentence_words": 12,
    "must_create_tension_by_second": 3
  },
  "tone": {
    "voice": "calm, ominous, dry, direct",
    "humor": "dark but not cruel",
    "energy": "controlled tension",
    "avoid": [
      "generic influencer hype",
      "fake outrage",
      "defaming active companies without sources",
      "making victims look stupid"
    ]
  },
  "script_rules": {
    "sentence_length": "short",
    "beat_duration_seconds": "3-6",
    "claims_required": true,
    "legal_language_required": true,
    "structure": [
      "cold_open",
      "false_safety",
      "trap_mechanism",
      "case_or_data_point",
      "why_it_works",
      "red_flags",
      "closing_warning"
    ]
  },
  "visual_rules": {
    "style_id": "bricktoon",
    "scene_change_seconds": "2-4",
    "character_continuity": true,
    "use_real_faces": false,
    "use_real_company_logos": false,
    "preferred_visuals": [
      "moving truck",
      "boxes",
      "phone quote",
      "invoice jump",
      "storage unit",
      "fake review screen",
      "official source card",
      "red flag checklist"
    ]
  },
  "audio_rules": {
    "voice_style": "documentary male or neutral serious narrator",
    "music": "low dark synth, low volume",
    "sound_effects": [
      "low hit",
      "paper stamp",
      "phone notification",
      "truck door slam",
      "cash register sting"
    ]
  },
  "caption_rules": {
    "style": "large kinetic center captions",
    "words_per_caption": "3-7",
    "emphasis_words": [
      "cheap",
      "deposit",
      "cash",
      "hostage",
      "too late",
      "fake",
      "quote"
    ]
  },
  "qc_rules": {
    "fact_check_required": true,
    "legal_review_required": true,
    "visual_safety_review_required": true
  }
}
```

---

## 8) Fake Moving Companies Example

### Video concept

```text
It Sucks to Hire a Fake Moving Company
```

### Cast

```text
The Gigbizness Guide — narrator
Jay — customer
Maya — customer
Slick Steve — shady broker
Box Truck Guy — rogue mover
Inspector Dana — regulator/investigator
```

### Story beats

```text
B01 — It sucks to hire a fake moving company.
B02 — At first, everything looks normal: website, reviews, friendly quote.
B03 — Then they give you a price that beats everyone else.
B04 — The trap starts when your belongings are on the truck.
B05 — Suddenly, the price changes.
B06 — If you refuse, your stuff does not move.
B07 — Regulators call this a hostage-goods problem.
B08 — Some cases involve hundreds of victims.
B09 — The trick works because moving day gives scammers leverage.
B10 — Red flags: phone-only quote, big deposit, cash demand, blank paperwork, broker confusion.
B11 — The cheapest quote can become the most expensive move of your life.
```

### Example opening script

```text
It sucks to hire a fake moving company.

Because at first, nothing feels fake.

There is a website.
There are five-star reviews.
There is a friendly person on the phone.

And then they give you a quote so cheap it feels like you found a secret.

But the real price does not show up until your entire life is already inside the truck.
```

### Example scene flow

```text
S01 — Narrator stands beside tiny moving boxes.
S02 — Jay and Maya search “cheap movers near me.”
S03 — Slick Steve appears on phone screen with fake five-star reviews.
S04 — Plain white truck arrives.
S05 — Truck door closes with boxes inside.
S06 — Invoice jumps from $1,200 to $3,800.
S07 — Box Truck Guy points to “cash only” sign.
S08 — Inspector Dana opens source folder.
S09 — Red flag checklist appears.
S10 — Final shot: Jay and Maya compare three verified movers instead.
```

---

## 9) Visual Prompt Templates

### Character reference prompt

```text
Create a reusable character reference for a blocky toy cartoon business character, miniature plastic figure style, original design, not based on any copyrighted toy brand, simple expressive face, rounded block shapes, cinematic lighting, clean background, front view, side view, three-quarter view, consistent outfit: {outfit}, personality: {personality}, role: {role}, no logos, no copyrighted characters, no readable text.
```

### Scene prompt

```text
Vertical 9:16 cinematic blocky toy cartoon scene, miniature plastic world, {characters} in {environment}, {action}, dramatic but clean lighting, high contrast, simple readable composition, space for large captions in center, original toy-brick-inspired characters, no official toy branding, no logos, no readable private information, no real company names.
```

### Source card prompt

```text
Vertical 9:16 documentary graphic in a blocky toy cartoon world, fictional desk with official-looking folder, magnifying glass, printed source card, clean readable layout, no real agency logo unless manually added from official source, no fake legal document, no private information.
```

### Thumbnail prompt

```text
Vertical 9:16 high-impact thumbnail, blocky toy cartoon moving scam scene, stressed customer toy figure watching a moving truck drive away with boxes, shady broker toy figure holding a giant fake quote, dramatic lighting, large empty space for title text, no logos, no real company names, no copyrighted toy branding.
```

---

## 10) Animation Plan

You do not need full 3D animation at first. Start with fast, cheap movement.

### Phase 1 — Static image motion

Use:
- slow zoom
- pan
- parallax
- shake on reveal
- invoice number pop
- caption animation
- truck door slam cut
- phone notification pop

This is enough for Shorts.

### Phase 2 — AI image-to-video

For selected shots only:
- blinking
- character turning head
- truck door closing
- phone screen glowing
- boxes sliding
- paper stamp

Use short 2–4 second clips.

### Phase 3 — Real 3D system later

Eventually build or buy simple blocky 3D character rigs and render locally:
- Blender
- simple reusable motions
- reusable sets
- reusable cameras
- GPU overnight renders

Do not start with full 3D unless you want production to slow down.

---

## 11) Quality Control Rules

### Fact QC

Every factual claim must link to a claim ID.

Example:

```json
{
  "claim_id": "CLAIM_007",
  "claim": "FMCSA has investigated household-goods movers in response to hostage complaints.",
  "source": "FMCSA Operation Protect Your Move",
  "status": "official",
  "allowed_script_language": "FMCSA says / according to FMCSA"
}
```

### Legal QC

For business crime videos:
- Use “alleged” for charges.
- Use “convicted” only after confirming conviction.
- Use “sentenced” only after confirming sentencing.
- Use fictional cartoon characters for dramatizations.
- Do not visually imply a real company committed fraud unless the source supports it.
- Put “dramatization” in description if using fictional scenes.

### Visual QC

Reject visuals that contain:
- LEGO logo
- official LEGO packaging
- real company logos
- real victim faces
- readable private info
- fake police/FBI/agency logos
- exact copyrighted characters
- real addresses
- license plates
- court documents that look real but are invented

---

## 12) Implementation Phases

### Phase 1 — Architecture files only

Create:

```text
styles/bricktoon/style_bible.md
styles/bricktoon/visual_rules.json
formats/bleak_explainer_bricktoon.json
schemas/cast.schema.json
schemas/scene_cards.schema.json
```

Goal:
The AI knows the style and folder structure.

### Phase 2 — Fake moving companies pilot

Create:

```text
workspaces/fake_moving_companies/03_cast/cast.json
workspaces/fake_moving_companies/05_scene_cards/scene_cards.json
workspaces/fake_moving_companies/05_scene_cards/visual_prompts.md
```

Goal:
Turn the fake moving company topic into a bricktoon pilot.

### Phase 3 — Prompt-to-assets

Build a script that reads `scene_cards.json` and exports:

```text
image_prompts/
stock_queries/
caption_chunks/
animation_tasks/
```

Goal:
Every scene gets its own visual prompt and animation instruction.

### Phase 4 — Render MVP

Build a simple renderer:
- accepts voiceover
- accepts scene images
- applies zoom/pan
- overlays captions
- adds sound effects
- exports 1080x1920 video

Goal:
Produce a short without manual editing.

### Phase 5 — Overnight production

Create a queue:

```text
research → script → cast → scene cards → images → animation → render → QC
```

Goal:
Generate previews overnight, then manually approve final videos.

---

## 13) Recommended Rule for the Whole Channel

Use cartoons for dramatization.
Use official source cards for proof.

That gives the videos personality without weakening credibility.

Example:

```text
Cartoon scene:
Jay and Maya watch the truck door close.

Proof scene:
FMCSA / DOJ / BBB source card appears with the exact verified claim.
```

This is the safest and most reusable style for business crime videos.

---

## 14) Best Short-Term Build Order

1. Add `formats/bleak_explainer_bricktoon.json`.
2. Add `styles/bricktoon/style_bible.md`.
3. Add `character_agent`.
4. Add `scene_card_agent`.
5. Create cast for `fake_moving_companies`.
6. Create 10–14 scene cards.
7. Generate still images first.
8. Render with motion/captions.
9. Add AI image-to-video only for the best 3–5 shots.
10. QC facts and legal wording before publishing.

---

## 15) One-Sentence Architecture Summary

The new system should treat every video as a **researched business story performed by a reusable cast of original brick-toy cartoon characters**, controlled by a format recipe, scene cards, and strict fact/legal QC.
