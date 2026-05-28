from pydantic import BaseModel
from typing import Optional, List, Dict


class IntelligenceRequest(BaseModel):
    transcript: str
    session_name: Optional[str] = "Untitled Session"


class SaveSessionRequest(BaseModel):
    session_name: Optional[str] = "Untitled Session"
    transcript: str
    summary: Optional[str] = ""
    action_items: Optional[List[str]] = []
    key_topics: Optional[List[str]] = []
    sentiment: Optional[str] = "NEUTRAL"
    score: Optional[float] = 0.0
    filler_count: Optional[int] = 0
    filler_words: Optional[Dict[str, int]] = {}
    pace_wpm: Optional[float] = 0.0
    audio_duration_sec: Optional[float] = 0.0
    language: Optional[str] = "en"


class IntelligenceResponse(BaseModel):
    session_name: str
    summary: str
    action_items: List[str]
    sentiment: dict
    key_topics: Optional[List[str]] = []
