# ComfyUI Portable Setup

This document explains how to reproduce the working manual ComfyUI setup on another Windows machine, especially for older NVIDIA cards such as the GTX 1080.

## Goal

Create a stable local ComfyUI instance that:

- runs outside the desktop bundle
- exposes the HTTP API for the Gigbizness Stories repo
- can see the required checkpoints
- is easy to move to another machine

## Recommended Environment

- OS: Windows
- Python: `3.10` 64-bit
- GPU target: NVIDIA GTX 1080 8GB or similar Pascal-era GPU
- Torch build: `cu118`
- ComfyUI install root:
  - `C:\AI\ComfyUI-GTX1080`
- API host:
  - `127.0.0.1`
- API port:
  - `8188`

## Why This Setup Exists

The desktop ComfyUI bundle can work for browsing and quick tests, but on this project we hit three repeat issues:

- desktop/backend port mismatch
- bundled runtime compatibility issues on the GTX 1080
- checkpoints living in a different data directory than the runtime the repo was actually calling

The manual source install avoids those problems and gives the repo one predictable API target.

## One-Time Installation

### 1. Install prerequisites

Open a normal PowerShell window.

Install Git if needed:

```powershell
git --version
```

Install Python 3.10 if needed:

```powershell
py -0
winget install Python.Python.3.10
```

Verify:

```powershell
py -3.10 --version
```

### 2. Clone ComfyUI into the manual install folder

```powershell
mkdir C:\AI\ComfyUI-GTX1080
cd C:\AI\ComfyUI-GTX1080
git clone https://github.com/comfyanonymous/ComfyUI.git .
```

Expected files after clone:

- `main.py`
- `requirements.txt`
- `nodes.py`
- `comfy\`

### 3. Create and activate the virtual environment

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
```

The prompt should look like:

```powershell
(.venv) PS C:\AI\ComfyUI-GTX1080>
```

### 4. Install Torch and ComfyUI requirements

Use the Pascal-friendlier Torch build first:

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

### 5. Add checkpoints

Create or confirm this folder:

```text
C:\AI\ComfyUI-GTX1080\models\checkpoints
```

Copy the project test checkpoint into it:

```powershell
Copy-Item "C:\Users\admin\Documents\ComfyUI\models\checkpoints\realisticVisionV60B1_v51HyperVAE-small.safetensors" "C:\AI\ComfyUI-GTX1080\models\checkpoints\"
```

Important:

- the manual install must have its own visible checkpoint file
- if the file is only in another ComfyUI folder, `CheckpointLoaderSimple` may show an empty list

### 6. Start the ComfyUI server

In the same activated terminal:

```powershell
python main.py --listen 127.0.0.1 --port 8188
```

Expected success line:

```text
[INFO] To see the GUI go to: http://127.0.0.1:8188
```

### 7. Verify the API from a second terminal

Open a second PowerShell window:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8188/system_stats
```

Expected result:

- `StatusCode : 200`
- JSON content from ComfyUI

## Moving To Another Computer

Repeat the same structure:

1. Install Python 3.10 64-bit
2. Create `C:\AI\ComfyUI-GTX1080`
3. Clone ComfyUI there
4. Create `.venv`
5. Install `cu118` Torch
6. Install `requirements.txt`
7. Copy checkpoints into `models\checkpoints`
8. Start `main.py --listen 127.0.0.1 --port 8188`
9. Verify `/system_stats`

Recommended to keep the same path if possible:

```text
C:\AI\ComfyUI-GTX1080
```

That makes reuse and documentation simpler.

## Common Errors

### `Unable to connect to the remote server`

Cause:

- ComfyUI is not running
- wrong port
- wrong host

Fix:

```powershell
cd C:\AI\ComfyUI-GTX1080
.\.venv\Scripts\activate
python main.py --listen 127.0.0.1 --port 8188
```

### `ckpt_name ... not in []`

Cause:

- ComfyUI sees zero checkpoints

Fix:

- copy the checkpoint into:
  - `C:\AI\ComfyUI-GTX1080\models\checkpoints`
- restart ComfyUI

### `ckpt_name ... not in [...]`

Cause:

- checkpoint filename in config does not exactly match the filename ComfyUI sees

Fix:

- use the exact filename shown by `CheckpointLoaderSimple`

### `CUDA error: no kernel image is available for execution on the device`

Cause:

- runtime incompatibility between the GPU and the installed CUDA/Torch stack

Known working direction for this project:

- Python `3.10`
- Torch `cu118`
- manual ComfyUI source install

## Project Checkpoint Notes

Current project test checkpoint:

```text
realisticVisionV60B1_v51HyperVAE-small.safetensors
```

Not for current repo image workflow:

```text
ltx-video-2b-v0.9-mixed.safetensors
```

Reason:

- the repo's current ComfyUI integration is using image-generation workflows through `CheckpointLoaderSimple`
- `ltx-video-2b-v0.9-mixed.safetensors` is not the right fit for that path
