# Implementation plan

1. Freeze release input: inspect dirty worktree, choose approved commit/tag or archive checksum, and record it.
2. Add/verify auth config contract and registration-closed UI. Run auth and existing test suites.
3. Add production container assets: Node 22 image, Compose service graph, PostgreSQL 17 named volume, Nginx SPA/API/SSE config, health checks, and secret env template. Keep DB/app unexposed.
4. Provision VM 210 only after ARP/IP verification; configure Debian, firewall, Docker/Compose, `/opt/protrack`, and `.env` 0600.
5. Start PostgreSQL/API/Nginx on `10.99.9.21:8080`, generate the admin password on-server into `/root/protrack-admin.json` mode 0600, and verify `READ_AUTH`, registration closure, persistence, and SSE.
6. Append the tunnel hostname to the existing tunnel and point it at `http://10.99.9.21:8080`; run external HTTPS smoke tests and verify CT100/VM200 routes.
7. Install daily PostgreSQL dump/retention/capacity guard on the VM, copy dumps to `/var/lib/vz/protrack-backups`, and perform an isolated restore test.
8. Record rollback: stop new VM/route, restore prior tunnel config, and redeploy the last known-good immutable release.
