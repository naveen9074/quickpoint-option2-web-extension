"""
Module 4 – User Dashboard Router
GET  /api/dashboard/sessions       → list all meeting sessions
GET  /api/dashboard/stats          → aggregate analytics
GET  /api/dashboard/sessions/{id}  → single session detail
DELETE /api/dashboard/sessions/{id}→ delete a session
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.session import MeetingSession

router = APIRouter()


def _session_to_dict(s: MeetingSession) -> dict:
    return {
        "id": s.id,
        "session_name": s.session_name or f"Session #{s.id}",
        "language": s.language,
        "transcript_preview": (s.transcript or "")[:200],
        "summary": s.summary,
        "action_items": json.loads(s.action_items) if s.action_items else [],
        "filler_count": s.filler_count,
        "filler_words": json.loads(s.filler_words) if s.filler_words else {},
        "pace_wpm": s.pace_wpm,
        "sentiment": s.sentiment,
        "score": s.score,
        "audio_duration_sec": s.audio_duration_sec,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/dashboard/sessions")
def list_sessions(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """Return all meeting sessions ordered by newest first."""
    sessions = (
        db.query(MeetingSession)
        .order_by(MeetingSession.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": db.query(func.count(MeetingSession.id)).scalar(),
        "sessions": [_session_to_dict(s) for s in sessions],
    }


@router.get("/dashboard/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Return full details of a single session."""
    s = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    result = _session_to_dict(s)
    result["transcript"] = s.transcript  # Full transcript in detail view
    return result


@router.get("/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    """Aggregate analytics across all sessions."""
    total = db.query(func.count(MeetingSession.id)).scalar()
    if total == 0:
        return {"total_sessions": 0, "message": "No sessions yet."}

    avg_score    = db.query(func.avg(MeetingSession.score)).scalar() or 0
    avg_pace     = db.query(func.avg(MeetingSession.pace_wpm)).scalar() or 0
    avg_fillers  = db.query(func.avg(MeetingSession.filler_count)).scalar() or 0
    avg_duration = db.query(func.avg(MeetingSession.audio_duration_sec)).scalar() or 0

    # Sentiment distribution
    sentiments = db.query(MeetingSession.sentiment, func.count()).group_by(MeetingSession.sentiment).all()
    sentiment_dist = {row[0] or "UNKNOWN": row[1] for row in sentiments}

    # Top scorer session
    best = (
        db.query(MeetingSession)
        .order_by(MeetingSession.score.desc())
        .first()
    )

    return {
        "total_sessions": total,
        "avg_score": round(avg_score, 2),
        "avg_pace_wpm": round(avg_pace, 1),
        "avg_filler_count": round(avg_fillers, 1),
        "avg_duration_sec": round(avg_duration, 1),
        "sentiment_distribution": sentiment_dist,
        "best_session": {
            "id": best.id,
            "score": best.score,
            "session_name": best.session_name or f"Session #{best.id}",
        } if best else None,
    }


@router.delete("/dashboard/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a session by ID."""
    s = db.query(MeetingSession).filter(MeetingSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.delete(s)
    db.commit()
    return {"message": f"Session {session_id} deleted successfully."}
