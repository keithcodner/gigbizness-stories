import argparse
import subprocess
import sys


FONT_PATH = "C\\:/Windows/Fonts/arial.ttf"


def run_ffmpeg(output_path: str, title_text: str, overlay_text: str, accent: str) -> None:
    vf = ",".join([
        "drawbox=x=0:y=0:w=1280:h=720:color=#19232a:t=fill",
        f"drawbox=x=820:y=80:w=340:h=560:color={accent}@0.8:t=fill",
        f"drawtext=fontfile='{FONT_PATH}':text='{title_text}':fontcolor=#f4e6cf:fontsize=34:x=70:y=120",
        f"drawtext=fontfile='{FONT_PATH}':text='{overlay_text}':fontcolor=#fff7e6:fontsize=78:x=70:y=360:box=1:boxcolor=0x00000066:boxborderw=24",
        f"drawtext=fontfile='{FONT_PATH}':text='Tow truck + invoice + warning':fontcolor=#f4e6cf:fontsize=26:x=70:y=610"
    ])

    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=#111111:s=1280x720:d=1",
        "-frames:v",
        "1",
        "-vf",
        vf,
        output_path
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "thumbnail render failed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate simple thumbnail placeholders.")
    parser.add_argument("--title", required=True)
    parser.add_argument("--text1", required=True)
    parser.add_argument("--text2", required=True)
    parser.add_argument("--output1", required=True)
    parser.add_argument("--output2", required=True)
    parser.add_argument("--final-output", required=True)
    args = parser.parse_args()

    run_ffmpeg(args.output1, args.title, args.text1, "#c64d3a")
    run_ffmpeg(args.output2, args.title, args.text2, "#2e6c73")
    run_ffmpeg(args.final_output, args.title, args.text1, "#c64d3a")
    print(f"Generated thumbnail placeholder at {args.output1}")
    print(f"Generated thumbnail placeholder at {args.output2}")
    print(f"Generated final thumbnail placeholder at {args.final_output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
