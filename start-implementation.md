# Business Video Docs Automation — Implementation Spec

**Owner:** V J  
**Machine target:** NVIDIA GeForce GTX 1080 8GB, Intel Xeon E5-2696 class CPU, ~65GB RAM  
**Primary goal:** Produce **2 high-quality business videos per week** without making cheap AI-slop content.  
**Core idea:** Build a repeatable “video docs” production system that can create business comparison videos, business stories, business crime stories, documentaries, tips, and related formats using research agents + render agents + quality gates.

---

## 0. Philosophy: automate speed, not judgment

This system should not blindly create videos. It should automate repetitive work while keeping human review for taste, truth, pacing, and final approvals.

The system must optimize for:

1. **Viewer value**
   - The video should teach something useful.
   - The viewer should leave with a clearer understanding of a business, job, scam, industry, or decision.

2. **Credibility**
   - No made-up numbers.
   - No fake cases.
   - Every important claim should be traceable to a source.
   - Crime videos must distinguish between alleged, charged, convicted, sued, and proven.

3. **Production quality**
   - No generic AI intros.
   - No endless stock footage loops.
   - No monotone narration.
   - No repeated vague phrases like “in today’s fast-paced world.”
   - Visuals should support the story, not just fill time.

4. **Repeatability**
   - Every video type should use a template.
   - Every topic should have a config file.
   - Research, scripting, voice, assets, rendering, shorts, and metadata should have predictable outputs.

5. **Hardware utilization**
   - CPU handles research parsing, downloads, ffmpeg preprocessing, audio normalization, chart generation, proxy generation, and batch jobs.
   - GPU handles NVENC rendering/encoding, local transcription when supported, image processing/upscaling, and light AI image work.
   - Overnight mode should queue long-running jobs without requiring supervision.

---

## 1. Video types

The system should support the following video types.

### 1. Business comparison videos

**Purpose:** Compare two or more businesses, models, platforms, jobs, or strategies.

Examples:
- Costco vs Sam’s Club: Why One Model Wins
- DoorDash vs Uber Eats: Who Actually Makes Money?
- Buying a Franchise vs Starting From Scratch
- Laundromat vs Car Wash: Which Business Is Better?

Core structure:
1. Hook
2. The competitors
3. Revenue model comparison
4. Cost/risk comparison
5. Customer advantage
6. Hidden weakness
7. Winner by category
8. Final verdict

Required outputs:
- Comparison table
- Winner matrix
- 3–5 visual charts
- Sources list

---

### 2. Business story videos

**Purpose:** Tell the story of a founder, company, local operator, job, or industry shift.

Examples:
- How a Small Towing Company Became a Citywide Powerhouse
- The Man Who Turned Junk Removal Into a Franchise Empire
- How a Barbershop Became a Local Brand

Core structure:
1. Hook
2. Before the business
3. The problem/opportunity
4. The first breakthrough
5. Growth phase
6. Crisis or turning point
7. What changed
8. Lesson

Required outputs:
- Timeline
- Character/business profile
- Story arc document
- Visual mood board

---

### 3. Business crime story videos

**Purpose:** Explain frauds, scams, white-collar crime, illegal business models, predatory schemes, or business-adjacent crimes.

Examples:
- The Dark Side of Tow Truck Companies
- How Fake Moving Companies Hold Families Hostage
- The Fake Contractor Scam Destroying Homeowners
- How Stolen Catalytic Converters Became a Business

Core structure:
1. Hook with stakes
2. Normal business model
3. Where the exploit starts
4. How the money works
5. Real public case
6. Victim/customer impact
7. Why enforcement is hard
8. Prevention / takeaway

Special rules:
- Use “alleged,” “charged,” “convicted,” “lawsuit claims,” “regulators said,” or “according to court documents” accurately.
- Do not accuse private people or businesses without reliable sourcing.
- Do not provide operational instructions for committing crimes.
- Focus on explanation, public interest, prevention, and consumer awareness.
- Avoid graphic victim details unless necessary and handled respectfully.

Required outputs:
- Claims-to-verify file
- Case chronology
- Legal-status table
- Redaction checklist
- Source risk rating

---

### 4. Business documentary videos

**Purpose:** Explain a full industry or hidden business system.

Examples:
- Why Car Washes Are Suddenly Everywhere
- The Hidden Business of Storage Units
- The Dirty Business of Porta Potties
- Why Funeral Homes Are Recession-Proof

Core structure:
1. Hook
2. What the business does
3. Why it exists
4. How money flows
5. Costs and margins
6. Growth drivers
7. Hidden risks
8. Future outlook
9. Takeaway

Required outputs:
- Industry explainer doc
- Revenue/cost visual
- Timeline
- Map or market visual when useful
- 8–12 minute script

---

### 5. Business tip videos

**Purpose:** Give practical advice to business owners, creators, workers, or viewers.

Examples:
- 7 Business Scams to Avoid Before Hiring a Contractor
- 5 Things to Check Before Buying a Franchise
- How to Spot a Fake Job Agency
- Why Most Small Businesses Misread Profit

Core structure:
1. Fast practical hook
2. The problem
3. Tip 1
4. Tip 2
5. Tip 3
6. Common mistake
7. Action checklist
8. Final summary

Required outputs:
- Checklist
- On-screen cards
- Short-form cuts
- CTA

---

### 6. Industry economics explainers

**Purpose:** Explain why an industry behaves the way it does.

Examples:
- Why Restaurants Fail Even When They’re Busy
- Why Gyms Make Money When You Stop Going
- Why Mattress Stores Are Everywhere
- Why Dollar Stores Are Taking Over

Core structure:
1. Hook
2. Counterintuitive question
3. Basic economics
4. Incentives
5. Numbers
6. Consumer behavior
7. Industry pressure
8. Final insight

Required outputs:
- At least 2 charts
- Unit economics breakdown
- “The real reason” section

---

### 7. Job economics videos

**Purpose:** Explain how jobs really make money, where workers get squeezed, and what skills create leverage.

Examples:
- How Tow Truck Drivers Actually Make Money
- Why Plumbers Can Make More Than Office Workers
- The Truth About Owning a Barbershop
- How Truckers Survive High Fuel Costs

Core structure:
1. Hook
2. What the job looks like from outside
3. How pay actually works
4. Expenses and risks
5. Best-case scenario
6. Worst-case scenario
7. Skills that increase income
8. Final takeaway

Required outputs:
- Pay model breakdown
- Expense breakdown
- Career ladder visual
- Practical lessons

---

### 8. Business failure / teardown videos

**Purpose:** Break down why a business, product, startup, restaurant, franchise, or side hustle failed.

