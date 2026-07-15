import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
import wave


def create_silent_wav(output_path: str, duration_seconds: float, sample_rate: int = 48000) -> None:
    frame_count = max(1, int(sample_rate * duration_seconds))
    silence = b"\x00\x00" * frame_count
    with wave.open(output_path, "wb") as wav_file:
      wav_file.setnchannels(1)
      wav_file.setsampwidth(2)
      wav_file.setframerate(sample_rate)
      wav_file.writeframes(silence)


def synthesize_windows_tts(transcript_path: str, output_path: str) -> bool:
    with open(transcript_path, "r", encoding="utf8") as handle:
        transcript = handle.read().strip()

    if not transcript:
        return False

    script = """Add-Type -AssemblyName System.Speech
$transcript = Get-Content -LiteralPath $args[0] -Raw
if ([string]::IsNullOrWhiteSpace($transcript)) { exit 2 }
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$synth.Volume = 100
$synth.SetOutputToWaveFile($args[1])
$synth.Speak($transcript)
$synth.Dispose()
"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".ps1", mode="w", encoding="utf8") as handle:
        handle.write(script)
        script_path = handle.name

    try:
        result = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script_path,
                transcript_path,
                output_path,
            ],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    finally:
        if os.path.exists(script_path):
            os.unlink(script_path)


def total_duration_from_timing(timing_path: str) -> float:
    with open(timing_path, "r", encoding="utf8") as handle:
        data = json.load(handle)
    total_seconds = float(data.get("total_seconds", 0))
    return max(1.0, total_seconds)


def run_ffmpeg_normalize(input_path: str, output_path: str) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-af",
        "loudnorm=I=-14:LRA=7:TP=-1.5",
        output_path,
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "ffmpeg normalization failed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Create and normalize draft narration WAV audio.")
    parser.add_argument("--transcript", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--normalized-output", required=True)
    parser.add_argument("--timing", required=True)
    args = parser.parse_args()

    if not os.path.exists(args.transcript):
        raise FileNotFoundError(f"Transcript not found: {args.transcript}")

    duration_seconds = total_duration_from_timing(args.timing)
    padded_duration = duration_seconds + 1.0
    synthesized = synthesize_windows_tts(args.transcript, args.output)
    if not synthesized:
        create_silent_wav(args.output, padded_duration)
    run_ffmpeg_normalize(args.output, args.normalized_output)

    if synthesized:
        print(f"Created draft TTS WAV at {args.output}")
        print(f"Normalized draft TTS WAV at {args.normalized_output}")
    else:
        print(f"Created placeholder WAV at {args.output}")
        print(f"Normalized placeholder WAV at {args.normalized_output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
