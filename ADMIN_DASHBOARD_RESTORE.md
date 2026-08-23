# Admin Dashboard Restore

Restored admin account-management functionality and improved the user-card layout.

- Long emails are contained within cards and wrap on small screens.
- Active/inactive status is visible.
- Admins can Approve/Activate or Deactivate accounts.
- Admins can change access role: Veteran/Member, Member, Partner, Admin.
- Backend protects an admin from deactivating or demoting their own account.
- Existing ValorBuddy wellness, branch theme, voice, GPS and other app features are preserved.

Deploy both frontend and backend because the role/activation controls use a new PATCH /admin/users/{user_id} endpoint.
