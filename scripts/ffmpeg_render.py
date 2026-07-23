import argparse
import csv
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


def file_has_content(file_path: Path) -> bool:
    return file_path.exists() and file_path.stat().st_size > 0


def probe_duration_seconds(file_path: Path) -> float:
    result = subprocess.run([
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(file_path)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        return 0.0
    try:
        return float((result.stdout or "0").strip() or 0)
    except ValueError:
        return 0.0


def probe_dimensions(file_path: Path) -> tuple[int, int]:
    result = subprocess.run([
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        str(file_path)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        return (0, 0)
    try:
        width_text, height_text = (result.stdout or "").strip().split("x")
        return (int(width_text), int(height_text))
    except (ValueError, AttributeError):
        return (0, 0)


def detect_audio_mean_volume_db(file_path: Path) -> float | None:
    if not file_has_content(file_path):
        return None
    result = subprocess.run([
        "ffmpeg",
        "-i",
        str(file_path),
        "-af",
        "volumedetect",
        "-f",
        "null",
        "NUL"
    ], capture_output=True, text=True)
    combined = f"{result.stdout}\n{result.stderr}"
    for line in combined.splitlines():
        if "mean_volume:" in line:
            try:
                return float(line.split("mean_volume:")[1].split("dB")[0].strip())
            except (IndexError, ValueError):
                return None
    return None


def choose_best_voice_path(workspace: Path) -> Path | None:
    candidates = [
        workspace / "03_voice" / "voiceover_clean.wav",
        workspace / "03_voice" / "voiceover.wav"
    ]
    scored = []
    for candidate in candidates:
        if not file_has_content(candidate):
            continue
        mean_db = detect_audio_mean_volume_db(candidate)
        if mean_db is None:
            scored.append((candidate, -999.0))
            continue
        scored.append((candidate, mean_db))
    if not scored:
        return None
    scored.sort(key=lambda item: item[1], reverse=True)
    best_path, best_mean_db = scored[0]
    if best_mean_db <= -80:
        return None
    return best_path


def detect_selected_music(workspace: Path) -> Path | None:
    manifest_path = workspace / "04_assets" / "music" / "music_manifest.csv"
    if not file_has_content(manifest_path):
        return None
    with manifest_path.open("r", encoding="utf8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            status = str(row.get("status", "")).strip().lower()
            track_path = str(row.get("track_path", "")).strip()
            if status in {"selected", "approved", "picked"} and track_path:
                resolved = Path(track_path)
                if resolved.exists():
                    return resolved
    return None


def build_procedural_music_bed(output_path: Path, duration_seconds: float) -> None:
    safe_duration = max(6.0, float(duration_seconds))
    fade_start = max(0.0, safe_duration - 2.5)
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency=196:sample_rate=48000:duration={safe_duration}",
        "-f",
        "lavfi",
        "-i",
        f"sine=frequency=247:sample_rate=48000:duration={safe_duration}",
        "-f",
        "lavfi",
        "-i",
        f"anoisesrc=color=pink:sample_rate=48000:duration={safe_duration}",
        "-filter_complex",
        (
            f"[0:a]volume=0.035,afade=t=in:st=0:d=1.8,afade=t=out:st={fade_start}:d=2[a0];"
            f"[1:a]volume=0.02,afade=t=in:st=0.4:d=2.1,afade=t=out:st={fade_start}:d=2[a1];"
            f"[2:a]lowpass=f=900,highpass=f=120,volume=0.01,afade=t=in:st=0:d=1.8,afade=t=out:st={fade_start}:d=2[a2];"
            "[a0][a1][a2]amix=inputs=3:duration=longest:dropout_transition=2,alimiter=limit=0.85"
        ),
        "-c:a",
        "pcm_s16le",
        str(output_path)
    ]
    run(command, "build procedural music bed")


def build_overlay_filter_chain(scene: dict, settings: dict, text_dir: Path) -> str:
    return "setsar=1"


def build_visual_filtergraph(scene: dict, settings: dict, text_dir: Path, source_path: Path) -> str:
    width, height = settings["resolution"].split("x")
    overlay_chain = build_overlay_filter_chain(scene, settings, text_dir)
    finish_chain = "eq=contrast=1.12:saturation=1.11:brightness=-0.013,unsharp=9:9:1.8:5:5:0.65"
    source_width, source_height = probe_dimensions(source_path)
    portrait_like = source_height > source_width and source_width > 0 and source_height > 0
    if portrait_like:
        return (
            f"[0:v]split=2[bgsrc][fgsrc];"
            f"[bgsrc]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},boxblur=20:4,eq=saturation=0.78:brightness=-0.04[bg];"
            f"[fgsrc]scale=-2:{int(int(height) * 1.06)},unsharp=5:5:0.8:3:3:0.0[fg];"
            f"[bg][fg]overlay=x='(W-w)/2+sin(t*0.35)*18':y='(H-h)/2+cos(t*0.24)*10'[base];"
            f"[base]{finish_chain},{overlay_chain}[vout]"
        )
    return (
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height}[base];"
        f"[base]{finish_chain},{overlay_chain}[vout]"
    )


def render_fallback_clip(scene: dict, clip_path: Path, settings: dict, index: int, text_dir: Path, duration: float) -> None:
    width, height = settings["resolution"].split("x")
    bg_color, _ = choose_colors(index)
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c={bg_color}:s={width}x{height}:d={duration}:r={settings['fps']}",
        "-vf",
        "eq=contrast=1.08:saturation=1.02:brightness=-0.01,vignette=PI/5:0.18",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(clip_path)
    ]
    run(command, f"fallback clip {scene.get('id', '')}")


def render_visual_subclip(
    scene: dict,
    visual: dict,
    clip_path: Path,
    settings: dict,
    workspace: Path,
    text_dir: Path,
    duration: float,
    visual_index: int = 0,
    total_visuals: int = 1
) -> None:
    asset_path = workspace / visual.get("file", "")
    if not asset_path.exists():
      render_fallback_clip(scene, clip_path, settings, 0, text_dir, duration)
      return

    suffix = asset_path.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        filtergraph = build_visual_filtergraph(scene, settings, text_dir, asset_path)
        command = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(asset_path),
            "-t",
            str(duration),
            "-filter_complex",
            filtergraph,
            "-map",
            "[vout]",
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
        source_duration = probe_duration_seconds(asset_path)
        available_trim = max(0.0, source_duration - duration)
        offset_ratio = 0 if total_visuals <= 1 else visual_index / max(1, total_visuals - 1)
        start_offset = round(available_trim * offset_ratio, 3)
        filtergraph = build_visual_filtergraph(scene, settings, text_dir, asset_path)
        command = [
            "ffmpeg",
            "-y",
        ]
        if source_duration > duration + 0.25 and start_offset > 0:
            command.extend([
                "-ss",
                str(start_offset)
            ])
        elif source_duration <= duration + 0.25:
            command.extend([
                "-stream_loop",
                "-1"
            ])
        command.extend([
            "-i",
            str(asset_path),
            "-t",
            str(duration),
            "-filter_complex",
            filtergraph,
            "-map",
            "[vout]",
            "-r",
            str(settings["fps"]),
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(clip_path)
        ])
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
        render_visual_subclip(
            scene,
            visual,
            part_path,
            settings,
            workspace,
            text_dir,
            per_visual_duration,
            visual_index - 1,
            len(visuals)
        )
        concat_lines.append(f"file '{part_path.resolve().as_posix()}'")

    concat_path = scene_parts_dir / "parts.txt"
    concat_path.write_text("\n".join(concat_lines) + "\n", encoding="utf8")
    concat_clips(concat_path, clip_path, f"scene clip {scene.get('id', '')}")


def mux_audio(video_path: Path, voice_path: Path | None, music_path: Path | None, output_path: Path, profile_name: str) -> None:
    settings = profile_settings(profile_name)
    preferred_codec = "h264_nvenc"
    command = ["ffmpeg", "-y", "-i", str(video_path)]
    input_count = 1
    if voice_path and file_has_content(voice_path):
        command.extend(["-i", str(voice_path)])
        input_count += 1
    if music_path and file_has_content(music_path):
        command.extend(["-stream_loop", "-1", "-i", str(music_path)])
        input_count += 1

    has_voice = voice_path is not None and file_has_content(voice_path)
    has_music = music_path is not None and file_has_content(music_path)
    if has_voice and has_music:
        command.extend([
            "-filter_complex",
            "[1:a]volume=1.0[voice];[2:a]volume=0.16[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]",
            "-map",
            "0:v:0",
            "-map",
            "[aout]"
        ])
    elif has_voice:
        command.extend([
            "-map",
            "0:v:0",
            "-map",
            "1:a:0"
        ])
    elif has_music:
        command.extend([
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-filter:a",
            "volume=0.16"
        ])
    else:
        command.extend(["-map", "0:v:0"])

    command.extend([
        "-c:v",
        preferred_codec,
        "-preset",
        "p5",
        "-b:v",
        settings["bitrate"]
    ])
    if has_voice or has_music:
        command.extend([
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest"
        ])
    else:
        command.append("-an")
    command.append(str(output_path))
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
        return

    fallback = ["ffmpeg", "-y", "-i", str(video_path)]
    if voice_path and file_has_content(voice_path):
        fallback.extend(["-i", str(voice_path)])
    if music_path and file_has_content(music_path):
        fallback.extend(["-stream_loop", "-1", "-i", str(music_path)])
    if has_voice and has_music:
        fallback.extend([
            "-filter_complex",
            "[1:a]volume=1.0[voice];[2:a]volume=0.16[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]",
            "-map",
            "0:v:0",
            "-map",
            "[aout]"
        ])
    elif has_voice:
        fallback.extend([
            "-map",
            "0:v:0",
            "-map",
            "1:a:0"
        ])
    elif has_music:
        fallback.extend([
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-filter:a",
            "volume=0.16"
        ])
    else:
        fallback.extend(["-map", "0:v:0"])
    fallback.extend([
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20"
    ])
    if has_voice or has_music:
        fallback.extend([
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest"
        ])
    else:
        fallback.append("-an")
    fallback.append(str(output_path))
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

    voice_path = choose_best_voice_path(workspace)
    music_path = detect_selected_music(workspace)
    generated_music_path = None
    if not music_path:
        generated_music_path = temp_dir / "procedural_preview_music.wav"
        build_procedural_music_bed(generated_music_path, float(manifest.get("duration_seconds", 0) or 0))
        music_path = generated_music_path
    mux_audio(output_no_audio, voice_path, music_path, output_path, args.profile)

    print(f"Rendered visual-first video at {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
