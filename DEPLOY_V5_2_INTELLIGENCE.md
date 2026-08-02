# ValorBuddy v5.2 Intelligence Activation

This release preserves the restored interface and activates the existing agent architecture in the everyday workflows.

## What changes

- Complex Assistant requests automatically become missions.
- Mission Control displays Supervisor plans, participating agents, steps, verification, and progress.
- PDF, DOCX, TXT, MD, CSV, and JSON documents receive text extraction and AI analysis.
- Resume, DD214, certification, and VA-record uploads automatically launch a specialist mission.
- Resume analysis extracts skills, role directions, missing information, and next actions.
- Career & Business Studio builds resumes, cover letters, transition plans, and veteran business plans.
- Service Profile exposes MOS and all career/business fields already created in PostgreSQL.
- Memories accept photos.
- Music favorites open directly in Spotify, YouTube, and Apple Music.
- Text contrast, forms, dialogs, and mobile layouts are strengthened.

## Database

Run `VALORBUDDY_V5_2_INTELLIGENCE.sql` once against the production PostgreSQL database.

## Required backend environment variables

At least one AI authentication mode must be active. Without it, the platform intentionally falls back to limited heuristic output.

API-key mode:

```
GOOGLE_API_KEY=<your Google Gemini API key>
GOOGLE_GENAI_USE_VERTEXAI=false
GEMINI_MODEL=<your currently enabled Gemini model>
GEMINI_PLANNER_MODEL=<your currently enabled Gemini model>
ENABLE_GOOGLE_SEARCH_GROUNDING=true
```

Vertex AI mode:

```
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=<project-id>
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=<model enabled in your project>
GEMINI_PLANNER_MODEL=<model enabled in your project>
ENABLE_GOOGLE_SEARCH_GROUNDING=true
```

Keep the existing `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, and Google Places variables.

## Render deployment order

1. Run the SQL migration.
2. Push the updated code to `main`.
3. Deploy the backend first.
4. Confirm `/api/agentic/core` responds after login.
5. Upload a DOCX or text-based PDF resume and confirm the response contains `analysis` and `mission`.
6. Deploy the frontend.
7. Clear the frontend build cache.
8. Test Mission Control, Career & Business, Documents, Memories, and Music on desktop and mobile.

## Frontend settings

```
Root Directory: frontend
Build Command: npm ci --no-audit --no-fund && npm run build
Publish Directory: dist
```

## Backend settings

```
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Verification requests

- Assistant: `Analyze my background and build a transition plan into cybersecurity.`
- Mission Control: `Use my uploaded resume and MOS to recommend three roles and build a tailored resume.`
- Documents: upload a text-based PDF or DOCX resume.
- Career & Business: build a resume and a business plan.

The agent system is active when complex Assistant requests return `intent: agentic_mission`, and Mission Control shows multiple verified steps rather than a single chat response.
