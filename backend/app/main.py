from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote_plus
from typing import Any, List, Optional
import asyncio
import logging

import httpx
from google import genai
from google.genai import types
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
# Prefer GOOGLE_API_KEY so the existing Render variable continues to work.
# GEMINI_API_KEY remains a backward-compatible alias.
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY = GOOGLE_API_KEY
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_PLANNER_MODEL = os.getenv("GEMINI_PLANNER_MODEL", GEMINI_MODEL)
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
GOOGLE_GENAI_USE_VERTEXAI = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
ENABLE_GOOGLE_SEARCH_GROUNDING = os.getenv("ENABLE_GOOGLE_SEARCH_GROUNDING", "true").lower() == "true"
AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "35"))
logger = logging.getLogger("valorbuddy.ai")
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
    city = Column(String(120), nullable=False, default="")
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
    city: str = ""
    state: str = ""
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
    lat: Optional[float] = None
    lng: Optional[float] = None
    timezone: str = ""


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
    branch: str = ""
    city: str = ""
    state: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    title: str = ""
    date: str = ""
    time: str = ""
    memory: str = ""
    mood: str = "calm"
    user_type: str = "Veteran"


class BranchUpdate(BaseModel):
    branch: str


def profile_out(user: User) -> ProfileOut:
    p = user.profile
    return ProfileOut(id=user.id, email=user.email, role=user.role, first_name=p.first_name if p else "Veteran", last_name=p.last_name if p else "", branch=p.branch if p else "Army", city=p.city if p else "", state=p.state if p else "", interests=p.interests if p else [])


def _genai_client():
    """Create a Google Gen AI client for API-key or Vertex AI authentication."""
    if GOOGLE_GENAI_USE_VERTEXAI:
        kwargs = {"vertexai": True, "location": GOOGLE_CLOUD_LOCATION}
        if GOOGLE_CLOUD_PROJECT:
            kwargs["project"] = GOOGLE_CLOUD_PROJECT
        if GEMINI_API_KEY:
            kwargs["api_key"] = GEMINI_API_KEY
        return genai.Client(**kwargs)
    return genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


SYSTEM_INSTRUCTION = """You are ValorBuddy, a trusted digital battle buddy for the entire military community.

You support veterans, active-duty service members, retired service members, National Guard, Reserve members, transitioning service members, military spouses, children, dependents, caregivers, Gold Star families, surviving spouses, wounded warriors, and military families from every race, ethnicity, nationality, gender, religion, disability status, background, and branch of service.

Treat every person with dignity, respect, empathy, and professionalism. Never make assumptions about combat history, disability status, VA eligibility, finances, beliefs, health conditions, or personal experiences.

MISSION
Help the user accomplish real tasks, save time, reduce stress, understand options, and take the next useful action. Do not merely describe what you could do.

PERSONALITY
Be warm, calm, capable, practical, encouraging, concise, confident, humble, conversational, and military-aware. Never sound like ChatGPT, a search engine, documentation, or a scripted call center. Do not call yourself an AI assistant unless directly asked. Use the user's name naturally when appropriate.

INTENT FIRST
Identify the user's primary intent and stay focused on it. If the user asks about activities or events, discuss only activities or events. Do not mention documents, reminders, benefits, or unrelated features. If the user asks about restaurants, discuss restaurants only. If the user asks about benefits, discuss benefits only.

Ask at most one focused clarification question when it is truly necessary. If sufficient information exists, act immediately. Never end with a generic question such as “What would you like to do?” Make a useful recommendation or ask a specific next-step question.

LIVE LOCATION
For “near me” requests, current GPS coordinates are authoritative. Never default to Dallas or any other city. Never use a saved city when live GPS exists. If GPS is unavailable for a “near me” request, ask: “What city and state are you in so I can search near you?”

LIVE INFORMATION
Never invent events, places, addresses, business hours, weather, traffic, news, prices, jobs, discounts, schedules, or VA office hours. Use live tools when available. Clearly distinguish live results from general guidance.

TOOL BEHAVIOR
Use only the tools needed for the user's exact request. Combine tool results into one natural answer. Never expose internal reasoning, planner output, tool names, backend systems, or implementation details.

CONVERSATION MEMORY
Use recent conversation naturally. Resolve references such as “it,” “that place,” “the first one,” or “is it open?” from prior context. Do not repeat information the user already provided.

LOCAL RESULTS
Give no more than three strong options unless the user asks for more. Summarize why each option fits. End with one specific next step such as directions, distance, hours, registration details, or filtering by today/free/family-friendly.

MENTAL WELLNESS AND SAFETY
You are not a therapist, doctor, psychiatrist, psychologist, crisis counselor, lawyer, or financial advisor. Never diagnose PTSD, depression, anxiety, or another condition. Never provide clinical treatment or promise eligibility or legal outcomes.

If someone appears stressed or overwhelmed, respond calmly, validate without exaggeration, offer one simple grounding step, offer one practical next action, and ask one gentle follow-up question.

If the user expresses intent to harm themselves or someone else, or says they may not be safe, respond immediately: “In the U.S., please call or text 988 and press 1 for the Veterans Crisis Line now. If there is immediate danger, call 911 or go to the nearest emergency department.” Encourage immediate human support and stay calm.

RESPONSE STYLE
Keep most responses under 220 words unless the user asks for detail. Be direct, natural, specific, and action-oriented. Never say “My next useful step would be,” “I can help by,” or list unrelated capabilities. Actually help.

Every response should leave the user better informed, more confident, or one step closer to completing the goal."""