Examples:
- Why So Many Ghost Kitchens Collapsed
- The Franchise Dream That Turned Into Debt
- Why Restaurants Fail Even When Customers Show Up
- Why Some Car Wash Investors Lose Money

Core structure:
1. Hook
2. The promise
3. The business model
4. The hidden assumption
5. The failure point
6. Real case/examples
7. Warning signs
8. Lessons

Required outputs:
- Failure tree
- Assumption checklist
- Lessons for viewers
- Risk score

---

## 2. Target publishing schedule

Goal: **2 videos per week**.

Recommended release days:
- **Tuesday:** Video A
- **Friday:** Video B

Weekly production rhythm:

### Monday
- Lock topics for the next 2 videos.
- Run research agent for both topics.
- Produce research dossiers and claims-to-verify files.

### Tuesday
- Publish Video A if already complete.
- Script Video B.
- Start asset gathering for Video B.
- Generate voiceover draft for Video B.

### Wednesday
- Edit/render Video B.
- QC Video B.
- Generate 3–5 shorts from Video B.

### Thursday
- Research next week’s Video A.
- Prepare thumbnail and metadata for Friday video.
- Run overnight render/export batch if needed.

### Friday
- Publish Video B.
- Script next week’s Video A.
- Run stock footage/image/music gathering overnight.

### Saturday
- Heavy render day.
- Batch-generate shorts.
- Thumbnail variants.
- Human polish.

### Sunday
- Review analytics from last videos.
- Update templates based on retention drop-off.
- Prepare next week’s topic queue.

Important: production should overlap. While one video is being researched, another is being rendered, and another is being turned into shorts.

---

## 3. Repository structure

Create this project:

```text
business-video-docs/
  README.md
  IMPLEMENTATION.md
  .env.example
  package.json
  requirements.txt

  config/
    machine_profile.json
    render_profiles.json
    quality_rules.json
    source_rules.json
    channel_style.json
    schedule.json

  topics/
    queue.csv
    tow_truck_dark_side.json
    car_washes_everywhere.json
    fake_moving_companies.json

  prompts/
    research_agent.md
    source_validator_agent.md
    outline_agent.md
    script_agent.md
    visual_asset_agent.md
    stock_search_agent.md
    music_sfx_agent.md
    joke_agent.md
    render_plan_agent.md
    shorts_agent.md
    thumbnail_agent.md
    metadata_agent.md
    qc_agent.md

  agents/
    orchestrator.js
    topic_planner.js
    research_agent.js
    source_validator.js
    outline_agent.js
    script_agent.js
    visual_asset_agent.js
    voice_agent.js
    music_sfx_agent.js
    render_agent.js
    shorts_agent.js
    thumbnail_agent.js
    metadata_agent.js
    qc_agent.js

  scripts/
    setup_check.py
    benchmark_machine.py
    normalize_audio.py
    generate_subtitles.py
    generate_charts.py
    generate_timeline.py
    create_proxy_clips.py
    create_fact_cards.py
    build_scene_manifest.py
    ffmpeg_render.py
    make_shorts.py
    archive_project.py

  templates/
    remotion/
      package.json
      src/
        Main.tsx
        compositions/
          Documentary.tsx
          Comparison.tsx
          CrimeStory.tsx
          Tips.tsx
          Shorts.tsx
        components/
          TitleCard.tsx
          LowerThird.tsx
          FactCard.tsx
          Timeline.tsx
          SourceCard.tsx
          ChartFrame.tsx
          QuoteCard.tsx
          WarningCard.tsx
    davinci/
      resolve_render_queue.py
      timeline_import_template.py
    thumbnails/
      business_doc_template.psd
      crime_story_template.psd
      comparison_template.psd

  assets/
    global/
      fonts/
      music/
      sfx/
      overlays/
      backgrounds/
      icons/
    licensed/
      README_LICENSES.md

  workspaces/
    tow_truck_dark_side/
      00_config/
        topic.json
      01_research/
        research_dossier.md
        sources.csv
        claims_to_verify.md
        fact_table.csv
        case_timeline.md
        source_risk_report.md
      02_script/
        outline.md
        script_v1.md
        script_v2_human_review.md
        shotlist.csv
        jokes_and_analogies.md
      03_voice/
        voiceover.wav
        voiceover_clean.wav
        captions.srt
        transcript.txt
      04_assets/
        images/
        stock_videos/
        screenshots/
        music/
        sfx/
        charts/
        documents/
        licenses.csv
      05_render_plan/
        scene_manifest.json
        render_plan.json
        visual_timing.csv
      06_renders/
        draft_01.mp4
        draft_02.mp4
        final_1080p.mp4
        final_1440p.mp4
      07_shorts/
        short_01.mp4
        short_02.mp4
        short_03.mp4
        short_scripts.md
      08_thumbnail/
        thumbnail_prompt.txt
        thumbnail_01.png
        thumbnail_02.png
        final_thumbnail.jpg
      09_publish/
        title_options.txt
        description.txt
        tags.txt
        chapters.txt
        pinned_comment.txt
      10_qc/
        quality_report.md
        final_approval.md

  output/
    published/
    archive/
    logs/
```

---

## 4. Core config files

### 4.1 `config/machine_profile.json`

```json
{
  "machine_name": "vj_video_machine",
  "gpu": {
    "model": "NVIDIA GeForce GTX 1080",
    "vram_gb": 8,
    "preferred_encoding": "h264_nvenc",
    "avoid": ["heavy local AI video generation", "large SDXL batch jobs", "4K heavy effects"]
  },
  "cpu": {
    "model": "Intel Xeon E5-2696 class",
    "preferred_threads": 16,
    "max_threads": 32,
    "use_for": [
      "ffmpeg preprocessing",
      "research parsing",
      "chart generation",
      "audio normalization",
      "proxy generation",
      "batch downloads"
    ]
  },
  "ram_gb": 65,
  "target_resolution": "1920x1080",
  "optional_resolution": "2560x1440",
  "fps": 30,
  "overnight_mode": true
}
```

### 4.2 `config/render_profiles.json`

```json
{
  "draft": {
    "resolution": "1280x720",
    "fps": 30,
    "codec": "h264_nvenc",
    "bitrate": "4M",
    "audio_bitrate": "128k",
    "purpose": "fast review"
  },
  "youtube_1080p": {
    "resolution": "1920x1080",
    "fps": 30,
    "codec": "h264_nvenc",
    "bitrate": "14M",
    "audio_bitrate": "192k",
    "purpose": "main upload"
  },
  "youtube_1440p": {
    "resolution": "2560x1440",
    "fps": 30,
    "codec": "h264_nvenc",
    "bitrate": "24M",
    "audio_bitrate": "192k",
    "purpose": "higher-quality upload option"
  },
  "shorts_1080x1920": {
    "resolution": "1080x1920",
    "fps": 30,
    "codec": "h264_nvenc",
    "bitrate": "12M",
    "audio_bitrate": "192k",
    "purpose": "vertical short"
  }
}
```

