# Project Full Setup: GitHub To Comfy Render

This document covers the full setup path for the Gigbizness Stories project from a fresh GitHub checkout to a working ComfyUI-backed bricktoon video render path.

## Goal

Set up a machine so you can:

- clone the repo
- install Node dependencies
- prepare the test-story fixture
- run a manual ComfyUI server
- point the repo at that server
- generate bricktoon character refs and keyframes
- continue through motion stages
- export a rendered sample video

## Part 1: Clone The Repo

Open PowerShell:

```powershell
cd C:\xampp\htdocs\apps
git clone <YOUR_GITHUB_REPO_URL> gigbizness-stories
cd C:\xampp\htdocs\apps\gigbizness-stories
```

## Part 2: Install Repo Dependencies

From:

```text
C:\xampp\htdocs\apps\gigbizness-stories
```

Run:

```powershell
npm install
```

Optional quick verification:

```powershell
npm run test:bricktoon
npm run audit:orchestrator
```

## Part 3: Prepare The Test Fixture

Use the standard regression topic:

```powershell
npm run test-story:init
```

If needed, rebuild it from scratch:

```powershell
npm run test-story:restart
```

## Part 4: Set Up Manual ComfyUI

Use the separate manual install described in:

- [COMFYUI_PORTABLE_SETUP.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_PORTABLE_SETUP.md)

Working target for this project:

- install root:
  - `C:\AI\ComfyUI-GTX1080`
- API:
  - `http://127.0.0.1:8188`
- checkpoint:
  - `realisticVisionV60B1_v51HyperVAE-small.safetensors`

## Part 5: Start ComfyUI

### Terminal 1

```powershell
cd C:\AI\ComfyUI-GTX1080
.\.venv\Scripts\activate
python main.py --listen 127.0.0.1 --port 8188
```

Leave this running.

### Terminal 2

Test the API:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8188/system_stats
```

If that fails, stop here and fix ComfyUI before touching the repo config.

## Part 6: Configure The Repo `.env`

Edit:

```text
C:\xampp\htdocs\apps\gigbizness-stories\.env
```

Use:

```env
BRICKTOON_IMAGE_PROVIDER=comfyui
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=realisticVisionV60B1_v51HyperVAE-small.safetensors
```

If using OpenAI as backup, you may also keep:

```env
OPENAI_API_KEY=...
```

## Part 7: Run The First Comfy-Backed Generation

From:

```text
C:\xampp\htdocs\apps\gigbizness-stories
```

Prefer direct commands:

```powershell
node agents/orchestrator.js --topic test_story_template --stage bricktoon-characters
node agents/orchestrator.js --topic test_story_template --stage asset-generation
```

Why direct commands:

- they avoid the previously observed npm argument-formatting oddity on this machine

## Part 8: Where Output Should Appear

Character refs:

```text
workspaces\test_story_template\07_visuals\character_refs
```

Approved shot keyframes:

```text
workspaces\test_story_template\07_visuals\approved_keyframes
```

Workflow requests:

```text
workspaces\test_story_template\07_visuals\workflow_requests
```

Provider reports:

```text
workspaces\test_story_template\07_visuals\generation_reports
```

## Part 9: Continue Into Motion And Render

Once character refs and shot keyframes are working, continue with:

```powershell
node agents/orchestrator.js --topic test_story_template --stage layer-extraction
node agents/orchestrator.js --topic test_story_template --stage character-rigging
node agents/orchestrator.js --topic test_story_template --stage ai-video-motion-passes
node agents/orchestrator.js --topic test_story_template --stage shot-compositing
node agents/orchestrator.js --topic test_story_template --stage scene-assembly
node agents/orchestrator.js --topic test_story_template --stage render-contract
```

Optional render path after the sequence assets exist:

```powershell
npm run test-story:render
```

That command is the fastest end-to-end regression check because it restores the static test fixture and exports a fresh draft render without requiring a full upstream rebuild.

## Part 10: Export A Full Draft Video

For the fastest sample render:

```powershell
npm run test-story:render
```

For a staged production-style run after the visual pipeline is ready:

```powershell
node agents/orchestrator.js --topic test_story_template --stage render-plan
node agents/orchestrator.js --topic test_story_template --stage render
```

Expected draft output examples:

```text
workspaces\test_story_template\06_renders\draft_01.mp4
workspaces\test_story_template\06_renders\final_1080p.mp4
```

## Part 11: Success Checks

You are in good shape if:

- `Invoke-WebRequest ... /system_stats` returns `200 OK`
- no `provider-fallback` lines appear during bricktoon generation
- ComfyUI accepts prompts without checkpoint validation errors
- PNGs appear under `character_refs` and `approved_keyframes`
- scene-sequence and composited outputs appear later in `08_animation`
- at least one MP4 render is produced in `06_renders`

## Part 12: Troubleshooting

### Repo still falls back to `mock`

Check:

- ComfyUI server is running
- `.env` points at the correct port
- `.env` uses the correct checkpoint name

### Checkpoint validation error

If you see:

```text
ckpt_name ... not in []
```

ComfyUI cannot see any checkpoints in the manual install.

Fix:

- copy the model into:
  - `C:\AI\ComfyUI-GTX1080\models\checkpoints`
- restart ComfyUI

### CUDA runtime error on GTX 1080

If you see:

```text
CUDA error: no kernel image is available for execution on the device
```

Use the manual Python 3.10 + `cu118` setup described in the ComfyUI portable doc.

## Related Docs

- [BRICKTOON_PIPELINE_GUIDE.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/BRICKTOON_PIPELINE_GUIDE.md)
- [BRICKTOON_COMFYUI_IMPLEMENTATION.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/BRICKTOON_COMFYUI_IMPLEMENTATION.md)
- [COMFYUI_GTX1080_QUICK_START.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_GTX1080_QUICK_START.md)
- [COMFYUI_PORTABLE_SETUP.md](C:/xampp/htdocs/apps/gigbizness-stories/docs/technical_docs/COMFYUI_PORTABLE_SETUP.md)
