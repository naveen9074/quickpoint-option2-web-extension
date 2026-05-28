"""
Audio Processing Service – Noise Reduction + Speed Control.
Provides:
  - reduce_noise()    : spectral gating via noisereduce
  - change_speed()    : time-stretching via librosa (no pitch change)
  - enhance_audio()   : combined pipeline, returns output path
"""
import os
import uuid
import numpy as np

try:
    import librosa
    import librosa.effects
    import soundfile as sf
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("[WARN] librosa not found – speed control disabled.")

try:
    import noisereduce as nr
    NOISEREDUCE_AVAILABLE = True
except ImportError:
    NOISEREDUCE_AVAILABLE = False
    print("[WARN] noisereduce not found – noise reduction disabled.")

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def reduce_noise(input_path: str, output_path: str, sr: int = 16000) -> str:
    """
    Apply spectral-gating noise reduction using noisereduce.
    Falls back to copying input → output if library unavailable.
    """
    if not LIBROSA_AVAILABLE or not NOISEREDUCE_AVAILABLE:
        import shutil
        shutil.copy(input_path, output_path)
        return output_path

    y, sr = librosa.load(input_path, sr=None, mono=True)
    # Use first 0.5 s as noise reference (stationary noise profile)
    noise_sample = y[:int(sr * 0.5)] if len(y) > sr * 0.5 else y
    reduced = nr.reduce_noise(y=y, y_noise=noise_sample, sr=sr, prop_decrease=0.85)
    sf.write(output_path, reduced, sr)
    return output_path


def change_speed(input_path: str, output_path: str, speed_factor: float = 1.0) -> str:
    """
    Time-stretch audio by speed_factor without altering pitch.
    speed_factor: 0.5 (half speed) – 2.0 (double speed). 1.0 = no change.
    Falls back to copy if librosa not available.
    """
    if not LIBROSA_AVAILABLE or abs(speed_factor - 1.0) < 0.01:
        import shutil
        shutil.copy(input_path, output_path)
        return output_path

    y, sr = librosa.load(input_path, sr=None, mono=True)
    # librosa time_stretch rate = speed_factor (>1 = faster, <1 = slower)
    stretched = librosa.effects.time_stretch(y, rate=speed_factor)
    sf.write(output_path, stretched, sr)
    return output_path


def enhance_audio(
    input_path: str,
    speed_factor: float = 1.0,
    denoise: bool = True,
    output_dir: str = None,
) -> dict:
    """
    Full enhancement pipeline:
      1. Noise reduction (optional)
      2. Speed control (optional)

    Returns:
      {
        "output_path": str,
        "denoise_applied": bool,
        "speed_applied": float,
        "libraries_available": dict,
      }
    """
    if output_dir is None:
        output_dir = UPLOAD_DIR

    base = os.path.splitext(os.path.basename(input_path))[0]
    uid = uuid.uuid4().hex[:8]
    current_path = input_path

    # Step 1 – Noise reduction
    if denoise and LIBROSA_AVAILABLE and NOISEREDUCE_AVAILABLE:
        denoised_path = os.path.join(output_dir, f"{base}_{uid}_denoised.wav")
        reduce_noise(current_path, denoised_path)
        current_path = denoised_path

    # Step 2 – Speed control
    final_path = os.path.join(output_dir, f"{base}_{uid}_enhanced.wav")
    if LIBROSA_AVAILABLE and abs(speed_factor - 1.0) >= 0.01:
        change_speed(current_path, final_path, speed_factor)
    else:
        import shutil
        shutil.copy(current_path, final_path)

    return {
        "output_path": final_path,
        "denoise_applied": denoise and NOISEREDUCE_AVAILABLE and LIBROSA_AVAILABLE,
        "speed_applied": speed_factor,
        "libraries_available": {
            "librosa": LIBROSA_AVAILABLE,
            "noisereduce": NOISEREDUCE_AVAILABLE,
        },
    }
