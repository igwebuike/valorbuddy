from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

APP_NAME = os.getenv("APP_NAME", "ValorBuddy API")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./valorbuddy.db")
DATA_DIR = Path(os.getenv("DATA_DIR", "/tmp/valorbuddy"))
UPLOAD_DIR = DATA_DIR / "uploads"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class UserProfileDB(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False, default="local")
    name = Column(String(120), nullable=False, default="Veteran")
    branch = Column(String(80), nullable=False, default="Army")
    city = Column(String(120), nullable=False, default="Dallas")
    state = Column(String(80), nullable=False, default="TX")
    interests = Column(JSON, nullable=False, default=list)
    preferred_tone = Column(String(120), nullable=False, default="calm and positive")
    companion_mode = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MemoryDB(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True, index=True)
    profile_email = Column(String(255), index=True, nullable=False, default="local")
    title = Column(String(255), nullable=False)
    note = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ReminderDB(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    profile_email = Column(String(255), index=True, nullable=False, default="local")
    title = Column(String(255), nullable=False)
    when_text = Column(String(255), nullable=False)
    note = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ConversationDB(Base):
    __tablename__ = "companion_conversations"
    id = Column(Integer, primary_key=True, index=True)
    profile_email = Column(String(255), index=True, nullable=False, default="local")
    user_message = Column(Text, nullable=False)
    ai_reply = Column(Text, nullable=False)
    mode = Column(String(80), nullable=False, default="companion")
    source = Column(String(80), nullable=False, default="fallback")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ActivityCacheDB(Base):
    __tablename__ = "activity_searches"
    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(120), nullable=False)
    state = Column(String(80), nullable=False)
    interest = Column(String(255), nullable=False)
    provider = Column(String(120), nullable=False)
    live = Column(Boolean, nullable=False, default=False)
    results = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MusicFavoriteDB(Base):
    __tablename__ = "music_favorites"
    id = Column(Integer, primary_key=True, index=True)
    profile_email = Column(String(255), index=True, nullable=False, default="local")
    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=True)
    mood = Column(String(80), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI(title=APP_NAME, version="2.1.0")
origins = [x.strip() for x in CORS_ORIGINS.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


class Profile(BaseModel):
    name: str = "Veteran"
    branch: str = "Army"
    city: str = "Dallas"
    state: str = "TX"
    interests: List[str] = []
    preferred_tone: str = "calm and positive"


class ProfileIn(Profile):
    email: str = "local"


class CompanionRequest(BaseModel):
    profile: Profile = Field(default_factory=Profile)
    message: str
    mode: str = "companion"
    recent_memories: List[str] = []
    profile_email: str = "local"


class MemoryIn(BaseModel):
    profile_email: str = "local"
    title: str
    note: str = ""
    tags: List[str] = []
    image_url: Optional[str] = None


class ReminderIn(BaseModel):
    profile_email: str = "local"
    title: str
    when_text: str
    note: str = ""


@app.on_event("startup")
def on_startup():
    create_tables()
    db = SessionLocal()
    try:
        existing = db.query(UserProfileDB).filter(UserProfileDB.email == "local").first()
        if not existing:
            db.add(UserProfileDB(email="local", name="Veteran", branch="Army", city="Dallas", state="TX", interests=["local events", "benefits", "memories"]))
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": "2.1.0",
        "database": "postgres" if DATABASE_URL.startswith("postgres") else "sqlite",
        "tables_auto_create": True,
        "gemini": bool(GEMINI_API_KEY),
        "google_maps": bool(GOOGLE_MAPS_API_KEY),
    }


@app.get("/db/tables")
def db_tables():
    return {
        "tables": [
            "user_profiles",
            "memories",
            "reminders",
            "companion_conversations",
            "activity_searches",
            "music_favorites",
        ]
    }


async def gemini_answer(req: CompanionRequest) -> str | None:
    if not GEMINI_API_KEY:
        return None
    profile = req.profile
    system = (
        "You are ValorBuddy, a warm, positive AI companion and practical assistant for veterans. "
        "You are not a clinician, therapist, emergency service, or legal representative. "
        "Do not diagnose or treat PTSD. You may provide grounding, encouragement, practical reminders, resource navigation, "
        "local activity suggestions, benefits guidance in plain English, and gentle companionship. "
        "If the user mentions immediate danger, self-harm, harming others, or crisis, urge them to call 988 and press 1 in the U.S., "
        "call emergency services, or contact a trusted person now. Keep responses concise, personal, and action-oriented. "
        f"Call the user by first name: {profile.name}. Their branch is {profile.branch}. Location: {profile.city}, {profile.state}. "
        f"Tone preference: {profile.preferred_tone}."
    )
    memories = "\n".join(f"- {m}" for m in req.recent_memories[:5]) or "No memories shared yet."
    prompt = f"{system}\n\nRecent memories to use gently if relevant:\n{memories}\n\nUser message: {req.message}"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.55, "maxOutputTokens": 420}}
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return None


