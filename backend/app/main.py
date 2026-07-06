from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote_plus
from typing import Any, List, Optional

import httpx
import jwt
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, Request
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
    transcript: str = ""
    first_name: str = ""
    email: str = ""
    branch: str = ""
    city: str = ""
    state: str = ""
    user_type: str = "Veteran"
    title: str = ""
    date: str = ""
    time: str = ""
    memory: str = ""
    mood: str = "calm"

    class Config:
        extra = "allow"


class BranchUpdate(BaseModel):
    branch: str


def profile_out(user: User) -> ProfileOut:
    p = user.profile
    return ProfileOut(id=user.id, email=user.email, role=user.role, first_name=p.first_name if p else "Veteran", last_name=p.last_name if p else "", branch=p.branch if p else "Army", city=p.city if p else "Dallas", state=p.state if p else "TX", interests=p.interests if p else [])


async def gemini_reply(prompt: str, fallback: str) -> str:
    """Gemini wrapper. If the key is missing/fails, use a dynamic non-canned fallback."""
    if not GEMINI_API_KEY:
        return fallback
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.72, "maxOutputTokens": 900},
    }
    try:
        async with httpx.AsyncClient(timeout=22) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return fallback


def clean_text(text: str) -> str:
    return " ".join((text or "").strip().split())


def human_list(items: list[dict[str, Any]], limit: int = 3) -> str:
    parts = []
    for idx, item in enumerate(items[:limit], 1):
        name = item.get("title") or item.get("name") or "Option"
        loc = item.get("location") or item.get("type") or "nearby"
        rating = f" — rating {item.get('rating')}" if item.get("rating") else ""
        parts.append(f"{idx}. {name} ({loc}){rating}")
    return " ".join(parts)


