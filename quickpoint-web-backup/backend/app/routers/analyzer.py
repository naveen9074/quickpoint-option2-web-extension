"""
Module 3 – Communication Skill Analyzer Router
POST /api/analyze  → upload audio → full skill report (fillers, pace, sentiment, score)
POST /api/analyze/text → plain text skill check (no audio needed)
"""
import os
import uuid
import shutil
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import MeetingSession
from app.schemas.analyzer import AnalyzerResponse
from app.services import whisper_service, nlp_service, analyzer_service

router = APIRouter()

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {
    "audio/mpeg", "audio/wav", "audio/ogg",
    "audio/mp4", "audio/x-m4a", "audio/webm",
}


@router.post("/analyze", response_model=AnalyzerResponse)
async def analyze_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload audio → transcribe with Whisper → full communication analysis.
    Result is automatically saved as a session.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}",
        )

    ext = os.path.splitext(file.filename or "audio")[1] or ".mp3"
    tmp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")

    try:
        with open(tmp_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        # Step 1 – Transcribe
        transcription = whisper_service.transcribe_audio(tmp_path)
        text         = transcription["text"]
        duration_sec = transcription["duration_sec"]

        # Step 2 – Sentiment
        sentiment = nlp_service.analyze_sentiment(text)

        # Step 3 – Build report
        report = analyzer_service.build_analysis_report(text, duration_sec, sentiment)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # Persist session
    try:
        session = MeetingSession(
            transcript=text,
            filler_count=report["filler"]["count"],
            filler_words=json.dumps(report["filler"]["distribution"]),
            pace_wpm=report["pace"]["wpm"],
            sentiment=sentiment["label"],
            score=report["score"],
            audio_duration_sec=duration_sec,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    except Exception:
        session_id = None

    return AnalyzerResponse(**report, session_id=session_id)


@router.post("/analyze/text", response_model=AnalyzerResponse)
def analyze_text(text: str, duration_sec: float = 60.0):
    """
    Analyze a raw transcript text string (no audio).
    duration_sec defaults to 60 s if not provided.
    """
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    sentiment = nlp_service.analyze_sentiment(text)
    report = analyzer_service.build_analysis_report(text, duration_sec, sentiment)
    return AnalyzerResponse(**report)