def _extract_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if text:
        return text.strip()
    try:
        parts = response.candidates[0].content.parts
        return "".join(getattr(part, "text", "") or "" for part in parts).strip()
    except Exception:
        return ""


async def gemini_reply(prompt: str, fallback: str, *, grounded: bool = False, json_mode: bool = False, model: str | None = None) -> str:
    """Google Gen AI SDK wrapper with optional Google Search grounding and JSON output."""
    client = _genai_client()
    if not client:
        return fallback
    tools = [types.Tool(google_search=types.GoogleSearch())] if grounded and ENABLE_GOOGLE_SEARCH_GROUNDING else None
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.35 if json_mode else 0.62,
        max_output_tokens=1400,
        tools=tools,
        response_mime_type="application/json" if json_mode else None,
    )
    def call():
        return client.models.generate_content(model=model or GEMINI_MODEL, contents=prompt, config=config)
    try:
        response = await asyncio.wait_for(asyncio.to_thread(call), timeout=AI_TIMEOUT_SECONDS)
        return _extract_text(response) or fallback
    except Exception as exc:
        logger.exception("Gemini request failed: %s", exc)
        return fallback


async def plan_request(message: str, context: dict[str, Any]) -> dict[str, Any]:
    """Ask Gemini to plan tool use. Keyword routing is only a fail-safe fallback."""
    schema = {
        "intent": "general|local_search|live_web|benefits|create_reminder|save_memory|music|briefing|profile|document_question",
        "needs_location": False,
        "needs_places": False,
        "needs_google_search": False,
        "needs_clarification": False,
        "clarification_question": "",
        "default_query": "",
        "search_query": "",
        "response_goal": "",
    }
    prompt = f"""Return only valid JSON matching this shape: {json.dumps(schema)}

Identify ONE primary intent and select the minimum tools required.
- Use local_search with needs_places=true for nearby activities, veteran events, VFW, American Legion, restaurants, VA facilities, stores, parks, directions, or any 'near me' request.
- Use live_web with needs_google_search=true for current weather, traffic, road conditions, news, current policies, changing benefits rules, jobs, discounts, prices, public event schedules, or other time-sensitive facts not reliably covered by Places.
- Use benefits for benefits guidance.
- Use create_reminder only when the user explicitly asks to create/save a reminder.
- Use save_memory only when the user explicitly asks to remember/save something.
- Use music for music requests.

Stay strictly focused on the user's request. An activities request must not expand into documents, reminders, benefits, or unrelated features.
Ask one clarification question only when the request cannot be acted on accurately without it. When clarification is needed, set needs_clarification=true, write one natural clarification_question, and provide a useful default_query that can be executed if the user does not respond. Do not request clarification when the user already asked clearly for nearby veteran activities or events.

Context: {json.dumps(context, default=str)}
User message: {message}"""
    raw = await gemini_reply(prompt, json.dumps(schema), json_mode=True, model=GEMINI_PLANNER_MODEL)
    try:
        plan = json.loads(raw)
        return {**schema, **plan}
    except Exception:
        fallback_intent = infer_intent(message)
        mapping = {"find_local_veteran_activities":"local_search","search_benefits":"benefits","get_today_briefing":"briefing","get_user_profile":"profile","suggest_music":"music"}
        return {**schema, "intent": mapping.get(fallback_intent, fallback_intent), "needs_places": fallback_intent == "find_local_veteran_activities", "needs_location": fallback_intent == "find_local_veteran_activities", "search_query": message}

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


async def reverse_geocode_location(lat: float | None, lng: float | None) -> dict[str, str]:
    """Resolve browser coordinates into city/state when Google key is available."""
    if lat is None or lng is None or not GOOGLE_MAPS_API_KEY:
        return {"city": "", "state": ""}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"latlng": f"{lat},{lng}", "key": GOOGLE_MAPS_API_KEY},
            )
            r.raise_for_status()
            data = r.json()
        city = ""
        state = ""
        for res in data.get("results", []):
            for c in res.get("address_components", []):
                types = c.get("types", [])
                if "locality" in types or "postal_town" in types:
                    city = c.get("long_name", city)
                if "administrative_area_level_1" in types:
                    state = c.get("short_name", state)
            if city and state:
                break
        return {"city": city, "state": state}
    except Exception:
        return {"city": "", "state": ""}


