# ValorBuddy Standard Operating Procedure (SOP): Staging Deployments

This document defines the authoritative procedure for pushing frontend and backend updates to ValorBuddy staging environments without causing downtime, triggering unwanted deployments, or failing security gates.

---

## 1. Environments, Services & URL Directory

| Component | Service Name (Render) | GitHub Environment Name | Live URL | Root Directory |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend (Static Site)** | `valorbuddy-frontend-staging` | `security/v6-standardization - valorbuddy-frontend-staging` | [https://valorbuddy-frontend-staging.onrender.com](https://valorbuddy-frontend-staging.onrender.com) | `frontend` |
| **Backend (Web Service)** | `valorbuddy-staging` | `security/v6-standardization - valorbuddy-staging` | [https://valorbuddy-staging.onrender.com](https://valorbuddy-staging.onrender.com) | `backend` |

- **Active Deployment Branch:** `security/v6-standardization`
- **GitHub Deployments Console:** [https://github.com/igwebuike/valorbuddy/deployments/security%2Fv6-standardization%20-%20valorbuddy-frontend-staging](https://github.com/igwebuike/valorbuddy/deployments/security%2Fv6-standardization%20-%20valorbuddy-frontend-staging)

---

## 2. Deployment Architecture & Automation Rules

Render and GitHub Actions are orchestrated via git webhooks and status checks:

1. **Auto Deploy Trigger (`autoDeployTrigger: checksPass`):**
   Render only triggers a build and deployment when **all GitHub Actions checks pass** on the commit. If any check fails (e.g. Semgrep, Bandit, Pytest, or npm audit), deployment is completely blocked.
2. **Selective Root Directory Filtering (`rootDir`):**
   - **Frontend Only:** Render checks for git diffs inside `frontend/`. If a commit does NOT touch any file in `frontend/`, Render **skips** building the frontend.
   - **Backend Only:** Render checks for git diffs inside `backend/`. If a commit does NOT touch any file in `backend/`, Render **skips** building the backend.
3. **GitHub Deployment Environment Tracking:**
   `.github/workflows/deploy-staging.yml` automatically registers the deployment under `security/v6-standardization - valorbuddy-frontend-staging` using the `deployments: write` permission.

---

## 3. Step-by-Step Procedure for Deploying Updates

### Scenario A: Frontend-Only Update (Do NOT Touch Backend)

1. **Implement Frontend Changes:**
   Edit files only within `frontend/` (e.g., `frontend/src/App.jsx`, `frontend/src/styles/views.css`, etc.).
2. **Bump Frontend Patch Version:**
   Update the patch version in both files:
   - `frontend/package.json` (e.g. `"version": "6.2.3"` -> `"version": "6.2.4"`)
   - `frontend/package-lock.json` (lines 3 & 9)
   *(This ensures Render's root directory filter detects the update even if changes were minimal).*
3. **Verify Local Frontend Build:**
   ```powershell
   cd frontend
   npm run build
   cd ..
   ```
4. **Stage and Commit:**
   ```bash
   git add frontend/ .github/workflows/deploy-staging.yml
   git commit -m "Deploy v6.2.x frontend: <description of changes>"
   ```
5. **Push to Staging Branch:**
   ```bash
   git push origin security/v6-standardization
   ```
6. **Verify GitHub Actions & Deployments:**
   - Ensure `Security CI` and `Deploy Staging Environment` pass.
   - Confirm active deployment on the GitHub Deployments dashboard.
   - Verify live static site at [https://valorbuddy-frontend-staging.onrender.com](https://valorbuddy-frontend-staging.onrender.com) (allow up to 5 min for Cloudflare edge TTL cache expiration).

---

### Scenario B: Backend-Only Update (Do NOT Touch Frontend)

1. **Implement Backend Changes:**
   Edit files only within `backend/` (e.g., `backend/app/main.py`, `backend/requirements.txt`).
2. **Run Security & Test Checks Locally:**
   ```powershell
   cd backend
   python -m pytest tests -q
   bandit -r app -x tests -ll
   cd ..
   ```
3. **Stage and Commit:**
   ```bash
   git add backend/
   git commit -m "Update backend: <description of changes>"
   ```
4. **Push to Staging Branch:**
   ```bash
   git push origin security/v6-standardization
   ```
5. **Verify Backend Deployment:**
   - Once `Security CI` turns green, Render automatically deploys `valorbuddy-staging`.
   - Confirm `/health` at [https://valorbuddy-staging.onrender.com/health](https://valorbuddy-staging.onrender.com/health).

---

### Scenario C: Combined Frontend + Backend Update

1. Implement both sets of changes.
2. Bump `frontend/package.json` and `frontend/package-lock.json`.
3. Verify local build and test suites for both.
4. Stage both directories and push to `security/v6-standardization`.
5. Both Render services will deploy in parallel as soon as GitHub CI passes.

---

## 4. Strict Security & Operational Guardrails

- **Never use manual Render dashboard deploy buttons:** All deployments must be auditable through Git commits and GitHub Actions.
- **Never push untested code to `main`:** `main` is production. Only merge to `main` after staging sign-off.
- **Never bypass failing security checks:** If Semgrep or Bandit fails, fix the code rather than modifying the scanner rules.
- **Never expose credentials in logger outputs:** Verify CWE-532 compliance (tokens, passwords, and sensitive URLs must never be passed to `logger.info`, `logger.warning`, etc.).
