from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, List, Optional

import httpx
import jwt
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, create_engine, func
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

APP_NAME = os.getenv("APP_NAME", "ValorBuddy Enterprise API")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./valorbuddy.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me-valorbuddy")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
GOOGLE_CALENDAR_ENABLED = os.getenv("GOOGLE_CALENDAR_ENABLED", "false").lower() == "true"
DATA_DIR = Path(os.getenv("DATA_DIR", "/tmp/valorbuddy"))
UPLOAD_DIR = DATA_DIR / "uploads"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="veteran")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    profile = relationship("UserProfile", back_populates="user", uselist=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=True)
    branch = Column(String(80), nullable=False, default="Army")
    city = Column(String(120), nullable=False, default="Dallas")
    state = Column(String(80), nullable=False, default="TX")
    interests = Column(JSON, nullable=False, default=list)
    preferred_tone = Column(String(120), nullable=False, default="calm, practical, encouraging")
    companion_mode = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="profile")


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source = Column(String(80), nullable=False, default="web")
    title = Column(String(255), nullable=False, default="ValorBuddy conversation")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Memory(Base):
    __tablename__ = "memories"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    note = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    date = Column(String(80), nullable=True)
    time = Column(String(80), nullable=True)
    when_text = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="active")
    calendar_event_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(100), nullable=False, default="general")
    file_url = Column(String(500), nullable=True)
    extracted_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ActivitySearch(Base):
    __tablename__ = "activity_searches"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    city = Column(String(120), nullable=False)
    state = Column(String(80), nullable=False)
    query = Column(String(255), nullable=False)
    provider = Column(String(120), nullable=False, default="Google Places")
    live = Column(Boolean, nullable=False, default=False)
    results = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MusicFavorite(Base):
    __tablename__ = "music_favorites"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=True)
    mood = Column(String(80), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt, digest = stored.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
        return secrets.compare_digest(candidate, digest)
    except Exception:
        return False


def create_access_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user.id), "email": user.email, "role": user.role, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user


def get_optional_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> Optional[User]:
    try:
        return get_current_user(authorization, db)
    except Exception:
        return None


def admin_required(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str
    last_name: str = ""
    branch: str = "Army"
    city: str = "Dallas"
    state: str = "TX"
    interests: List[str] = []


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileOut(BaseModel):
    id: int
    email: str
    role: str
    first_name: str
    last_name: str | None = ""
    branch: str
    city: str
    state: str
    interests: List[str] = []


class LoginResponse(BaseModel):
    token: str
    user: ProfileOut


class CompanionRequest(BaseModel):
    message: str
    conversation_id: int | None = None
    mode: str = "companion"


class ReminderIn(BaseModel):
    title: str
    date: str = ""
    time: str = ""
    when_text: str = ""
    note: str = ""


class MemoryIn(BaseModel):
    title: str
    note: str = ""
    tags: List[str] = []
    image_url: str | None = None


class VapiActionRequest(BaseModel):
    intent: str = "general"
    query: str = ""
    message: str = ""
    first_name: str = ""
    email: str = ""
    branch: str = "Army"
    city: str = "Dallas"
    state: str = "TX"
    title: str = ""
    date: str = ""
    time: str = ""
    memory: str = ""
    mood: str = "calm"


def profile_out(user: User) -> ProfileOut:
    p = user.profile
    return ProfileOut(id=user.id, email=user.email, role=user.role, first_name=p.first_name if p else "Veteran", last_name=p.last_name if p else "", branch=p.branch if p else "Army", city=p.city if p else "Dallas", state=p.state if p else "TX", interests=p.interests if p else [])


async def gemini_reply(prompt: str, fallback: str) -> str:
    if not GEMINI_API_KEY:
        return fallback
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.55, "maxOutputTokens": 700}}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return fallback


