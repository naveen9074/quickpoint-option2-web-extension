"""
NLP Service - HuggingFace Transformers for summarization and sentiment.
Models are lazy-loaded on first use.
"""
import re
from transformers import pipeline
from app.config import get_settings

settings = get_settings()

_summarizer_model = None
_summarizer_tokenizer = None
_sentiment_analyzer = None


def _get_summarizer():
    global _summarizer_model, _summarizer_tokenizer
    if _summarizer_model is None or _summarizer_tokenizer is None:
        print(f"[LOADING] Summarization model '{settings.summarization_model}' ...")
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        _summarizer_tokenizer = AutoTokenizer.from_pretrained(settings.summarization_model)
        _summarizer_model = AutoModelForSeq2SeqLM.from_pretrained(settings.summarization_model)
        print("[READY] Summarizer model and tokenizer ready.")
    return _summarizer_model, _summarizer_tokenizer


def _get_sentiment():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        print(f"[LOADING] Sentiment model '{settings.sentiment_model}' ...")
        _sentiment_analyzer = pipeline("sentiment-analysis", model=settings.sentiment_model)
        print("[READY] Sentiment analyzer ready.")
    return _sentiment_analyzer


def summarize_text(text: str, max_length: int = 200, min_length: int = 40) -> str:
    """
    Summarize the given text using BART.
    Chunking applied automatically if text is too long.
    """
    model, tokenizer = _get_summarizer()

    # BART max input tokens ~1024. Rough word limit: 800
    words = text.split()
    chunk_size = 800
    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

    summaries = []
    for chunk in chunks:
        if len(chunk.split()) < 30:
            summaries.append(chunk)
            continue
        
        inputs = tokenizer(chunk, max_length=1024, truncation=True, return_tensors="pt")
        summary_ids = model.generate(
            inputs["input_ids"],
            max_length=max_length,
            min_length=min_length,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        decoded = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        summaries.append(decoded.strip())

    return " ".join(summaries).strip()


def extract_action_items(text: str) -> list:
    """
    Heuristic extraction of action items from transcript text.
    Looks for action signals like 'will', 'should', 'need to', 'must', 'action:', etc.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text)
    action_signals = [
        r"\bwill\b", r"\bshould\b", r"\bneed to\b", r"\bmust\b",
        r"\baction\b", r"\bfollow[- ]?up\b", r"\bassign\b", r"\bresponsible\b",
        r"\bby (monday|tuesday|wednesday|thursday|friday|tomorrow|next week)\b",
        r"\bdeadline\b", r"\bdeliver\b", r"\bensure\b",
    ]
    pattern = re.compile("|".join(action_signals), re.IGNORECASE)
    items = [s.strip() for s in sentences if pattern.search(s) and len(s.split()) >= 5]
    return items[:15]   # return up to 15 action items


def analyze_sentiment(text: str) -> dict:
    """
    Run sentiment analysis. Returns:
      {"label": "POSITIVE" | "NEGATIVE" | "NEUTRAL", "score": 0.0-1.0}
    """
    analyzer = _get_sentiment()
    # Truncate to 512 tokens (model limit)
    truncated = " ".join(text.split()[:400])
    result = analyzer(truncated)[0]
    return {
        "label": result["label"],
        "score": round(result["score"], 4),
    }


def extract_key_topics(text: str, top_n: int = 8) -> list:
    """
    Extract key topics/keywords from transcript using word frequency + stop-word filter.
    Pure Python - no extra NLP library required.
    """
    stop_words = {
        "the","a","an","and","or","but","in","on","at","to","for","of","with",
        "by","from","is","are","was","were","be","been","being","have","has",
        "had","do","does","did","will","would","could","should","may","might",
        "shall","can","i","we","you","he","she","they","it","this","that",
        "these","those","my","our","your","his","her","their","its","not","so",
        "if","just","also","then","than","as","up","about","out","very","what",
        "which","who","when","where","why","how","all","any","both","each",
        "few","more","most","other","some","such","no","nor","only","same",
        "too","into","through","during","before","after","between","while",
        "here","there","us","okay","yes","right","like","know","think","going",
        "need","want","make","take","come","give","look","good","well","really",
        "said","says","say","told","tell","think","thought","mean","means",
    }
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq: dict = {}
    for w in words:
        if w not in stop_words:
            freq[w] = freq.get(w, 0) + 1
    ranked = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [word.capitalize() for word, _ in ranked[:top_n]]