def _fallback_local_cards(city: str, state: str, query: str) -> list[dict[str, Any]]:
    location_label = f"{city}, {state}" if city and state else "your area"
    maps_location = quote_plus(f"{city} {state}".strip() or "near me")
    clean_query = clean_text(query) or "veteran friendly places"
    fallback_map = {
        "coffee": [
            {"title": "Veteran-friendly coffee nearby", "location": f"Near {location_label}", "type": "Coffee", "description": "Fallback card until live Google Places returns results. Use this for the flow, but verify live options before visiting.", "maps_url": f"https://www.google.com/maps/search/veteran+friendly+coffee+near+{maps_location}"},
            {"title": "American Legion coffee social search", "location": location_label, "type": "Veteran community", "description": "Good for a quick meetup, conversation, or networking with other veterans and families.", "maps_url": f"https://www.google.com/maps/search/American+Legion+near+{maps_location}"},
        ],
        "clinic": [
            {"title": "Nearest VA clinic search", "location": f"Near {location_label}", "type": "VA care", "description": "Open map results for VA clinics and resource centers near the veteran or family member.", "maps_url": f"https://www.google.com/maps/search/VA+clinic+near+{maps_location}"},
            {"title": "Vet Center / counseling resource search", "location": location_label, "type": "Support", "description": "For official support, use VA.gov or call the facility before going.", "maps_url": f"https://www.google.com/maps/search/Vet+Center+near+{maps_location}"},
        ],
        "parks": [
            {"title": "Quiet park or walking trail", "location": f"Near {location_label}", "type": "Wellness", "description": "A simple low-pressure reset option for veterans, spouses, kids, dependents, caregivers, or family.", "maps_url": f"https://www.google.com/maps/search/parks+near+{maps_location}"},
            {"title": "Lake, trail, or outdoor space", "location": location_label, "type": "Outdoor", "description": "Good for fresh air, family time, or decompression.", "maps_url": f"https://www.google.com/maps/search/trails+near+{maps_location}"},
        ],
        "food": [
            {"title": "Mission BBQ / veteran-friendly restaurant search", "location": f"Near {location_label}", "type": "Food", "description": "Look for veteran-friendly restaurants and military discount spots.", "maps_url": f"https://www.google.com/maps/search/veteran+discount+restaurants+near+{maps_location}"},
            {"title": "Veteran-owned restaurant search", "location": location_label, "type": "Food", "description": "Support veteran-owned businesses nearby.", "maps_url": f"https://www.google.com/maps/search/veteran+owned+restaurant+near+{maps_location}"},
        ],
        "family": [
            {"title": "Family-friendly veteran activity search", "location": f"Near {location_label}", "type": "Family", "description": "Options suitable for spouses, kids, dependents, caregivers, and family members.", "maps_url": f"https://www.google.com/maps/search/family+friendly+veteran+events+near+{maps_location}"},
            {"title": "Museums, parks, and community events", "location": location_label, "type": "Kids and family", "description": "Low-pressure local outings for the whole family.", "maps_url": f"https://www.google.com/maps/search/museums+parks+family+events+near+{maps_location}"},
        ],
    }
    q = clean_query.lower()
    if any(k in q for k in ["spouse", "dependent", "kid", "kids", "child", "children", "family", "caregiver"]):
        return fallback_map["family"]
    if any(k in q for k in ["coffee", "breakfast", "cafe"]):
        return fallback_map["coffee"]
    if any(k in q for k in ["clinic", "hospital", "doctor", "va"]):
        return fallback_map["clinic"]
    if any(k in q for k in ["park", "walk", "trail", "outdoor"]):
        return fallback_map["parks"]
    if any(k in q for k in ["food", "restaurant", "bbq", "lunch", "dinner"]):
        return fallback_map["food"]
    return [
        {"title": "VFW or American Legion post", "location": f"Near {location_label}", "type": "Veteran community", "description": "Community, networking, and veteran-friendly events.", "maps_url": f"https://www.google.com/maps/search/VFW+American+Legion+near+{maps_location}"},
        {"title": "Veteran and family-friendly meetup search", "location": location_label, "type": "Social", "description": "A simple option for connection without pressure.", "maps_url": f"https://www.google.com/maps/search/veteran+family+events+near+{maps_location}"},
        {"title": "VA resource or benefits office", "location": f"Near {location_label}", "type": "Benefits", "description": "Useful for official VA questions or referrals.", "maps_url": f"https://www.google.com/maps/search/VA+benefits+office+near+{maps_location}"},
        {"title": "Outdoor family reset spot", "location": f"Near {location_label}", "type": "Wellness", "description": "Park, trail, or quiet outdoor option for veterans, spouses, kids, dependents, caregivers, and family.", "maps_url": f"https://www.google.com/maps/search/parks+near+{maps_location}"},
    ]


