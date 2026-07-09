import argparse
import json
import re
import sys


def load_timing(timing_path: str) -> dict:
    with open(timing_path, "r", encoding="utf8") as handle:
        return json.load(handle)


def format_timestamp(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    hours = millis // 3_600_000
    millis %= 3_600_000
    minutes = millis // 60_000
    millis %= 60_000
    secs = millis // 1000
    millis %= 1000
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part.strip() for part in parts if part.strip()]


def build_cues(timing_data: dict) -> list[tuple[float, float, str]]:
    cues = []
    for scene in timing_data.get("scenes", []):
        text = scene.get("text", "").strip()
        if not text:
            continue
        sentences = split_sentences(text)
        if not sentences:
            continue
        scene_start = float(scene.get("start_seconds", 0))
        scene_end = float(scene.get("end_seconds", scene_start + 1))
        scene_duration = max(1.0, scene_end - scene_start)
        segment_duration = scene_duration / len(sentences)

        for index, sentence in enumerate(sentences):
            start = scene_start + (index * segment_duration)
            end = scene_start + ((index + 1) * segment_duration)
            cues.append((start, end, sentence))
    return cues


def write_srt(cues: list[tuple[float, float, str]], output_path: str) -> None:
    lines = []
    for index, (start, end, text) in enumerate(cues, start=1):
        lines.append(str(index))
        lines.append(f"{format_timestamp(start)} --> {format_timestamp(end)}")
        lines.append(text)
        lines.append("")
    with open(output_path, "w", encoding="utf8") as handle:
        handle.write("\n".join(lines).rstrip() + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate starter SRT captions from timing data.")
    parser.add_argument("--transcript", required=True)
    parser.add_argument("--timing", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    timing_data = load_timing(args.timing)
    cues = build_cues(timing_data)
    write_srt(cues, args.output)

    print(f"Generated SRT captions at {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
