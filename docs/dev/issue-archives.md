# Named issue archives

The Work items Archive tab shows archived issues as cards. Search matches the issue identifier
and title. Cards retain their status and dates. Restore returns an issue to the active board.

Collections belong to one project. Users who can edit work items create and rename them and
choose one when archiving a single issue or a board selection. Any status can be archived.
Existing archived issues and the automatic archive sweep use Unfiled. No monthly naming or
routing rule runs automatically. Empty collections remain available. Collection deletion is not
exposed.

`issue_archive` stores the name and project. Nullable `issue.archive_id` assigns an archived
issue to a collection. A composite foreign key enforces project ownership; a check prevents an
active issue from retaining membership. Restoring or moving an issue to another project clears
its collection. Moving between collections preserves `archived_at` and does not add an
`archived` activity entry. Cascaded subtasks take the chosen destination when first archived;
children already archived retain their own collection and archive date. Moving an already archived parent changes only that
parent's collection.

Collection reads use `work_items.read`; writes use `work_items.edit` and the existing project
and issue guards. Destination validation runs before subtask disposal. Collection create/rename
triggers advance the board revision. The Archive tab watches that revision for cards and names.

Routes:

- `GET /projects/:projectKey/archives`: collections.
- `POST /projects/:projectKey/archives`: create with `{ name }` (1–80 characters, not whitespace).
- `PATCH /projects/:projectKey/archives/:archiveId`: rename.
- Existing single and bulk archive routes accept optional nullable `archiveId`. Omission keeps
  an existing issue's collection; null selects Unfiled.
- Existing `GET /projects/:projectKey/issues/archived` returns whole archived-issue list,
  newest first. The UI uses local collection/title filtering and `usePaging`/`ListPager`.
  Server paging can replace this endpoint if archives outgrow board-sized lists.

Migration `0179_chilly_multiple_man.sql` adds collection storage, constraints and revision trigger.
No existing archived issue is assigned a collection during migration.
