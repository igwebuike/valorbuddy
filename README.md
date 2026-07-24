# ValorBuddy Production AI Upgrade v4.1

The existing UI is preserved. This release upgrades the intelligence layer.

## Improvements
- Google Gen AI SDK (Gemini Developer API or Gemini Enterprise Agent Platform / Vertex AI)
- Gemini-based request planner instead of primary keyword heuristics
- Optional Google Search grounding for live/current questions
- GPS refreshed at request time; profile city is only a fallback
- Recent conversation, reminders, and memories are supplied as context
- Follow-up questions can reference prior messages
- Google Places remains the source for nearby physical locations
- AI failures degrade gracefully instead of breaking the app

## Render backend environment variables
Required:
- `GOOGLE_API_KEY=<your existing Google/Gemini API key>`
- `GOOGLE_PLACES_API_KEY=<key with Places + Geocoding enabled>`
- `SECRET_KEY=<long random secret>`
- `DATABASE_URL=<Render Postgres internal URL>`

Recommended:
- `GEMINI_MODEL=gemini-3.6-flash` (change this in Render whenever you want to switch models)
- `GEMINI_PLANNER_MODEL=gemini-3.6-flash` (optional; if omitted, it automatically uses `GEMINI_MODEL`)
- `ENABLE_GOOGLE_SEARCH_GROUNDING=true`
- `CORS_ORIGINS=https://valorbuddy.com,https://www.valorbuddy.com`

Vertex AI mode (optional):
- `GOOGLE_GENAI_USE_VERTEXAI=true`
- `GOOGLE_CLOUD_PROJECT=<project-id>`
- `GOOGLE_CLOUD_LOCATION=global`
- Supply credentials supported by your hosting environment. API-key mode is simplest on Render. The backend reads `GOOGLE_API_KEY` first and also accepts `GEMINI_API_KEY` as a compatibility alias.

## Deploy
1. Push this folder to GitHub.
2. In Render, deploy backend from `backend` and frontend from `frontend`.
3. Add the environment variables above to the backend service.
4. Ensure Places API and Geocoding API are enabled for the Places key.
5. In the browser, allow location permission and test “restaurants near me” while outside the saved profile city.

## Mobile
Capacitor configuration is retained. After web validation:
```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

## v4.2 focused-intelligence update

- Replaced generic capability-list responses with intent-focused AI behavior.
- Added one-question clarification flow with a 12-second sensible-default continuation in web voice/chat.
- Enforced GPS-first handling for “near me” requests; no silent Dallas fallback.
- Added an inclusive production system prompt for the full military community.
- Added `docs/VAPI_PRODUCTION_PROMPT.txt` for the Vapi assistant configuration.
- Redesigned the Navy theme with a distinct deep-navy, sonar-grid, and gold-accent identity.
- Updated the first greeting to use “digital battle buddy” language without announcing loaded personal data.


## v4.6 conversation completion update

- Clear event and nearby-place requests now bypass vague planner fallbacks and route directly to live location search.
- ValorBuddy no longer repeats the user's question.
- Removed “I heard you,” “best starting point,” and “tell me one detail” responses.
- Responses continue through a useful answer, recommendation, numbered choices, and a concrete next action.
- Event responses recommend a first option and let the user continue by saying a number.


## ValorBuddy v4.6 additions

- Beautiful responsive recommendation popup with wrapped clickable action buttons.
- GPS-first local discovery with city/state fallback and date-oriented search choices.
- Live Google Places details for top results, including opening status, phone, website, ratings, and available Google review excerpts.
- ValorBuddy explanation for why each event or place may fit.
- Benefits popup with plain-English explanation, best next step, and clearly labeled common veteran-community guidance.
- Voice and Activities pages now surface quick choices for today, this weekend, free events, family-friendly options, VFW/Legion, and “pick for me.”
- No invented reviews: place comments are shown only when returned by Google; benefits community notes are labeled as common practical guidance rather than individual testimonials.
