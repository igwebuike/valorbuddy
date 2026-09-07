# ValorBuddy Security Architecture

## Environment boundary

| Environment | Purpose | Data | Integrations | Promotion |
|---|---|---|---|---|
| Development | Engineering and experiments | Synthetic/mock only | Sandbox/mocks | Pull request |
| Staging | QA, regression, mobile and security testing | Synthetic or approved de-identified fixtures | VA sandbox; non-production credentials | Successful gates plus owner approval |
| Production | Real members and approved partners | Production data only | Separately approved production credentials | Tagged release and documented approval |

Each environment has a different database, secret set, service identity, API credentials, logs, and backup destination. Staging must never reference the production database. Production data must never be copied to development.

## Release flow

`Feature branch → pull request → Gitleaks/Semgrep/Trivy/audits/tests/build → staging → OWASP ZAP → approval → production`

Production releases are immutable commits/tags. Rollback selects the last approved release; it does not copy staging data into production.

## Application controls

- Explicit CORS and trusted hosts; production wildcard origins are rejected.
- HTTPS enforcement, HSTS, request IDs, body-size limits, rate limits, and defensive response headers.
- PBKDF2-SHA256 password hashing at 600,000 iterations with verification compatibility for existing hashes.
- Shorter access-token lifetime, role checks for administrators and partners, user-scoped records, and admin audit events.
- Structured security events suitable for centralized collection and Wazuh rules.
- No claim of VA endorsement, ATO, FISMA compliance, or FedRAMP authorization solely from these controls.

## Data pipeline pattern

For approved external datasets: `RAW/INGEST → VALIDATED/NORMALIZED → SERVING`. Raw data is immutable and source-tagged; validation rejects malformed or unapproved content; serving tables expose only required fields. This data-layer pattern is separate from DEV/STAGING/PROD isolation.

## Remaining production requirements

- Enforce phishing-resistant MFA for administrators and privileged support accounts through the selected identity provider.
- Use managed secrets and key rotation; do not place secrets in Render blueprints or GitHub variables.
- Configure external Wazuh manager/log forwarding and staffed alert ownership.
- Complete an independent penetration test, privacy assessment, Section 508 testing, threat model, incident exercise, and access review before handling VA-controlled or sensitive health data.

