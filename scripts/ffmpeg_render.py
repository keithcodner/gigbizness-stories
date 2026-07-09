import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


FONT_PATH = "C\\:/Windows/Fonts/arial.ttf"


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


def render_scene_clip(scene: dict, clip_path: Path, settings: dict, index: int, text_dir: Path) -> None:
    width, height = settings["resolution"].split("x")
    duration = max(1, float(scene.get("duration_seconds", 1)))
    bg_color, text_color = choose_colors(index)
    title_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_title.txt", scene.get("title", scene.get("id", "Scene")))
    scene_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_scene.txt", f"Scene {scene.get('id', '')}")
    body_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_body.txt", scene.get("narration_excerpt", ""))
    motion_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_motion.txt", f"Motion: {scene.get('motion_style', 'steady_documentary')}")
    retention_file = write_text_file(text_dir / f"{scene.get('id', 'scene')}_retention.txt", f"Retention: {scene.get('retention_purpose', '')}")

    draw_filters = [
        f"drawtext=fontfile='{FONT_PATH}':textfile='{title_file}':fontcolor={text_color}:fontsize=42:x=70:y=70",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{scene_file}':fontcolor={text_color}:fontsize=22:x=70:y=130",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{body_file}':fontcolor={text_color}:fontsize=28:x=70:y=220:box=1:boxcolor=0x00000055:boxborderw=18",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{motion_file}':fontcolor={text_color}:fontsize=20:x=70:y=h-120",
        f"drawtext=fontfile='{FONT_PATH}':textfile='{retention_file}':fontcolor={text_color}:fontsize=20:x=70:y=h-82",
    ]

    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c={bg_color}:s={width}x{height}:d={duration}:r={settings['fps']}",
        "-vf",
        ",".join(draw_filters),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(clip_path),
    ]
    run(command, f"scene clip {scene.get('id', '')}")


def run(command: list[str], label: str) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{label} failed")


def concat_scene_clips(concat_path: Path, output_no_audio: Path) -> None:
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
        str(output_no_audio),
    ]
    run(command, "concat scene clips")


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
    parser = argparse.ArgumentParser(description="Render a simple scene-card draft video from the scene manifest.")
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
      render_scene_clip(scene, clip_path, settings, index - 1, text_dir)
      concat_lines.append(f"file '{clip_path.as_posix()}'")

    concat_path = temp_dir / "scene_concat.txt"
    concat_path.write_text("\n".join(concat_lines) + "\n", encoding="utf8")

    output_no_audio = temp_dir / "video_no_audio.mp4"
    concat_scene_clips(concat_path, output_no_audio)

    audio_path = workspace / "03_voice" / "voiceover_clean.wav"
    mux_audio(output_no_audio, audio_path, output_path, args.profile)

    print(f"Rendered draft video at {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
