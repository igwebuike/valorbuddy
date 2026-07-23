# ValorBuddy Production Launch

## What this build now includes
- Cost-aware Gemini routing: `gemini-3.6-flash` for conversation/reasoning and `gemini-3.5-flash-lite` for summaries, extraction, and routing.
- Vertex AI authentication support through Application Default Credentials.
- Central safety instruction for veteran, family, benefits, medical, legal, and crisis-related conversations.
- Native Capacitor geolocation and local reminder notifications.
- Android and iOS build scripts.
- Corrected Vite entry point to remove the duplicated application bundle.

## Recommended production environment
```bash
ENVIRONMENT=production
SECRET_KEY=<strong-random-secret>
DATABASE_URL=<managed-postgres-url>
CORS_ORIGINS=https://valorbuddy.com,https://www.valorbuddy.com
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=<gcp-project-id>
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3.6-flash
GEMINI_LITE_MODEL=gemini-3.5-flash-lite
GOOGLE_PLACES_API_KEY=<restricted-key>
```

On Cloud Run, attach a dedicated service account with only the permissions required to call Vertex AI and access the selected storage/database services. Do not place a service-account JSON file in the repository.

## Mobile commands
```bash
cd frontend
npm install
npm run android:add
npm run mobile:sync
npm run android:open
```

Run `npm run ios:add` and `npm run ios:open` on macOS for iOS. Add Android location and notification permissions during native project setup, and complete App Store/Play Store privacy disclosures before release.

## Before public launch
1. Replace SQLite and local `/tmp` uploads with managed Postgres and Cloud Storage.
2. Remove demo-account fallback from `/api/vapi/action` and require a signed Vapi webhook or authenticated user token.
3. Add rate limiting, password-reset/email verification, refresh-token rotation, and account deletion/export.
4. Ground benefits answers in approved VA sources and show citations/last-reviewed dates.
5. Add crisis escalation language and test it with a qualified veteran-support reviewer.
6. Add error monitoring, structured logs, uptime checks, backups, and restore tests.
7. Run accessibility, privacy, security, and veteran-user acceptance testing.


## ValorBuddy 3.2 additional Render variable

```env
ENABLE_GOOGLE_SEARCH_GROUNDING=true
```

This enables Google Search grounding for current travel, jobs, housing, discounts, veteran-owned business, auto-buying, and financial-education questions. Vertex AI is recommended for production.
