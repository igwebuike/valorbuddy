# Deployment, Monitoring and Recovery Runbook

## Before production

1. Create distinct DEV, STAGING and PROD services and PostgreSQL databases.
2. Generate different random secrets for every environment. Set them in the hosting secret store.
3. Enable protected `main`: pull request required, two reviewers for security-sensitive changes, stale approval dismissal, required Security CI/CodeQL/supply-chain checks, no force pushes.
4. Deploy the exact candidate commit to staging and complete member, admin, vendor, VA facilities, voice, disclaimer, and mobile regression tests.
5. Run the ZAP staging workflow. Resolve or formally accept findings with an owner and expiry.
6. Approve the release, tag it, deploy the identical artifact, and record approver, commit, time, and rollback version.

## Wazuh

ValorBuddy emits structured `valorbuddy_security` JSON events. On a VM, install an authorized Wazuh agent and merge the files under `ops/wazuh`. On a PaaS that cannot run a persistent agent, forward application/platform logs to an external collector feeding the Wazuh manager. Test failed-login, rate-limit and file-integrity alerts. Assign a human owner and response SLA.

## Backups

Render-managed PostgreSQL should use the provider's encrypted backups and point-in-time recovery when available. The supplied restic scripts add a separately encrypted repository and a guarded restore test. pgBackRest is appropriate only where Tagus controls PostgreSQL/WAL access; the example file is not active configuration for managed Render PostgreSQL.

Run backups daily and restore into an isolated DR database at least monthly. Record recovery time, recovery point, schema checks, critical-table checks, application health, operator and corrective actions. A successful backup without a tested restore is not accepted as recovery evidence.

## Incident minimum

Contain access, preserve logs, rotate exposed credentials, assess affected users/data, restore only from verified artifacts, document decisions, and obtain legal/privacy guidance for notification obligations. Never test an incident procedure using live Veteran records unless expressly authorized.

