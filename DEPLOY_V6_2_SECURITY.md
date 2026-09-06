# Deploy ValorBuddy v6.2 Safely

Follow this order. Do not push first and add the encryption key afterward.

## 1. Back up production

Create and verify a Render PostgreSQL backup/snapshot. Preserve the current Render environment-variable list separately. The v6.2 startup migration encrypts existing sensitive fields and files in place; older application code will not understand those encrypted values.

## 2. Generate two different secrets

Run locally in PowerShell twice:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep the existing `SECRET_KEY` if production users already have active sessions and administrator MFA. Generate a new, separate value for `DATA_ENCRYPTION_KEY`. Never commit either value.

## 3. Configure Render before deployment

Backend service variables:

```text
ENVIRONMENT=production
SECRET_KEY=<existing strong signing key>
DATA_ENCRYPTION_KEY=<new separate persistent encryption key>
ADMIN_MFA_REQUIRED=true
PASSWORD_RESET_BASE_URL=https://valorbuddy.com
PASSWORD_RESET_EXPIRE_MINUTES=30
AUDIT_RETENTION_DAYS=365
RESEND_API_KEY=<real secret>
AUTH_FROM_EMAIL=ValorBuddy Security <security@valorbuddy.com>
CORS_ORIGINS=https://valorbuddy.com,https://www.valorbuddy.com,capacitor://localhost,https://localhost,http://localhost
ALLOWED_HOSTS=valorbuddy.onrender.com,valorbuddy.com,www.valorbuddy.com
```

Create/verify `security@valorbuddy.com` in Resend and create `privacy@valorbuddy.com` as a working mailbox or forwarding alias.

## 4. Deploy staging first

Use separate staging secrets and a separate staging database. Confirm:

- Existing and new member sign-in
- Administrator MFA enrollment/sign-in
- Pending-member approval
- Vendor portal and administrator vendor preview
- Sensitive profile save/read
- DD214 upload, list, authenticated download, and delete
- Forgot-password email and reset
- Privacy, retention, and account-deletion pages
- Android login, microphone, voice, navigation, and secure document download

## 5. Promote to production

```bash
git add .
git status
git commit -m "Release ValorBuddy v6.2 security and fundraising readiness"
git push origin main
```

After Render reports healthy, check `/health`; it must show version `6.2.0` and `security_ready: true`.

## Rollback

Do not roll the application back alone after the encryption migration. Restore the matching pre-v6.2 database and upload-storage backup together, or correct/roll forward v6.2. Keep `DATA_ENCRYPTION_KEY` backed up in an approved secret manager because losing it makes encrypted data and administrator MFA secrets unreadable.
