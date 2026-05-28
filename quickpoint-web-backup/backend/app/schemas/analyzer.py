from pydantic import BaseModel
from typing import Optional


class AnalyzerResponse(BaseModel):
    word_count: int
    duration_sec: float
    filler: dict
    pace: dict
    sentiment: dict
    score: float
    grade: str
    session_id: Optional[int] = None