async def google_places(city: str, state: str, query: str) -> tuple[bool, list[dict[str, Any]]]:
    """Search live Google Places when configured; otherwise return varied realistic demo cards."""
    clean_query = clean_text(query) or "veteran friendly places"
    fallback_map = {
        "coffee": [
            {"title": "Veteran-friendly coffee nearby", "location": f"Near {city}, {state}", "type": "Coffee", "description": "Demo card until GOOGLE_PLACES_API_KEY is connected. Use this to show the flow, then enable live Google Places.", "maps_url": f"https://www.google.com/maps/search/veteran+friendly+coffee+near+{quote_plus(city+' '+state)}"},
            {"title": "American Legion coffee social", "location": f"{city} area", "type": "Veteran community", "description": "Good for a quick meetup, conversation, or networking with other veterans.", "maps_url": f"https://www.google.com/maps/search/American+Legion+near+{quote_plus(city+' '+state)}"},
        ],
        "clinic": [
            {"title": "Nearest VA clinic search", "location": f"Near {city}, {state}", "type": "VA care", "description": "Open map results for VA clinics and resource centers near the veteran.", "maps_url": f"https://www.google.com/maps/search/VA+clinic+near+{quote_plus(city+' '+state)}"},
            {"title": "Vet Center / counseling resource search", "location": f"{city} area", "type": "Support", "description": "For official support, use VA.gov or call the facility before going.", "maps_url": f"https://www.google.com/maps/search/Vet+Center+near+{quote_plus(city+' '+state)}"},
        ],
        "parks": [
            {"title": "Quiet park or walking trail", "location": f"Near {city}, {state}", "type": "Wellness", "description": "A simple low-pressure reset option nearby.", "maps_url": f"https://www.google.com/maps/search/parks+near+{quote_plus(city+' '+state)}"},
            {"title": "Lake, trail, or outdoor space", "location": f"{city} area", "type": "Outdoor", "description": "Good for fresh air, family time, or decompression.", "maps_url": f"https://www.google.com/maps/search/trails+near+{quote_plus(city+' '+state)}"},
        ],
        "food": [
            {"title": "Mission BBQ / veteran-friendly restaurant search", "location": f"Near {city}, {state}", "type": "Food", "description": "Look for veteran-friendly restaurants and military discount spots.", "maps_url": f"https://www.google.com/maps/search/veteran+discount+restaurants+near+{quote_plus(city+' '+state)}"},
            {"title": "Veteran-owned restaurant search", "location": f"{city} area", "type": "Food", "description": "Support veteran-owned businesses nearby.", "maps_url": f"https://www.google.com/maps/search/veteran+owned+restaurant+near+{quote_plus(city+' '+state)}"},
        ],
    }
    q = clean_query.lower()
    if any(k in q for k in ["coffee", "breakfast", "cafe"]):
        fallback = fallback_map["coffee"]
    elif any(k in q for k in ["clinic", "hospital", "doctor", "va"]):
        fallback = fallback_map["clinic"]
    elif any(k in q for k in ["park", "walk", "trail", "outdoor"]):
        fallback = fallback_map["parks"]
    elif any(k in q for k in ["food", "restaurant", "bbq", "lunch", "dinner"]):
        fallback = fallback_map["food"]
    else:
        fallback = [
            {"title": "VFW or American Legion post", "location": f"Near {city}, {state}", "type": "Veteran community", "description": "Community, networking, and veteran-friendly events.", "maps_url": f"https://www.google.com/maps/search/VFW+American+Legion+near+{quote_plus(city+' '+state)}"},
            {"title": "Veteran-friendly coffee or meetup", "location": f"{city} area", "type": "Social", "description": "A simple option for connection without pressure.", "maps_url": f"https://www.google.com/maps/search/veteran+coffee+near+{quote_plus(city+' '+state)}"},
            {"title": "VA resource or benefits office", "location": f"Near {city}", "type": "Benefits", "description": "Useful for official VA questions or referrals.", "maps_url": f"https://www.google.com/maps/search/VA+benefits+office+near+{quote_plus(city+' '+state)}"},
            {"title": "Outdoor reset spot", "location": f"Near {city}", "type": "Wellness", "description": "Park, trail, or quiet outdoor option.", "maps_url": f"https://www.google.com/maps/search/parks+near+{quote_plus(city+' '+state)}"},
        ]
    if not GOOGLE_MAPS_API_KEY:
        return False, fallback
    try:
        text_query = f"{clean_query} near {city}, {state}"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://maps.googleapis.com/maps/api/place/textsearch/json", params={"query": text_query, "key": GOOGLE_MAPS_API_KEY})
            r.raise_for_status()
            data = r.json()
        status = data.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            return False, [{**x, "description": f"Google Places returned {status}. Check key, billing, Places API, and restrictions."} for x in fallback]
        results = []
        seen = set()
        for item in data.get("results", [])[:8]:
            name = item.get("name") or "Local option"
            if name.lower() in seen:
                continue
            seen.add(name.lower())
            address = item.get("formatted_address", f"{city}, {state}")
            place_id = item.get("place_id")
            results.append({
                "title": name,
                "location": address,
                "type": ", ".join(item.get("types", [])[:3]),
                "rating": item.get("rating"),
                "description": f"Live Google Places result for: {clean_query}",
                "place_id": place_id,
                "maps_url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(name + ' ' + address)}" + (f"&query_place_id={place_id}" if place_id else ""),
            })
        return True, results or fallback
    except Exception as exc:
        return False, [{**x, "description": f"Google Places call failed: {type(exc).__name__}. Check Render env vars and API restrictions."} for x in fallback]


