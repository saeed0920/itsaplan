# Telegram-only proxy

## Status

Local source candidate, 2026-11-15. Not deployed locally or on VPS. No bot tokens changed, accounts linked, messages sent, or production services restarted.

VPS diagnostic: direct certificate-verified HTTPS to `https://api.telegram.org` timed out (HTTP000, 4.21s). Explicit existing host Xray HTTP proxy `http://127.0.0.1:10809` returned HTTP302 in 0.54s. This proves host reachability, not container access or authenticated bot delivery. Xray was active. Do not disable TLS verification.

## Configuration

Set `TELEGRAM_PROXY_URL` to an HTTP(S) proxy origin reachable from API, worker and bot containers. Leave empty for direct Telegram access. Do not use a container's `127.0.0.1` for a host proxy. Do not put authenticated proxy URLs in Helm's shared ConfigMap; supply them through an operator-managed Secret if required.

The five deployment Compose files pass this variable to API, worker and bot. Helm uses `api.env.TELEGRAM_PROXY_URL` in its shared ConfigMap. Changing runtime environment requires approved service recreation. No public proxy listener is supplied by this source change.

`@repo/net/telegram` is a dedicated Bun fetch transport for exact HTTPS origin `api.telegram.org`. It is used by:

- API bot-token validation (`getMe`).
- grammY bot polling and account-link replies (custom client fetch).
- Worker Telegram notification delivery.
- Built-in agent Telegram send tool.

Only those callers use this proxy. Email, models, webhooks, DB, object storage and other fetch calls are unchanged. The URL must not contain destination credentials; redirects are refused. Invalid proxy configuration fails closed, without direct fallback. Request bodies, caller cancellation and timeouts are retained. Transport errors are generic to avoid exposing bot-token URLs or proxy credentials. Blank configuration explicitly disables ambient proxy inheritance for this transport.

The bot uses Bun fetch behind grammY's node-fetch-compatible client hook. Current bot only polls and sends text; file-upload streaming compatibility is not claimed. Exactly one polling replica remains required. Reusing a bot already polled by another application can interrupt that integration.

## Checks

Run with Bun from repository root, isolated from real DB, Telegram and credentials:

```bash
bun test packages/net/src/__tests__/telegram.test.ts apps/bot/src/__tests__/unit/telegram-transport.test.ts
```

2026-11-15 result: 3 tests, 18 assertions PASS. Covers destination restriction, direct/default selection, proxy validation, payload/cancellation preservation, generic errors, real HTTPS CONNECT interception, grammY getMe/getUpdates/sendMessage interception. CONNECT tests use isolated loopback and synthetic token; they do not contact Telegram or send real messages.

- Typechecks PASS: packages/net, apps/bot, apps/worker, packages/agent-tools.
- API-wide typecheck incomplete: first combined sandbox run timed out at 110s; separate API run ended137 at 127s under 2GiB resource bound. No API typecheck pass claimed.
- Changed TS ESLint PASS; new transport/test formatting applied with Prettier; git diff --check PASS.
- Parsed all five Compose files: all 15 intended service environment entries present. Helm values parsed; Helm renderer unavailable, so template rendering untested.
- Focused tidy, correctness review and security guidance pass: no retained code finding. This is not a full security audit or deployment assurance.

## Deployment gates

Follow `.agents/skills/itsaplan-deploy/SKILL.md`: finish checks, obtain local deployment approval, test locally, require owner acceptance and separate production release approval, verify restore-tested recovery and off-host copy before cutover. Preserve unrelated dirty invite changes and migration0180; do not deploy those as part of this transport change.

VPS containers currently use `itsaplan_default` gateway `172.18.0.1`, with no proxy variables. Existing documented Pocket listener is on a different network gateway. An operator must approve and verify a private container-reachable proxy path before setting a real production URL; do not publish an unauthenticated listener, change global routing, restart shared Xray or attach services to unrelated networks implicitly. This network step is not implemented.

After approved rollout, verify token validation and linking as owner, then enable only intended personal PUZZ/SF preferences. Any real notification test must be explicitly approved for a named recipient. No blind retries after ambiguous delivery; existing notification retries can duplicate messages.

Rollback transport images and runtime configuration together; no DB migration is needed for this change. Keep bot token and account links intact. Do not replay or purge queued notifications automatically.