async def google_places(city: str, state: str, query: str) -> tuple[bool, list[dict[str, Any]]]:
    fallback = [
        {"title": "Veteran Coffee Meetup", "location": f"{city}, {state}", "type": "Community", "description": "A local meetup-style suggestion for veteran connection."},
        {"title": "VFW / American Legion Post Visit", "location": f"Near {city}", "type": "Veteran community", "description": "Search nearby veteran organizations and social events."},
        {"title": "VA Resource Check-in", "location": f"{city} area", "type": "Benefits", "description": "Look for VA support services, clinics, or resource offices."},
        {"title": "Outdoor Walk or Park Check-in", "location": f"Near {city}", "type": "Wellness", "description": "A simple positive activity to reset the day."},
    ]
    if not GOOGLE_MAPS_API_KEY:
        return False, fallback
    text_query = f"{query or 'veteran events VFW American Legion VA community'} near {city}, {state}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://maps.googleapis.com/maps/api/place/textsearch/json", params={"query": text_query, "key": GOOGLE_MAPS_API_KEY})
            r.raise_for_status()
            data = r.json()
        results = []
        for item in data.get("results", [])[:6]:
            results.append({"title": item.get("name"), "location": item.get("formatted_address", f"{city}, {state}"), "type": ", ".join(item.get("types", [])[:2]), "rating": item.get("rating"), "description": "Live Google Places result", "place_id": item.get("place_id")})
        return True, results or fallback
    except Exception:
        return False, fallback


def benefits_lookup(query: str, state: str, branch: str) -> dict[str, Any]:
    q = (query or "benefits").lower()
    items = []
    if any(x in q for x in ["education", "school", "gi", "tuition"]):
        items.append({"title": "GI Bill and education benefits", "summary": "Review Post-9/11 GI Bill, school certification, housing allowance basics, and state education programs.", "next_step": "Gather DD214, school/program details, and check eligibility on VA.gov."})
    if any(x in q for x in ["disability", "claim", "rating", "compensation"]):
        items.append({"title": "VA disability compensation", "summary": "You can organize evidence and questions for a service-connected claim. ValorBuddy can help prepare a checklist, not decide eligibility.", "next_step": "Speak with a VSO or VA-accredited representative."})
    if any(x in q for x in ["home", "loan", "mortgage"]):
        items.append({"title": "VA home loan", "summary": "VA-backed home loans may support buying, refinancing, or repairing a home.", "next_step": "Check Certificate of Eligibility and talk with a VA-approved lender."})
    if not items:
        items = [{"title": "Benefits starting point", "summary": "Common categories include healthcare, disability compensation, education, home loan, employment, pension, and survivor benefits.", "next_step": "Ask about one category and ValorBuddy will build a plain-English checklist."}]
    return {"disclaimer": "Informational only. Use VA.gov or a VA-accredited representative for official guidance.", "items": items, "state": state, "branch": branch}


def music_suggestions(mood: str, branch: str) -> list[dict[str, str]]:
    mood_l = (mood or "calm").lower()
    if "patriotic" in mood_l or "military" in mood_l:
        return [{"title": "Patriotic instrumental playlist", "url": "https://www.youtube.com/results?search_query=patriotic+instrumental+music", "mood": mood}, {"title": f"{branch} cadence and heritage music", "url": f"https://www.youtube.com/results?search_query={branch}+military+cadence", "mood": mood}]
    if "gospel" in mood_l:
        return [{"title": "Calming gospel playlist", "url": "https://www.youtube.com/results?search_query=calming+gospel+playlist", "mood": mood}]
    if "country" in mood_l:
        return [{"title": "Classic country calm mix", "url": "https://www.youtube.com/results?search_query=classic+country+calm+playlist", "mood": mood}]
    return [{"title": "Calm instrumental focus", "url": "https://www.youtube.com/results?search_query=calm+instrumental+music", "mood": mood}, {"title": "Relaxing old school classics", "url": "https://www.youtube.com/results?search_query=relaxing+old+school+classics", "mood": mood}]


def infer_intent(text: str) -> str:
    t = (text or "").lower()
    if any(x in t for x in ["event", "activity", "vfw", "american legion", "near me", "places", "coffee", "park", "va facility", "clinic"]):
        return "find_local_veteran_activities"
    if any(x in t for x in ["remind", "reminder", "appointment", "call the va", "schedule"]):
        return "create_reminder"
    if any(x in t for x in ["remember", "memory", "save this"]):
        return "save_memory"
    if any(x in t for x in ["benefit", "claim", "gi bill", "disability", "home loan", "va loan"]):
        return "search_benefits"
    if any(x in t for x in ["music", "song", "playlist", "play something"]):
        return "suggest_music"
    if any(x in t for x in ["briefing", "today", "how is my day", "schedule"]):
        return "get_today_briefing"
    return "general"


