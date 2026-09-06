# ValorBuddy v6.2 Security Readiness Remediation

This release addresses the actionable findings in the August/September 2026 fundraising and security review while preserving current member, administrator, vendor, mobile, and agentic-platform functions.

| Review observation | v6.2 response | Status |
| --- | --- | --- |
| Built-in JWT secret fallback | Removed. Startup fails when `SECRET_KEY` is absent; production configuration also rejects weak values. | Implemented |
| PBKDF2 password hashing | New passwords use Argon2id. Existing PBKDF2 hashes remain valid and migrate to Argon2id at the next successful login. | Implemented |
| Sensitive profile fields | Deployment history and VA disability rating are encrypted at field level; existing plaintext values are migrated idempotently at startup. | Implemented |
| DD214/VA document storage | Non-photo uploads, extracted text, and summaries are encrypted at rest. Downloads require the owner’s authenticated session. | Implemented |
| Sensitive-data accountability | Profile and document list/file reads create access-audit events. Sensitive VA rating is no longer returned in the administrator member list. | Implemented |
| Retention/deletion policy | A public plain-language policy and explicit retention schedule are included. Expired reset material and old audit logs are automatically purged. | Implemented |
| Administrator security | Mandatory TOTP MFA, RBAC, pending-member approval, suspension controls, and no shared credential design. | Implemented |
| Traction depth | Admin metrics now expose 7-day active members, 30-day active members, repeat AI members, partner applications, conversations, messages, and documents. | Implemented |
| Monolith maintainability | Data-protection logic has been extracted into a dedicated module. Further route/domain extraction should be incremental after this stable release. | Started |
| Independent assessment/certification | Code controls are ready for review, but a third-party penetration test, SOC 2 examination, and formal NIST/VA authorization remain external work. | Pending external validation |
| Gemini/Places concentration | Existing graceful degradation remains. A production-grade second AI/search provider still requires product and cost decisions. | Roadmap |

This release does not claim VA authorization, VA endorsement, SOC 2 certification for ValorBuddy, an ATO, or completion of an independent penetration test.

## Key-management warning

`SECRET_KEY` and `DATA_ENCRYPTION_KEY` must be different, randomly generated production secrets. Keep `DATA_ENCRYPTION_KEY` stable and backed up in an approved secret manager: losing or casually rotating it makes encrypted fields, files, and administrator MFA secrets unreadable. Never commit either key to Git.
