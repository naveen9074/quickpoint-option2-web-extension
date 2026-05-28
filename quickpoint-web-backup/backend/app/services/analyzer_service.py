"""
Communication Skill Analyzer Service.
Analyses: filler words, speech pace, and overall communication score.
"""
import re


# ── Filler Word Dictionary ─────────────────────────────────────────────────────
FILLER_WORDS = [
    "um", "uh", "er", "ah", "hmm", "like",
    "you know", "basically", "literally", "actually",
    "sort of", "kind of", "right", "okay so",
    "i mean", "you see", "well", "so yeah",
]

_FILLER_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(f) for f in FILLER_WORDS) + r")\b",
    re.IGNORECASE,
)


def detect_fillers(text: str) -> dict:
    """
    Detect filler words in transcript text.

    Returns:
        {
            "count": int,
            "words": {"um": 3, "like": 5, ...},
            "rate_per_100_words": float,
        }
    """
    matches = _FILLER_PATTERN.findall(text)
    total_words = len(text.split())

    word_counts: dict[str, int] = {}
    for m in matches:
        key = m.lower()
        word_counts[key] = word_counts.get(key, 0) + 1

    rate = round((len(matches) / total_words * 100), 2) if total_words > 0 else 0.0

    return {
        "count": len(matches),
        "words": word_counts,
        "rate_per_100_words": rate,
    }


def compute_pace(word_count: int, duration_sec: float) -> dict:
    """
    Compute words-per-minute (WPM) and provide a qualitative label.

    Typical pace ranges:
        < 100 wpm  – Too slow
        100–130    – Slow
        130–160    – Ideal (conversational)
        160–200    – Fast
        > 200      – Too fast
    """
    if duration_sec <= 0:
        return {"wpm": 0.0, "label": "unknown", "feedback": "Duration unavailable."}

    wpm = round((word_count / duration_sec) * 60, 1)

    if wpm < 100:
        label, feedback = "too slow", "Consider speaking a bit faster to keep listeners engaged."
    elif wpm < 130:
        label, feedback = "slow", "Your pace is slightly slow – try to pick up the energy."
    elif wpm < 160:
        label, feedback = "ideal", "Great pace! Clear and easy to follow."
    elif wpm < 200:
        label, feedback = "fast", "You're speaking quickly – try to pause more between points."
    else:
        label, feedback = "too fast", "Very fast – slow down to improve clarity and comprehension."

    return {"wpm": wpm, "label": label, "feedback": feedback}


def compute_score(filler_rate: float, pace_label: str, sentiment_score: float) -> float:
    """
    Compute an overall communication score (0–100).

    Weighted formula:
        - Filler rate penalty  (40 pts)
        - Pace score           (30 pts)
        - Sentiment confidence (30 pts)
    """
    # Filler score: 0 fillers → 40 pts; ≥ 10 per 100 words → 0 pts
    filler_score = max(0.0, 40.0 - (filler_rate * 4))

    pace_scores = {
        "ideal": 30.0,
        "slow": 20.0,
        "fast": 20.0,
        "too slow": 8.0,
        "too fast": 8.0,
        "unknown": 15.0,
    }
    pace_score = pace_scores.get(pace_label, 15.0)

    # Sentiment confidence score (model confidence → 0-30)
    sentiment_score_val = round(sentiment_score * 30, 2)

    total = round(filler_score + pace_score + sentiment_score_val, 2)
    return min(100.0, total)


def build_analysis_report(
    text: str,
    duration_sec: float,
    sentiment: dict,
) -> dict:
    """
    Full skill analysis combining filler detection, pace, sentiment, and score.
    """
    filler_data = detect_fillers(text)
    word_count = len(text.split())
    pace_data = compute_pace(word_count, duration_sec)
    score = compute_score(
        filler_rate=filler_data["rate_per_100_words"],
        pace_label=pace_data["label"],
        sentiment_score=sentiment.get("score", 0.5),
    )

    # Build per-filler feedback
    top_fillers = sorted(filler_data["words"].items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "word_count": word_count,
        "duration_sec": duration_sec,
        "filler": {
            "count": filler_data["count"],
            "distribution": filler_data["words"],
            "rate_per_100_words": filler_data["rate_per_100_words"],
            "top_fillers": [{"word": w, "count": c} for w, c in top_fillers],
        },
        "pace": pace_data,
        "sentiment": sentiment,
        "score": score,
        "grade": _grade(score),
    }


def _grade(score: float) -> str:
    if score >= 85:
        return "A – Excellent"
    elif score >= 70:
        return "B – Good"
    elif score >= 55:
        return "C – Average"
    elif score >= 40:
        return "D – Needs Improvement"
    else:
        return "F – Poor"
