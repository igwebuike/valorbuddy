# ValorBuddy v5.3.5 — Mobile Veteran Feedback Fixes

This update addresses the August 2026 mobile feedback round.

- Mobile service-branch theme switcher is now visible and horizontally scrollable in the phone header.
- Voice can now be changed using the device/browser's available English voices.
- Added voice delivery styles: Command (strong/steady), Clear, Calm, and Warm. Command is the default.
- Added a Test Voice control and saves the user's voice/style choice locally.
- "Use my location" now requests fresh GPS location and reports permission/time-out errors instead of silently using the account city.
- "Near me" / "closest" requests require live GPS. If permission is denied, ValorBuddy explains how to enable it rather than returning profile-location results.
- Non-location requests no longer trigger unnecessary location permission prompts.
- Activities page clearly identifies whether it is using live GPS or the profile city.
- Today’s Briefing Reminders and Nearby Options cards are now high-contrast, mobile-readable, and clickable.
- Activity search, AI Send, Career Agent, and other action buttons have high-contrast mobile styling so labels no longer disappear into dark backgrounds.
- Mobile forms and action composers stack cleanly to avoid clipped/hidden controls.
