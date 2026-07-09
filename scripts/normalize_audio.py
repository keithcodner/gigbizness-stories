import argparse
import json
import math
import os
import subprocess
import sys
import wave


def create_silent_wav(output_path: str, duration_seconds: float, sample_rate: int = 48000) -> None:
    frame_count = max(1, int(sample_rate * duration_seconds))
    silence = b"\x00\x00" * frame_count
    with wave.open(output_path, "wb") as wav_file:
      wav_file.setnchannels(1)
      wav_file.setsampwidth(2)
      wav_file.setframerate(sample_rate)
      wav_file.writeframes(silence)


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
    parser = argparse.ArgumentParser(description="Create and normalize a placeholder narration WAV.")
    parser.add_argument("--transcript", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--normalized-output", required=True)
    parser.add_argument("--timing", required=True)
    args = parser.parse_args()

    if not os.path.exists(args.transcript):
        raise FileNotFoundError(f"Transcript not found: {args.transcript}")

    duration_seconds = total_duration_from_timing(args.timing)
    padded_duration = duration_seconds + 1.0
    create_silent_wav(args.output, padded_duration)
    run_ffmpeg_normalize(args.output, args.normalized_output)

    print(f"Created placeholder WAV at {args.output}")
    print(f"Normalized placeholder WAV at {args.normalized_output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
