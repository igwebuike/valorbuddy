ValorBuddy v5.3.5 Registration Hotfix

Problem fixed:
POST /auth/register was returning HTTP 500 because the registration handler referenced payload.profile_data but RegisterRequest did not define profile_data.

Changes are intentionally narrow:
1. Added optional profile_data to RegisterRequest with a safe empty-dict default.
2. Changed registration list defaults to default_factory so requests do not share mutable list objects.
3. Made registration profile_data assignment defensive with getattr(..., {}).

No frontend, reminder, AI, profile-edit, theme, document, benefits, media, mission, or other feature code was changed.

Install:
Copy backend/app/main.py into your existing ValorBuddy repo at:
  C:\Users\eugen\Desktop\valorbuddy-prod\backend\app\main.py

Then run:
  cd C:\Users\eugen\Desktop\valorbuddy-prod
  python -m py_compile backend\app\main.py
  git status
  git add backend\app\main.py
  git commit -m "Fix registration profile_data crash"
  git push origin main

After Render deploys, create a NEW test user. The Render log should show a successful POST /auth/register instead of 500.
