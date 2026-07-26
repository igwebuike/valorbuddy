# ValorBuddy v5.0 deployment

1. Copy this package over the existing repository while preserving `.git` and production environment variables.
2. Commit and push to a feature branch.
3. Configure Render backend and frontend staging services to deploy the feature branch.
4. The backend uses additive SQLAlchemy table creation for existing ORM tables. For observability tables, run `backend/migrations/0050_vos_runtime.sql` after `0049_1_agentic_core.sql` if those tables are not already present.
5. Test: login, profile, Mission Control, multi-agent mission, approval-gated reminder, mobile contrast, and existing admin toggle.
6. Merge to `main` only after Render tests pass.

## Git
```bash
git checkout -b feature/valorbuddy-v5-vos
git add .
git commit -m "Build ValorBuddy v5 Veteran Operating System"
git push -u origin feature/valorbuddy-v5-vos
```

## Production test missions
- Plan an accessible road trip from Arlington to Nashville next Friday and remind me to confirm the hotel.
- I am moving to San Antonio next month. Find housing, nearby VA resources, and veteran-friendly employment.
- Help me identify the VA form to add my spouse and build the document checklist.
- I have had a stressful day. Help me organize tonight and suggest calming music.
