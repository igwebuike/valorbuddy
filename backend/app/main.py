from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

APP_NAME = os.getenv("APP_NAME", "ValorBuddy API")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
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


app = FastAPI(title=APP_NAME, version="2.2.0")
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


class VapiActionRequest(BaseModel):
    intent: str = "general"
    query: str = ""
    message: str = ""
    first_name: str = "Veteran"
    email: str = "local"
    branch: str = "Army"
    city: str = "Dallas"
    state: str = "TX"
    title: str = ""
    date: str = ""
    time: str = ""
    memory: str = ""
    mood: str = "calm"


def normalize_intent(text: str) -> str:
    t = (text or "").lower()
    if any(x in t for x in ["event", "activity", "vfw", "american legion", "near me", "place", "coffee", "park"]):
        return "find_local_veteran_activities"
    if any(x in t for x in ["remind", "reminder", "appointment", "call the va"]):
        return "create_reminder"
    if any(x in t for x in ["remember", "memory", "save this", "photo"]):
        return "save_memory"
    if any(x in t for x in ["benefit", "benefits", "claim", "gi bill", "disability", "va loan", "dd214"]):
        return "search_benefits"
    if any(x in t for x in ["music", "song", "play", "calm", "relax"]):
        return "suggest_music"
    if any(x in t for x in ["briefing", "today", "schedule", "what do i have"]):
        return "get_today_briefing"
    if any(x in t for x in ["profile", "who am i", "my info"]):
        return "get_user_profile"
    return "general"


def profile_payload(row, fallback_email="local"):
    if not row:
        return {"email": fallback_email, "name": "Veteran", "branch": "Army", "city": "Dallas", "state": "TX", "interests": [], "preferred_tone": "calm and positive"}
    return {"email": row.email, "name": row.name, "branch": row.branch, "city": row.city, "state": row.state, "interests": row.interests or [], "preferred_tone": row.preferred_tone}


def benefits_response(query: str, state: str = "TX", branch: str = "Army"):
    q = (query or "benefits").lower()
    items = []
    if any(x in q for x in ["gi", "education", "school", "tuition"]):
        items.append({"title": "GI Bill and education benefits", "summary": "Review Post-9/11 GI Bill, Montgomery GI Bill, transferability, school certification, and housing allowance basics.", "next_step": "Check eligibility on VA.gov and gather DD214, school program details, and prior education records."})
    if any(x in q for x in ["disability", "claim", "rating", "compensation"]):
        items.append({"title": "VA disability compensation", "summary": "You may be able to file or update a claim for service-connected conditions. ValorBuddy can help organize questions and documents, but cannot guarantee outcomes.", "next_step": "Work with a VSO, VA-accredited representative, or VA.gov to review evidence and file officially."})
    if any(x in q for x in ["home", "loan", "mortgage", "house"]):
        items.append({"title": "VA home loan benefit", "summary": "VA-backed home loans can help eligible veterans buy, build, repair, or refinance a home.", "next_step": "Check Certificate of Eligibility and speak with a VA-approved lender."})
    if not items:
        items = [
            {"title": "Benefits starting point", "summary": "Common areas include healthcare, disability compensation, education, VA home loans, employment support, and pension programs.", "next_step": "Tell me which benefit area you want, and I’ll build a plain-English checklist."},
            {"title": "Find a VSO", "summary": "A Veteran Service Officer can help review claims and paperwork.", "next_step": f"Search for a VSO near your location in {state} or ask ValorBuddy to find nearby veteran organizations."},
        ]
    return {"query": query, "branch": branch, "state": state, "disclaimer": "Informational only. For official decisions use VA.gov or a VA-accredited representative.", "items": items}


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
        "version": "2.2.0",
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
    provider = "Curated starter suggestions"
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


@app.get("/api/profile")
def api_profile(email: str = "local"):
    db = SessionLocal()
    try:
        return profile_payload(db.query(UserProfileDB).filter(UserProfileDB.email == email).first(), email)
    finally:
        db.close()


@app.get("/api/events/search")
async def api_events_search(city: str = "Dallas", state: str = "TX", keyword: str = "veteran events"):
    return await activities(city=city, state=state, interest=keyword)


@app.get("/api/benefits/search")
def api_benefits_search(query: str = "benefits", state: str = "TX", branch: str = "Army"):
    return benefits_response(query=query, state=state, branch=branch)


@app.get("/api/music/suggest")
def api_music_suggest(mood: str = "calm", branch: str = "Army"):
    data = music_suggestions(mood=mood)
    data["branch"] = branch
    return data


