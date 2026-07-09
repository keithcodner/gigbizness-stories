import argparse
import json
import subprocess
import sys
from pathlib import Path


FONT_PATH = "C\\:/Windows/Fonts/arial.ttf"


def escape_text(value: str) -> str:
    return value.replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def write_text(path: Path, value: str) -> str:
    path.write_text(value, encoding="utf8")
    return escape_text(path.as_posix())


def run(command: list[str], label: str) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{label} failed")


def render_short(short_item: dict, output_path: Path, temp_dir: Path) -> None:
    bg = "#1a242b"
    text = "#f4e6cf"
    title_file = write_text(temp_dir / f"{short_item['id']}_hook.txt", short_item["hook_text"])
    setup_file = write_text(temp_dir / f"{short_item['id']}_setup.txt", short_item["setup"])
    core_file = write_text(temp_dir / f"{short_item['id']}_core.txt", short_item["narration_excerpt"])
    end_file = write_text(temp_dir / f"{short_item['id']}_takeaway.txt", short_item["takeaway"])

    vf = ",".join([
        f"drawtext=fontfile='{FONT_PATH}':textfile='{title_file}':fontcolor={text}:fontsize=54:x=60:y=80",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{setup_file}':fontcolor={text}:fontsize=30:x=60:y=240:box=1:boxcolor=0x00000055:boxborderw=12",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{core_file}':fontcolor={text}:fontsize=28:x=60:y=420:box=1:boxcolor=0x00000055:boxborderw=14",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{end_file}':fontcolor={text}:fontsize=30:x=60:y=1580:box=1:boxcolor=0x00000055:boxborderw=12",
    ])

    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c={bg}:s=1080x1920:d={short_item['duration_seconds']}:r=30",
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=r=48000:cl=mono:d={short_item['duration_seconds']}",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        str(output_path),
    ]
    run(command, short_item["id"])


def main() -> int:
    parser = argparse.ArgumentParser(description="Create simple vertical short drafts.")
    parser.add_argument("--plan", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    with open(args.plan, "r", encoding="utf8") as handle:
        plan = json.load(handle)

    output_dir = Path(args.output_dir)
    temp_dir = output_dir / "_tmp_shorts"
    temp_dir.mkdir(parents=True, exist_ok=True)

    for index, short_item in enumerate(plan.get("shorts", []), start=1):
        output_path = output_dir / f"short_{index:02}.mp4"
        render_short(short_item, output_path, temp_dir)
        print(f"Rendered short at {output_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
