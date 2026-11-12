# VPS database backups

Operator-only deployment for the Puzzley VPS. No application credentials or database backups belong in Git.

## Git release

The deployment branch is `vps/current-20261112` on `git@github.com:saeed0920/itsaplan.git`. It contains the VPS deployment configuration, multiple-workspace creation and multiple human issue assignees. The separate `main` branch keeps its newer upstream history; do not force-push or merge it into production without review/tests.

The operator verifies local and VPS file hashes against the published commit. Git synchronization alone does not restart containers, rebuild images or apply migrations. Running images can contain byte-identical application code built before its changes were committed.

## Backup scope and storage

Owner selected **private unencrypted backups**, one laptop download now, VPS-only recurring backups and **30-day retention**. Dumps contain private application/authentication data; account/disk access exposes them. Do not publish, attach to issues or upload them to Git.

- VPS directory: `/var/backups/itsaplan-db`, root0700, files0600.
- Initial laptop copy: `~/.local/state/puzzley-pi/itsaplan-db-backups/`, user0700/files0600, outside all repositories.
- Backup contents: PostgreSQL custom-format `database.dump`, SHA256, metadata, restore log and COMPLETE marker. No `.env`, host secrets, object-store uploads or running container filesystems are included.
- A database-only dump is not a full application disaster-recovery backup. Keep operator configuration, appropriate images/source and object-store data separately. The laptop copy is a manual point-in-time copy, not a continuously updated mirror.

## Commands

```bash
# Pure synthetic checks; no database or Docker access.
python3 deploy/backup-db.py --self-test

# VPS operator: force one new verified dump, or run only when due.
sudo python3 /usr/local/libexec/itsaplan-backup-db.py --apply
sudo python3 /usr/local/libexec/itsaplan-backup-db.py --if-due
```

Cron file `deploy/itsaplan-db-backup.cron` installs as `/etc/cron.d/itsaplan-db-backup` (root0644). The source helper installs as `/usr/local/libexec/itsaplan-backup-db.py` (root0700). `/var/log/itsaplan-db-backup.log` is root0600; inspect privately. No system service needs restarting to load a cron.d file.

Cron checks each hour at minute17. A locked helper creates a backup only when at least72 hours have passed since the last successful backup; the next eligible hourly tick runs it. This avoids the irregular month-boundary behavior of cron's `*/3` day-of-month syntax. A failed run does not advance last-success; the next tick can try again. No laptop background job, inbound laptop connection or AI/model loop exists.

## Validation and retention

`pg_dump` reads the running database without stopping services. Avoid concurrent DDL or credential rotation. Every successful dump is fully restored with `pg_restore --exit-on-error` into a fresh PostgreSQL17 clone with network none, no published ports/live volumes,512MiB memory and384MiB temporary data. Issue and additional-assignment tables must be readable. The clone is removed before publishing COMPLETE and advancing `last-success.json`.

The tested helper refuses a source database over256MiB or a filesystem below2GiB free. These are deliberate limits for this VPS; review and retest larger restore capacity rather than silently removing the checks. A failure leaves a private incomplete directory for diagnosis and never qualifies it for automatic retention cleanup.

Only after a new verified backup succeeds are completed scheduled backups older than30 days removed. Directory naming, metadata format, regular-file allowlist and full dump SHA must match. Corrupt, incomplete, symlinked, manual and unrelated directories are preserved; the newest successful backup is always retained. Existing `/root/itsaplan-backups` recovery archives are outside this policy. No automatic laptop deletion or recurring transfer is installed; review its one copied backup manually.

Checksums verify byte identity; the isolated restore checks database importability, not a browser login or full semantic validation of all application data. Restore never overwrites the live database.

## TODO — offsite bucket / S3

- [ ] Choose bucket/S3-compatible provider, region, budget and retention policy.
- [ ] Create a dedicated least-privilege backup identity and private bucket; never commit access keys.
- [ ] Decide client-side encryption/key recovery before uploading private data.
- [ ] Add verified upload/download, lifecycle/versioning and failure alerts.
- [ ] Run a restore drill from downloaded offsite backup, including object-store assets and operator configuration.

No bucket is provisioned, connected or billed by this setup.
