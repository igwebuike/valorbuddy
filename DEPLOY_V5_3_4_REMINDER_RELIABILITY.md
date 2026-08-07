# ValorBuddy v5.3.4 — Reminder Reliability & System Guardrails

This is an additive update on top of v5.3.3. It preserves the current UI/features and fixes reminder lifecycle and several high-confidence workflow defects found during a static system audit.

## Reminder fixes
- Expired reminders no longer remain falsely labeled `active`; the UI derives `upcoming`, `due now`, `overdue`, `completed`, `dismissed`, and `cancelled` states.
- Manual reminders require a future date/time and store the user's IANA timezone.
- Web reminders request browser notification permission and schedule an in-session browser notification.
- The Android/native bridge attempts Capacitor Local Notifications when the plugin is present, allowing on-device alerts after the app is closed.
- Optional server-side email fallback via Resend can deliver while the web app/browser is closed.
- The backend runs a lightweight due-reminder dispatcher every 30 seconds by default.
- Users can Mark complete, Dismiss, or Delete a reminder.
- The app checks for overdue reminders every minute and flags missed reminders when the user returns.
- Assistant-created reminders now require/resolve a real date and time instead of saving vague reminders as `Soon`.

## Additional audit fixes
- Fixed Activities quick-filter buttons using a stale previous search query after clicking Today / This weekend / Free events / etc.
- Fixed the Memory Wall copy/paste validation text and added Delete memory, matching the privacy/deletion promise already shown to users.
- Added backend reminder validation and additive reminder-table migrations for existing deployments.

## Render settings for closed-browser email delivery
Add these environment variables to the `valorbuddy` backend service:

- `RESEND_API_KEY` = your Resend API key
- `REMINDER_FROM_EMAIL` = a verified sender, for example `ValorBuddy <reminders@valorbuddy.com>`
- `REMINDER_DISPATCHER_ENABLED` = `true`
- `REMINDER_POLL_SECONDS` = `30`

If `RESEND_API_KEY` is not configured, web users still receive overdue catch-up inside ValorBuddy and browser notifications while the page is running. Native Android attempts Local Notifications if the Capacitor plugin is present in the installed app.

## Smoke test after deployment
1. Create a reminder 3–5 minutes in the future.
2. Confirm it displays `upcoming` rather than generic `active`.
3. Keep the page open and verify the browser notification fires.
4. In the Android app, repeat and close the app; verify the local notification fires.
5. If Resend is configured, close the browser and verify the email is received.
6. Create or locate an old reminder and confirm it shows `overdue`.
7. Mark it complete, then confirm the status changes immediately.
8. Delete a reminder and confirm it disappears.
9. On Activities, click `Today`, `This weekend`, and `Free events` and confirm each search uses the clicked filter immediately.
10. Save and delete a Memory Wall item.

## Validation performed in the sandbox
- `python -m py_compile backend/app/main.py` passed.
- `frontend/src/App.jsx` parsed successfully with Babel JSX parser.
- Full backend runtime smoke test could not execute in the sandbox because the Google Gen AI Python dependency is not installed in that runtime; Render installs it from `backend/requirements.txt` during deployment.
