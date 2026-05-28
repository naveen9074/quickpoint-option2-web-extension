"""
Module 2 - Post-Meeting Intelligence Router
POST /api/summarize  -> transcript text -> summary + action items + key topics + sentiment
POST /api/intelligence/save -> persist intelligence result to DB
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import MeetingSession
from app.schemas.intelligence import IntelligenceRequest, IntelligenceResponse, SaveSessionRequest
from app.services import nlp_service

router = APIRouter()


@router.post("/summarize", response_model=IntelligenceResponse)
def summarize_transcript(payload: IntelligenceRequest):
    """
    Summarize a transcript and extract action items, key topics, and sentiment.
    Send raw transcript text; receives structured intelligence.
    """
    transcript = payload.transcript.strip()
    if len(transcript.split()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Transcript too short for meaningful summarization (min 20 words).",
        )

    try:
        summary      = nlp_service.summarize_text(transcript)
        action_items = nlp_service.extract_action_items(transcript)
        sentiment    = nlp_service.analyze_sentiment(transcript)
        key_topics   = nlp_service.extract_key_topics(transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLP processing failed: {str(e)}")

    return IntelligenceResponse(
        session_name=payload.session_name or "Untitled Session",
        summary=summary,
        action_items=action_items,
        sentiment=sentiment,
        key_topics=key_topics,
    )


@router.post("/intelligence/save")
def save_intelligence(payload: SaveSessionRequest, db: Session = Depends(get_db)):
    """
    Save meeting session to DB. Auto-generates summary/action items/sentiment if missing.
    """
    summary = payload.summary
    action_items = payload.action_items
    sentiment = payload.sentiment
    
    # Auto-generate summary/action items/sentiment if not provided
    if not summary or not action_items or sentiment == "NEUTRAL":
        try:
            nlp_req = IntelligenceRequest(transcript=payload.transcript, session_name=payload.session_name)
            result = summarize_transcript(nlp_req)
            if not summary:
                summary = result.summary
            if not action_items:
                action_items = result.action_items
            if sentiment == "NEUTRAL":
                sentiment = result.sentiment.get("label", "NEUTRAL")
        except Exception as e:
            print(f"[SAVE] NLP auto-generation fallback failed: {e}")
            if not summary:
                summary = "Summary generation failed."
            if not action_items:
                action_items = []
            if sentiment == "NEUTRAL":
                sentiment = "NEUTRAL"

    session = MeetingSession(
        session_name=payload.session_name,
        transcript=payload.transcript,
        language=payload.language or "en",
        summary=summary,
        action_items=json.dumps(action_items) if action_items is not None else "[]",
        filler_count=payload.filler_count or 0,
        filler_words=json.dumps(payload.filler_words or {}),
        pace_wpm=payload.pace_wpm or 0.0,
        sentiment=sentiment,
        score=payload.score or 0.0,
        audio_duration_sec=payload.audio_duration_sec or 0.0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"message": "Session saved.", "session_id": session.id}
