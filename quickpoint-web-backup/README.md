# ───────────────────────────────────────────────────────────────────────────────
# ISERT – Intelligent Speech Enhancement and Real-Time Communication Toolkit
# MCA Final Year Project
# ───────────────────────────────────────────────────────────────────────────────

## 🧱 Tech Stack
| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | FastAPI (Python 3.10+)              |
| AI – STT   | OpenAI Whisper                      |
| AI – NLP   | HuggingFace Transformers            |
| Frontend   | React 18 + Vite                     |
| Database   | SQLite (default) / PostgreSQL       |
| Charts     | Recharts                            |

---

## 📦 Project Structure
```
isert/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config.py           # Settings / .env
│   │   ├── database.py         # SQLAlchemy engine
│   │   ├── models/             # DB ORM models
│   │   ├── routers/            # Module API routes
│   │   ├── services/           # AI business logic
│   │   └── schemas/            # Pydantic schemas
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── api/isertApi.js     # Axios service
        ├── pages/              # 4 module pages
        └── App.jsx             # Router + sidebar
```

---

## 🚀 Quick Start

### 1. Backend Setup
```powershell
cd isert\backend

# Copy env template
Copy-Item .env.example .env

# Install dependencies (first time takes ~5 min for torch/whisper)
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for the interactive Swagger API.

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** – the full UI.

---

## 🗂 The 4 Modules

| # | Module | Endpoint | What it does |
|---|--------|----------|-------------|
| 1 | **Meeting Assistant** | `POST /api/transcribe` | Upload audio → Whisper STT → transcript with filler highlights |
| 2 | **Post-Meeting Intelligence** | `POST /api/summarize` | Transcript → BART summary + action items + sentiment |
| 3 | **Skill Analyzer** | `POST /api/analyze` | Audio → full report: fillers, WPM, sentiment, score (0-100) |
| 4 | **Dashboard** | `GET /api/dashboard/*` | Session history, charts, aggregate analytics |

---

## 🗄️ Database
- **Default:** SQLite (`isert.db` auto-created in backend folder)
- **Switch to PostgreSQL:** Edit `.env` → set `DATABASE_URL=postgresql://user:pass@localhost/isert_db`
  - Then run `database/schema.sql` in psql for PostgreSQL-specific schema.

---

## 📊 Scoring System (Module 3)
| Metric        | Weight |
|---------------|--------|
| Filler Rate   | 40 pts |
| Speech Pace   | 30 pts |
| Sentiment     | 30 pts |

**Grades:** A (≥85) · B (≥70) · C (≥55) · D (≥40) · F (<40)
