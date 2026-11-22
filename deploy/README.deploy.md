# plan.apeto.ir deployment

Upstream: https://github.com/croffasia/itsaplan
Deployment fork: git@github.com:saeed0920/itsaplan.git
Deployment branch: `vps/current-20261112` (laptop and VPS).
Base commit: 96c965682c8ac06b05c6f0841da6fd4376d7e251

Workspace creation, multiple human issue assignees and scheduled database backups are included. See [VPS backups](../docs/dev/vps-backups.md) for the 72-hour schedule, 30-day retention, private laptop copy and bucket/S3 TODO list. Git/source synchronization does not itself rebuild/restart services or run migrations.

The HTTPS bootstrap script/template below are historical operator setup tools, not an unattended deployment step. The live Nginx site also has an exact MCP exemption and its independent access gate; preserve both. Do not re-run bootstrap or remove access restrictions as part of Git synchronization.

## Run

```sh
cd /opt/itsaplan
docker compose -f docker-compose.yml -f compose.override.yaml build
docker compose -f docker-compose.yml -f compose.override.yaml up -d --no-build --pull never
docker compose -f docker-compose.yml -f compose.override.yaml ps
```

Images are built locally, not fetched releases. API/web bind only 127.0.0.1.
Postgres, storage, worker, bot stay on Docker network. Data: itsaplan_postgres-data,
itsaplan_minio-data, itsaplan_db-backups. Never run `down -v` on production.
Secrets: /opt/itsaplan/.env (0600). Preserve APP_ENCRYPTION_KEY permanently.

## HTTPS / initial owner

For a fresh installation only: set Cloudflare A record plan -> 86.106.142.249, DNS only, without stale AAAA.
Then run `sh deploy/enable-https.sh`. Certbot timer renews certificate and its
renewal hook reloads Nginx. ACME account initially has no email; add one with
`certbot update_account --email YOUR_EMAIL` for account recovery.

Nginx access restriction: /etc/nginx/snippets/itsaplan-access.conf.
Only localhost and setup operator IP allowed. First signup becomes instance admin.
Register owner, select invite-only/closed registration in god mode, verify settings,
then remove allow/deny rules from snippet and `nginx -t && systemctl reload nginx`.
Do not remove restriction before owner account exists. Do not enable Cloudflare proxy
while source-IP restriction is active; origin would see Cloudflare rather than operator.

## Custom changes / updates

Commit features on `vps/current-20261112`, push to the deployment fork through remote `puzzley`, and verify the published SHA before aligning VPS Git metadata. Preserve the existing upstream remote and separate newer `main`. Never push `.env`, database backups or runtime credentials. No automatic upstream updates.
Fetch upstream, review release notes and merge a tested tag/commit on this branch only with explicit approval.
Save previous commit SHA before merge. Build images before restarting app.
Migrations run through migrate service; DB is backed up before schema changes.
Database rollback requires matching backup restore, not merely checking out old code.

Before update, back up DB, attachments, .env and deployment config. Example attachment
backup (may take time as uploads grow):

```sh
mkdir -p /root/itsaplan-backups
chmod 700 /root/itsaplan-backups
docker run --rm --network none -v itsaplan_minio-data:/data:ro \
  -v /root/itsaplan-backups:/out alpine:3.23 \
  tar czf /out/attachments-$(date +%Y%m%d-%H%M%S).tgz -C /data .
```

The scheduled PostgreSQL helper uses an online consistent dump and a disposable restore check without stopping services. Avoid concurrent DDL/credential rotation. Database and object-store backups are separate; coordinating both for full application recovery needs its own plan. Migration backups and VPS-only scheduled dumps are not offsite disaster recovery. Owner selected a private unencrypted laptop copy now; encrypted bucket/S3 storage remains TODO.

## Checks / logs

Run `./deploy/check.sh` for service, migration, secret-permission and localhost-port checks.
Initial source build and all checks passed. Nginx HTTPS routing was also tested using
a temporary localhost-only listener/certificate: login, API, auth session, OAuth discovery.
Plan public TLS and authenticated app access are live. Keep independent edge access restrictions; authenticated owner credentials are never stored in this repository.

```sh
nginx -t
docker compose -f docker-compose.yml -f compose.override.yaml config --quiet
docker compose -f docker-compose.yml -f compose.override.yaml ps
docker compose -f docker-compose.yml -f compose.override.yaml logs --tail=80
curl -fsS http://127.0.0.1:3000/
curl -fsS http://127.0.0.1:3001/login >/dev/null
```

Build log: /var/log/itsaplan-build.log; exit status: /var/log/itsaplan-build.exit.
License AGPL-3.0: preserve license and satisfy corresponding-source obligations
when serving modified versions to network users.