### 4.3 `config/quality_rules.json`

```json
{
  "script": {
    "forbidden_phrases": [
      "in today's fast-paced world",
      "ever wondered",
      "let's dive in",
      "game-changer",
      "revolutionary",
      "this begs the question"
    ],
    "required": [
      "clear hook within first 10 seconds",
      "specific central question",
      "viewer payoff stated early",
      "at least one surprising insight",
      "no unsupported financial claims"
    ]
  },
  "visuals": {
    "max_seconds_without_visual_change": 8,
    "min_original_graphics_per_video": 3,
    "min_source_cards_per_video": 2,
    "avoid": [
      "random unrelated stock footage",
      "same clip reused too many times",
      "text walls",
      "low-resolution screenshots",
      "AI-looking generic characters unless style is intentional"
    ]
  },
  "research": {
    "min_sources": 8,
    "min_primary_or_official_sources": 2,
    "crime_video_min_official_sources": 3,
    "all_numbers_need_sources": true,
    "legal_claims_need_exact_status": true
  },
  "audio": {
    "target_lufs": -14,
    "voice_must_be_clear": true,
    "music_below_voice_db": -22,
    "avoid_overused_ai_voice_cadence": true
  },
  "final_review": {
    "human_must_review": [
      "title",
      "hook",
      "crime allegations",
      "thumbnail",
      "final export"
    ]
  }
}
```

---

## 5. Topic config format

Every video starts with a topic JSON.

Example: `topics/tow_truck_dark_side.json`

```json
{
  "id": "tow_truck_dark_side",
  "video_type": "business_crime_story",
  "working_title": "The Dark Side of Tow Truck Companies",
  "central_question": "How does a normal roadside service turn into a high-pressure business where customers can feel trapped?",
  "target_length_minutes": 9,
  "tone": "serious, clear, documentary, slightly skeptical",
  "audience": "general viewers interested in business, scams, money, and consumer protection",
  "value_promise": "Viewers will understand the towing business model, the legitimate costs, and where predatory practices can enter.",
  "must_include": [
    "normal towing business model",
    "fee stack explanation",
    "storage fees",
    "at least one real public case",
    "consumer warning signs"
  ],
  "must_avoid": [
    "accusing a company without a source",
    "showing victims disrespectfully",
    "giving instructions for illegal activity",
    "generic stock footage for too long"
  ],
  "visual_style": [
    "dark documentary",
    "tow trucks",
    "parking lots",
    "invoice graphics",
    "fee stack animation",
    "court/legal document cards",
    "city map graphics"
  ],
  "asset_keywords": [
    "tow truck night",
    "impound lot",
    "parking lot towing",
    "invoice closeup",
    "car being towed",
    "city street"
  ],
  "music_style": "low tension documentary, subtle, not horror",
  "humor_level": "light analogies only; no jokes about victims",
  "publish_priority": "high"
}
```

---

## 6. Agent architecture

The system should behave like a team of agents, even if implemented as scripts at first.

### 6.1 Orchestrator Agent

File: `agents/orchestrator.js`

Responsibilities:
- Accept a topic ID.
- Create workspace folders.
- Load topic config.
- Run agents in order.
- Save logs.
- Stop if required files are missing.
- Allow `--draft`, `--full`, `--overnight`, and `--resume`.

Commands:

```bash
node agents/orchestrator.js --topic tow_truck_dark_side --stage research
node agents/orchestrator.js --topic tow_truck_dark_side --stage script
node agents/orchestrator.js --topic tow_truck_dark_side --stage assets
node agents/orchestrator.js --topic tow_truck_dark_side --stage render --profile draft
node agents/orchestrator.js --topic tow_truck_dark_side --full
node agents/orchestrator.js --topic tow_truck_dark_side --overnight
```

Pipeline order:

```text
topic_config
  -> research_agent
  -> source_validator
  -> outline_agent
  -> script_agent
  -> visual_asset_agent
  -> voice_agent
  -> subtitle_agent
  -> music_sfx_agent
  -> render_plan_agent
  -> render_agent
  -> shorts_agent
  -> thumbnail_agent
  -> metadata_agent
  -> qc_agent
```

---

### 6.2 Research Agent

File: `agents/research_agent.js`  
Prompt: `prompts/research_agent.md`

Input:
- `topic.json`

Output:
- `research_dossier.md`
- `sources.csv`
- `fact_table.csv`
- `claims_to_verify.md`
- `case_timeline.md`
- `source_risk_report.md`

Research agent must gather:

```text
1. Basic explanation of the business/industry/job.
2. How money flows.
3. Key numbers and definitions.
4. Historical timeline.
5. Major companies or actors.
6. Official/government/regulator sources.
7. News and investigation sources.
8. Visual opportunities.
9. Risks, controversies, and counterpoints.
10. Claims that require human verification.
```

For business crime stories, it must also gather:

```text
1. Accusation/legal status.
2. Official source or court/regulator source.
3. What is alleged/proven.
4. Who was affected.
5. Outcome/status.
6. Exact wording needed: alleged, charged, convicted, settled, fined, sued, etc.
```

`fact_table.csv` schema:

```csv
claim,claim_type,value,date,source_title,source_url,source_type,reliability,risk_level,needs_human_review
"Storage fees can accumulate daily after a vehicle is impounded","business_model","","","Example Source","https://example.com","government","high","medium","yes"
```

Source type values:

```text
government
court
regulator
company_filing
company_page
reputable_news
industry_report
academic
trade_publication
blog
unknown
```

Reliability values:

```text
high
medium
low
```

Risk values:

```text
low
medium
high
critical
```

---

### 6.3 Source Validator Agent

File: `agents/source_validator.js`

Responsibilities:
- Check that every major script claim exists in the fact table.
- Flag weak sources.
- Flag crime/legal claims without official sourcing.
- Flag stale data.
- Create replacement search tasks when evidence is weak.

Output:
- `source_risk_report.md`
- `approved_facts.csv`
- `blocked_claims.md`

Rules:
- If a number appears in the script, it must have a source.
- If the video names a person/company in a crime context, it must have a reliable source.
- If the legal status is unclear, the script must use conservative wording.
- Never let the script say “they scammed people” if the source only says “accused” or “lawsuit alleges.”

---

### 6.4 Outline Agent

File: `agents/outline_agent.js`

Output:
- `outline.md`
- `story_map.md`

The outline must include:

