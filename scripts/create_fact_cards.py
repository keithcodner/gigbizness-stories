import argparse
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont


WIDTH = 1400
HEIGHT = 900
BACKGROUND = "#132328"
CARD = "#1e3b42"
ACCENT = "#e9d4a8"
TEXT = "#f7efe0"
MUTED = "#d6d6cf"


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


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def build_card_png(card: dict, output_path: str) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    title_font = load_font(48, bold=True)
    subtitle_font = load_font(24)
    body_font = load_font(34)
    footer_font = load_font(20)

    draw.rounded_rectangle((84, 84, 1316, 816), radius=32, fill=CARD, outline=ACCENT, width=4)
    draw.text((126, 132), card.get("title", "Fact Card"), fill=TEXT, font=title_font)
    draw.text((126, 192), card.get("subtitle", ""), fill=ACCENT, font=subtitle_font)
    draw.line((126, 246, 1274, 246), fill=ACCENT, width=3)

    body_lines = wrap_text(draw, card.get("body", ""), body_font, 1120)
    y = 310
    for line in body_lines[:8]:
      draw.text((126, y), line, fill=TEXT, font=body_font)
      y += 56

    draw.text((126, 760), card.get("scene_id", ""), fill=MUTED, font=footer_font)
    image.save(output_path, format="PNG")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate PNG fact cards from a JSON spec.")
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    spec = load_spec(args.spec)
    cards = spec.get("cards", [])

    for card in cards:
        output_path = os.path.join(args.output_dir, card.get("output_filename", "fact_card.png"))
        build_card_png(card, output_path)
        print(f"Generated fact card PNG at {output_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
