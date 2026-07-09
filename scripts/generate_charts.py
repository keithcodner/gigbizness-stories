import argparse
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont


WIDTH = 1400
HEIGHT = 900


def load_spec(spec_path: str) -> dict:
    with open(spec_path, "r", encoding="utf8") as handle:
        return json.load(handle)


def load_font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def build_png(spec: dict, output_path: str) -> None:
    scenes = spec.get("scenes", [])
    max_seconds = max((scene.get("seconds", 1) for scene in scenes), default=1)
    image = Image.new("RGB", (WIDTH, HEIGHT), "#f6f1e8")
    draw = ImageDraw.Draw(image)
    title_font = load_font(40, bold=True)
    subtitle_font = load_font(20)
    label_font = load_font(20)
    seconds_font = load_font(18)

    left = 250
    top = 180
    bar_height = 54
    gap = 26
    chart_width = 980

    draw.rounded_rectangle((54, 54, 1346, 846), radius=28, fill="#fffaf1", outline="#182126", width=3)
    draw.text((92, 92), spec.get("title", "Chart"), fill="#182126", font=title_font)
    draw.text((92, 138), spec.get("subtitle", ""), fill="#5c5d58", font=subtitle_font)

    for index, scene in enumerate(scenes):
        y = top + (index * (bar_height + gap))
        seconds = float(scene.get("seconds", 0))
        label = scene.get("label", f"Scene {index + 1}")
        bar_width = max(24, int((seconds / max_seconds) * chart_width))
        fill = "#b34a36" if index % 2 == 0 else "#2f6c68"
        draw.text((92, y + 14), label, fill="#182126", font=label_font)
        draw.rounded_rectangle((left, y, left + chart_width, y + bar_height), radius=14, fill="#ebe2d3")
        draw.rounded_rectangle((left, y, left + bar_width, y + bar_height), radius=14, fill=fill)
        draw.text((left + bar_width + 18, y + 16), f"{int(seconds)}s", fill="#182126", font=seconds_font)

    image.save(output_path, format="PNG")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a starter scene-timing PNG chart.")
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    spec = load_spec(args.spec)
    output_path = os.path.join(args.output_dir, spec.get("output_filename", "chart.png"))
    build_png(spec, output_path)

    print(f"Generated chart PNG at {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
