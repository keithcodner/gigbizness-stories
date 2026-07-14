import argparse
import colorsys
import hashlib
import json
import math
import os
import struct


def color_from_text(text):
    digest = hashlib.sha256(text.encode("utf8")).hexdigest()
    hue = int(digest[:2], 16) / 255.0
    sat = 0.45 + (int(digest[2:4], 16) / 255.0) * 0.35
    val = 0.6 + (int(digest[4:6], 16) / 255.0) * 0.25
    r, g, b = colorsys.hsv_to_rgb(hue, sat, val)
    return int(r * 255), int(g * 255), int(b * 255)


def clamp(value, low, high):
    return max(low, min(high, value))


def create_canvas(width, height, color):
    row = [list(color) for _ in range(width)]
    return [list(map(list, row)) for _ in range(height)]


def fill_rect(canvas, x, y, width, height, color):
    max_y = len(canvas)
    max_x = len(canvas[0])
    for row_index in range(clamp(y, 0, max_y), clamp(y + height, 0, max_y)):
      for col_index in range(clamp(x, 0, max_x), clamp(x + width, 0, max_x)):
        canvas[row_index][col_index] = list(color)


def fill_circle(canvas, cx, cy, radius, color):
    max_y = len(canvas)
    max_x = len(canvas[0])
    for y in range(clamp(cy - radius, 0, max_y), clamp(cy + radius + 1, 0, max_y)):
      for x in range(clamp(cx - radius, 0, max_x), clamp(cx + radius + 1, 0, max_x)):
        if ((x - cx) ** 2) + ((y - cy) ** 2) <= radius ** 2:
          canvas[y][x] = list(color)


def draw_block_figure(canvas, center_x, ground_y, scale, main_color, accent_color):
    torso_w = int(50 * scale)
    torso_h = int(70 * scale)
    head_r = int(20 * scale)
    leg_w = int(16 * scale)
    leg_h = int(36 * scale)
    arm_w = int(14 * scale)
    arm_h = int(42 * scale)

    torso_x = center_x - torso_w // 2
    torso_y = ground_y - leg_h - torso_h
    head_cy = torso_y - head_r - 8
    head_cx = center_x

    fill_rect(canvas, torso_x, torso_y, torso_w, torso_h, main_color)
    fill_circle(canvas, head_cx, head_cy, head_r, (240, 220, 190))
    fill_rect(canvas, torso_x - arm_w, torso_y + 8, arm_w, arm_h, accent_color)
    fill_rect(canvas, torso_x + torso_w, torso_y + 8, arm_w, arm_h, accent_color)
    fill_rect(canvas, torso_x + 6, ground_y - leg_h, leg_w, leg_h, accent_color)
    fill_rect(canvas, torso_x + torso_w - leg_w - 6, ground_y - leg_h, leg_w, leg_h, accent_color)
    fill_circle(canvas, head_cx - int(6 * scale), head_cy - int(3 * scale), max(1, int(2 * scale)), (25, 25, 25))
    fill_circle(canvas, head_cx + int(6 * scale), head_cy - int(3 * scale), max(1, int(2 * scale)), (25, 25, 25))
    fill_rect(canvas, head_cx - int(8 * scale), head_cy + int(7 * scale), int(16 * scale), max(1, int(2 * scale)), (120, 60, 60))


def draw_scene_background(canvas, spec):
    width = len(canvas[0])
    height = len(canvas)
    background = color_from_text(spec.get("environment", "scene"))
    darker = tuple(max(0, channel - 40) for channel in background)
    fill_rect(canvas, 0, 0, width, height, background)
    fill_rect(canvas, 0, int(height * 0.68), width, int(height * 0.32), darker)
    fill_rect(canvas, int(width * 0.05), int(height * 0.08), int(width * 0.9), int(height * 0.12), (245, 240, 230))


def draw_scene(canvas, spec):
    draw_scene_background(canvas, spec)
    width = len(canvas[0])
    height = len(canvas)
    characters = spec.get("character_ids", [])
    if not characters:
      characters = ["narrator_001"]

    spacing = width // (len(characters) + 1)
    for index, character_id in enumerate(characters, start=1):
      main = color_from_text(character_id)
      accent = tuple(max(0, channel - 55) for channel in main)
      draw_block_figure(canvas, spacing * index, int(height * 0.82), 1.4, main, accent)

    if "truck" in spec.get("environment", "").lower() or "van" in spec.get("environment", "").lower():
      fill_rect(canvas, int(width * 0.58), int(height * 0.54), int(width * 0.24), int(height * 0.16), (235, 235, 235))
      fill_rect(canvas, int(width * 0.77), int(height * 0.59), int(width * 0.07), int(height * 0.11), (215, 215, 215))
      fill_circle(canvas, int(width * 0.63), int(height * 0.72), int(height * 0.028), (45, 45, 45))
      fill_circle(canvas, int(width * 0.79), int(height * 0.72), int(height * 0.028), (45, 45, 45))


def draw_character_reference(canvas, spec):
    width = len(canvas[0])
    height = len(canvas)
    background = color_from_text(spec.get("role", spec.get("name", "character")))
    lighter = tuple(clamp(channel + 45, 0, 255) for channel in background)
    fill_rect(canvas, 0, 0, width, height, lighter)
    fill_rect(canvas, 0, int(height * 0.72), width, int(height * 0.28), background)

    main = color_from_text(spec.get("character_id", spec.get("name", "character")))
    accent = tuple(max(0, channel - 50) for channel in main)
    draw_block_figure(canvas, width // 2, int(height * 0.82), 2.2, main, accent)

    fill_rect(canvas, int(width * 0.1), int(height * 0.08), int(width * 0.8), int(height * 0.07), (245, 240, 230))
    fill_rect(canvas, int(width * 0.12), int(height * 0.17), int(width * 0.76), int(height * 0.045), (225, 220, 210))


def write_bmp(canvas, output_path):
    height = len(canvas)
    width = len(canvas[0])
    row_padding = (4 - ((width * 3) % 4)) % 4
    pixel_rows = []
    for row in reversed(canvas):
      raw = bytearray()
      for r, g, b in row:
        raw.extend([b, g, r])
      raw.extend(b"\x00" * row_padding)
      pixel_rows.append(bytes(raw))

    pixel_data = b"".join(pixel_rows)
    file_size = 14 + 40 + len(pixel_data)
    with open(output_path, "wb") as handle:
      handle.write(b"BM")
      handle.write(struct.pack("<I", file_size))
      handle.write(b"\x00\x00\x00\x00")
      handle.write(struct.pack("<I", 54))
      handle.write(struct.pack("<I", 40))
      handle.write(struct.pack("<i", width))
      handle.write(struct.pack("<i", height))
      handle.write(struct.pack("<H", 1))
      handle.write(struct.pack("<H", 24))
      handle.write(struct.pack("<I", 0))
      handle.write(struct.pack("<I", len(pixel_data)))
      handle.write(struct.pack("<I", 2835))
      handle.write(struct.pack("<I", 2835))
      handle.write(struct.pack("<I", 0))
      handle.write(struct.pack("<I", 0))
      handle.write(pixel_data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    with open(args.spec, "r", encoding="utf8") as handle:
      spec = json.load(handle)

    width = int(spec.get("width", 768))
    height = int(spec.get("height", 1344))
    canvas = create_canvas(width, height, (240, 238, 230))

    kind = spec.get("kind", "scene")
    if kind == "character":
      draw_character_reference(canvas, spec)
    else:
      draw_scene(canvas, spec)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    write_bmp(canvas, args.output)


if __name__ == "__main__":
    main()