async def google_places(city: str = "", state: str = "", query: str = "", lat: float | None = None, lng: float | None = None) -> tuple[bool, list[dict[str, Any]], dict[str, Any]]:
    """Search live Google Places using browser lat/lng first, then city/state. Never silently defaults to Dallas."""
    clean_query = clean_text(query) or "veteran friendly events"
    resolved_city = clean_text(city)
    resolved_state = clean_text(state)
    source = "profile" if resolved_city else "missing"

    if lat is not None and lng is not None:
        rg = await reverse_geocode_location(lat, lng)
        resolved_city = rg.get("city") or resolved_city
        resolved_state = rg.get("state") or resolved_state
        source = "browser_location"

    location_meta = {"city": resolved_city, "state": resolved_state, "lat": lat, "lng": lng, "source": source}

    if not GOOGLE_MAPS_API_KEY:
        return False, _fallback_local_cards(resolved_city, resolved_state, clean_query), {**location_meta, "error": "GOOGLE_PLACES_API_KEY not configured"}

    try:
        params = {"query": clean_query, "key": GOOGLE_MAPS_API_KEY}
        if lat is not None and lng is not None:
            params.update({"location": f"{lat},{lng}", "radius": 25000})
        elif resolved_city and resolved_state:
            params["query"] = f"{clean_query} near {resolved_city}, {resolved_state}"
        else:
            return False, [], {**location_meta, "error": "location_required"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://maps.googleapis.com/maps/api/place/textsearch/json", params=params)
            r.raise_for_status()
            data = r.json()
        status = data.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            fb = _fallback_local_cards(resolved_city, resolved_state, clean_query)
            return False, [{**x, "description": f"Google Places returned {status}. Check key, billing, Places API, and restrictions."} for x in fb], {**location_meta, "error": status}
        results = []
        seen = set()
        async with httpx.AsyncClient(timeout=15) as detail_client:
            for item in data.get("results", [])[:8]:
                name = item.get("name") or "Local option"
                if name.lower() in seen:
                    continue
                seen.add(name.lower())
                address = item.get("formatted_address", f"{resolved_city}, {resolved_state}".strip(", "))
                place_id = item.get("place_id")
                reviews = []
                phone = ""
                website = ""
                opening_hours = item.get("opening_hours", {})
                if place_id and len(results) < 3:
                    try:
                        detail_response = await detail_client.get(
                            "https://maps.googleapis.com/maps/api/place/details/json",
                            params={
                                "place_id": place_id,
                                "fields": "formatted_phone_number,website,opening_hours,reviews,url",
                                "reviews_sort": "most_relevant",
                                "key": GOOGLE_MAPS_API_KEY,
                            },
                        )
                        detail = detail_response.json().get("result", {})
                        phone = detail.get("formatted_phone_number", "")
                        website = detail.get("website", "")
                        opening_hours = detail.get("opening_hours") or opening_hours
                        reviews = [
                            {
                                "author": review.get("author_name", "Google reviewer"),
                                "rating": review.get("rating"),
                                "text": clean_text(review.get("text", ""))[:240],
                                "time_description": review.get("relative_time_description", ""),
                            }
                            for review in detail.get("reviews", [])[:2]
                            if clean_text(review.get("text", ""))
                        ]
                    except Exception:
                        reviews = []
                rating = item.get("rating")
                review_total = item.get("user_ratings_total")
                type_text = ", ".join(item.get("types", [])[:3]).replace("_", " ")
                explanation = f"A nearby {type_text or 'community option'} that matches your request."
                if rating:
                    explanation += f" It has a {rating} Google rating"
                    if review_total:
                        explanation += f" from {review_total} reviews"
                    explanation += "."
                results.append({
                    "title": name,
                    "location": address,
                    "type": type_text,
                    "rating": rating,
                    "review_count": review_total,
                    "description": explanation,
                    "assistant_explanation": explanation,
                    "reviews": reviews,
                    "phone": phone,
                    "website": website,
                    "open_now": opening_hours.get("open_now") if isinstance(opening_hours, dict) else None,
                    "place_id": place_id,
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(name + ' ' + address)}" + (f"&query_place_id={place_id}" if place_id else ""),
                })
        if results:
            return True, results, location_meta
        return False, _fallback_local_cards(resolved_city, resolved_state, clean_query), {**location_meta, "error": "ZERO_RESULTS"}
    except Exception as exc:
        fb = _fallback_local_cards(resolved_city, resolved_state, clean_query)
        return False, [{**x, "description": f"Google Places call failed: {type(exc).__name__}. Check Render env vars and API restrictions."} for x in fb], {**location_meta, "error": type(exc).__name__}


