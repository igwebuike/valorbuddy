ValorBuddy Location + Family Access Patch

Replace these files:
- backend/app/main.py
- frontend/src/App.jsx
- frontend/src/main.jsx
- frontend/src/style.css
- frontend/src/assets/valorbuddy-logo.png

What changed:
- Browser geolocation is captured on app load and stored in localStorage.
- Voice requests now send lat/lng to /api/vapi/action.
- Activities search now sends lat/lng to /api/events/search.
- Backend Google Places uses lat/lng first, then profile city/state.
- Dallas is no longer hardcoded in VapiActionRequest.
- If no location exists, backend asks for city/state instead of assuming Dallas.
- Veteran family access language added for spouses, kids, dependents, caregivers, and family.

Render env vars:
- GEMINI_API_KEY=your_key
- GOOGLE_PLACES_API_KEY=your_key
- CORS_ORIGINS=*

Browser note:
The user must allow location permission for true “near me.” If permission is blocked, ValorBuddy uses saved profile city/state. If neither exists, it asks for city/state.
