# ValorBuddy Production MVP - Military UI Restored

This package restores the original military command-center interface while keeping the production backend, PostgreSQL support, Gemini, Google Places, memory/reminder/companion endpoints, and Render deployment structure.

## Frontend
- Root Directory: `frontend`
- Build Command: `npm install --include=dev && chmod +x node_modules/@esbuild/linux-x64/bin/esbuild || true && npm run build`
- Publish Directory: `dist`
- Env: `VITE_API_BASE_URL=https://api.valorbuddy.com` or Render backend URL during testing.

## Backend
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Database
Set `DATABASE_URL` to Render Postgres Internal Database URL. Tables auto-create on backend startup.

## Notes
The UI intentionally uses branch-specific command-center themes for Army, Air Force, Navy, Marines, Coast Guard, and Space Force.
