import argparse
import json
import math
import subprocess
import sys
from pathlib import Path


FONT_PATH = "C\\:/Windows/Fonts/arial.ttf"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".bmp", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}


def load_manifest(manifest_path: str) -> dict:
    with open(manifest_path, "r", encoding="utf8") as handle:
        return json.load(handle)


def profile_settings(profile_name: str) -> dict:
    presets = {
        "draft": {"resolution": "1280x720", "fps": 30, "bitrate": "4M"},
        "youtube_1080p": {"resolution": "1920x1080", "fps": 30, "bitrate": "14M"},
        "youtube_1440p": {"resolution": "2560x1440", "fps": 30, "bitrate": "24M"},
    }
    return presets.get(profile_name, presets["draft"])


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def escape_drawtext(value: str) -> str:
    return value.replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def write_text_file(file_path: Path, text: str) -> str:
    file_path.write_text(text, encoding="utf8")
    return escape_drawtext(file_path.as_posix())


def choose_colors(index: int) -> tuple[str, str]:
    palette = [
        ("#102229", "#e9d4a8"),
        ("#25303a", "#f6efe0"),
        ("#3a231f", "#f0dbc0"),
        ("#24352f", "#f7e8d1"),
    ]
    return palette[index % len(palette)]


def run(command: list[str], label: str) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{label} failed")


def build_overlay_filters(scene: dict, settings: dict, text_dir: Path) -> str:
    title_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_title.txt", scene.get("title", scene.get("id", "Scene")))
    body_text = scene.get("narration_excerpt", "")[:180]
    body_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_body.txt", body_text)
    lower_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_lower.txt", scene.get("retention_purpose", ""))
    _, text_color = choose_colors(0)
    width, height = settings["resolution"].split("x")

    filters = [
        f"scale={width}:{height}:force_original_aspect_ratio=increase",
        f"crop={width}:{height}",
        "setsar=1",
        f"drawbox=x=50:y=50:w={int(int(width) * 0.62)}:h=150:color=0x00000066:t=fill",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{title_file}':fontcolor={text_color}:fontsize=36:x=72:y=78",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{body_file}':fontcolor={text_color}:fontsize=22:x=72:y=126",
        f"drawbox=x=50:y=h-90:w={int(int(width) * 0.45)}:h=42:color=0x00000066:t=fill",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{lower_file}':fontcolor={text_color}:fontsize=20:x=72:y=h-62"
    ]
    return ",".join(filters)


def render_fallback_clip(scene: dict, clip_path: Path, settings: dict, index: int, text_dir: Path, duration: float) -> None:
    width, height = settings["resolution"].split("x")
    bg_color, _ = choose_colors(index)
    title_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_fallback_title.txt", scene.get("title", scene.get("id", "Scene")))
    body_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_fallback_body.txt", scene.get("narration_excerpt", ""))
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c={bg_color}:s={width}x{height}:d={duration}:r={settings['fps']}",
        "-vf",
        ",".join([
            f"drawtext=fontfile='{FONT_PATH}':textfile='{title_file}':fontcolor=white:fontsize=38:x=60:y=60",
            f"drawtext=fontfile='{FONT_PATH}':textfile='{body_file}':fontcolor=white:fontsize=22:x=60:y=150:box=1:boxcolor=0x00000055:boxborderw=16"
        ]),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(clip_path)
    ]
    run(command, f"fallback clip {scene.get('id', '')}")


