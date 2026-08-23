# ValorBuddy v5.3.6 — Stable Complete Build

This build was reconstructed from the last stable v5.3.4 source in the supplied repository history, then the requested additions were reapplied as isolated changes instead of replacing existing application functions.

## Preserved
- All functions/components present in the stable v5.3.4 App.jsx baseline.
- Benefits / VA Forms component and its state initialization.
- Existing AI assistant, missions, documents, reminders, career/business, music/media, profile, admin, activities, privacy, and account-deletion flows.
- Existing backend source.

## Added / fixed
- Fitness & Wellness screen and dashboard/sidebar entry.
- Dedicated mobile Service Theme selector for Army, Navy, Air Force, Marines, Coast Guard, and Space Force.
- Immediate theme application plus branch-profile save.
- Stronger browser voice presets: Command and Tactical, plus Clear, Calm, and Warm.
- User-selectable installed device/browser voices.
- Live GPS behavior for “near me” requests; no silent profile-city fallback when live location is required.
- Mobile navigation backdrop and close handling.
- High-contrast action-button/mobile UI fixes retained.
- Important health notice retained.

## Validation performed
- Babel JSX parse: PASS for frontend/src/App.jsx and frontend/src/main.jsx.
- Stable function preservation check: PASS; no stable v5.3.4 top-level function was removed.
- CSS parse with PostCSS: PASS.
- Python backend compileall: PASS.
- Feature-presence assertions: PASS.

The Linux sandbox cannot run the Vite/Rollup production build using the supplied Windows node_modules because native Rollup/esbuild binaries are platform-specific. node_modules is therefore intentionally excluded from this package. Run npm ci on the target machine/Render before npm run build.
