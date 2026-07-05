ValorBuddy Demo Patch

Replace:
- backend/app/main.py
- frontend/src/App.jsx

Then commit, push, and redeploy backend + frontend.

Fixes:
- /api/vapi/action now returns detailed top 3 Google Places results and stores last activity search.
- Follow-up questions like “tell me more” or “details” reuse the last activity results.
- Branch/theme buttons now switch Army/Navy/Air Force/Marines/Coast Guard/Space Force.
- Voice/AI Assistant displays result cards with map links when available.