def render_visual_subclip(scene: dict, visual: dict, clip_path: Path, settings: dict, workspace: Path, text_dir: Path, duration: float) -> None:
    asset_path = workspace / visual.get("file", "")
    if not asset_path.exists():
      render_fallback_clip(scene, clip_path, settings, 0, text_dir, duration)
      return

    suffix = asset_path.suffix.lower()
    filters = build_overlay_filters(scene, settings, text_dir)
    if suffix in IMAGE_EXTENSIONS:
        command = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(asset_path),
            "-t",
            str(duration),
            "-vf",
            filters,
            "-r",
            str(settings["fps"]),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(clip_path)
        ]
        run(command, f"image subclip {scene.get('id', '')}")
        return

    if suffix in VIDEO_EXTENSIONS:
        command = [
            "ffmpeg",
            "-y",
            "-stream_loop",
            "-1",
            "-i",
            str(asset_path),
            "-t",
            str(duration),
            "-vf",
            filters,
            "-r",
            str(settings["fps"]),
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(clip_path)
        ]
        run(command, f"video subclip {scene.get('id', '')}")
        return

    render_fallback_clip(scene, clip_path, settings, 0, text_dir, duration)


def concat_clips(concat_path: Path, output_path: Path, label: str) -> None:
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_path),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(output_path),
    ]
    run(command, label)


def render_scene_clip(scene: dict, clip_path: Path, settings: dict, index: int, workspace: Path, temp_dir: Path, text_dir: Path) -> None:
    duration = max(1, float(scene.get("duration_seconds", 1)))
    visuals = scene.get("visuals", [])
    if len(visuals) == 0:
        render_fallback_clip(scene, clip_path, settings, index, text_dir, duration)
        return

    scene_parts_dir = temp_dir / f"{scene.get('id', f'scene_{index + 1}')}_parts"
    ensure_dir(scene_parts_dir)
    per_visual_duration = max(1.0, duration / max(1, len(visuals)))
    concat_lines = []

    for visual_index, visual in enumerate(visuals, start=1):
        part_path = scene_parts_dir / f"part_{visual_index:02}.mp4"
        render_visual_subclip(scene, visual, part_path, settings, workspace, text_dir, per_visual_duration)
        concat_lines.append(f"file '{part_path.resolve().as_posix()}'")

    concat_path = scene_parts_dir / "parts.txt"
    concat_path.write_text("\n".join(concat_lines) + "\n", encoding="utf8")
    concat_clips(concat_path, clip_path, f"scene clip {scene.get('id', '')}")


def mux_audio(video_path: Path, audio_path: Path, output_path: Path, profile_name: str) -> None:
    settings = profile_settings(profile_name)
    preferred_codec = "h264_nvenc"
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-c:v",
        preferred_codec,
        "-preset",
        "p5",
        "-b:v",
        settings["bitrate"],
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(output_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
        return

    fallback = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(output_path),
    ]
    fallback_result = subprocess.run(fallback, capture_output=True, text=True)
    if fallback_result.returncode != 0:
        raise RuntimeError(fallback_result.stderr.strip() or "audio mux fallback failed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a visual-first scene video from the scene manifest.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--workspace", required=True)
    args = parser.parse_args()

    manifest = load_manifest(args.manifest)
    settings = profile_settings(args.profile)
    workspace = Path(args.workspace)
    output_path = Path(args.output)
    ensure_dir(output_path.parent)

    temp_dir = output_path.parent / "_tmp_render"
    ensure_dir(temp_dir)
    scene_dir = temp_dir / "scenes"
    ensure_dir(scene_dir)
    text_dir = temp_dir / "text"
    ensure_dir(text_dir)

    concat_lines = []
    for index, scene in enumerate(manifest.get("scenes", []), start=1):
        clip_path = scene_dir / f"{scene.get('id', f's{index:02}')}.mp4"
        render_scene_clip(scene, clip_path, settings, index - 1, workspace, temp_dir, text_dir)
        concat_lines.append(f"file '{clip_path.resolve().as_posix()}'")

    concat_path = temp_dir / "scene_concat.txt"
    concat_path.write_text("\n".join(concat_lines) + "\n", encoding="utf8")

    output_no_audio = temp_dir / "video_no_audio.mp4"
    concat_clips(concat_path, output_no_audio, "concat scene clips")

    audio_path = workspace / "03_voice" / "voiceover_clean.wav"
    mux_audio(output_no_audio, audio_path, output_path, args.profile)

    print(f"Rendered visual-first video at {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
