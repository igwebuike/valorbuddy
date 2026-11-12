# ValorBuddy Workspace Rules & Deployment Guidelines

## 1. Branch & Staging Environment Constraints

- **Active Development & Staging Branch:** `security/v6-standardization`
- **Frontend Service:** Render static site `valorbuddy-frontend-staging` (`rootDir: frontend`)
- **Frontend Live URL:** `https://valorbuddy-frontend-staging.onrender.com`
- **Frontend GitHub Environment:** `security/v6-standardization - valorbuddy-frontend-staging`
- **Backend Service:** Render web service `valorbuddy-staging` (`rootDir: backend`)
- **Backend Live URL:** `https://valorbuddy-staging.onrender.com`
- **Backend GitHub Environment:** `security/v6-standardization - valorbuddy-staging`
- **Production Guardrail:** Never push directly to `main` and never alter production configs or databases.

## 2. Deployment Protocol (Automated via GitHub Actions)

- **Render Auto-Deploy Trigger:** Render is configured with `autoDeployTrigger: checksPass`. It only builds after all GitHub Actions check runs (`Security CI` and `Deploy Staging Environment`) pass 100% green.
- **Selective Directory Deployments:**
  - **Frontend-only deploy:** Only edit files in `frontend/`. Bump the version in `frontend/package.json` and `frontend/package-lock.json` so Render detects changes in `rootDir: frontend`. Do not touch `backend/`.
  - **Backend-only deploy:** Only edit files in `backend/`. Do not touch `frontend/`.
- **Workflow Permissions:** `.github/workflows/deploy-staging.yml` must retain `deployments: write` and dynamic environment mapping:
  `name: ${{ github.ref_name == 'security/v6-standardization' && 'security/v6-standardization - valorbuddy-frontend-staging' || 'staging' }}`
- **Render Dashboard:** Never perform manual deploys from the Render dashboard. All deployments must originate from Git commits and pass CI.

## 3. Security Quality Gates

- **CWE-532 Compliance:** Never write auth tokens, password reset tokens, or raw reset URLs to application logs (`logger.warning`, `logger.exception`, etc.).
- **Dependency Auditing:** Maintain high/critical vulnerability-free status in `backend/requirements.txt` (`pip-audit`) and `frontend/package.json` (`npm audit`).
- **Security Check Suite:** All code pushed to `security/v6-standardization` must pass Bandit (`bandit -r backend/app -x backend/tests -ll`) and Semgrep OWASP Top 10 rules.

