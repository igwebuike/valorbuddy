# ValorBuddy Enterprise MVP

Production-ready foundation for ValorBuddy with:

- Veteran authentication with JWT
- User accounts and profiles
- Admin login and admin dashboard
- Gemini companion and memory-aware chat
- Vapi voice integration endpoint: `POST /api/vapi/action`
- Google Places live local veteran activity search
- Reminder storage with Google Calendar-ready field
- Document Vault with upload and AI summary
- Conversations and messages stored in PostgreSQL
- Music suggestions
- VA benefits lookup guidance
- Auto database table creation on backend startup
- Military command-center UI with branch themes

## Test Accounts

Veteran:
- `demo@valorbuddy.com`
- `ValorDemo123!`

Admin:
- `admin@valorbuddy.com`
- `ValorAdmin123!`

## Backend Render

Root Directory: `backend`
Build Command: `pip install -r requirements.txt`
Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required env:
- `DATABASE_URL`
- `SECRET_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `CORS_ORIGINS`
- `PYTHON_VERSION=3.11.9`

## Frontend Render

Root Directory: `frontend`
Build Command: `npm install --include=dev && chmod +x node_modules/@esbuild/linux-x64/bin/esbuild || true && npm run build`
Publish Directory: `dist`

Env:
- `VITE_API_BASE_URL=https://valorbuddy.onrender.com`

## Vapi Tool

Create one API Request tool:

Name: `valorbuddy_agent_action`
Method: `POST`
URL: `https://valorbuddy.onrender.com/api/vapi/action`
Header: `Content-Type: application/json`
Request body fields: intent, query, message, first_name, email, branch, city, state, title, date, time, memory, mood.
Response body property: `response` string.
