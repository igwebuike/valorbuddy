# ValorBuddy Privacy Policy Deployment

The public privacy policy is available at either:

- `https://valorbuddy.com/privacy-policy`
- `https://valorbuddy.com/privacy`

## Deploy

```cmd
cd C:\Users\eugen\Desktop\valorbuddy-prod
git add frontend/src/App.jsx frontend/src/style.css render.yaml PRIVACY_POLICY_DEPLOY.md
git commit -m "Add public ValorBuddy privacy policy"
git push origin main
```

After Render finishes deploying, open `https://valorbuddy.com/privacy-policy` in an incognito browser window. Confirm that it loads without signing in, then paste that exact URL into Google Play Console.

## Local verification

```cmd
cd C:\Users\eugen\Desktop\valorbuddy-prod\frontend
npm install
npm run build
```

The Render rewrite in `render.yaml` allows the direct `/privacy-policy` URL to load the React app.
