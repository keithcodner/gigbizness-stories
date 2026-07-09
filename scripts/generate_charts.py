import argparse
import json
import os
import sys


def load_spec(spec_path: str) -> dict:
    with open(spec_path, "r", encoding="utf8") as handle:
        return json.load(handle)


def build_svg(spec: dict) -> str:
    scenes = spec.get("scenes", [])
    max_seconds = max((scene.get("seconds", 1) for scene in scenes), default=1)
    width = 1400
    height = 900
    left = 250
    top = 180
    bar_height = 54
    gap = 26
    chart_width = 980

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#f6f1e8"/>',
        '<rect x="54" y="54" width="1292" height="792" rx="28" fill="#fffaf1" stroke="#182126" stroke-width="3"/>',
        f'<text x="92" y="120" font-family="Georgia, serif" font-size="40" fill="#182126">{spec.get("title", "Chart")}</text>',
        f'<text x="92" y="156" font-family="Arial, sans-serif" font-size="20" fill="#5c5d58">{spec.get("subtitle", "")}</text>',
    ]

    for index, scene in enumerate(scenes):
        y = top + (index * (bar_height + gap))
        seconds = float(scene.get("seconds", 0))
        label = scene.get("label", f"Scene {index + 1}")
        bar_width = max(24, int((seconds / max_seconds) * chart_width))
        fill = "#b34a36" if index % 2 == 0 else "#2f6c68"
        svg.append(f'<text x="92" y="{y + 35}" font-family="Arial, sans-serif" font-size="20" fill="#182126">{label}</text>')
        svg.append(f'<rect x="{left}" y="{y}" width="{chart_width}" height="{bar_height}" rx="14" fill="#ebe2d3"/>')
        svg.append(f'<rect x="{left}" y="{y}" width="{bar_width}" height="{bar_height}" rx="14" fill="{fill}"/>')
        svg.append(f'<text x="{left + bar_width + 18}" y="{y + 35}" font-family="Arial, sans-serif" font-size="18" fill="#182126">{int(seconds)}s</text>')

    svg.append("</svg>")
    return "\n".join(svg) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a starter scene-timing SVG chart.")
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    spec = load_spec(args.spec)
    output_path = os.path.join(args.output_dir, spec.get("output_filename", "chart.svg"))

    with open(output_path, "w", encoding="utf8") as handle:
        handle.write(build_svg(spec))

    print(f"Generated chart SVG at {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