def fallback_answer(req: CompanionRequest) -> str:
    name = req.profile.name or "friend"
    msg = req.message.lower()
    if any(x in msg for x in ["crisis", "suicide", "kill myself", "harm myself", "can't go on"]):
        return f"{name}, I’m really glad you said something. If you might hurt yourself or someone else, call 988 and press 1 now, call emergency services, or reach a trusted person immediately. Stay with someone and move away from anything dangerous."
    if any(x in msg for x in ["ptsd", "anxious", "panic", "stress", "nightmare"]):
        return f"{name}, I’m here with you. Let’s take one small step: breathe in for four, hold for two, breathe out for six. Look around and name five things you can see. You’re not alone. I can also remind you about calming routines, play a gentle instrumental tone, or help find a nearby veteran-friendly activity."
    if any(x in msg for x in ["memory", "photo", "picture", "remember"]):
        return f"{name}, you can add that to your Memory Wall so ValorBuddy can bring it back later as a positive reminder. Add a title, a note, and a photo if you want."
    if any(x in msg for x in ["song", "music", "play"]):
        return f"{name}, I can play a calming instrumental sound here and suggest uplifting playlists. For licensed songs, use the Music Companion links to open Spotify or YouTube."
    if any(x in msg for x in ["event", "activity", "near", "local"]):
        return f"{name}, I’ll look for veteran-friendly events and activities near {req.profile.city}, {req.profile.state}. Try community meetups, VFW/American Legion posts, job fairs, parks, coffee groups, museums, or service opportunities."
    if any(x in msg for x in ["benefit", "claim", "va", "dd214"]):
        return f"{name}, I can help you organize the next steps in plain English. For official benefits action, use VA.gov or a certified VSO. Tell me the benefit type and I’ll build a checklist."
    return f"{name}, I’m with you. Tell me what you need: benefits help, local activities, reminders, memories, documents, music, or a quick grounding check-in."


@app.get("/profile/{email}")
def get_profile(email: str):
    db = SessionLocal()
    try:
        row = db.query(UserProfileDB).filter(UserProfileDB.email == email).first()
        if not row:
            return None
        return {"email": row.email, "name": row.name, "branch": row.branch, "city": row.city, "state": row.state, "interests": row.interests or [], "preferred_tone": row.preferred_tone}
    finally:
        db.close()


@app.post("/profile")
def save_profile(profile: ProfileIn):
    db = SessionLocal()
    try:
        row = db.query(UserProfileDB).filter(UserProfileDB.email == profile.email).first()
        if not row:
            row = UserProfileDB(email=profile.email)
            db.add(row)
        row.name = profile.name
        row.branch = profile.branch
        row.city = profile.city
        row.state = profile.state
        row.interests = profile.interests
        row.preferred_tone = profile.preferred_tone
        row.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"ok": True, "profile": profile.model_dump()}
    finally:
        db.close()


@app.post("/ai/companion")
async def ai_companion(req: CompanionRequest):
    answer = await gemini_answer(req)
    source = "gemini" if answer else "fallback"
    reply = answer or fallback_answer(req)
    db = SessionLocal()
    try:
        db.add(ConversationDB(profile_email=req.profile_email or "local", user_message=req.message, ai_reply=reply, mode=req.mode, source=source))
        db.commit()
    finally:
        db.close()
    return {"reply": reply, "source": source}


