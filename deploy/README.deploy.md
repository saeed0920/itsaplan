# pi.apeto.ir deployment

Source: https://github.com/croffasia/itsaplan
Initial commit: 96c965682c8ac06b05c6f0841da6fd4376d7e251
Local branch: deploy/pi. No remote fork created or pushed.

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

Set Cloudflare A record pi -> 86.106.142.249, DNS only, without stale AAAA.
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

Commit features on deploy/pi. Create your own GitHub fork later, add as `origin`,
rename existing remote to `upstream`; never push .env. No automatic upstream updates.
Fetch upstream, review release notes and merge a tested tag/commit on this branch.
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

For consistent backup, pause writes while dumping DB and attachments. Migration
backups are local only, not disaster recovery. Arrange encrypted off-server scheduled
backups before relying on instance for important data.

## Checks / logs

Run `./deploy/check.sh` for service, migration, secret-permission and localhost-port checks.
Initial source build and all checks passed. Nginx HTTPS routing was also tested using
a temporary localhost-only listener/certificate: login, API, auth session, OAuth discovery.
Public DNS, trusted TLS issuance and browser signup remain pending DNS setup.

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
