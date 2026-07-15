# ComfyUI GTX 1080 Quick Start

This is the shortest repeatable setup and launch path for the working local ComfyUI integration used by the bricktoon pipeline on the GTX 1080 machine.

## What This Uses

- Manual ComfyUI source install:
  - `C:\AI\ComfyUI-GTX1080`
- Repo:
  - `C:\xampp\htdocs\apps\gigbizness-stories`
- GPU:
  - NVIDIA GeForce GTX 1080 8GB
- Python:
  - `3.10` 64-bit
- Torch:
  - `cu118`

## One-Time Setup

### 1. Install Python 3.10

In a normal PowerShell window:

```powershell
winget install Python.Python.3.10
```

Verify:

```powershell
py -0
py -3.10 --version
```

### 2. Create the manual ComfyUI install

In PowerShell:

```powershell
mkdir C:\AI\ComfyUI-GTX1080
cd C:\AI\ComfyUI-GTX1080
git clone https://github.com/comfyanonymous/ComfyUI.git .
py -3.10 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

### 3. Put the checkpoint in the manual install

The working checkpoint for current repo testing is:

```text
realisticVisionV60B1_v51HyperVAE-small.safetensors
```

It must exist here:

```text
C:\AI\ComfyUI-GTX1080\models\checkpoints\realisticVisionV60B1_v51HyperVAE-small.safetensors
```

Copy it from the older ComfyUI data folder if needed:

```powershell
Copy-Item "C:\Users\admin\Documents\ComfyUI\models\checkpoints\realisticVisionV60B1_v51HyperVAE-small.safetensors" "C:\AI\ComfyUI-GTX1080\models\checkpoints\"
```

## Daily Startup

### Terminal 1: Start ComfyUI

Open PowerShell and run:

```powershell
cd C:\AI\ComfyUI-GTX1080
.\.venv\Scripts\activate
python main.py --listen 127.0.0.1 --port 8188
```

Leave this terminal open.

Expected success line:

```text
[INFO] To see the GUI go to: http://127.0.0.1:8188
```

### Terminal 2: Verify the API

Open a second PowerShell window and run:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8188/system_stats
```

If working, it should return JSON with status `200 OK`.

## Repo `.env`

In:

```text
C:\xampp\htdocs\apps\gigbizness-stories\.env
```

Use:

```env
BRICKTOON_IMAGE_PROVIDER=comfyui
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=realisticVisionV60B1_v51HyperVAE-small.safetensors
```

## Repo Test Commands

Run these from:

```text
C:\xampp\htdocs\apps\gigbizness-stories
```

Prefer direct `node` commands:

```powershell
node agents/orchestrator.js --topic test_story_template --stage bricktoon-characters
node agents/orchestrator.js --topic test_story_template --stage asset-generation
```

If everything is working:

- no `provider-fallback` lines should appear
- real generated PNGs should appear in:
  - `workspaces\test_story_template\07_visuals\character_refs`
  - `workspaces\test_story_template\07_visuals\approved_keyframes`

## Fast Troubleshooting

### Error: `Unable to connect to the remote server`

ComfyUI is not running, or not running on `127.0.0.1:8188`.

Restart it with:

```powershell
cd C:\AI\ComfyUI-GTX1080
.\.venv\Scripts\activate
python main.py --listen 127.0.0.1 --port 8188
```

### Error: `ckpt_name ... not in []`

ComfyUI cannot see any checkpoint files.

Fix:

- make sure the model exists in:
  - `C:\AI\ComfyUI-GTX1080\models\checkpoints`
- restart ComfyUI

### Error: `ckpt_name ... not in [...]`

The checkpoint name in `.env` does not exactly match the filename ComfyUI sees.

Fix `.env`:

```env
COMFYUI_CHECKPOINT=realisticVisionV60B1_v51HyperVAE-small.safetensors
```

### Error: `CUDA error: no kernel image is available for execution on the device`

This usually means the installed runtime is not compatible with the GTX 1080 GPU.

Known working direction:

- manual ComfyUI source install
- Python 3.10 64-bit
- Torch `cu118`

## Notes

- The desktop ComfyUI app previously used port `8000`; this quick-start uses the manual install on port `8188`.
- The repo-side ComfyUI workflow contracts now prefer the configured checkpoint from `.env`.
- `ltx-video-2b-v0.9-mixed.safetensors` is not the right checkpoint for the current repo image-generation workflow.
