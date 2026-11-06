# Self-host Pro-Track production

## Goal

Deploy the current Pro-Track SPA/API as a private, persistent production service at `https://protrack.warnoto.com` behind the existing Cloudflare tunnel, with application login and PostgreSQL persistence.

## Scope and constraints

- Provision independent Proxmox VM 210 (Debian 13, 2 vCPU, 4 GiB RAM, 64 GiB disk, `10.99.9.21/24`, gateway `10.99.9.1`, `vmbr1`). Do not modify CT100 or VM200.
- Run Node 22, Express API, Vite build, Nginx, and PostgreSQL 17 through Compose. Persist PostgreSQL on a named volume; attachments remain base64 data URLs in DB TEXT.
- Expose only Nginx on VM address `10.99.9.21:8080` to the tunnel. Do not publish PostgreSQL or the application port publicly.
- Production starts with an empty database and one admin (`dilankanjut@gmail.com`) whose secure password is generated on the server and stored only in `/root/protrack-admin.json` mode 0600. Never commit or log the password.
- Production env uses `NODE_ENV=production`, `DB_DRIVER=pg`, `SEED_DEMO=0`, `READ_AUTH=1`, `REGISTRATION_OPEN=0`, fresh `JWT_SECRET`, fresh DB credentials, and `.env` mode 0600.
- Append `protrack.warnoto.com -> http://10.99.9.21:4007` to tunnel `pve-gudang` without changing existing routes; DNS is proxied CNAME.
- Daily PostgreSQL custom-format dumps created on the VM, seven-day retention, capacity guard, copy to PVE `/var/lib/vz/protrack-backups`, and restore test.
- Deployment input is an explicit commit/tag or archive checksum. The current dirty worktree must not be silently overwritten.

## User stories

1. As an authenticated PLN user, I can open `protrack.warnoto.com` and use the existing app over HTTPS.
2. As an administrator, I can create the initial production account without demo credentials being seeded.
3. As an operator, I can restart the VM/containers without losing projects, agendas, and files.
4. As an operator, I can restore a recent database dump into a temporary PostgreSQL instance and verify schema plus admin access.
5. As a security owner, I can confirm public unauthenticated reads are denied in production and registration is closed.

## Functional requirements

- FR-1: `GET /api/auth/config` returns `{ registrationOpen: boolean }` without requiring login.
- FR-2: Registration rejects requests when `REGISTRATION_OPEN=0`; development defaults remain unchanged.
- FR-3: Frontend fetches auth config and hides/disables registration while closed.
- FR-4: Production auth requires `JWT_SECRET`; registration rate limits and security headers remain enabled.
- FR-5: API read guards are active in production (`READ_AUTH=1`); token-bearing export links continue working.
- FR-6: Compose starts PostgreSQL before API, runs bootstrap/schema safely, and keeps DB/app ports private.
- FR-7: Nginx serves the built SPA, proxies `/api`, and disables SSE buffering for `/api/events/stream`.
- FR-8: Backup job writes `pg_dump -Fc` files with timestamps, refuses low free space, and prunes beyond seven daily copies.
- FR-9: Restore procedure proves the dump is readable and contains expected schema/admin data without touching production DB.
- FR-10: Health checks cover Nginx, API auth config, PostgreSQL readiness, and tunnel hostname.

## Acceptance criteria

- `https://protrack.warnoto.com` returns the app through the tunnel and login succeeds with the separately supplied admin password.
- Anonymous production API read returns 401/403; `GET /api/auth/config` remains public and reports `registrationOpen:false`.
- A registration attempt returns 403 while closed; no register link/action is offered in the production UI.
- VM/container restart preserves a created project, agenda, and uploaded base64 file.
- Seven or fewer daily dumps remain after retention; a forced low-space check aborts without deleting the newest valid backup.
- Restore test completes against an isolated temporary PostgreSQL service and is recorded with timestamp/checksum.
- Existing CT100/VM200 tunnel routes remain unchanged and healthy.

## Risks and blockers

- Candidate IP `.21` must be verified free immediately before provisioning.
- Dirty local UI changes require a release commit/tag or immutable archive checksum before deployment.
- Cloudflare DNS/tunnel changes require operator credentials and must preserve existing ingress/catch-all rules.
