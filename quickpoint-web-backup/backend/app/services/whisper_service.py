"""
Whisper Service – lazy-loads the model on first call.
Keeps the model in memory for subsequent requests.
"""
import io
import time
import os
import platform
import shutil

def setup_ffmpeg_path():
    if platform.system() == "Windows":
        # First check if shutil.which can find ffmpeg directly
        ffmpeg_cmd = shutil.which("ffmpeg")
        if ffmpeg_cmd:
            ffmpeg_dir = os.path.dirname(ffmpeg_cmd)
            if ffmpeg_dir not in os.environ["PATH"]:
                os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]
                print(f"[FFMPEG] Found via shutil.which and prepended to PATH in whisper_service: {ffmpeg_dir}")
            return

        username = os.environ.get("USERNAME") or os.environ.get("USER")
        paths_to_check = []
        if username:
            paths_to_check.append(f"C:\\Users\\{username}\\AppData\\Local\\Microsoft\\WinGet\\Links")
            paths_to_check.append(f"C:\\Users\\{username}\\AppData\\Local\\Programs\\winget\\links")
        paths_to_check.extend([
            "C:\\Program Files\\ffmpeg\\bin",
            "C:\\ffmpeg\\bin",
            "C:\\tools\\ffmpeg\\bin"
        ])
        for path in paths_to_check:
            if os.path.exists(os.path.join(path, "ffmpeg.exe")):
                if path not in os.environ["PATH"]:
                    os.environ["PATH"] = path + os.pathsep + os.environ["PATH"]
                    print(f"[FFMPEG] Found and added to PATH in whisper_service: {path}")
                break

# Ensure path setup runs
setup_ffmpeg_path()

import whisper
import soundfile as sf
from app.config import get_settings

settings = get_settings()
_model = None   # loaded lazily


def _get_model():
    global _model
    if _model is None:
        print(f"[LOADING] Whisper model '{settings.whisper_model_size}' ...")
        _model = whisper.load_model(settings.whisper_model_size)
        print("[READY] Whisper model ready.")
    return _model


def transcribe_audio(file_path: str) -> dict:
    """
    Transcribe an audio file using OpenAI Whisper.

    Returns:
        {
            "text": str,
            "segments": list,
            "language": str,
            "duration_sec": float
        }
    """
    model = _get_model()
    result = model.transcribe(file_path, verbose=False)

    # Compute duration via soundfile (light-weight, no ffmpeg required)
    try:
        info = sf.info(file_path)
        duration = info.duration
    except Exception:
        duration = 0.0

    return {
        "text": result.get("text", "").strip(),
        "segments": result.get("segments", []),
        "language": result.get("language", "unknown"),
        "duration_sec": round(duration, 2),
    }
