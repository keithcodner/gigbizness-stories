$comfyRoot = "C:\AI\ComfyUI-GTX1080"
$venvPython = Join-Path $comfyRoot ".venv\Scripts\python.exe"
$mainPy = Join-Path $comfyRoot "main.py"

if (-not (Test-Path $comfyRoot)) {
  Write-Error "ComfyUI root not found: $comfyRoot"
  exit 1
}

if (-not (Test-Path $venvPython)) {
  Write-Error "ComfyUI virtualenv python not found: $venvPython"
  exit 1
}

if (-not (Test-Path $mainPy)) {
  Write-Error "ComfyUI main.py not found: $mainPy"
  exit 1
}

Write-Host "Starting ComfyUI from $comfyRoot on http://127.0.0.1:8188"
Set-Location $comfyRoot
& $venvPython $mainPy --listen 127.0.0.1 --port 8188
