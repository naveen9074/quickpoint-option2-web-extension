from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class MeetingSession(Base):
    __tablename__ = "meeting_sessions"

    id           = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(255), nullable=True)
    transcript   = Column(Text, nullable=True)
    language     = Column(String(50), nullable=True)
    summary      = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)   # JSON string of list
    filler_count = Column(Integer, default=0)
    filler_words = Column(Text, nullable=True)   # JSON string
    pace_wpm     = Column(Float, default=0.0)
    sentiment    = Column(String(50), nullable=True)
    score        = Column(Float, default=0.0)    # 0-100 overall score
    audio_duration_sec = Column(Float, default=0.0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
