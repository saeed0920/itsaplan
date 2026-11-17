---
name: itsaplan-deploy
description: Approval-gated It's a Plan feature delivery. Use after feature changes or when asked to deploy locally, publish to the puzzley GitHub fork, deploy on piPzz, verify backups, or plan rollback. Requires local deployment approval, user testing, and separate production approval.
---

# It's a Plan deployment

Follow these stages in order. Creating or invoking this skill grants no deployment permission.
Never interpret a feature request, successful tests, or an earlier release approval as permission
for a new deployment. Stop at each approval gate and wait for the user's answer.

## 1. Identify the release

- Read the root `AGENTS.md`, affected area instructions, and `docs/dev/deploy-stack.md`.
- Inspect the actual repo root, Git status, remotes, branch, running containers, Compose labels,
  active overrides, storage mounts, and existing operational runbooks. Memory is only a hint.
- Expected fork: remote `puzzley`, repository `saeed0920/itsaplan` on GitHub. `origin` points to
  upstream `croffasia/itsaplan`; do not push there. Verify URLs and ask if they differ.
- Expected production target: SSH alias `piPzz`, checkout `/opt/itsaplan`, public site
  `https://plan.apeto.ir`. Verify identity, checkout, active stack, and domain before mutation.
- Discover the local source from running container metadata. Inspect
  `~/.local/state/itsaplan-source-move/current/stack` if present; use it only after verifying its
  source paths and Compose inputs. Do not substitute bare Compose commands or guessed paths.
- Stop on conflicting checkouts, dirty production files, concurrent deploys, unresolved builds,
  missing credentials, or insufficient disk/RAM. Never replay historical cutover scripts.
- Preserve unrelated edits, containers, volumes, and services, including Pocket. Agree on the
  release's exact files and branch; never stage the whole dirty tree indiscriminately.

## 2. Prepare and request local deployment

Implement the requested feature. Run relevant tests, typecheck, lint, and formatting checks;
run `tidy`, `code-review`, then `security-audit` on the scoped changes. Report blockers honestly.
Keep integration tests isolated from live local and production data.

Record a release candidate: base commit, scoped tracked/untracked file hashes, migration list,
and test results. Explain feature behavior, local URL, downtime, and backup/rollback plan.
Ask explicitly: **Approve deploying this candidate locally for your testing?**

After approval, capture and verify the local recovery point using stage 4's safety rules.
Build from the approved source, preserve current images/config/volumes, apply migrations as a
separate step, and update only the intended app services through the verified local stack.
Verify health, logs, migration results, data invariants, login, and the changed feature where
possible. Give the user specific manual test steps and stop for their testing.

## 3. Require user acceptance and production approval

The user must confirm the feature passed their local tests. Agent checks cannot replace this.
If code changes after testing, repeat checks, local deployment approval, and user acceptance
for the changed candidate.

Present the exact release scope and target branch, proposed commit message, production URL,
backup coverage, expected downtime, migration risks, and rollback limits. Ask explicitly:
**Did local testing pass, and do you approve committing these files, pushing this release to
puzzley, and deploying it on piPzz with the stated backup and downtime plan?**

A vague answer or approval for only one action authorizes only that action. Request the rest.

## 4. Establish a verified recovery point

Apply this stage before mutating either deployment. Production recovery is a separate backup
of production data; local backups cannot substitute for it.

- Inspect the latest completed backup: source instance, UTC time, scope, sizes, checksums,
  completion status, restore evidence, and accessible off-host copy. File existence is not proof.
- Capture the current commit, running image IDs with retained rollback tags, resolved stack
  inputs, migration state, DB roles, uploads/object storage, config, encryption keys, and secrets.
  Keep secret values out of chat, Git, and ordinary logs.
- Default to a fresh full recovery point: consistent DB plus attachments/object storage and
  required config/secrets. Explain any writer pause and obtain downtime approval. Quiesce all
  writers, including workers, bots, and external integrations; hold them through final backup
  and cutover, or use a verified snapshot/PITR method covering the interval. A long build must
  finish before this final pause. Track exactly which services need resuming on failure.
- Reuse inspected backup tooling when available. Verify checksums and perform a real restore
  into an isolated disposable DB with no production integrations; compare schema/migrations
  and relevant data counts/hashes. Verify storage archive readability and inventory, config
  availability, and the documented restore procedure. Do not overwrite live data to test backups.
- Copy the recovery point off the VPS to an approved private location, such as
  `~/Backups/itsaplan/piPzz/`; verify destination checksums. Restrict directories to `0700` and
  files to `0600`, protect transfers, and encrypt sensitive backups for off-host storage. Obtain
  the owner's approved key/storage method; never invent or print encryption keys.
- Stop if backup, restore, storage, or off-host verification fails. A DB-only exception requires
  explicit user acceptance of missing uploads/config/secrets and limited rollback coverage.
  Earlier DB-only permission does not carry over to another release.

Keep existing backups, rollback images, and volumes. Never use `down -v`, volume pruning,
force-push, destructive reset, or migration-backup bypasses as part of this workflow.

## 5. Publish and deploy the approved release

After production approval, verify the latest backup before publication. Commit only approved
files using normal hooks. If hooks or other edits change the tested candidate's content, stop
and repeat affected checks and user acceptance. Record the final exact commit SHA.

Push explicitly to `puzzley` and the approved branch; verify GitHub's branch SHA. On piPzz,
verify a clean checkout, fetch that remote, and fast-forward only to the approved SHA. Stop on
divergence or unexpected commits; do not merge upstream or deploy an unverified branch tip.

Build candidate images while current services remain available. Use an approved local/remote
builder for resource-heavy builds when VPS capacity is insufficient; verify exact source SHA,
image identity, and transfer checksums. Do not silently restart Docker or unrelated services.

Complete stage 4's fresh final recovery point immediately before cutover. Rehearse risky
migrations against an isolated restored copy. Keep automatic pre-migration backup enabled;
its DB dump alone does not satisfy stage 4. Run migrations separately and require success
before starting candidate apps. Preserve existing DB/storage mounts and runtime secrets.
Update only intended app services with verified images, with exactly one bot replica.

## 6. Verify, report, and retain rollback

Check deployed commit/image identities, service health/restarts/logs, migration state, data
invariants, TLS, login, uploads, and feature smoke tests. Preserve existing access gates;
a gated `401` or a login page alone does not prove authenticated feature success. Report any
untested paths and request the user's production check.

Keep a private receipt outside Git: approvals, candidate hashes/final SHA, commands/results,
backup paths/checksums/restore results, old/new image IDs, migration evidence, downtime,
health checks, and exact recovery steps. Resume only services paused by this run.

On failure, stop further rollout and preserve evidence. Reuse old app images only after
verifying DB compatibility. A DB restore can discard writes made after the backup; disclose
the loss window and obtain explicit restore approval. Capture the failed current state first,
then restore DB/storage/config as a consistent set during an approved maintenance window,
or propose a forward repair. Never promise zero-loss rollback without verified PITR or an
equivalent recovery method. Do not delete recovery points after a successful deploy.