app = FastAPI(title=APP_NAME, version="3.0.0")
origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins or ["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@valorbuddy.com").first():
            admin = User(email="admin@valorbuddy.com", password_hash=hash_password("ValorAdmin123!"), role="admin")
            db.add(admin); db.flush()
            db.add(UserProfile(user_id=admin.id, first_name="Eugene", last_name="", branch="Army", city="Dallas", state="TX", interests=["analytics", "veteran pilots"]))
        if not db.query(User).filter(User.email == "demo@valorbuddy.com").first():
            demo = User(email="demo@valorbuddy.com", password_hash=hash_password("ValorDemo123!"), role="veteran")
            db.add(demo); db.flush()
            db.add(UserProfile(user_id=demo.id, first_name="James", last_name="", branch="Army", city="Dallas", state="TX", interests=["events", "benefits", "music", "memories"]))
        db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "app": APP_NAME, "version": "3.0.0", "database": "postgres" if DATABASE_URL.startswith("postgres") else "sqlite", "gemini": bool(GEMINI_API_KEY), "google_places": bool(GOOGLE_MAPS_API_KEY)}


@app.get("/db/tables")
def db_tables():
    return {"tables": sorted(Base.metadata.tables.keys())}


@app.post("/auth/register", response_model=LoginResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(email=str(payload.email).lower(), password_hash=hash_password(payload.password), role="veteran")
    db.add(user); db.flush()
    db.add(UserProfile(user_id=user.id, first_name=payload.first_name, last_name=payload.last_name, branch=payload.branch, city=payload.city, state=payload.state, interests=payload.interests))
    db.add(AdminAuditLog(user_id=user.id, action="user.registered", details=user.email))
    db.commit(); db.refresh(user)
    token = create_access_token(user)
    return LoginResponse(token=token, user=profile_out(user))


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user)
    db.add(AuthToken(user_id=user.id, token=token)); db.add(AdminAuditLog(user_id=user.id, action="user.login", details=user.email)); db.commit()
    return LoginResponse(token=token, user=profile_out(user))


@app.get("/auth/me", response_model=ProfileOut)
def me(user: User = Depends(get_current_user)):
    return profile_out(user)


@app.get("/api/profile")
def get_profile(user: User = Depends(get_current_user)):
    return profile_out(user).model_dump()


