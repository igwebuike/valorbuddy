# ValorBuddy Backend Modularization Plan

## Objective

Reduce the 3,270-line `main.py` without changing public API routes, database behavior, authentication rules, response formats, or current mobile/web functionality.

## Target structure

```text
backend/app/
├── main.py                 # App factory, middleware, router registration only
├── core/
│   ├── config.py           # Typed environment settings
│   ├── database.py         # Engine, SessionLocal, Base, get_db
│   ├── logging.py          # Application and security logging
│   └── lifecycle.py        # Startup/shutdown orchestration
├── models/
│   ├── identity.py         # User, UserProfile, AuthToken
│   ├── partner.py          # PartnerOrganization, PartnerMembership
│   ├── engagement.py       # Conversation, Message, Memory, Reminder
│   ├── documents.py        # Document, CareerDocument
│   ├── administration.py   # AdminAuditLog, PlatformSetting, KnowledgeItem
│   └── missions.py         # AgentMission and related mission models
├── schemas/
│   ├── auth.py
│   ├── profile.py
│   ├── partner.py
│   ├── reminder.py
│   ├── document.py
│   ├── admin.py
│   └── mission.py
├── api/
│   ├── dependencies.py     # Current/optional/admin user dependencies
│   └── routers/
│       ├── auth.py
│       ├── profiles.py
│       ├── partners.py
│       ├── reminders.py
│       ├── memories.py
│       ├── benefits.py
│       ├── music.py
│       ├── resources.py
│       ├── documents.py
│       ├── companion.py
│       ├── administration.py
│       └── missions.py
├── services/
│   ├── authentication.py
│   ├── email.py
│   ├── encryption.py
│   ├── reminders.py
│   ├── documents.py
│   ├── places.py
│   ├── va_facilities.py
│   ├── benefits.py
│   ├── companion.py
│   └── missions.py
├── repositories/
│   ├── users.py
│   ├── partners.py
│   ├── reminders.py
│   ├── documents.py
│   └── missions.py
├── agentic/                # Existing planner/router/catalog/prompts package
└── migrations/             # Versioned schema migrations
```

## Dependency rule

Dependencies should flow in one direction:

```text
routers -> services -> repositories -> models/database
                    -> external integrations
```

Models and repositories must not import routers. Services must not import the FastAPI application object.

## Safe extraction phases

### Phase 0 — Release stabilization

- Keep current API behavior frozen.
- Move DDL out of startup into versioned migrations.
- Record a route inventory and response snapshots.
- Require current unit, security, and frontend checks on every pull request.

### Phase 1 — Foundations

Extract configuration, database setup, lifecycle functions, security dependencies, and shared response utilities. Keep every endpoint in `main.py` during this phase.

### Phase 2 — Low-coupling routers

Move health, benefits, music, memories, and reminders into `APIRouter` modules first. Register them from `main.py` without changing paths or response payloads.

### Phase 3 — Identity and partner domains

Move authentication, MFA, password reset, profiles, partner registration, partner portal, and administrator approval. Add authorization tests before moving each router.

### Phase 4 — Documents and integrations

Extract encrypted document storage, Resend, Google Places, VA Lighthouse facilities, and Gemini behind service interfaces. Ensure external clients have explicit timeouts, error translation, and test doubles.

### Phase 5 — Agentic mission domain

Move mission models, planning, tool execution, approvals, handoffs, checkpoints, feedback, and failure tracking into a dedicated mission service and router.

### Phase 6 — Data access boundary

Move query logic from routers/services into repositories. Introduce Alembic (or an equivalent migration runner) and remove `Base.metadata.create_all` from production startup after every environment uses migrations.

## Compatibility controls for every phase

1. Move one domain at a time.
2. Preserve all existing route paths and HTTP methods.
3. Preserve request/response schemas and status codes.
4. Add characterization tests before moving code.
5. Compare `/openapi.json` before and after each extraction.
6. Run authentication, admin, vendor, document, reminder, and mission smoke tests.
7. Deploy to staging and verify with a separate database and secrets.
8. Merge only when the API contract and security checks remain unchanged.

## Recommended first modularization pull request

The first PR should move only:

- environment parsing to `core/config.py`;
- SQLAlchemy setup and `get_db` to `core/database.py`;
- authentication dependencies to `api/dependencies.py`;
- `/health` to `api/routers/health.py`;
- Resend delivery helpers to `services/email.py`.

This creates useful boundaries while minimizing risk to the agentic, vendor, admin, and mobile-facing flows.

## Definition of done

- `main.py` contains app creation, middleware, lifecycle wiring, and `include_router` calls only.
- No route module exceeds roughly 400 lines.
- No service module imports `app` from `main.py`.
- Database migrations run separately from web-service startup.
- Unit tests cover services; integration tests cover routers and permissions.
- DEV, STAGING, and PROD use separate databases, credentials, secrets, and deployment approvals.