def benefits_lookup(query: str, state: str, branch: str) -> dict[str, Any]:
    q = (query or "benefits").lower()
    items = []
    if any(x in q for x in ["spouse", "dependent", "wife", "husband", "child", "children", "survivor", "caregiver", "family"]):
        items.append({"title": "Spouse, dependent, survivor, and caregiver pathways", "summary": "ValorBuddy can help families understand education, survivor, caregiver, healthcare, and benefit-support pathways in plain English. Eligibility depends on service history and VA rules.", "next_step": "Create a family-access profile, gather DD214/benefit letters, then verify official eligibility on VA.gov or with an accredited VSO.", "assistant_explanation": "This pathway helps families understand which programs may apply and which documents to gather first.", "community_note": "Veteran families commonly say the hardest part is knowing where to start; a document checklist and accredited VSO review can reduce confusion."})
    if any(x in q for x in ["education", "school", "gi", "tuition", "chapter", "dea"]):
        items.append({"title": "Education benefits / GI Bill / DEA starting point", "summary": "Review Post-9/11 GI Bill, transfer rules, Chapter 35 DEA for eligible dependents, school certification, and housing allowance basics.", "next_step": "Gather service records, school/program details, and check the official VA education portal.", "assistant_explanation": "Start by matching the education goal to the correct VA education chapter and confirming school certification.", "community_note": "Many veterans recommend confirming benefit months and housing allowance rules before enrolling."})
    if any(x in q for x in ["disability", "claim", "rating", "compensation", "appeal"]):
        items.append({"title": "VA disability compensation and claim support", "summary": "ValorBuddy can organize evidence, questions, appointments, and plain-English checklists. It does not decide eligibility or replace an accredited representative.", "next_step": "Collect medical/service evidence and speak with a VSO or VA-accredited representative.", "assistant_explanation": "A strong starting point is an organized evidence list, current diagnoses from qualified professionals, and a clear timeline of service-connected events.", "community_note": "Veterans often find accredited VSO support useful for checking forms and evidence before submission."})
    if any(x in q for x in ["home", "loan", "mortgage"]):
        items.append({"title": "VA home loan pathway", "summary": "VA-backed home loans may support buying, refinancing, or repairing a home for eligible veterans and some surviving spouses.", "next_step": "Check Certificate of Eligibility and talk with a VA-approved lender.", "assistant_explanation": "Confirm eligibility, estimate an affordable monthly payment, and compare VA-approved lenders before selecting a property.", "community_note": "Veteran homebuyers frequently recommend comparing lender fees and not assuming every lender offers the same VA loan terms."})
    if any(x in q for x in ["health", "clinic", "medical", "mental", "doctor"]):
        items.append({"title": "VA healthcare and local care navigation", "summary": "Find VA clinics, Vet Centers, community care questions, and appointment reminders. For urgent or crisis needs, call emergency services or 988 then press 1.", "next_step": "Use VA.gov or local VA facility contacts for official enrollment and appointment details.", "assistant_explanation": "ValorBuddy can help locate the closest facility and prepare questions, while the VA confirms enrollment and care options.", "community_note": "Veterans often suggest bringing a medication list, records, and written questions to appointments."})
    if not items:
        items = [
            {"title": "Benefits command center", "summary": "Common categories include healthcare, disability compensation, education, home loan, employment, pension, caregiver, survivor, spouse, and dependent benefits.", "next_step": "Choose a category and ValorBuddy will build a plain-English checklist.", "assistant_explanation": "Pick the benefit area that matters most and receive a focused eligibility and document checklist.", "community_note": "Veterans commonly recommend working one benefit category at a time and keeping copies of every submission."},
            {"title": "Family access", "summary": "Spouses and dependents can use ValorBuddy to organize documents, reminders, resources, and benefit questions connected to the veteran's journey.", "next_step": "Create the appropriate family profile and gather key documents.", "assistant_explanation": "Family pathways vary, so identifying the relationship and benefit goal makes the guidance more accurate.", "community_note": "Military families often say a shared checklist helps everyone understand deadlines and missing documents."},
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



def event_choice_payload(first_name: str) -> dict[str, Any]:
    choices = [
        {"label": "Veteran social events", "query": "veteran social events near me"},
        {"label": "VFW or American Legion", "query": "VFW American Legion events near me"},
        {"label": "Family-friendly activities", "query": "family friendly veteran activities near me"},
        {"label": "Outdoor activities", "query": "veteran outdoor activities parks trails fishing near me"},
        {"label": "Live music and entertainment", "query": "veteran friendly live music entertainment near me"},
        {"label": "Coffee and breakfast meetups", "query": "veteran coffee breakfast meetup near me"},
        {"label": "Volunteer opportunities", "query": "veteran volunteer opportunities near me"},
        {"label": "Fitness and recreation", "query": "veteran fitness recreation activities near me"},
        {"label": "Museums and military history", "query": "military museums veteran history attractions near me"},
        {"label": "Career and networking", "query": "veteran career networking events near me"},
        {"label": "Support and wellness groups", "query": "veteran peer support wellness groups near me"},
        {"label": "Free events today", "query": "free veteran events today near me"},
    ]
    labels = "; ".join(f"{i+1}. {x['label']}" for i, x in enumerate(choices))
    response = (
        f"Absolutely, {first_name}. Here are some easy choices: {labels}. "
        "Say the number or the type you want. If you are not sure, say ‘pick for me’ and I’ll start with the best-rated options happening closest to you."
    )
    return {"response": response, "intent": "event_choices", "data": {"choices": choices, "awaiting_choice": True}}


def is_event_choice_request(message: str) -> bool:
    t = (message or "").lower()
    event_words = any(x in t for x in ("event", "events", "activity", "activities", "things to do"))
    choice_words = any(x in t for x in ("example", "examples", "choose", "choices", "options", "types", "what kind", "list"))
    return event_words and choice_words

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
    *, text: str, first_name: str, branch: str, city: str = "", state: str = "",
    lat: float | None = None, lng: float | None = None, user_type: str = "Veteran",
    user: Optional[User] = None, db: Optional[Session] = None, explicit_intent: str = "general",
    title: str = "", date: str = "", time: str = "", memory: str = "", mood: str = "calm"
) -> dict[str, Any]:
    """Agentic router: decides which tool to call, gathers data, then composes a human answer."""
    message = clean_text(text)
    if is_event_choice_request(message):
        return event_choice_payload(first_name)
    # GPS is authoritative. Reverse-geocode once so every planner and response uses the current area.
    if lat is not None and lng is not None:
        current = await reverse_geocode_location(lat, lng)
        city = current.get("city") or city
        state = current.get("state") or state
    recent_messages = []
    recent_memories = []
    recent_reminders = []
    if user and db:
        recent_messages = db.query(Message).filter(Message.user_id == user.id).order_by(Message.id.desc()).limit(8).all()
        recent_memories = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.id.desc()).limit(5).all()
        recent_reminders = db.query(Reminder).filter(Reminder.user_id == user.id, Reminder.status == "active").order_by(Reminder.id.desc()).limit(5).all()
    context = {
        "first_name": first_name, "branch": branch, "profile_city": city, "profile_state": state,
        "gps_available": lat is not None and lng is not None, "latitude": lat, "longitude": lng, "user_type": user_type,
        "recent_conversation": [{"role": m.role, "content": m.content[:500]} for m in reversed(recent_messages)],
        "memories": [{"title": m.title, "note": (m.note or "")[:300]} for m in recent_memories],
        "reminders": [{"title": r.title, "when": r.when_text} for r in recent_reminders],
    }
    # Deterministic routing comes first so clear requests never fall into a vague AI fallback.
    inferred_intent = infer_intent(message)
    if explicit_intent and explicit_intent != "general":
        plan = {"intent": explicit_intent}
    elif inferred_intent != "general":
        plan = {
            "intent": inferred_intent,
            "needs_places": inferred_intent == "find_local_veteran_activities",
            "needs_location": inferred_intent == "find_local_veteran_activities",
            "search_query": message,
        }
    else:
        plan = await plan_request(message, context)
    intent = plan.get("intent", "general")

    if plan.get("needs_clarification"):
        if any(x in message.lower() for x in ("event", "events", "activity", "activities", "near me")):
            return event_choice_payload(first_name)
        question = clean_text(plan.get("clarification_question")) or f"{first_name}, what should I focus on?"
        default_query = clean_text(plan.get("default_query")) or message
        return {
            "response": question,
            "intent": "clarification",
            "data": {"awaiting_clarification": True, "default_query": default_query, "plan": plan},
        }

    if intent in ("local_search", "find_local_veteran_activities") or plan.get("needs_places"):
        near_me = any(phrase in message.lower() for phrase in ("near me", "nearby", "around me", "close to me"))
        if lat is None and lng is None and (near_me or not clean_text(city)):
            return {
                "response": f"Absolutely {first_name}. What city and state should I search, and are you looking for today, this weekend, or specific dates?",
                "intent": "ask_location",
                "data": {"location_required": True}
            }
        live, items, location_meta = await google_places(city=city, state=state, query=message, lat=lat, lng=lng)
        if location_meta.get("error") == "location_required":
            return {
                "response": f"Absolutely {first_name}. What city and state should I search, and are you looking for today, this weekend, or specific dates?",
                "intent": "ask_location",
                "data": {"location_required": True}
            }
        mode = "live Google Places" if live else "fallback map suggestions"
        place_label = f"near {location_meta.get('city')}, {location_meta.get('state')}" if location_meta.get('city') else "near your current location"
        verified_note = "live options" if live else "search starting points"
        top = items[:3]
        detail_lines = []
        for index, item in enumerate(top, 1):
            title_text = clean_text(item.get("title")) or "Local option"
            location_text = clean_text(item.get("location"))
            rating_text = f", rated {item.get('rating')}" if item.get("rating") else ""
            detail_lines.append(f"{index}. {title_text}" + (f" — {location_text}" if location_text else "") + rating_text)
        listed = " ".join(detail_lines) if detail_lines else "I did not find a verified option yet."
        fallback = (
            f"{first_name}, I found three {verified_note} {place_label}. {listed} "
            "I recommend starting with option 1 because it is the first strong match. "
            "You can choose a number, ask for directions, or say ‘show me free events today.’"
        )
        prompt = f"""User: {first_name}, branch={branch}, current_area={location_meta.get('city') or city}, {location_meta.get('state') or state}
User type: {user_type}
Exact request: {message}
Primary intent: {intent}
Live local results: live={live}, source={location_meta.get('source')}, results={json.dumps(items[:5])}

COMPLETION CONTRACT:
- Do not repeat, quote, paraphrase, or announce the user's request.
- Do not say “I heard you,” “best starting point,” “tell me more,” or “tell me the one detail that matters.”
- Complete the useful work before stopping.
- If live results exist, give the three best options immediately and recommend one.
- If live results are unavailable, clearly say that these are map/search starting points and still give the best three next actions.
- Make the choice easy: number the options and tell the user they can say a number.

Answer ONLY the exact local intent. If the request is for veteran activities or events, discuss only those activities or events. Do not mention documents, reminders, benefits, memories, or other ValorBuddy features.
For each option, briefly state what it is, where it is, and any verified rating or useful live detail available in the results. Do not invent dates, times, hours, admission, or event details that are absent.
Use natural battle-buddy language without calling yourself an AI assistant. Finish with one concrete next action, such as “Say 1, 2, or 3 and I’ll check directions and current details.” Do not ask a vague follow-up question."""
        response = await gemini_reply(prompt, fallback, grounded=False)
        quick_choices = [
            {"label": "Today", "query": "veteran events today near me"},
            {"label": "Free", "query": "free veteran events near me"},
            {"label": "Family-friendly", "query": "family friendly veteran activities near me"},
            {"label": "VFW / Legion", "query": "VFW American Legion events near me"},
            {"label": "Outdoor", "query": "veteran outdoor activities near me"},
            {"label": "Pick for me", "query": "best rated veteran activities closest to me"},
        ]
        return {"response": response, "intent": intent, "data": {"live": live, "items": items, "choices": quick_choices, "location": location_meta, "plan": plan}}

    if intent == "search_benefits":
        data = benefits_lookup(message, state, branch)
        fallback = f"{first_name}, here is the strongest starting point: {data['items'][0]['title']}. {data['items'][0]['summary']} Next step: {data['items'][0]['next_step']}"
        prompt = f"""You are ValorBuddy, a plain-English veteran benefits guide. You are informational only, not legal/medical advice.
User: {first_name}, {branch}, {city}, {state}
Question: {message}
Benefit data: {json.dumps(data)}
Answer naturally and specifically. Include spouse, child, dependent, caregiver, and family access when relevant. Keep it concise and useful."""
        response = await gemini_reply(prompt, fallback, grounded=bool(plan.get("needs_google_search")))
        return {"response": response, "intent": intent, "data": {**data, "plan": plan}}

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
        live, places, location_meta = await google_places(city=city, state=state, query="veteran friendly coffee parks VFW", lat=lat, lng=lng)
        reminder_txt = "; ".join([f"{r.title} ({r.when_text})" for r in rems]) or "no saved reminders yet"
        fallback = f"Good to see you, {first_name}. You have {reminder_txt}. One nearby option is {places[0]['title']}. Should I check its hours or directions?"
        prompt = f"Create a short daily briefing for {first_name}, a {branch} veteran in {city}, {state}. Reminders: {reminder_txt}. Nearby options: {json.dumps(places[:3])}. Make it warm, practical, and not canned."
        response = await gemini_reply(prompt, fallback)
        return {"response": response, "intent": intent, "data": {"items": places, "live": live}}

    if intent == "get_user_profile":
        return {"response": f"I have your name as {first_name} and your branch as {branch}. Your saved area is {city}, {state}. Tell me what you want corrected, and I’ll focus on that update.", "intent": intent}

    # General companion: make every answer contextual, not canned.
    recent = []
    rems = []
    if user and db:
        recent = db.query(Memory).filter(Memory.user_id == user.id).order_by(Memory.id.desc()).limit(4).all()
        rems = db.query(Reminder).filter(Reminder.user_id == user.id).order_by(Reminder.id.desc()).limit(4).all()
    fallback = (
        f"{first_name}, here is the most practical answer I can give right now. "
        "I’ll keep it focused, make a recommendation, and give you a clear next action."
    )
    prompt = f"""User profile: first_name={first_name}, branch={branch}, current_city={city}, current_state={state}
Recent memories: {[m.title for m in recent]}
Recent reminders: {[r.title for r in rems]}
Primary intent: {intent}
User said: {message}

COMPLETION CONTRACT:
- Never repeat or paraphrase the user's question back to them.
- Never begin with “I heard you,” “you asked,” or “based on what you asked.”
- Do not stop after promising to help. Perform the useful work in the same response.
- Continue until a logical conclusion: answer, recommendation, useful options, and one concrete next action.
- Ask a question only when an essential fact is genuinely missing and cannot be inferred.

Answer the user's actual request directly and stay on that single topic. Do not list ValorBuddy capabilities or unrelated features. Do not say “my next useful step,” “I can help by,” “tell me more,” or “which direction do you want?” Keep it natural, concise, warm, and action-oriented."""
    use_grounding = bool(plan.get("needs_google_search") or intent == "live_web")
    if use_grounding:
        prompt += "\nUse Google Search grounding for current facts. Include dates or freshness context where useful and do not invent local results."
    response = await gemini_reply(prompt, fallback, grounded=use_grounding)
    return {"response": response, "intent": intent, "data": {"plan": plan, "grounded": use_grounding}}


