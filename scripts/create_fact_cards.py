import argparse
import json
import os
import sys


def load_spec(spec_path: str) -> dict:
    with open(spec_path, "r", encoding="utf8") as handle:
        return json.load(handle)


def wrap_text(text: str, line_length: int = 34) -> list[str]:
    words = text.split()
    lines = []
    current = []
    current_length = 0
    for word in words:
        projected = current_length + len(word) + (1 if current else 0)
        if projected > line_length:
            lines.append(" ".join(current))
            current = [word]
            current_length = len(word)
        else:
            current.append(word)
            current_length = projected
    if current:
        lines.append(" ".join(current))
    return lines


def build_card_svg(card: dict) -> str:
    width = 1400
    height = 900
    body_lines = wrap_text(card.get("body", ""))
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#132328"/>',
        '<rect x="84" y="84" width="1232" height="732" rx="32" fill="#1e3b42" stroke="#e9d4a8" stroke-width="4"/>',
        f'<text x="126" y="170" font-family="Georgia, serif" font-size="48" fill="#f7efe0">{card.get("title", "Fact Card")}</text>',
        f'<text x="126" y="214" font-family="Arial, sans-serif" font-size="22" fill="#e9d4a8">{card.get("subtitle", "")}</text>',
        '<line x1="126" y1="246" x2="1274" y2="246" stroke="#e9d4a8" stroke-width="3"/>'
    ]

    y = 330
    for line in body_lines[:8]:
        svg.append(f'<text x="126" y="{y}" font-family="Arial, sans-serif" font-size="34" fill="#f7efe0">{line}</text>')
        y += 58

    svg.append(f'<text x="126" y="760" font-family="Arial, sans-serif" font-size="20" fill="#d6d6cf">{card.get("scene_id", "")}</text>')
    svg.append("</svg>")
    return "\n".join(svg) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate SVG fact cards from a JSON spec.")
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    spec = load_spec(args.spec)
    cards = spec.get("cards", [])

    for card in cards:
        output_path = os.path.join(args.output_dir, card.get("output_filename", "fact_card.svg"))
        with open(output_path, "w", encoding="utf8") as handle:
            handle.write(build_card_svg(card))
        print(f"Generated fact card SVG at {output_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