@app.get("/api/briefing")
async def api_briefing(email: str = "local", city: str = "Dallas", state: str = "TX"):
    db = SessionLocal()
    try:
        profile = db.query(UserProfileDB).filter(UserProfileDB.email == email).first()
        if profile:
            city, state = profile.city, profile.state
        reminders = db.query(ReminderDB).filter(ReminderDB.profile_email == email, ReminderDB.status == "active").order_by(ReminderDB.id.desc()).limit(5).all()
        memories = db.query(MemoryDB).filter(MemoryDB.profile_email == email).order_by(MemoryDB.id.desc()).limit(3).all()
    finally:
        db.close()
    events = await activities(city=city, state=state, interest="veteran activities")
    return {
        "greeting": f"Good to see you. Here is your ValorBuddy briefing for {city}, {state}.",
        "reminders": [{"title": r.title, "when_text": r.when_text, "note": r.note} for r in reminders],
        "recent_memories": [{"title": m.title, "note": m.note} for m in memories],
        "local_activities": events.get("items", [])[:3],
        "suggested_focus": "One practical step, one connection, and one calming routine today."
    }


@app.post("/api/reminders")
def api_create_reminder(payload: dict):
    title = payload.get("title") or payload.get("reminder") or "Reminder"
    date = payload.get("date", "")
    time = payload.get("time", "")
    when_text = payload.get("when_text") or " ".join(x for x in [date, time] if x).strip() or "soon"
    email = payload.get("profile_email") or payload.get("email") or "local"
    return add_reminder(ReminderIn(profile_email=email, title=title, when_text=when_text, note=payload.get("note", "")))


@app.post("/api/memories")
def api_save_memory(payload: dict):
    title = payload.get("title") or "Saved memory"
    memory = payload.get("memory") or payload.get("note") or ""
    email = payload.get("profile_email") or payload.get("email") or "local"
    return add_memory(MemoryIn(profile_email=email, title=title, note=memory, tags=payload.get("tags", [])))


@app.post("/api/vapi/action")
async def api_vapi_action(payload: VapiActionRequest, request: Request):
    # One orchestration endpoint for Vapi. It routes voice intent to Google Places, Gemini, DB reminders, memories, benefits, music, or briefing.
    intent = normalize_intent(payload.intent or payload.query or payload.message)
    msg = payload.message or payload.query or payload.intent
    db = SessionLocal()
    try:
        row = db.query(UserProfileDB).filter(UserProfileDB.email == payload.email).first()
        if not row:
            row = UserProfileDB(email=payload.email, name=payload.first_name or "Veteran", branch=payload.branch, city=payload.city, state=payload.state, interests=["veteran events", "benefits", "wellness"])
            db.add(row); db.commit(); db.refresh(row)
        prof = Profile(name=row.name or payload.first_name, branch=row.branch or payload.branch, city=row.city or payload.city, state=row.state or payload.state, interests=row.interests or [], preferred_tone=row.preferred_tone)
    finally:
        db.close()

    result = None
    if intent == "find_local_veteran_activities":
        result = await activities(city=prof.city, state=prof.state, interest=payload.query or "veteran activities")
        summary = f"{prof.name}, I found {len(result.get('items', []))} veteran-friendly options near {prof.city}. Top options: " + "; ".join([i.get('title','Option') for i in result.get('items', [])[:3]])
    elif intent == "create_reminder":
        title = payload.title or msg or "Reminder"
        when = " ".join(x for x in [payload.date, payload.time] if x).strip() or "soon"
        result = api_create_reminder({"email": payload.email, "title": title, "when_text": when})
        summary = f"Absolutely, {prof.name}. I saved that reminder: {title}, {when}."
    elif intent == "save_memory":
        title = payload.title or "Important memory"
        memory = payload.memory or msg
        result = api_save_memory({"email": payload.email, "title": title, "memory": memory})
        summary = f"I saved that memory for you, {prof.name}."
    elif intent == "get_user_profile":
        result = profile_payload(row, payload.email)
        summary = f"{prof.name}, I have your profile as {prof.branch}, based near {prof.city}, {prof.state}."
    elif intent == "get_today_briefing":
        result = await api_briefing(email=payload.email, city=prof.city, state=prof.state)
        summary = f"{prof.name}, here is your briefing: {len(result['reminders'])} reminders, {len(result['local_activities'])} nearby activity options, and a focus on one practical step today."
    elif intent == "search_benefits":
        result = benefits_response(query=payload.query or msg, state=prof.state, branch=prof.branch)
        summary = f"{prof.name}, I found benefits guidance. Top item: {result['items'][0]['title']}. {result['items'][0]['next_step']}"
    elif intent == "suggest_music":
        result = music_suggestions(mood=payload.mood)
        summary = f"{prof.name}, I can suggest calming or uplifting music. I found options for {payload.mood} mood, including a built-in calming tone and licensed playlist links."
    else:
        comp = await ai_companion(CompanionRequest(profile=prof, message=msg or "How can you help me today?", profile_email=payload.email))
        result = comp
        summary = comp.get("reply")

    return {"ok": True, "intent": intent, "response": summary, "data": result}
