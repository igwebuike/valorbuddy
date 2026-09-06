# ValorBuddy v6.2 Complete Release

This package contains the FastAPI backend, React frontend, Capacitor Android project, vendor marketplace, administrator controls, agentic platform, environment templates, security workflows, Wazuh configuration, backup/restore tooling, policies, and deployment instructions.

## Security changes

- Argon2id is the default password hash; valid PBKDF2 accounts migrate transparently after login.
- No built-in JWT signing secret; startup fails when `SECRET_KEY` is missing.
- A separate production `DATA_ENCRYPTION_KEY` is mandatory.
- Deployment history and VA disability-rating fields are encrypted.
- DD214s, VA records, resumes, certifications, extracted text, and document summaries are encrypted at rest.
- Sensitive document downloads require the owner’s bearer-authenticated session.
- Sensitive profile/document reads are audit logged.
- Admin MFA, member approval, password recovery, vendor portal, and vendor administration are retained.
- A public retention/deletion policy and automatic reset-token/audit-log cleanup are included.
- Investor-facing admin metrics now distinguish signup totals from 7-day activity, 30-day activity, and repeat AI usage.

## Validation

- React/Vite production build: passed
- Capacitor Android synchronization: passed
- Backend unit tests: 7 passed
- Full account/security/vendor/document regression: passed
- Python dependency audit: zero known vulnerabilities
- Frontend production dependency audit: zero known vulnerabilities
- Bandit: zero medium/high findings

Android APK compilation requires Gradle network access on the build computer or CI runner. The native project and current web assets are synchronized in this package.

Read `DEPLOY_V6_2_SECURITY.md` before deploying.
