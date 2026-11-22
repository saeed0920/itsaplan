# Multiple issue assignees

An issue can have up to 100 distinct human project members. Use the Assignee picker in issue creation, issue properties, table or timeline. Search, click or press Enter to toggle a member; the picker stays open. “No assignee” clears the set. Pending writes disable picker choices until the issue refresh completes. Failed writes use the existing error toast.

All selected members match assignment filters, cross-project lists and My Work. New assignees receive the existing assignment notification and auto-watch behavior; unchanged members are not notified again. Cards and table/timeline cells show up to three avatars plus an overflow count; the full names are available on the picker and avatar group. Reduced public shares redact every assignee. Extended shares follow the existing sharing policy.

## Compatibility

- API create, update and bulk patch accept `assigneeUserIds: string[]`, including `[]` to clear. It replaces the full set. Do not send it with `assigneeUserId`; conflicting fields are rejected.
- Reads include `assigneeUserIds`; `assigneeUserId` remains the primary member. Existing issues are read as one-element arrays, without rewriting assignments.
- Legacy scalar writes change the primary and retain additional members. Explicit scalar `null` clears all. Column auto-assignment changes the primary and retains other members. Templates, bulk single-person menu, primary grouping/sorting and per-person analytics retain their single-primary behavior.
- Delegation to AI agents is unchanged and separate. This release does not add multiple delegates, multi-person templates, bulk multi-picker or third-party import changes.
- Additional members are stored in `issue_assignee`, with issue and project-membership foreign keys. Membership removal deletes additional links; user deletion follows membership cascades. Project moves retain only destination members. Existing primary-member removal behavior is unchanged.
- Project JSON exports include `assigneeEmails` and keep `assigneeEmail`. Webhook payloads carry all member ids and names. JSON exports are downloads, not an import/restore format.

## Deployment

Migration `0177_issue_multi_assignee.sql` adds one table, membership FK, index and board revision trigger. It does not update existing issues. Run the normal migration runner after a verified backup, then deploy matching API/web images. Worker and bot need no restart.

Image rollback can retain the additive table and migration journal. The old UI cannot show additional assignments; retain database data and return to the multi-assignee release to read them. Never drop the table or restore a live database automatically.

Regression checks: `apps/api/src/modules/issues/__tests__/integration/assignees.test.ts`, existing issue/activity/move/notification/share/export/workspace suites, and operator `infra/plan/test-multiassign.sh` in the Puzzley deployment project. Browser checks use disposable synthetic accounts, not production tasks.
