# ValorBuddy Data Retention and Deletion Policy

**Effective date:** September 6, 2026  
**Operator:** Tagus Technologies LLC

ValorBuddy collects only information needed to provide personalized Veteran support, operate accounts, protect the service, and meet legal obligations. ValorBuddy is not a medical provider, crisis center, or emergency service.

## Retention schedule

| Information | Normal retention | Deletion behavior |
| --- | --- | --- |
| Account and profile | While the account is active | Deleted after a verified account-deletion request, except limited records required by law or security obligations |
| Deployment history and VA disability-rating fields | While supplied by the member | Encrypted at field level; removed when the member clears the fields or the account is deleted |
| Uploaded DD214s, VA records, resumes, and certifications | Until the member deletes the document or account | Encrypted at rest and permanently removed from active storage when deleted |
| AI conversations, missions, memories, reminders, and preferences | Until individually deleted or the account is deleted | Removed from active systems following deletion |
| Password-reset tokens | 30 minutes | Automatically invalidated and purged after expiration or successful use |
| Authentication, administrator, and sensitive-data access audit logs | 365 days | Automatically purged after the retention period unless a documented security or legal hold applies |
| Encrypted backups | According to the documented backup rotation, normally no more than 35 days | Expire through the normal encrypted-backup rotation and are not restored to reactivate deleted accounts |

## Security and access

Sensitive profile fields and non-photo uploaded documents are encrypted at rest. Access to sensitive profile and document functions is logged. Administrators use role-based access controls and mandatory multi-factor authentication. ValorBuddy does not give marketplace vendors access to private conversations, documents, medical information, reminders, or sensitive profile fields.

## Member choices

Members can delete individual documents, reminders, memories, and saved preferences inside ValorBuddy where the control is available. A member may request complete account deletion from the account-deletion page or by contacting **privacy@valorbuddy.com** from the registered email address. Identity verification may be required. Verified requests are normally completed within 30 days.

Limited information may be retained when required for fraud prevention, incident investigation, legal compliance, dispute resolution, or another documented lawful obligation. Retained information remains access-controlled and is not used to continue the deleted account.

Questions or requests: **privacy@valorbuddy.com**
