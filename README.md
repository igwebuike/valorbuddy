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
