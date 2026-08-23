# ValorBuddy v5.3.6 — Critical Signup + Mobile UI Fixes

## Fixed in this package

1. **Account creation / signup failure**
   - Root cause found in backend registration: `/auth/register` referenced `payload.profile_data`, but `RegisterRequest` did not define `profile_data`.
   - Added the missing field and hardened registration with rollback/error handling.
   - Normalized email addresses and improved duplicate-email handling.
   - Frontend now validates required fields, prevents double submits, and shows clearer network/server errors.

2. **Mobile hamburger menu appearing behind the page**
   - Corrected the z-index conflict caused by the global `.app > *` stacking rule.
   - Mobile sidebar now sits above all page content with an opaque panel, shadow and backdrop.
   - Background scrolling is locked while the menu is open.
   - Menu icon changes to an X while open; tapping outside or pressing Escape closes it.

3. **Voice names inconsistent between desktop and mobile**
   - Kept each device's native browser/system voices (required by the Web Speech API).
   - Added friendly display labels so desktop voices such as `Microsoft David - English (United States)` appear as `David • US` instead of vendor-heavy names.
   - Mobile voices such as Karen, Rocko, Shelley, Daniel, etc. continue to display naturally.

4. **Army branch emblem**
   - Replaced the small rank-style Army graphic with a clearer Army star badge designed to read well at mobile header size.
   - Increased Army emblem visual size to match the other service branches.

5. **Benefits page source repair**
   - The supplied source contained a malformed/missing `Benefits` component around the official VA forms/programs section.
   - Reconstructed the component and restored benefit search, official VA form/program lookup, and explanatory actions.

## Verification

- `backend/app/main.py` passes Python syntax compilation.
- `frontend/src/App.jsx` passes Babel JSX parsing.
- Frontend package version and backend health version are now `5.3.6` for deployment verification.

## Deploy

Use the existing Render configuration. Both backend and frontend must redeploy because the signup fix is backend-side and the menu/voice/Army fixes are frontend-side.

After deploy, verify `https://valorbuddy.onrender.com/health` reports version `5.3.6`, then test a brand-new account with an email address that has never registered before.