```text
1. Opening hook
2. Viewer question
3. Scene list
4. Payoff per scene
5. Visual idea per scene
6. Source support per scene
7. Retention risk per scene
```

Scene format:

```markdown
## Scene 03 — How the money works

Purpose:
Explain the fee stack.

Narration goal:
Make the viewer understand why small fees can become a big bill.

Visuals:
- Animated invoice stack
- Tow truck footage
- Parking lot shot
- Fact card

Sources:
- approved_facts.csv rows 4, 5, 8

Retention device:
Reveal that the initial tow fee is not always the end of the bill.
```

---

### 6.5 Script Agent

File: `agents/script_agent.js`

Output:
- `script_v1.md`
- `script_v2_human_review.md`
- `shotlist.csv`

The script agent must follow the selected video type template.

Writing rules:
- Use short sentences.
- Start with a concrete, visual hook.
- Explain jargon.
- Avoid generic motivational language.
- Use evidence naturally.
- Do not overload viewers with numbers.
- Keep one central idea per scene.
- Use clear transitions.
- End with a real takeaway.

Good hook examples:

```text
Your car can disappear in ten minutes, but the bill can follow you for weeks.

A car wash looks simple from the street. But the money is not just in washing cars.

A storage unit is basically a garage you rent forever. That is exactly why investors love them.

The fake moving scam starts with a cheap quote. The real price appears after your life is already inside the truck.
```

Bad hook examples:

```text
In today's fast-paced world, businesses are changing rapidly.
Have you ever wondered how businesses make money?
Let's dive into the world of towing.
This industry is truly a game-changer.
```

---

### 6.6 Visual Asset Agent

File: `agents/visual_asset_agent.js`

Output:
- `visual_manifest.csv`
- downloaded assets under `04_assets/`
- `licenses.csv`

Responsibilities:
- Convert each scene into visual needs.
- Search/download stock footage, images, icons, public documents, screenshots.
- Generate asset gaps for manual review.
- Track licenses.

Visual categories:

```text
stock_video
stock_photo
screenshot
document
chart
map
generated_graphic
icon
logo
background
b_roll
```

`visual_manifest.csv` schema:

```csv
scene_id,asset_type,search_query,filename,source_url,license,usage,priority,status
S03,stock_video,"tow truck parking lot night","tow_truck_01.mp4","https://...","pexels","background b-roll","high","downloaded"
```

Rules:
- Every asset must have a source or license note.
- Avoid using random low-quality screenshots.
- Company logos should be used carefully as references, not as fake endorsements.
- Public documents should be cropped/highlighted for readability.
- Do not use graphic crime/victim visuals unnecessarily.

---

### 6.7 Music/SFX Agent

File: `agents/music_sfx_agent.js`

Output:
- `music_plan.md`
- `sfx_plan.csv`

Responsibilities:
- Pick background music style.
- Pick subtle sound effects.
- Avoid making serious stories feel like horror exploitation.
- Avoid overusing whooshes and booms.

Music rules:
- Voice must always be clear.
- Music should support tension, not overpower.
- Business tips can be lighter.
- Crime stories should be serious, not sensational.
- Store license/source for every music track.

SFX examples:
- soft hit for title card
- paper stamp for “court document”
- subtle cash register for money breakdown
- low riser before reveal
- light click for checklist items

Humor/joke rules:
- Jokes are allowed in business explainers and tips.
- Business crime stories may use light analogies, but never joke about victims.
- Humor should clarify the point, not derail the video.

Example acceptable analogy:

```text
A cheap moving quote can work like bait. It gets you to say yes before you know the real price.
```

Example to avoid:

```text
These victims really got played.
```

---

### 6.8 Voice Agent

File: `agents/voice_agent.js`

Output:
- `voiceover.wav`
- `voiceover_clean.wav`

Responsibilities:
- Generate or prepare voiceover.
- Normalize audio.
- Add pauses.
- Split sections if needed.
- Export clean WAV.

Voice style:
- Documentary
- Calm
- Confident
- Slightly skeptical
- Not robotic
- Not overdramatic

Audio processing:
- Normalize to roughly -14 LUFS for YouTube target.
- Remove harsh noise.
- Use compression lightly.
- Keep music below narration.

---

### 6.9 Subtitle Agent

File: `scripts/generate_subtitles.py`

Output:
- `captions.srt`
- `transcript.txt`

Recommended:
- Use faster-whisper or Whisper-based local transcription.
- Start with smaller/medium models for speed.
- Use GPU int8 if supported; otherwise CPU mode overnight.

Caption styles:
- YouTube long video: upload `.srt`
- Shorts: burn captions into vertical video
- Do not burn large subtitles into long documentaries unless style requires it.

---

### 6.10 Render Plan Agent

File: `agents/render_plan_agent.js`

Output:
- `scene_manifest.json`
- `render_plan.json`
- `visual_timing.csv`

Responsibilities:
- Turn script and assets into timed scenes.
- Assign visuals to script segments.
- Decide when to show charts, screenshots, maps, lower thirds, source cards.
- Create instructions for Remotion/FFmpeg/DaVinci.

Scene manifest example:

```json
{
  "video_id": "tow_truck_dark_side",
  "duration_seconds": 540,
  "scenes": [
    {
      "id": "S01",
      "title": "Hook",
      "start": 0,
      "end": 22,
      "voiceover_file": "voiceover.wav",
      "visuals": [
        {
          "type": "stock_video",
          "file": "tow_truck_night.mp4",
          "start": 0,
          "end": 8,
          "effect": "slow_zoom"
        },
        {
          "type": "text",
          "text": "TOWED & TRAPPED",
          "start": 3,
          "end": 8,
          "effect": "title_card"
        }
      ],
      "music": "low_tension_track_01.wav",
      "sfx": ["soft_hit.wav"],
      "notes": "Fast, visual, no generic intro."
    }
  ]
}
```

---

### 6.11 Render Agent

File: `agents/render_agent.js`

Responsibilities:
- Generate draft videos.
- Generate final long video.
- Generate vertical shorts.
- Use hardware-aware settings.
- Save logs and render reports.
- Resume failed renders.

Recommended render layers:
1. Preprocess clips with FFmpeg.
2. Generate charts/fact cards with Python.
3. Assemble motion graphics with Remotion or MoviePy.
4. Export final draft with FFmpeg NVENC.
5. Optional final polish in DaVinci Resolve.
6. Export final 1080p or 1440p.

For your machine:
- Prefer 1080p30 for normal output.
- Use 1440p only when final quality matters and render time is acceptable.
- Use GPU NVENC for final H.264 encoding.
- Use CPU overnight for preprocessing and proxies.
- Do not try to run heavy local AI video generation as a core production step.

