# ValorBuddy Account Deletion Page

The public account deletion page is available at:

- https://valorbuddy.com/delete-account

Alternative supported paths:

- https://valorbuddy.com/account-deletion
- https://valorbuddy.com/delete-my-account

## Google Play Console

Use this exact URL in the **Delete account URL** field:

```text
https://valorbuddy.com/delete-account
```

The page explains how to submit a deletion request, what data is deleted, limited retention exceptions, and the expected processing period.

## Deploy

```cmd
cd C:\Users\eugen\Desktop\valorbuddy-prod
npm --prefix frontend run build
git add frontend/src/App.jsx frontend/src/style.css ACCOUNT_DELETION_DEPLOY.md
git commit -m "Add public ValorBuddy account deletion page"
git push origin main
```

After Render deploys, verify the URL in an incognito window. The existing Render rewrite rule (`/*` to `/index.html`) must remain enabled.