def benefits_lookup(query: str, state: str, branch: str) -> dict[str, Any]:
    q = (query or "benefits").lower()
    items = []
    if any(x in q for x in ["spouse", "dependent", "wife", "husband", "child", "children", "survivor", "caregiver", "family"]):
        items.append({"title": "Spouse, dependent, survivor, and caregiver pathways", "summary": "ValorBuddy can help families understand education, survivor, caregiver, healthcare, and benefit-support pathways in plain English. Eligibility depends on service history and VA rules.", "next_step": "Create a family-access profile, gather DD214/benefit letters, then verify official eligibility on VA.gov or with an accredited VSO."})
    if any(x in q for x in ["education", "school", "gi", "tuition", "chapter", "dea"]):
        items.append({"title": "Education benefits / GI Bill / DEA starting point", "summary": "Review Post-9/11 GI Bill, transfer rules, Chapter 35 DEA for eligible dependents, school certification, and housing allowance basics.", "next_step": "Gather service records, school/program details, and check the official VA education portal."})
    if any(x in q for x in ["disability", "claim", "rating", "compensation", "appeal"]):
        items.append({"title": "VA disability compensation and claim support", "summary": "ValorBuddy can organize evidence, questions, appointments, and plain-English checklists. It does not decide eligibility or replace an accredited representative.", "next_step": "Collect medical/service evidence and speak with a VSO or VA-accredited representative."})
    if any(x in q for x in ["home", "loan", "mortgage"]):
        items.append({"title": "VA home loan pathway", "summary": "VA-backed home loans may support buying, refinancing, or repairing a home for eligible veterans and some surviving spouses.", "next_step": "Check Certificate of Eligibility and talk with a VA-approved lender."})
    if any(x in q for x in ["health", "clinic", "medical", "mental", "doctor"]):
        items.append({"title": "VA healthcare and local care navigation", "summary": "Find VA clinics, Vet Centers, community care questions, and appointment reminders. For urgent or crisis needs, call emergency services or 988 then press 1.", "next_step": "Use VA.gov or local VA facility contacts for official enrollment and appointment details."})
    if not items:
        items = [
            {"title": "Benefits command center", "summary": "Common categories include healthcare, disability compensation, education, home loan, employment, pension, caregiver, survivor, spouse, and dependent benefits.", "next_step": "Ask about one category, and ValorBuddy will build a plain-English checklist."},
            {"title": "Family access", "summary": "Spouses and dependents can use ValorBuddy to organize documents, reminders, resources, and benefit questions connected to the veteran's journey.", "next_step": "Create a spouse/dependent profile and attach key documents."},
        ]
    return {"disclaimer": "Informational only. Use VA.gov or a VA-accredited representative for official guidance.", "items": items, "state": state, "branch": branch}


def music_suggestions(mood: str, branch: str) -> list[dict[str, str]]:
    mood_l = (mood or "calm").lower()
    if "patriotic" in mood_l or "military" in mood_l:
        return [{"title": "Patriotic instrumental playlist", "url": "https://www.youtube.com/results?search_query=patriotic+instrumental+music", "mood": mood}, {"title": f"{branch} cadence and heritage music", "url": f"https://www.youtube.com/results?search_query={quote_plus(branch)}+military+cadence", "mood": mood}]
    if "gospel" in mood_l:
        return [{"title": "Calming gospel playlist", "url": "https://www.youtube.com/results?search_query=calming+gospel+playlist", "mood": mood}]
    if "country" in mood_l:
        return [{"title": "Classic country calm mix", "url": "https://www.youtube.com/results?search_query=classic+country+calm+playlist", "mood": mood}]
    return [{"title": "Calm instrumental focus", "url": "https://www.youtube.com/results?search_query=calm+instrumental+music", "mood": mood}, {"title": "Relaxing old school classics", "url": "https://www.youtube.com/results?search_query=relaxing+old+school+classics", "mood": mood}]


def infer_intent(text: str) -> str:
    t = (text or "").lower()
    if any(x in t for x in ["remind", "reminder", "appointment", "call the va", "schedule", "tomorrow", "next week"]):
        return "create_reminder"
    if any(x in t for x in ["remember", "memory", "save this", "log this", "journal"]):
        return "save_memory"
    if any(x in t for x in ["benefit", "claim", "gi bill", "disability", "home loan", "va loan", "spouse", "dependent", "survivor", "caregiver", "family access"]):
        return "search_benefits"
    if any(x in t for x in ["event", "activity", "vfw", "american legion", "near me", "places", "coffee", "park", "restaurant", "bbq", "food", "clinic", "va facility", "gym", "fishing"]):
        return "find_local_veteran_activities"
    if any(x in t for x in ["music", "song", "playlist", "play something"]):
        return "suggest_music"
    if any(x in t for x in ["briefing", "today", "how is my day", "what should i do", "plan my day"]):
        return "get_today_briefing"
    if any(x in t for x in ["who am i", "my profile", "profile", "branch"]):
        return "get_user_profile"
    return "general"