Example FFmpeg NVENC pattern:

```bash
ffmpeg -y -i input.mov -c:v h264_nvenc -preset p5 -b:v 14M -c:a aac -b:a 192k output_1080p.mp4
```

If NVENC errors occur, fall back to CPU:

```bash
ffmpeg -y -i input.mov -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k output_1080p.mp4
```

---

### 6.12 Shorts Agent

File: `agents/shorts_agent.js`

Output:
- `short_scripts.md`
- `short_01.mp4`
- `short_02.mp4`
- `short_03.mp4`

Responsibilities:
- Identify 3–5 short-worthy moments.
- Create vertical scene manifests.
- Burn captions.
- Add hook text.
- Export 1080x1920.

Shorts structure:

```text
0–2 sec: pattern interrupt / hook
2–10 sec: setup
10–30 sec: explanation
30–45 sec: punchline / takeaway
45–55 sec: optional CTA
```

Good shorts from one video:
- “The fee stack behind towing”
- “Why fake movers start with cheap quotes”
- “Why gyms love members who do not show up”
- “The car wash money model in 30 seconds”

---

### 6.13 Thumbnail Agent

File: `agents/thumbnail_agent.js`

Output:
- `thumbnail_prompt.txt`
- `thumbnail_concepts.md`
- `final_thumbnail.jpg`

Responsibilities:
- Create thumbnail concepts.
- Generate/refine prompts.
- Export title text options.
- Avoid misleading claims.
- Avoid clutter.

Thumbnail formulas:

```text
Object + conflict + short phrase
Industry visual + money symbol + question
Person/business image + warning label + 3-word title
```

Examples:
- Tow truck + invoice + “TOWED & TRAPPED”
- Car wash tunnel + cash + “MONEY MACHINE?”
- Moving truck + padlock + “FAKE MOVERS”
- Storage unit row + rent bill + “RENT FOREVER”

Rules:
- 3–5 words maximum.
- High contrast.
- Text readable on mobile.
- No fake police/court claims.
- Do not use logos in a way that implies endorsement.

---

### 6.14 Metadata Agent

File: `agents/metadata_agent.js`

Output:
- `title_options.txt`
- `description.txt`
- `tags.txt`
- `chapters.txt`
- `pinned_comment.txt`

Title rules:
- Clear curiosity.
- No fake certainty.
- No overpromising.
- Do not use “exposed” unless the video truly contains investigative findings.
- Crime title must not overstate legal status.

Good title formulas:

```text
The Dark Side of [Industry]
How [Business] Actually Makes Money
Why [Business] Is Suddenly Everywhere
The Hidden Business Behind [Thing]
How [Scam] Works
Why [Business] Looks Easy But Destroys Owners
[Company A] vs [Company B]: Who Really Wins?
```

---

### 6.15 QC Agent

File: `agents/qc_agent.js`

Output:
- `quality_report.md`
- `final_approval.md`

QC checklist:

```text
Research:
[ ] Every major factual claim has source support.
[ ] Every number has a source.
[ ] Legal/crime wording is accurate.
[ ] Counterpoints are included where needed.

Script:
[ ] Hook starts strong.
[ ] No generic AI phrases.
[ ] The video has a clear viewer payoff.
[ ] The pacing does not drag.
[ ] Ending gives a real takeaway.

Visuals:
[ ] Visual changes every 5–8 seconds.
[ ] At least 3 original graphics/charts/cards.
[ ] Stock footage is relevant.
[ ] Screenshots/documents are readable.
[ ] No license gaps.

Audio:
[ ] Voice is clear.
[ ] Music is not too loud.
[ ] No harsh SFX.
[ ] Captions are accurate.

Platform:
[ ] No reused-content style upload.
[ ] No misleading thumbnail.
[ ] No unsupported crime accusation.
[ ] No private personal info exposed.

Final:
[ ] Human reviewed title.
[ ] Human reviewed first 30 seconds.
[ ] Human reviewed all crime/legal claims.
[ ] Human reviewed thumbnail.
```

---

## 7. Overnight pipeline

The overnight pipeline should run tasks that do not need constant human judgment.

Command:

```bash
node agents/orchestrator.js --overnight
```

It should read:

```text
topics/queue.csv
config/machine_profile.json
config/render_profiles.json
```

### Overnight job categories

CPU-heavy:
- source text extraction
- screenshots from downloaded documents
- proxy clip creation
- stock video transcoding
- chart generation
- fact card generation
- audio cleanup
- metadata generation
- archive/backup

GPU-heavy:
- NVENC final exports
- local transcription if GPU-compatible
- image upscaling
- light AI image generation
- draft video preview renders

Network/API-heavy:
- stock footage downloads
- image downloads
- music/SFX downloads
- source page archiving
- TTS generation if cloud API is used

### Concurrency rules

```json
{
  "overnight": {
    "max_cpu_jobs": 4,
    "max_gpu_jobs": 1,
    "max_download_jobs": 3,
    "stop_on_critical_error": false,
    "write_logs": true,
    "shutdown_when_done": false
  }
}
```

Why:
- GPU jobs should usually run one at a time on GTX 1080 8GB.
- CPU jobs can run in parallel, but leave headroom.
- Download jobs should not overwhelm APIs or get rate-limited.

### Overnight queue file

`topics/queue.csv`

```csv
id,video_type,status,priority,next_stage,allow_overnight
tow_truck_dark_side,business_crime_story,research_done,high,script,yes
car_washes_everywhere,business_documentary,script_done,high,assets,yes
fake_moving_companies,business_crime_story,assets_done,medium,render,yes
```

### Overnight run order

```text
1. Validate configs.
2. Skip anything with status = needs_human_review.
3. Run missing research for approved topics.
4. Generate outlines and scripts only if topic has enough sources.
5. Gather stock footage/images/music.
6. Generate subtitles if voiceover exists.
7. Build charts/fact cards.
8. Render draft exports.
9. Render final only if QC precheck passes.
10. Generate shorts from approved final/draft.
11. Write morning report.
```

Morning report:

`output/logs/overnight_report_YYYY-MM-DD.md`

```markdown
# Overnight Report

Completed:
- car_washes_everywhere: downloaded 22 assets, generated 4 charts, rendered draft_01.mp4
- fake_moving_companies: generated captions, rendered short_01 and short_02

Needs review:
- tow_truck_dark_side: 3 legal claims need official sources
- car_washes_everywhere: 2 stock clips missing license metadata

Errors:
- None
```

---

## 8. Render strategy: automated but not cheap-looking

Avoid one giant script that creates the entire final video with random b-roll. Instead, render in layers.

### Layer 1 — Base voice/music

