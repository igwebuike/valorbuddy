# ValorBuddy Production MVP

Voice-first AI companion and veteran assistant for early testing with veteran groups.

## Core features
- Personalized login/profile by name, branch, city, and state
- Real microphone voice command on supported browsers/mobile web
- Gemini-powered AI companion with safe fallback responses
- Positive companion mode for grounding, encouragement, memories, reminders, and practical support
- Memory Wall for positive memories and photo/story prompts
- Music Companion with built-in calming tone and licensed-service playlist links
- Local veteran-friendly activities via Google Places when `GOOGLE_MAPS_API_KEY` is configured
- Benefits guidance with VA/VSO guardrails
- Reminder creation and browser notification support
- Capacitor-ready mobile build scripts

## Important safety boundary
ValorBuddy is supportive technology, not clinical care. It does not diagnose or treat PTSD. For crisis or immediate danger, users should call 911 or 988 and press 1.

## Backend local
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Frontend local
```bash
cd frontend
npm install
npm run dev
```

## Render backend envs
```env
GEMINI_API_KEY=your_existing_gemini_key
GEMINI_MODEL=gemini-1.5-flash
GOOGLE_MAPS_API_KEY=your_google_maps_key
CORS_ORIGINS=https://your-valorbuddy-frontend.onrender.com,https://valorbuddy.com
```

Backend Render:
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Frontend Render:
- Root Directory: `frontend`
- Build Command: `npm install --include=dev && chmod +x ./node_modules/@esbuild/linux-x64/bin/esbuild || true && npm run build`
- Publish Directory: `dist`
- Env: `VITE_API_BASE_URL=https://your-backend.onrender.com`

## Mobile
```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
For iOS, run on macOS:
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```