app = FastAPI(title=APP_NAME, version="4.4.0")
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
    return {"status": "ok", "app": APP_NAME, "version": "4.4.0", "database": "postgres" if DATABASE_URL.startswith("postgres") else "sqlite", "gemini": bool(GEMINI_API_KEY), "google_places": bool(GOOGLE_MAPS_API_KEY)}


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
        db.add(UserProfile(user_id=user.id, first_name="Veteran", branch=payload.branch, city="", state=""))
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
async def events_search(city: str = "", state: str = "", keyword: str = "veteran events", lat: float | None = None, lng: float | None = None, user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    if user and user.profile:
        city = city or user.profile.city or ""
        state = state or user.profile.state or ""
    live, items, location_meta = await google_places(city=city, state=state, query=keyword, lat=lat, lng=lng)
    db.add(ActivitySearch(user_id=user.id if user else None, city=location_meta.get("city") or city or "", state=location_meta.get("state") or state or "", query=keyword, live=live, results=items)); db.commit()
    return {"live": live, "provider": "Google Places" if live else "Fallback", "items": items, "location": location_meta}


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
async def today_briefing(lat: float | None = None, lng: float | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = user.profile
    rems = db.query(Reminder).filter(Reminder.user_id == user.id, Reminder.status == "active").order_by(Reminder.id.desc()).limit(3).all()
    live, events, location_meta = await google_places(city=p.city, state=p.state, query="veteran events VA VFW American Legion family friendly", lat=lat, lng=lng)
    return {"greeting": f"Good to see you, {p.first_name}. How is your day going?", "location": f"{location_meta.get('city') or p.city}, {location_meta.get('state') or p.state}", "reminders": [{"title": r.title, "when_text": r.when_text} for r in rems], "events": events[:3], "wellness_prompt": ("Live Google Places is connected." if live else "Google Places is in demo mode. Add GOOGLE_PLACES_API_KEY in Render to make activities live.")}


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
        lat=payload.lat,
        lng=payload.lng,
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


@app.post("/api/vapi/action")
async def vapi_action(payload: VapiActionRequest, db: Session = Depends(get_db)):
    text = payload.message or payload.query or payload.title or payload.memory or ""
    email = (payload.email or "").lower().strip()
    user = db.query(User).filter(User.email == email).first() if email else None
    if not user:
        user = db.query(User).filter(User.email == "demo@valorbuddy.com").first()

    profile = user.profile if user and user.profile else None
    first_name = payload.first_name or (profile.first_name if profile else "there")
    branch = payload.branch or (profile.branch if profile else "") or "Veteran"

    # IMPORTANT: browser GPS beats profile city. Profile city is used only when GPS is not available.
    city = clean_text(payload.city) or (profile.city if profile else "")
    state = clean_text(payload.state) or (profile.state if profile else "")
    lat = payload.lat
    lng = payload.lng

    result = await route_valorbuddy_message(
        text=text,
        first_name=first_name,
        branch=branch,
        city=city,
        state=state,
        lat=lat,
        lng=lng,
        user_type=payload.user_type or "Veteran",
        user=user,
        db=db,
        explicit_intent=payload.intent,
        title=payload.title,
        date=payload.date,
        time=payload.time,
        memory=payload.memory,
        mood=payload.mood,
    )
    return result


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
