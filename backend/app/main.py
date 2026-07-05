from __future__ import annotations

import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_NAME = os.getenv("APP_NAME", "ValorBuddy API")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
DATA_DIR = Path(os.getenv("DATA_DIR", "/tmp/valorbuddy"))
UPLOAD_DIR = DATA_DIR / "uploads"
MEMORIES_FILE = DATA_DIR / "memories.json"
REMINDERS_FILE = DATA_DIR / "reminders.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME, version="2.0.0")
origins = [x.strip() for x in CORS_ORIGINS.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Profile(BaseModel):
    name: str = "Veteran"
    branch: str = "Army"
    city: str = "Dallas"
    state: str = "TX"
    interests: List[str] = []
    preferred_tone: str = "calm and positive"


class CompanionRequest(BaseModel):
    profile: Profile = Field(default_factory=Profile)
    message: str
    mode: str = "companion"
    recent_memories: List[str] = []


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


def read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, default=str))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "gemini": bool(GEMINI_API_KEY),
        "google_maps": bool(GOOGLE_MAPS_API_KEY),
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


@app.post("/ai/companion")
async def ai_companion(req: CompanionRequest):
    answer = await gemini_answer(req)
    return {"reply": answer or fallback_answer(req), "source": "gemini" if answer else "fallback"}


@app.get("/activities")
async def activities(city: str = "Dallas", state: str = "TX", interest: str = "veteran events"):
    query = f"veteran friendly {interest} near {city} {state}"
    if GOOGLE_MAPS_API_KEY:
        try:
            url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params={"query": query, "key": GOOGLE_MAPS_API_KEY})
                r.raise_for_status()
                data = r.json().get("results", [])[:8]
            return {
                "live": True,
                "provider": "Google Places",
                "items": [
                    {
                        "title": x.get("name"),
                        "location": x.get("formatted_address"),
                        "rating": x.get("rating"),
                        "type": "Local activity/resource",
                        "open_now": x.get("opening_hours", {}).get("open_now"),
                    }
                    for x in data
                ],
            }
        except Exception:
            pass
    return {
        "live": False,
        "provider": "Fallback curated list",
        "items": [
            {"title": "Veteran Coffee Meetup", "type": "Community", "location": f"{city}, {state}", "date": "This week"},
            {"title": "VFW / American Legion Post Visit", "type": "Veteran community", "location": f"Near {city}", "date": "Any day"},
            {"title": "Veteran Job & Resource Fair", "type": "Employment", "location": f"{city} metro", "date": "Next available"},
            {"title": "Outdoor Walk or Park Check-in", "type": "Wellness", "location": f"Near {city}", "date": "Today"},
            {"title": "Veteran-Owned Business Visit", "type": "Discounts", "location": f"{city}, {state}", "date": "Daily"},
        ],
    }


@app.get("/music/suggestions")
def music_suggestions(mood: str = "calm"):
    mood = mood.lower()
    if "energy" in mood or "motivat" in mood:
        theme = "uplifting veteran motivation playlist"
    elif "sleep" in mood:
        theme = "calm sleep instrumental playlist"
    else:
        theme = "calm instrumental grounding playlist"
    return {
        "note": "ValorBuddy can play built-in calming tones. For commercial songs, open a licensed music service.",
        "suggestions": [
            {"title": "Calm instrumental grounding", "action": "play_builtin_calm"},
            {"title": "Uplifting classics", "url": f"https://open.spotify.com/search/{theme.replace(' ', '%20')}"},
            {"title": "YouTube calming playlist search", "url": f"https://www.youtube.com/results?search_query={theme.replace(' ', '+')}"},
        ],
    }


@app.get("/memories")
def list_memories(profile_email: str = "local"):
    rows = read_json(MEMORIES_FILE, [])
    return [x for x in rows if x.get("profile_email") == profile_email]


@app.post("/memories")
def add_memory(memory: MemoryIn):
    rows = read_json(MEMORIES_FILE, [])
    row = {**memory.model_dump(), "id": len(rows) + 1, "created_at": datetime.now(timezone.utc).isoformat()}
    rows.insert(0, row)
    write_json(MEMORIES_FILE, rows)
    return row


@app.post("/memories/photo")
async def add_memory_photo(
    profile_email: str = Form("local"),
    title: str = Form(...),
    note: str = Form(""),
    file: UploadFile = File(...),
):
    safe_name = f"{int(datetime.now().timestamp())}_{file.filename}".replace("/", "_")
    path = UPLOAD_DIR / safe_name
    path.write_bytes(await file.read())
    image_url = f"/uploads/{safe_name}"
    row = MemoryIn(profile_email=profile_email, title=title, note=note, image_url=image_url)
    return add_memory(row)


@app.get("/reminders")
def list_reminders(profile_email: str = "local"):
    rows = read_json(REMINDERS_FILE, [])
    return [x for x in rows if x.get("profile_email") == profile_email]


@app.post("/reminders")
def add_reminder(reminder: ReminderIn):
    rows = read_json(REMINDERS_FILE, [])
    row = {**reminder.model_dump(), "id": len(rows) + 1, "created_at": datetime.now(timezone.utc).isoformat(), "status": "active"}
    rows.insert(0, row)
    write_json(REMINDERS_FILE, rows)
    return row
