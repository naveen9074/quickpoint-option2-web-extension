import os
import platform
import shutil

def setup_ffmpeg_path():
    if platform.system() == "Windows":
        # First check if shutil.which can find ffmpeg directly
        ffmpeg_cmd = shutil.which("ffmpeg")
        if ffmpeg_cmd:
            ffmpeg_dir = os.path.dirname(ffmpeg_cmd)
            if ffmpeg_dir not in os.environ["PATH"]:
                os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]
                print(f"[FFMPEG] Found via shutil.which and prepended to PATH: {ffmpeg_dir}")
            return

        username = os.environ.get("USERNAME") or os.environ.get("USER")
        paths_to_check = []
        if username:
            paths_to_check.append(f"C:\\Users\\{username}\\AppData\\Local\\Microsoft\\WinGet\\Links")
            paths_to_check.append(f"C:\\Users\\{username}\\AppData\\Local\\Programs\\winget\\links")
        paths_to_check.extend([
            "C:\\Program Files\\ffmpeg\\bin",
            "C:\\ffmpeg\\bin",
            "C:\\tools\\ffmpeg\\bin"
        ])
        for path in paths_to_check:
            if os.path.exists(os.path.join(path, "ffmpeg.exe")):
                if path not in os.environ["PATH"]:
                    os.environ["PATH"] = path + os.pathsep + os.environ["PATH"]
                    print(f"[FFMPEG] Found and added to PATH: {path}")
                break

# Run path setup before importing any routers/services that depend on ffmpeg
setup_ffmpeg_path()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import Base, engine
from app.routers import transcription, intelligence, analyzer, dashboard, audio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables on startup
    Base.metadata.create_all(bind=engine)
    print("[OK] QuickPoint backend started - DB tables ready.")
    yield

app = FastAPI(
    title="QuickPoint API",
    description="AI-powered real-time communication enhancement system",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allow React dev server) ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(transcription.router, prefix="/api", tags=["Module 1 – Meeting Assistant"])
app.include_router(intelligence.router,  prefix="/api", tags=["Module 2 – Post-Meeting Intelligence"])
app.include_router(analyzer.router,      prefix="/api", tags=["Module 3 – Skill Analyzer"])
app.include_router(dashboard.router,     prefix="/api", tags=["Module 4 – Dashboard"])
app.include_router(audio.router,         prefix="/api", tags=["Module 0 – Audio Enhancement"])

@app.get("/", tags=["Health"])
def root():
    return {
        "project": "QuickPoint",
        "status": "running",
        "description": "AI-powered real-time communication enhancement system",
        "modules": [
            "Audio Enhancement (Noise Cancellation + Speed Control)",
            "Real-time Meeting Assistant",
            "Post-Meeting Intelligence",
            "Communication Skill Analyzer",
            "User Dashboard",
        ],
    }
