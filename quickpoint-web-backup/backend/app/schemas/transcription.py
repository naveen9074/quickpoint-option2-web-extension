from pydantic import BaseModel
from typing import Optional


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration_sec: float
    segments: Optional[list] = []
    word_count: int

    class Config:
        from_attributes = True


class TranscriptionRequest(BaseModel):
    """Used when sending raw text (no audio file) to re-process."""
    text: str
