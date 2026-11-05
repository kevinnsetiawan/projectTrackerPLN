# Tasks

- [x] T001 Record immutable release input (commit/tag or archive checksum); preserve unrelated dirty changes.
- [x] T002 Verify auth config endpoint, closed registration response/UI, production `READ_AUTH`, and tests.
- [x] T003 Add Node 22 production image and Compose with PostgreSQL 17 named persistent volume, private DB/API ports, health checks, and `.env` secret handling.
- [x] T004 Add Nginx SPA/API reverse proxy on 8080 with SSE buffering disabled and security-safe headers.
- [x] T005 Verify VM210 resources/network/IP, provision Debian/Docker, and configure `/opt/protrack`; do not alter CT100/VM200.
- [x] T006 Deploy immutable release, initialize empty DB, generate the `dilankanjut@gmail.com` admin password on-server into `/root/protrack-admin.json` mode 0600, and verify login/persistence/restart.
- [x] T007 Append Cloudflare tunnel/DNS hostname while preserving existing ingress and verify external HTTPS plus existing routes.
- [x] T008 Install daily `pg_dump -Fc` backup, seven-copy retention, free-space guard, and isolated restore test.
- [x] T009 Copy seven daily PostgreSQL dumps created on the VM to `/var/lib/vz/protrack-backups`, enforce retention/capacity guard, and run isolated restore test.
- [x] T010 Run acceptance smoke tests, capture logs/checksums, and document rollback.