Inputs:
- voiceover_clean.wav
- music track
- sfx_plan.csv

Output:
- mixed_audio.wav

### Layer 2 — Visual scene clips

Inputs:
- scene_manifest.json
- stock footage
- screenshots
- charts
- text cards

Output:
- `scene_S01.mp4`
- `scene_S02.mp4`
- etc.

### Layer 3 — Assembly

Inputs:
- rendered scene clips
- mixed_audio.wav
- captions.srt

Output:
- `draft_01.mp4`

### Layer 4 — Human polish

Optional:
- Import draft into DaVinci Resolve.
- Fix timing, add manual cuts, improve thumbnail, fix pacing.

### Layer 5 — Final export

Output:
- `final_1080p.mp4`
- `final_1440p.mp4`
- shorts

---

## 9. Visual quality system

Every scene should have a purpose.

Scene categories:

```text
hook
context
money_breakdown
timeline
case_example
source_card
quote_card
map
chart
warning_sign
comparison
takeaway
```

Minimum high-quality visual package per 8–12 minute video:

```text
1 custom title card
3 original charts/fact cards
2 source/headline cards
1 timeline
1 money-flow graphic
1 final takeaway card
15–30 relevant b-roll clips/images
```

Recommended visual pacing:

```text
0:00–0:10: fast hook with strong visuals
0:10–0:18: title card
0:18–1:00: setup/context
1:00–3:00: business model
3:00–5:00: conflict/problem
5:00–7:00: real case or deeper evidence
7:00–9:00: consequences/lesson
9:00–10:00: final takeaway
```

---

## 10. Research rules for value

Every video should answer at least one of these:

```text
1. How does this business actually make money?
2. Why does this industry exist?
3. Who benefits and who pays?
4. What incentives create the problem?
5. What do normal people misunderstand?
6. What should a viewer watch out for?
7. What lesson can an owner/worker/customer learn?
```

Research dossier must include:

```markdown
# Research Dossier

## Central question

## Short answer

## Business model

## Money flow

## Key numbers

## Timeline

## Real-world examples

## Crime/scam/legal section if applicable

## Counterpoints

## Visual opportunities

## Approved facts

## Claims needing review

## Sources
```

---

## 11. Script quality rules

A good script should sound human.

### Use this tone

```text
Clear.
Skeptical.
Specific.
Useful.
Curious.
Not preachy.
Not overhyped.
```

### Use this writing pattern

```text
Claim.
Simple explanation.
Concrete example.
Why it matters.
Transition.
```

Example:

```text
The towing business does not end when the car leaves the parking lot. That is often where the second part begins: storage. If the vehicle sits in an impound lot, the bill can grow day by day. That changes the customer's position. They are no longer shopping for a service. They are paying to get back something they already own.
```

### Avoid this

```text
Tow truck companies are an essential part of modern society, providing a wide range of services in an increasingly complex world.
```

---

## 12. Prompt templates

### 12.1 Research Agent Prompt

Save as `prompts/research_agent.md`

```markdown
You are a research producer for a high-quality business documentary channel.

Your job is to gather reliable information for a video. You must not invent facts. You must separate confirmed facts from claims that require verification.

Input topic:
{{TOPIC_JSON}}

Return the following files:

1. research_dossier.md
2. sources.csv
3. fact_table.csv
4. claims_to_verify.md
5. visual_opportunities.md

Requirements:
- Explain the business model clearly.
- Identify how money flows.
- Find real examples.
- Include primary/official sources where possible.
- For crime/scam topics, identify legal status precisely: alleged, charged, convicted, sued, settled, fined, or regulator warning.
- Flag weak or risky claims.
- Suggest visuals for each major section.
- Do not write the final script yet.

Output must be specific, useful, and source-aware.
```

### 12.2 Script Agent Prompt

Save as `prompts/script_agent.md`

```markdown
You are a documentary scriptwriter for a serious but engaging business channel.

Input:
- Topic config
- Research dossier
- Approved fact table
- Video type
- Target length
- Quality rules

Write a script that:
- Starts with a strong, concrete hook.
- Avoids generic AI phrases.
- Explains the business model clearly.
- Uses evidence naturally.
- Gives the viewer practical understanding.
- Includes scene headings.
- Includes notes for visuals.
- Uses careful wording for legal/crime claims.
- Ends with a clear takeaway.

Do not invent facts.
Do not include unsupported numbers.
Do not overstate accusations.
Do not joke about victims.

Return:
1. script_v1.md
2. shotlist.csv
3. narrator_notes.md
```

### 12.3 Joke/Analogy Agent Prompt

Save as `prompts/joke_agent.md`

```markdown
You are a humor and analogy assistant for a business documentary channel.

Your job is not to turn the video into comedy. Your job is to add light, useful, human moments that make the explanation easier to understand.

Rules:
- Do not joke about victims, crime victims, injuries, poverty, or people being exploited.
- Do not add jokes to serious crime sections unless they are neutral analogies.
- Prefer analogies over punchlines.
- Keep lines short.
- Make the narrator sound human, not sarcastic or cruel.

Input:
{{SCRIPT_SECTION}}

Return:
- 3 possible analogy lines
- 3 optional light humor lines
- A warning if humor is not appropriate for this section
```

### 12.4 Render Plan Prompt

Save as `prompts/render_plan_agent.md`

```markdown
You are a video edit planner.

Input:
- script
- shotlist
- available assets
- captions
- visual style
- target duration

Create a scene-by-scene render plan. Every scene must have:
- start/end estimate
- narration segment
- visual asset list
- text overlays
- chart/fact card needs
- motion style
- SFX
- music cue
- retention purpose

Avoid generic stock footage. Every visual must support the narration.

Return:
1. scene_manifest.json
2. visual_timing.csv
3. missing_assets.md
```

### 12.5 QC Agent Prompt

Save as `prompts/qc_agent.md`

```markdown
You are a strict quality-control producer for a business documentary channel.

Input:
- topic config
- research dossier
- approved facts
- script
- scene manifest
- render draft notes
- title/thumbnail/metadata

Review the video package for:
- factual accuracy
- legal risk
- weak sourcing
- generic AI writing
- low-value filler
- poor pacing
- irrelevant visuals
- misleading title/thumbnail
- unclear viewer payoff

Return:
1. quality_report.md
2. required_fixes.md
3. optional_improvements.md
4. final_approval.md with APPROVED or NOT APPROVED
```

---

## 13. MVP build phases

### Phase 0 — System check and benchmark

Goal:
- Confirm machine capabilities.
- Confirm FFmpeg, Node, Python, GPU encoding, and transcription.

Build:
- `scripts/setup_check.py`
- `scripts/benchmark_machine.py`