@app.post("/api/profile")
def update_profile(payload: RegisterRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = user.profile
    p.first_name = payload.first_name; p.last_name = payload.last_name; p.branch = payload.branch; p.city = payload.city; p.state = payload.state; p.interests = payload.interests; p.updated_at = datetime.now(timezone.utc)
    db.commit()
    return profile_out(user).model_dump()


@app.get("/api/events/search")
async def events_search(city: str = "Dallas", state: str = "TX", keyword: str = "veteran events", user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    live, items = await google_places(city, state, keyword)
    db.add(ActivitySearch(user_id=user.id if user else None, city=city, state=state, query=keyword, live=live, results=items)); db.commit()
    return {"live": live, "provider": "Google Places" if live else "Fallback", "items": items}


@app.post("/api/reminders")
def create_reminder(payload: ReminderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = Reminder(user_id=user.id, title=payload.title, date=payload.date, time=payload.time, when_text=payload.when_text or f"{payload.date} {payload.time}".strip(), note=payload.note)
    db.add(row); db.add(AdminAuditLog(user_id=user.id, action="reminder.created", details=payload.title)); db.commit(); db.refresh(row)
    return {"id": row.id, "title": row.title, "date": row.date, "time": row.time, "when_text": row.when_text, "status": row.status, "calendar_enabled": GOOGLE_CALENDAR_ENABLED}


@app.get("/api/reminders")
def list_reminders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Reminder).filter(Reminder.user_id == user.id).order_by(Reminder.id.desc()).all()
    return [{"id": r.id, "title": r.title, "date": r.date, "time": r.time, "when_text": r.when_text, "status": r.status} for r in rows]


@app.post("/api/memories")
def create_memory(payload: MemoryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = Memory(user_id=user.id, title=payload.title, note=payload.note, tags=payload.tags, image_url=payload.image_url)
    db.add(row); db.add(AdminAuditLog(user_id=user.id, action="memory.created", details=payload.title)); db.commit(); db.refresh(row)
    return {"id": row.id, "title": row.title, "note": row.note, "tags": row.tags, "image_url": row.image_url}


@app.get("/api/memories")
def list_memories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.id.desc()).all()
    return [{"id": r.id, "title": r.title, "note": r.note, "tags": r.tags, "image_url": r.image_url} for r in rows]


@app.get("/api/benefits/search")
def search_benefits(query: str = "benefits", state: str = "TX", branch: str = "Army"):
    return benefits_lookup(query, state, branch)


@app.get("/api/music/suggest")
def suggest_music(mood: str = "calm", branch: str = "Army"):
    return {"items": music_suggestions(mood, branch)}


@app.get("/api/briefing")
async def today_briefing(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = user.profile
    rems = db.query(Reminder).filter(Reminder.user_id == user.id, Reminder.status == "active").order_by(Reminder.id.desc()).limit(3).all()
    live, events = await google_places(p.city, p.state, "veteran events VA VFW American Legion")
    return {"greeting": f"Good to see you, {p.first_name}. How is your day going?", "location": f"{p.city}, {p.state}", "reminders": [{"title": r.title, "when_text": r.when_text} for r in rems], "events": events[:3], "wellness_prompt": "Take a steady breath, check your plan for today, and choose one positive action."}


@app.post("/api/companion/chat")
async def companion_chat(payload: CompanionRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = user.profile
    conv = db.get(Conversation, payload.conversation_id) if payload.conversation_id else None
    if not conv:
        conv = Conversation(user_id=user.id, source="web", title="ValorBuddy companion")
        db.add(conv); db.flush()
    recent_memories = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.id.desc()).limit(5).all()
    recent_reminders = db.query(Reminder).filter(Reminder.user_id == user.id).order_by(Reminder.id.desc()).limit(5).all()
    prompt = f"""You are ValorBuddy, a calm practical veteran companion. Address the user by first name.
User: {p.first_name}, Branch: {p.branch}, Location: {p.city}, {p.state}, Interests: {p.interests}
Recent memories: {[m.title for m in recent_memories]}
Recent reminders: {[r.title for r in recent_reminders]}
User message: {payload.message}
Respond warmly, briefly, practically. If they need local data, suggest asking for events/places. Safety: you are not a clinician; for crisis encourage immediate help/988 press 1."""
    fallback = f"{p.first_name}, I hear you. I can help with local veteran activities, reminders, memories, benefits, documents, music, or a quick plan for today. What would help most right now?"
    reply = await gemini_reply(prompt, fallback)
    db.add(Message(conversation_id=conv.id, user_id=user.id, role="user", content=payload.message))
    db.add(Message(conversation_id=conv.id, user_id=user.id, role="assistant", content=reply))
    db.commit()
    return {"conversation_id": conv.id, "response": reply, "reply": reply}


@app.post("/api/documents")
async def upload_document(doc_type: str = Form("general"), file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    content = await file.read()
    safe_name = f"{user.id}_{int(datetime.now().timestamp())}_{file.filename}"
    path = UPLOAD_DIR / safe_name
    path.write_bytes(content)
    extracted = ""
    try:
        if file.filename.lower().endswith((".txt", ".md", ".csv")):
            extracted = content.decode("utf-8", errors="ignore")[:6000]
    except Exception:
        extracted = ""
    summary = await gemini_reply(f"Summarize this veteran document in simple helpful terms:\n{extracted[:4000]}", "Document uploaded and stored. AI search is ready for text-based files.")
    row = Document(user_id=user.id, filename=file.filename, doc_type=doc_type, file_url=f"/uploads/{safe_name}", extracted_text=extracted, ai_summary=summary)
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "filename": row.filename, "doc_type": row.doc_type, "file_url": row.file_url, "ai_summary": row.ai_summary}


@app.get("/api/documents")
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Document).filter(Document.user_id == user.id).order_by(Document.id.desc()).all()
    return [{"id": r.id, "filename": r.filename, "doc_type": r.doc_type, "file_url": r.file_url, "ai_summary": r.ai_summary} for r in rows]


@app.post("/api/vapi/action")
async def vapi_action(payload: VapiActionRequest, db: Session = Depends(get_db)):
    text = payload.message or payload.query or payload.title or payload.memory or ""
    intent = payload.intent if payload.intent and payload.intent != "general" else infer_intent(text)
    email = (payload.email or "demo@valorbuddy.com").lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.email == "demo@valorbuddy.com").first()
    first_name = payload.first_name or (user.profile.first_name if user and user.profile else "there")
    branch = payload.branch or (user.profile.branch if user and user.profile else "Army")
    city = payload.city or (user.profile.city if user and user.profile else "Dallas")
    state = payload.state or (user.profile.state if user and user.profile else "TX")

    if intent == "find_local_veteran_activities":
        live, items = await google_places(city, state, payload.query or text or "veteran events")
        response = f"{first_name}, I found {len(items)} veteran-friendly options near {city}. The top options are: " + "; ".join([i.get("title", "Option") for i in items[:3]]) + "."
        return {"response": response, "intent": intent, "data": {"live": live, "items": items}}
    if intent == "create_reminder":
        title = payload.title or text or "Reminder"
        if user:
            row = Reminder(user_id=user.id, title=title, date=payload.date, time=payload.time, when_text=f"{payload.date} {payload.time}".strip() or "Soon")
            db.add(row); db.commit()
        return {"response": f"Absolutely, {first_name}. I saved that reminder: {title}.", "intent": intent}
    if intent == "save_memory":
        title = payload.title or "Memory"
        note = payload.memory or text
        if user:
            db.add(Memory(user_id=user.id, title=title, note=note, tags=["voice"])); db.commit()
        return {"response": f"I saved that memory for you, {first_name}.", "intent": intent}
    if intent == "search_benefits":
        data = benefits_lookup(payload.query or text, state, branch)
        response = f"{first_name}, here is a good starting point: {data['items'][0]['title']}. {data['items'][0]['summary']}"
        return {"response": response, "intent": intent, "data": data}
    if intent == "suggest_music":
        items = music_suggestions(payload.mood or text or "calm", branch)
        return {"response": f"{first_name}, I found a calming option: {items[0]['title']}. I can open the playlist link in the app.", "intent": intent, "data": {"items": items}}
    if intent == "get_today_briefing":
        return {"response": f"Good to see you, {first_name}. Today, start with one steady breath, check your reminders, and consider one local veteran-friendly activity near {city}. I can search live events now if you want.", "intent": intent}
    if intent == "get_user_profile":
        return {"response": f"I have your profile as {first_name}, {branch}, located around {city}, {state}.", "intent": intent}
    prompt = f"User {first_name}, branch {branch}, city {city}, state {state} said: {text}. Respond as ValorBuddy, practical veteran companion."
    response = await gemini_reply(prompt, f"{first_name}, I can help with veteran events, reminders, memories, benefits, music, documents, and today’s plan. What would you like me to handle first?")
    return {"response": response, "intent": intent}


@app.get("/admin/overview")
def admin_overview(_: User = Depends(admin_required), db: Session = Depends(get_db)):
    return {"users": db.query(User).count(), "veterans": db.query(User).filter(User.role == "veteran").count(), "admins": db.query(User).filter(User.role == "admin").count(), "reminders": db.query(Reminder).count(), "memories": db.query(Memory).count(), "conversations": db.query(Conversation).count(), "messages": db.query(Message).count(), "documents": db.query(Document).count(), "activity_searches": db.query(ActivitySearch).count()}


@app.get("/admin/users")
def admin_users(_: User = Depends(admin_required), db: Session = Depends(get_db)):
    rows = db.query(User).order_by(User.id.desc()).all()
    return [{"id": u.id, "email": u.email, "role": u.role, "active": u.is_active, "first_name": u.profile.first_name if u.profile else "", "branch": u.profile.branch if u.profile else "", "city": u.profile.city if u.profile else "", "state": u.profile.state if u.profile else ""} for u in rows]


@app.get("/admin/activity")
def admin_activity(_: User = Depends(admin_required), db: Session = Depends(get_db)):
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.id.desc()).limit(100).all()
    return [{"id": l.id, "user_id": l.user_id, "action": l.action, "details": l.details, "created_at": l.created_at.isoformat() if l.created_at else None} for l in logs]
