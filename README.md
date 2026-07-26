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

## ValorBuddy v4.7 additions

- Restored service-branch emblems in the sidebar and command header.
- Added interruptible voice playback: say “wait,” “stop,” “hold on,” or use the Stop Speaking button.
- Voice results are spoken one recommendation at a time with pauses between options.
- Follow-up questions now include the previously displayed result context, so questions such as “Are these veteran-owned?” and “Why did you choose them?” are answered against the actual options already shown.
- Previous results remain visible during explanation follow-ups.
- Added clearer distinction between veteran-serving locations, verified veteran-owned businesses, and confirmed scheduled events.


## ValorBuddy v4.8 standardization
- Removed test-login shortcuts and automatic demo-user creation.
- Added editable military profile: first/last name, rank, branch, service status, service period, deployment history, VA rating, location, accessibility and music preferences.
- AI prompts now receive the authenticated member profile for personalized guidance.
- Added travel safety, housing/credit, vehicle purchase, investments education, veteran-owned businesses, discounts, hiring companies, and VA forms/program guidance.
- Added editable Music & Entertainment favorites with add/delete support.
- Added mobile navigation so Voice and Logout remain reachable on small screens.
- Admin is controlled by ADMIN_EMAIL and ADMIN_PASSWORD environment variables. No production password is committed to source.

### Required Render variables
`ADMIN_EMAIL=eugene.ebem@gmail.com`
`ADMIN_PASSWORD=<strong unique password>`

For real-time interruptible speech, the recommended next integration is Gemini Live API or Google ADK Live. The current browser speech layer remains as a compatibility fallback.

# ValorBuddy v4.9 Platform Edition

## Implemented in this upgrade
- Professional responsive member platform and military-style personalized greeting.
- In-session Member View / Admin Command toggle for authorized roles.
- Expanded service and lifestyle profile through structured `profile_data` storage.
- AI companion mission interface using the existing planner, tools, GPS and Gemini layer.
- Explicit, user-controlled AI memory facts with add, update and forget operations.
- GPS-first resource intelligence for travel, events, housing, employment, veteran-owned businesses, discounts, vehicles and organizations.
- VA Forms navigator with official links, document checklists and an explicit no-false-submission safeguard.
- Benefits pathways, financial education guardrails, entertainment favorites, documents and reminders.
- Admin analytics, editable prompt/platform settings and knowledge-base APIs.
- New v4.9 database tables: `memory_facts`, `platform_settings`, and `knowledge_items`.
- Integration capability endpoint and health indicators.

## Production integration boundaries
The Google, Microsoft and Apple sign-in controls are presentation-ready but require OAuth client credentials and callback configuration. MFA, email verification, password reset, refresh-token rotation, device management, OCR providers, cloud object encryption, calendar write access, Gemini Live, VAPI, Firebase, and authorized VA submission APIs require provider credentials and deployment configuration; the source does not falsely represent those services as active.

## Local validation
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

cd ../frontend
npm install
npm run build
npm run dev
```

## Upgrade notes
Existing deployments use additive startup migrations for the new `profile_data` column. Back up production PostgreSQL before deployment. For a regulated or enterprise launch, replace the lightweight startup migration with Alembic, use a secrets manager, configure strict CORS, rotate `SECRET_KEY`, and complete an independent security review.


# ValorBuddy v4.9.1 Agentic Core

## Core principle
Every agent must either save the veteran time, reduce stress, improve access to trusted resources, or strengthen day-to-day quality of life.

## Implemented
- PostgreSQL-backed persistent missions, mission steps, approvals, events, progress, risk, and next-action state.
- Supervisor Agent with a constrained specialist-agent catalog.
- Structured Gemini mission planning with validated JSON and a deterministic fallback planner.
- Tool registry with explicit risk and approval metadata.
- Safe execution loop: Goal → Plan → Execute → Verify → Remember → Follow up.
- Human approval gates for reminders and durable memory changes.
- Verified result metadata and per-mission audit timeline.
- Specialist foundations for Travel, Benefits, VA Forms, Housing, Career, Personal Companion, Entertainment, Family, Wellness, Documents, Life Operations, and Safety.
- New responsive Mission Control screen with mission creation, progress, specialist agents, steps, tool results, approvals, and continuation.

## New PostgreSQL tables
- `agent_missions`
- `agent_mission_steps`
- `agent_approvals`
- `agent_mission_events`

The existing startup migration calls `Base.metadata.create_all()`, so these tables are created additively. For controlled production deployment, review and run `backend/migrations/0049_1_agentic_core.sql` during a maintenance window after backing up PostgreSQL.

## Agentic API
- `GET /api/agentic/core`
- `POST /api/agentic/missions`
- `GET /api/agentic/missions`
- `GET /api/agentic/missions/{mission_id}`
- `POST /api/agentic/missions/{mission_id}/run`
- `POST /api/agentic/approvals/{approval_id}`
- `POST /api/agentic/missions/{mission_id}/cancel`

## Validation note
Python syntax compilation passed. Frontend dependency installation could not finish in the build environment because the internal npm registry returned HTTP 503. Run `npm ci && npm run build` locally or in Render, where dependencies are installed during deployment.
