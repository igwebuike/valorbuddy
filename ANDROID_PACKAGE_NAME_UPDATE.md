# Android Package Name Update

ValorBuddy's Android application ID has been changed from:

`com.tagustechnologies.valorbuddy`

to:

`com.valorbuddy.app`

The source of truth is:

`frontend/capacitor.config.json`

Before generating the Android release project or bundle, run from the `frontend` folder:

```bash
npm ci
npm run build
npx cap add android
npx cap sync android
```

If an `android` folder already exists from the old application ID, remove or rename that folder before running `npx cap add android`, so Capacitor generates the native project with the new package name.

Use this exact package name in Google Play Console:

`com.valorbuddy.app`