async def route_valorbuddy_message(
    *, text: str, first_name: str, branch: str, city: str, state: str,
    user: Optional[User] = None, db: Optional[Session] = None, explicit_intent: str = "general",
    title: str = "", date: str = "", time: str = "", memory: str = "", mood: str = "calm"
) -> dict[str, Any]:
    """Agentic router: decides which tool to call, gathers data, then composes a human answer."""
    message = clean_text(text)
    intent = explicit_intent if explicit_intent and explicit_intent != "general" else infer_intent(message)

    if intent == "find_local_veteran_activities":
        live, items = await google_places(city, state, message)
        mode = "live Google Places" if live else "demo search cards"
        fallback = f"{first_name}, I searched for '{message}' around {city}. Here are the best {mode} options: {human_list(items)}. Pick one and I can help with directions, a reminder, or a follow-up question."
        prompt = f"""You are ValorBuddy, an AI battle buddy for veterans and families.
User: {first_name}, {branch}, {city}, {state}
User asked: {message}
Tool used: Google Places / local search. Live={live}. Results: {json.dumps(items[:5])}
Write a natural answer. Do not say 'I found 6 events' unless there are exactly 6. Mention 2-3 specific options, ask a useful follow-up, and avoid canned language."""
        response = await gemini_reply(prompt, fallback)
        return {"response": response, "intent": intent, "data": {"live": live, "items": items}}

    if intent == "search_benefits":
        data = benefits_lookup(message, state, branch)
        fallback = f"{first_name}, here is the strongest starting point: {data['items'][0]['title']}. {data['items'][0]['summary']} Next step: {data['items'][0]['next_step']}"
        prompt = f"""You are ValorBuddy, a plain-English veteran benefits guide. You are informational only, not legal/medical advice.
User: {first_name}, {branch}, {city}, {state}
Question: {message}
Benefit data: {json.dumps(data)}
Answer naturally and specifically. Include spouse/dependent access when relevant. Keep it concise and useful."""
        response = await gemini_reply(prompt, fallback)
        return {"response": response, "intent": intent, "data": data}

    if intent == "create_reminder":
        reminder_title = title or message or "Reminder"
        when_text = f"{date} {time}".strip() or "Soon"
        if user and db:
            row = Reminder(user_id=user.id, title=reminder_title, date=date, time=time, when_text=when_text)
            db.add(row); db.commit()
        return {"response": f"Done, {first_name}. I saved this reminder: {reminder_title}. Time: {when_text}.", "intent": intent}

    if intent == "save_memory":
        mem_title = title or "Saved memory"
        note = memory or message
        if user and db:
            db.add(Memory(user_id=user.id, title=mem_title, note=note, tags=["voice", "assistant"])); db.commit()
        return {"response": f"I saved that for you, {first_name}. You can find it in your Memory Wall.", "intent": intent}

    if intent == "suggest_music":
        items = music_suggestions(mood or message or "calm", branch)
        fallback = f"{first_name}, I would start with {items[0]['title']}. If you want, I can also suggest gospel, country, patriotic, or calm focus music."
        prompt = f"User {first_name} asked about music: {message}. Branch: {branch}. Suggestions: {json.dumps(items)}. Respond like a helpful companion with one clear recommendation."
        response = await gemini_reply(prompt, fallback)
        return {"response": response, "intent": intent, "data": {"items": items}}

    if intent == "get_today_briefing":
        rems = []
        if user and db:
            rems = db.query(Reminder).filter(Reminder.user_id == user.id, Reminder.status == "active").order_by(Reminder.id.desc()).limit(3).all()
        live, places = await google_places(city, state, "veteran friendly coffee parks VFW")
        reminder_txt = "; ".join([f"{r.title} ({r.when_text})" for r in rems]) or "no saved reminders yet"
        fallback = f"Good to see you, {first_name}. Your current reminders: {reminder_txt}. Around {city}, a good next move could be {places[0]['title']}. Want me to search activities, benefits, or save a reminder?"
        prompt = f"Create a short daily briefing for {first_name}, a {branch} veteran in {city}, {state}. Reminders: {reminder_txt}. Nearby options: {json.dumps(places[:3])}. Make it warm, practical, and not canned."
        response = await gemini_reply(prompt, fallback)
        return {"response": response, "intent": intent, "data": {"items": places, "live": live}}

    if intent == "get_user_profile":
        return {"response": f"I have you as {first_name}, {branch}, around {city}, {state}. ValorBuddy also supports spouse and dependent access, reminders, documents, benefits, local activities, music, and memory notes.", "intent": intent}

    # General companion: make every answer contextual, not canned.
    recent = []
    rems = []
    if user and db:
        recent = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.id.desc()).limit(4).all()
        rems = db.query(Reminder).filter(Reminder.user_id == user.id).order_by(Reminder.id.desc()).limit(4).all()
    fallback = f"{first_name}, I hear you. On '{message}', my next useful step would be to turn that into an action: search a local resource, explain a benefit, save a reminder, organize a document, or build a simple plan. Which direction do you want?"
    prompt = f"""You are ValorBuddy, a real AI battle buddy for veterans, spouses, and dependents. Never sound like a static FAQ.
User profile: first_name={first_name}, branch={branch}, city={city}, state={state}
Recent memories: {[m.title for m in recent]}
Recent reminders: {[r.title for r in rems]}
User said: {message}
Respond directly to the user's actual words. Be warm, practical, concise, and action-oriented. If a tool would help, say exactly which next action you can take. Avoid generic canned responses."""
    response = await gemini_reply(prompt, fallback)
    return {"response": response, "intent": intent}


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

