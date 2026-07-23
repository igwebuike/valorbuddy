# ValorBuddy 3.2 Git and Render Deployment

## Render backend environment

Add these to the **valorbuddy Python backend**:

```env
GEMINI_MODEL=gemini-3.6-flash
GEMINI_LITE_MODEL=gemini-3.5-flash-lite
ENABLE_GOOGLE_SEARCH_GROUNDING=true
AI_TIMEOUT_SECONDS=45
```

For the first deployment keep:

```env
GOOGLE_GENAI_USE_VERTEXAI=false
```

After Vertex AI credentials are configured, change it to `true` and add `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global`, and `GOOGLE_APPLICATION_CREDENTIALS`.

## Git commands

Run these commands from the folder containing this project:

```bash
cd valorbuddy-prod
git status
git add .
git commit -m "Upgrade ValorBuddy 3.2 branch-aware UI and grounded intelligent voice"
git branch -M main
git remote -v
git push origin main
```

For a first-time repository connection only:

```bash
git init
git branch -M main
git remote add origin https://github.com/igwebuike/valorbuddy.git
git add .
git commit -m "Upgrade ValorBuddy 3.2 branch-aware UI and grounded intelligent voice"
git push -u origin main
```

## Render deployment

1. Open `valorbuddy` (Python backend) and deploy the latest commit.
2. Open `valorbuddy-frontend` (Static Site) and deploy the latest commit.
3. Confirm `/health` reports version `3.2.0`.
4. Create a new account for each service branch and verify the correct theme and emblem load automatically.

## Android preparation

```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

The mobile app uses the same branch-aware profile returned by the backend, so an Army account opens Army Mission Control, Navy opens Navy Fleet Command, and so on.
