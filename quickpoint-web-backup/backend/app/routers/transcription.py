"""
Module 1 – Real-Time Meeting Assistant Router
POST /api/transcribe  → upload audio → enhance + transcribe → returns transcript
"""
import os
import uuid
import shutil
import subprocess
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services import whisper_service
from app.services.audio_processing_service import enhance_audio
from app.schemas.transcription import TranscriptionResponse

router = APIRouter()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
print(f"[STARTUP] Temp uploads directory verified at: {os.path.abspath(UPLOAD_DIR)}")

ALLOWED_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/webm"}


def _ensure_wav_path(input_path: str) -> str:
    """Convert the audio file to WAV if needed, using ffmpeg when available."""
    ext = os.path.splitext(input_path)[1].lower()
    if ext == ".wav":
        return input_path

    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path is None:
        raise FileNotFoundError(
            "Non-WAV audio requires ffmpeg. Please install ffmpeg and add it to your PATH."
        )

    output_path = os.path.splitext(input_path)[0] + "_decoded.wav"
    if os.path.exists(output_path):
        os.remove(output_path)

    cmd = [ffmpeg_path, "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not os.path.exists(output_path):
        raise RuntimeError(
            f"ffmpeg conversion failed: {proc.stderr.strip() or proc.stdout.strip()}"
        )

    return output_path


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Upload an audio file and receive the full transcript.
    Supports MP3, WAV, OGG, M4A, WebM.
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported: mp3, wav, ogg, m4a, webm.",
        )

    ext = os.path.splitext(file.filename or "audio")[1] or ".mp3"
    tmp_filename = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    converted_path = None
    enhanced_path = None
    temp_cleanup = []

    try:
        with open(tmp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if not os.path.exists(tmp_filename) or os.path.getsize(tmp_filename) == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty or could not be saved.")

        print(f"[TRANSCRIBE] saved temp audio: {os.path.abspath(tmp_filename)}")

        # Internal enhancement pipeline: try to denoise and normalize audio first.
        try:
            enhanced = enhance_audio(
                input_path=tmp_filename,
                speed_factor=1.0,
                denoise=True,
                output_dir=UPLOAD_DIR,
            )
            enhanced_path = enhanced.get("output_path")
            if enhanced_path and os.path.exists(enhanced_path):
                temp_cleanup.append(enhanced_path)
                print(f"[TRANSCRIBE] audio enhancement output: {os.path.abspath(enhanced_path)}")
            else:
                enhanced_path = None
        except Exception as enhancement_error:
            print(f"[TRANSCRIBE] enhancement failed, continuing with original audio: {enhancement_error}")
            enhanced_path = None

        audio_to_transcribe = enhanced_path or tmp_filename
        print(f"[TRANSCRIBE] transcription source path: {os.path.abspath(audio_to_transcribe)}")

        if os.path.splitext(audio_to_transcribe)[1].lower() != ".wav":
            converted_path = _ensure_wav_path(audio_to_transcribe)
            temp_cleanup.append(converted_path)
            audio_to_transcribe = converted_path
            print(f"[TRANSCRIBE] converted audio for Whisper: {os.path.abspath(audio_to_transcribe)}")

        if not os.path.exists(audio_to_transcribe):
            raise HTTPException(status_code=500, detail=f"Audio file missing before transcription: {audio_to_transcribe}")

        result = whisper_service.transcribe_audio(audio_to_transcribe)

    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        for path in [tmp_filename] + temp_cleanup:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass

    return TranscriptionResponse(
        text=result["text"],
        language=result["language"],
        duration_sec=result["duration_sec"],
        segments=result["segments"],
        word_count=len(result["text"].split()),
    )