Checks:
```text
[ ] Node installed
[ ] Python installed
[ ] FFmpeg installed
[ ] ffmpeg sees h264_nvenc
[ ] CUDA/GPU usable if needed
[ ] Disk space available
[ ] Output folders writable
[ ] API keys configured
```

Outputs:
- `output/logs/system_check.md`
- `output/logs/benchmark_report.md`

---

### Phase 1 — Manual MVP structure

Goal:
- One topic becomes one organized workspace.

Build:
- repo folder structure
- topic JSON schema
- workspace generator

Command:

```bash
node agents/orchestrator.js --topic tow_truck_dark_side --init
```

Output:
- `workspaces/tow_truck_dark_side/` folder tree

No AI required yet.

---

### Phase 2 — Research MVP

Goal:
- Make the Research Agent gather/source/organize information.

Build:
- `research_agent.js`
- `source_validator.js`
- prompt files

Output:
- research dossier
- source list
- claims to verify

Human gate:
- Do not proceed until key claims are approved.

---

### Phase 3 — Script MVP

Goal:
- Generate a useful script based on approved research.

Build:
- `outline_agent.js`
- `script_agent.js`
- `joke_agent.js`

Output:
- outline
- script
- shotlist

Human gate:
- Review hook.
- Review legal claims.
- Remove generic lines.
- Add personal taste.

---

### Phase 4 — Voice and subtitles MVP

Goal:
- Produce narration and captions.

Build:
- `voice_agent.js`
- `normalize_audio.py`
- `generate_subtitles.py`

Output:
- voiceover
- cleaned voiceover
- captions
- transcript

Human gate:
- Listen to first 60 seconds.
- Fix pronunciation and pacing.

---

### Phase 5 — Asset pipeline MVP

Goal:
- Gather visuals and create simple custom graphics.

Build:
- `visual_asset_agent.js`
- stock/image download helpers
- `generate_charts.py`
- `create_fact_cards.py`

Output:
- visual manifest
- stock clips/images
- charts
- fact cards
- license file

Human gate:
- Remove irrelevant stock footage.
- Replace weak visuals.

---

### Phase 6 — Render MVP

Goal:
- Render a draft video.

Build:
- `render_plan_agent.js`
- `render_agent.js`
- Remotion template or FFmpeg-based renderer

Output:
- `draft_01.mp4`

Human gate:
- Watch full draft.
- Mark boring spots.
- Fix visuals and pacing.

---

### Phase 7 — Shorts and thumbnail MVP

Goal:
- Turn each long video into 3–5 shorts and a thumbnail package.

Build:
- `shorts_agent.js`
- `thumbnail_agent.js`
- `metadata_agent.js`

Output:
- vertical shorts
- title options
- description
- thumbnail prompt/concepts

Human gate:
- Pick final title/thumbnail.
- Review shorts for context and accuracy.

---

### Phase 8 — Overnight mode

Goal:
- Let the machine run long tasks while you sleep.

Build:
- queue processor
- job locking
- logging
- resume support

Command:

```bash
node agents/orchestrator.js --overnight
```

Output:
- drafts
- captions
- assets
- charts
- reports

Human gate:
- Morning report review.

---

### Phase 9 — Quality system

Goal:
- Prevent AI slop and legal mistakes.

Build:
- `qc_agent.js`
- checklist enforcement
- source enforcement

Rule:
- No video gets final export unless QC passes.

---

### Phase 10 — Publishing loop

Goal:
- Repeat production twice per week.

Build:
- analytics tracker
- topic score updates
- template improvements

Metrics to track:
```text
CTR
average view duration
first 30-second retention
comments mentioning value
subscriber conversion
shorts-to-long-video conversion
production hours per video
```

---

## 14. Suggested technology stack

### Core automation

```text
Node.js
Python
FFmpeg
Remotion
DaVinci Resolve optional for final polish
```

### Research

```text
AI model/API for research and writing
Manual source verification
Source CSV tracking
Browser/screenshot tools
Public records/government/court/company filings/news
```

### Visuals

```text
Pexels API
Pixabay API
Public domain images where possible
Company websites and public filings for reference
Custom charts from Python
Custom fact cards
Screenshots with source labels
```

### Audio

```text
AI TTS or personal voice
FFmpeg audio cleanup
Whisper/faster-whisper captions
Licensed music/SFX
```

### Rendering

```text
Remotion for templated motion graphics
FFmpeg for encoding and assembly
DaVinci Resolve for optional final manual polish
NVENC for GPU-accelerated H.264 exports
```

---

## 15. Package scripts

`package.json` should eventually support:

```json
{
  "scripts": {
    "init": "node agents/orchestrator.js --init-project",
    "new": "node agents/orchestrator.js --new-topic",
    "research": "node agents/orchestrator.js --stage research",
    "script": "node agents/orchestrator.js --stage script",
    "assets": "node agents/orchestrator.js --stage assets",
    "voice": "node agents/orchestrator.js --stage voice",
    "render:draft": "node agents/orchestrator.js --stage render --profile draft",
    "render:final": "node agents/orchestrator.js --stage render --profile youtube_1080p",
    "shorts": "node agents/orchestrator.js --stage shorts",
    "qc": "node agents/orchestrator.js --stage qc",
    "full": "node agents/orchestrator.js --full",
    "overnight": "node agents/orchestrator.js --overnight"
  }
}
```

Example usage:

```bash
npm run research -- --topic tow_truck_dark_side
npm run script -- --topic tow_truck_dark_side
npm run render:draft -- --topic tow_truck_dark_side
npm run overnight
```

---

## 16. Minimum viable first video

Start with:

```text
The Dark Side of Tow Truck Companies
```

Why:
- Strong curiosity.
- Easy visuals.
- Business + crime overlap.
- Useful to viewers.
- Clear money model.
- Lots of stock footage opportunities.

Required deliverables:
```text
1. 8–10 minute long video
2. 3 vertical shorts
3. thumbnail
4. description
5. source list
6. quality report
```

First video success criteria:
```text
[ ] Viewer understands how towing fees work.
[ ] Viewer understands the difference between legitimate towing and predatory practices.
[ ] At least one real public case is included.
[ ] At least three visuals are custom, not stock.
[ ] The first 30 seconds are strong.
[ ] No unsupported legal accusations.
[ ] It feels like a researched documentary, not a lazy AI narration.
```

---

## 17. First 30 video queue