@app.get("/activities")
async def activities(city: str = "Dallas", state: str = "TX", interest: str = "veteran events"):
    query = f"veteran friendly {interest} near {city} {state}"
    live = False
    provider = "Fallback curated list"
    items = []
    if GOOGLE_MAPS_API_KEY:
        try:
            url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params={"query": query, "key": GOOGLE_MAPS_API_KEY})
                r.raise_for_status()
                data = r.json().get("results", [])[:8]
            live = True
            provider = "Google Places"
            items = [{"title": x.get("name"), "location": x.get("formatted_address"), "rating": x.get("rating"), "type": "Local activity/resource", "open_now": x.get("opening_hours", {}).get("open_now")} for x in data]
        except Exception:
            items = []
    if not items:
        items = [
            {"title": "Veteran Coffee Meetup", "type": "Community", "location": f"{city}, {state}", "date": "This week"},
            {"title": "VFW / American Legion Post Visit", "type": "Veteran community", "location": f"Near {city}", "date": "Any day"},
            {"title": "Veteran Job & Resource Fair", "type": "Employment", "location": f"{city} metro", "date": "Next available"},
            {"title": "Outdoor Walk or Park Check-in", "type": "Wellness", "location": f"Near {city}", "date": "Today"},
            {"title": "Veteran-Owned Business Visit", "type": "Discounts", "location": f"{city}, {state}", "date": "Daily"},
        ]
    db = SessionLocal()
    try:
        db.add(ActivityCacheDB(city=city, state=state, interest=interest, provider=provider, live=live, results=items))
        db.commit()
    finally:
        db.close()
    return {"live": live, "provider": provider, "items": items}


@app.get("/music/suggestions")
def music_suggestions(mood: str = "calm"):
    mood = mood.lower()
    if "energy" in mood or "motivat" in mood:
        theme = "uplifting veteran motivation playlist"
    elif "sleep" in mood:
        theme = "calm sleep instrumental playlist"
    else:
        theme = "calm instrumental grounding playlist"
    return {"note": "ValorBuddy can play built-in calming tones. For commercial songs, open a licensed music service.", "suggestions": [{"title": "Calm instrumental grounding", "action": "play_builtin_calm"}, {"title": "Uplifting classics", "url": f"https://open.spotify.com/search/{theme.replace(' ', '%20')}"}, {"title": "YouTube calming playlist search", "url": f"https://www.youtube.com/results?search_query={theme.replace(' ', '+')}"}]}


@app.get("/memories")
def list_memories(profile_email: str = "local"):
    db = SessionLocal()
    try:
        rows = db.query(MemoryDB).filter(MemoryDB.profile_email == profile_email).order_by(MemoryDB.id.desc()).all()
        return [{"id": r.id, "profile_email": r.profile_email, "title": r.title, "note": r.note or "", "tags": r.tags or [], "image_url": r.image_url, "created_at": r.created_at} for r in rows]
    finally:
        db.close()


@app.post("/memories")
def add_memory(memory: MemoryIn):
    db = SessionLocal()
    try:
        row = MemoryDB(**memory.model_dump())
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"id": row.id, "profile_email": row.profile_email, "title": row.title, "note": row.note or "", "tags": row.tags or [], "image_url": row.image_url, "created_at": row.created_at}
    finally:
        db.close()


@app.post("/memories/photo")
async def add_memory_photo(profile_email: str = Form("local"), title: str = Form(...), note: str = Form(""), file: UploadFile = File(...)):
    safe_name = f"{int(datetime.now().timestamp())}_{file.filename}".replace("/", "_")
    path = UPLOAD_DIR / safe_name
    path.write_bytes(await file.read())
    image_url = f"/uploads/{safe_name}"
    return add_memory(MemoryIn(profile_email=profile_email, title=title, note=note, image_url=image_url))


@app.get("/reminders")
def list_reminders(profile_email: str = "local"):
    db = SessionLocal()
    try:
        rows = db.query(ReminderDB).filter(ReminderDB.profile_email == profile_email).order_by(ReminderDB.id.desc()).all()
        return [{"id": r.id, "profile_email": r.profile_email, "title": r.title, "when_text": r.when_text, "note": r.note or "", "status": r.status, "created_at": r.created_at} for r in rows]
    finally:
        db.close()


@app.post("/reminders")
def add_reminder(reminder: ReminderIn):
    db = SessionLocal()
    try:
        row = ReminderDB(**reminder.model_dump(), status="active")
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"id": row.id, "profile_email": row.profile_email, "title": row.title, "when_text": row.when_text, "note": row.note or "", "status": row.status, "created_at": row.created_at}
    finally:
        db.close()