@app.post("/api/profile/branch")
def update_profile_branch(payload: BranchUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    allowed = {"Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"}
    if payload.branch not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported service branch")
    if not user.profile:
        db.add(UserProfile(user_id=user.id, first_name="Veteran", branch=payload.branch, city="Dallas", state="TX"))
    else:
        user.profile.branch = payload.branch
        user.profile.updated_at = datetime.now(timezone.utc)
    db.add(AdminAuditLog(user_id=user.id, action="profile.branch_updated", details=payload.branch))
    db.commit()
    db.refresh(user)
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
    return {"greeting": f"Good to see you, {p.first_name}. How is your day going?", "location": f"{p.city}, {p.state}", "reminders": [{"title": r.title, "when_text": r.when_text} for r in rems], "events": events[:3], "wellness_prompt": ("Live Google Places is connected." if live else "Google Places is in demo mode. Add GOOGLE_PLACES_API_KEY in Render to make activities live.")}


@app.post("/api/companion/chat")
async def companion_chat(payload: CompanionRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = user.profile
    conv = db.get(Conversation, payload.conversation_id) if payload.conversation_id else None
    if not conv:
        conv = Conversation(user_id=user.id, source="web", title="ValorBuddy companion")
        db.add(conv); db.flush()
    result = await route_valorbuddy_message(
        text=payload.message,
        first_name=p.first_name,
        branch=p.branch,
        city=p.city,
        state=p.state,
        user=user,
        db=db,
    )
    reply = result.get("response", "")
    db.add(Message(conversation_id=conv.id, user_id=user.id, role="user", content=payload.message))
    db.add(Message(conversation_id=conv.id, user_id=user.id, role="assistant", content=reply, metadata_json={"intent": result.get("intent"), "data": result.get("data", {})}))
    db.commit()
    return {"conversation_id": conv.id, **result, "reply": reply}


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


def _deep_find_value(obj: Any, keys: set[str]) -> str:
    """Find the first non-empty string value for any key in nested Vapi/frontend payloads."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).lower() in keys and isinstance(v, str) and v.strip():
                return v.strip()
        for v in obj.values():
            found = _deep_find_value(v, keys)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = _deep_find_value(item, keys)
            if found:
                return found
    return ""


def _deep_find_args(obj: Any) -> dict[str, Any]:
    """Vapi can send tool arguments in different shapes. This normalizes common ones."""
    if not isinstance(obj, (dict, list)):
        return {}
    if isinstance(obj, dict):
        # Direct Vapi shapes: {arguments:{...}}, {function:{arguments:{...}}}, {toolCall:{function:{arguments:{...}}}}
        for key in ("arguments", "args", "parameters"):
            value = obj.get(key)
            if isinstance(value, dict):
                return value
            if isinstance(value, str) and value.strip():
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict):
                        return parsed
                except Exception:
                    pass
        for value in obj.values():
            found = _deep_find_args(value)
            if found:
                return found
    else:
        for value in obj:
            found = _deep_find_args(value)
            if found:
                return found
    return {}


def _normalize_vapi_payload(raw: dict[str, Any]) -> VapiActionRequest:
    args = _deep_find_args(raw)
    merged: dict[str, Any] = {}
    if isinstance(raw, dict):
        merged.update(raw)
    merged.update(args)

    def pick(*names: str, default: str = "") -> str:
        for name in names:
            value = merged.get(name)
            if isinstance(value, str) and value.strip():
                return value.strip()
        found = _deep_find_value(raw, {n.lower() for n in names})
        return found or default

    return VapiActionRequest(
        intent=pick("intent", "action", "tool", default="general"),
        query=pick("query", "question", "search"),
        message=pick("message", "transcript", "user_message", "userMessage", "input", "text", "content"),
        transcript=pick("transcript"),
        first_name=pick("first_name", "firstName", "name", default="there"),
        email=pick("email", "user_email", "userEmail"),
        branch=pick("branch", "service_branch", "serviceBranch"),
        city=pick("city", "location_city", "locationCity"),
        state=pick("state", "location_state", "locationState"),
        user_type=pick("user_type", "userType", default="Veteran"),
        title=pick("title", "reminder_title", "reminderTitle"),
        date=pick("date", "reminder_date", "reminderDate"),
        time=pick("time", "reminder_time", "reminderTime"),
        memory=pick("memory", "note"),
        mood=pick("mood", default="calm"),
    )


@app.post("/api/vapi/action")
async def vapi_action(request: Request, db: Session = Depends(get_db)):
    """Agentic Vapi endpoint.

    Important: this endpoint does not hard-code Dallas. If Vapi does not pass a city/state
    and no authenticated user email is supplied, local searches ask for the user's location
    instead of returning fake Dallas recommendations.
    """
    try:
        raw = await request.json()
        if not isinstance(raw, dict):
            raw = {"message": str(raw)}
    except Exception:
        raw = {}

    payload = _normalize_vapi_payload(raw)
    text = payload.message or payload.query or payload.transcript or payload.title or payload.memory or ""

    # Only look up demo/user profile when Vapi passes an email. This prevents every public
    # voice call from silently falling back to demo@valorbuddy.com / Dallas.
    user = None
    if payload.email:
        email = payload.email.lower()
        user = db.query(User).filter(User.email == email).first()

    first_name = payload.first_name or (user.profile.first_name if user and user.profile else "there")
    branch = payload.branch or (user.profile.branch if user and user.profile else "Veteran")
    city = payload.city or (user.profile.city if user and user.profile else "")
    state = payload.state or (user.profile.state if user and user.profile else "")

    # Detect local intent early. If location is missing, ask instead of defaulting to Dallas.
    detected_intent = payload.intent if payload.intent and payload.intent != "general" else infer_intent(text)
    if detected_intent == "find_local_veteran_activities" and (not city or not state):
        answer = f"Of course, {first_name}. What city and state should I search around? Once I have that, I’ll look for veteran-friendly places, VA resources, VFW or American Legion posts, and nearby activities."
        return {"response": answer, "answer": answer, "reply": answer, "intent": detected_intent, "data": {"needs_location": True}}

    result = await route_valorbuddy_message(
        text=text,
        first_name=first_name,
        branch=branch,
        city=city or "your area",
        state=state or "",
        user=user,
        db=db,
        explicit_intent=payload.intent,
        title=payload.title,
        date=payload.date,
        time=payload.time,
        memory=payload.memory,
        mood=payload.mood,
    )
    response = result.get("response", "")
    # Return multiple common keys so Vapi/frontends can read the answer reliably.
    return {**result, "answer": response, "reply": response, "message": response}


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
