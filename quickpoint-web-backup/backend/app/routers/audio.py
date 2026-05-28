"""
Audio Enhancement Router
POST /api/enhance-audio → upload audio → returns enhanced audio file
"""
import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from app.services.audio_processing_service import enhance_audio

router = APIRouter()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
    "audio/x-m4a", "audio/webm", "audio/flac",
}
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/enhance-audio")
async def enhance_audio_endpoint(
    file: UploadFile = File(...),
    speed: float = Form(1.0),
    denoise: bool = Form(True),
):
    """
    Enhance uploaded audio:
    - Noise reduction (spectral gating)
    - Speed adjustment (0.5× – 2.0×)

    Returns the processed audio file as a download.
    """
    # Validate content type (be lenient – browsers vary)
    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_TYPES:
        # some browsers send audio/mpeg or application/octet-stream
        if not content_type.startswith("audio/") and content_type != "application/octet-stream":
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {content_type}.",
            )

    # Clamp speed
    speed = max(0.5, min(2.0, speed))

    # Save uploaded file
    ext = os.path.splitext(file.filename or "audio")[1] or ".mp3"
    tmp_input = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    try:
        with open(tmp_input, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        result = enhance_audio(
            input_path=tmp_input,
            speed_factor=speed,
            denoise=denoise,
            output_dir=UPLOAD_DIR,
        )

        output_path = result["output_path"]
        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Enhancement failed: output file not found.")

        # Stream back the enhanced audio; cleanup happens after response
        original_name = os.path.splitext(file.filename or "audio")[0]
        download_name = f"{original_name}_enhanced.wav"

        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename=download_name,
            headers={
                "X-Denoise-Applied": str(result["denoise_applied"]),
                "X-Speed-Applied": str(result["speed_applied"]),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio enhancement failed: {str(e)}")
    finally:
        # Clean up input temp file (output is streamed; OS will clean it)
        if os.path.exists(tmp_input):
            os.remove(tmp_input)


@router.get("/enhance-audio/status")
def enhancement_status():
    """Check which enhancement libraries are available."""
    try:
        import librosa
        librosa_ok = True
    except ImportError:
        librosa_ok = False
    try:
        import noisereduce
        nr_ok = True
    except ImportError:
        nr_ok = False

    return {
        "librosa": librosa_ok,
        "noisereduce": nr_ok,
        "speed_control_available": librosa_ok,
        "noise_reduction_available": librosa_ok and nr_ok,
    }