```csv
id,title,video_type,priority
tow_truck_dark_side,The Dark Side of Tow Truck Companies,business_crime_story,high
fake_moving_companies,How Fake Moving Companies Scam Families,business_crime_story,high
car_washes_everywhere,Why Car Washes Are Suddenly Everywhere,business_documentary,high
storage_units_hidden_business,The Hidden Business of Storage Units,business_documentary,high
porta_potties_dirty_business,The Dirty Business of Porta Potties,business_documentary,high
payday_loans_trap,How Payday Loans Became a Billion-Dollar Trap,business_crime_story,high
business_coach_scam,The Business Coach Scam Nobody Talks About,business_crime_story,medium
gyms_no_show,Why Gyms Make Money When You Stop Going,industry_economics,high
junk_removal_big_business,How Junk Removal Became Big Business,business_documentary,medium
restaurants_fail_busy,Why Restaurants Fail Even When They’re Busy,business_failure_teardown,high
franchise_debt_trap,The Franchise Dream That Turns Into Debt,business_failure_teardown,medium
dollar_stores_everywhere,Why Dollar Stores Are Everywhere,industry_economics,high
funeral_homes_money,How Funeral Homes Make Money,business_documentary,medium
private_college_business,The Private College Business Model,business_documentary,medium
fake_job_agencies,How Fake Job Agencies Exploit Workers,business_crime_story,medium
trucking_bankruptcies,Why Trucking Companies Go Bankrupt,job_economics,high
barbershop_business,How Barbershops Really Make Money,job_economics,medium
hvac_profit,Why HVAC Companies Can Be So Profitable,job_economics,medium
roofing_storm_business,How Roofing Companies Make Millions After Storms,business_documentary,medium
car_dealer_fees,The Hidden Fees at Car Dealerships,business_crime_story,high
costco_vs_sams,Costco vs Sam’s Club: Who Really Wins?,business_comparison,medium
doordash_vs_uber_eats,DoorDash vs Uber Eats: Who Makes Money?,business_comparison,medium
mlm_model,How MLM Companies Sell Hope,business_crime_story,medium
counterfeit_goods,How Counterfeit Goods Became a Global Industry,business_crime_story,medium
parking_lots_money,How Parking Lots Became Money Printers,business_documentary,medium
wedding_venues,How Wedding Venues Make Money,business_documentary,medium
rent_to_own,How Rent-to-Own Stores Make Poor People Pay More,business_crime_story,medium
buy_here_pay_here,The Dark Side of Buy-Here-Pay-Here Car Lots,business_crime_story,medium
ghost_kitchens_failed,Why So Many Ghost Kitchens Collapsed,business_failure_teardown,medium
plumbers_money,Why Plumbers Are Quietly Making Serious Money,job_economics,medium
```

---

## 18. Human review gates

The system should stop and request human review at these points:

```text
1. After research if:
   - fewer than required sources
   - risky claims
   - unclear legal status
   - weak numbers

2. After script if:
   - hook is weak
   - too many generic lines
   - crime claims are too aggressive
   - no clear viewer payoff

3. After asset gathering if:
   - license gaps
   - too much irrelevant stock footage
   - important visuals missing

4. After draft render if:
   - first 30 seconds are boring
   - visuals do not match narration
   - audio is unclear
   - pacing drags

5. Before publishing:
   - title and thumbnail must be checked manually
```

---

## 19. Anti-AI-slop checklist

A video is probably AI slop if:

```text
[ ] It could have been made from one vague article.
[ ] It uses generic stock clips unrelated to the narration.
[ ] It has no original charts, diagrams, or examples.
[ ] It repeats obvious points.
[ ] It uses AI clichés.
[ ] It makes claims without sources.
[ ] It sounds like a Wikipedia summary.
[ ] It has no clear “why this matters.”
[ ] It has no human judgment.
[ ] It tries to sound dramatic instead of being useful.
```

A video is valuable if:

```text
[ ] It answers a real question.
[ ] It explains incentives and money flow.
[ ] It gives practical viewer takeaways.
[ ] It includes specific examples.
[ ] It distinguishes fact from allegation.
[ ] It uses visuals to explain, not decorate.
[ ] It respects people harmed by scams/crimes.
[ ] It leaves the viewer smarter than before.
```

---

## 20. Official references checked while planning

These references justify the core tool choices. Update them as the project evolves.

- FFmpeg official site: https://www.ffmpeg.org/
- FFmpeg CLI documentation: https://ffmpeg.org/ffmpeg.html
- Remotion render docs: https://www.remotion.dev/docs/render
- Remotion renderer docs: https://www.remotion.dev/docs/renderer
- faster-whisper GitHub: https://github.com/SYSTRAN/faster-whisper
- Pexels API: https://www.pexels.com/api/documentation/
- Pixabay API: https://pixabay.com/api/docs/
- DaVinci Resolve scripting documentation mirror: https://extremraym.com/cloud/resolve-scripting-doc/

---

## 21. Build order for your local AI

Give your coding AI this exact order:

```text
Task 1:
Create the repository folders and starter config files.

Task 2:
Implement topic workspace creation from a topic JSON.

Task 3:
Implement queue.csv reading and status updates.

Task 4:
Implement research_agent.js as a stub that creates the expected research files from manual notes first.

Task 5:
Add AI call support to research_agent.js.

Task 6:
Implement source_validator.js.

Task 7:
Implement script_agent.js using prompt templates.

Task 8:
Implement voice_agent.js and subtitle generation.

Task 9:
Implement visual_asset_agent.js with manual asset mode first, API downloads second.

Task 10:
Implement chart/fact-card generators.

Task 11:
Implement render_plan_agent.js.

Task 12:
Implement a simple FFmpeg-based draft renderer.

Task 13:
Add Remotion templates for higher-quality motion graphics.

Task 14:
Implement shorts_agent.js.

Task 15:
Implement thumbnail_agent.js and metadata_agent.js.

Task 16:
Implement qc_agent.js.

Task 17:
Implement overnight mode with job locking, logging, and resume.

Task 18:
Test the full pipeline on tow_truck_dark_side.

Task 19:
Polish the first video manually.

Task 20:
Duplicate the workflow for the second weekly video.
```

---

## 22. Definition of done

The project is ready when this command:

```bash
npm run full -- --topic tow_truck_dark_side
```

Can create:

```text
workspaces/tow_truck_dark_side/
  01_research/research_dossier.md
  01_research/sources.csv
  01_research/claims_to_verify.md
  02_script/script_v2_human_review.md
  03_voice/voiceover_clean.wav
  03_voice/captions.srt
  04_assets/visual_manifest.csv
  05_render_plan/scene_manifest.json
  06_renders/draft_01.mp4
  07_shorts/short_01.mp4
  08_thumbnail/thumbnail_prompt.txt
  09_publish/title_options.txt
  10_qc/quality_report.md
```

And this command:

```bash
npm run overnight
```

Can process approved queued tasks and write a morning report.

Final publishing still requires human approval.
