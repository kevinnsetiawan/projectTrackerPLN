# Pro-Track self-host runbook

Production runs on VM210 (`10.99.9.21`) behind the existing `pve-gudang` Cloudflare tunnel. Only Nginx is published on VM port `8080`; PostgreSQL and Node stay on the Compose network.

## Automatic releases

GitHub Actions checks `main` and advances `production` only after CI succeeds. VM210 polls `production` every two minutes using a dedicated read-only deploy key and a pinned GitHub host key. It does not accept incoming GitHub connections or store a GitHub write token. The account's current private-repository plan does not support branch protection: repository maintainers must not push to `production` directly. A maintainer with write access could bypass the CI promotion; the VM cannot independently check private GitHub Actions status using its read-only Git deploy key.

The VM operator script lives at `/usr/local/sbin/protrack-autodeploy.sh`, outside the checkout. Updating operator scripts and systemd units requires a separate reviewed installation; the poller never executes deployment scripts from the repository. Before enabling the timer, run the baseline verifier once against the CI-promoted commit and the existing verified release. It checks application and frontend source, running image contents, current `dist`, and `deploy_postgres_data`; it does not alter the database. Never set `current-sha` manually without equivalent verification.

Each new fast-forward candidate is built and tested in isolation. Its runtime image and frontend files come from that same tested build image. The deployer rejects symlinks and special files in `dist`, publishes the revision in `/release.json`, and verifies the running container image ID. A schema, database bootstrap, migration, startup, Dockerfile, or dependency change stops for explicit operator review; only after review can the operator place the exact candidate SHA in root-only `/var/lib/protrack-deploy/approved-schema-sha`. This approval does not run a migration; schema migrations remain a separate manual operation.

The deployer stops writes, enables maintenance, takes a fresh database backup, waits for PVE's matching checksum acknowledgement, and tests an isolated restore before switching releases. PVE's separate minute timer checks for a new request and only copies a requested dump; the daily backup timer remains unchanged. Existing users, projects, memberships and files are preserved. The health check does not assume an empty database.

Failure before maintenance leaves the old release running and records `failed-sha` to prevent repeated deployment attempts. Failure after maintenance retains `/var/lib/protrack-deploy/BLOCKED`, stops the app and web, and requires operator intervention. The boot guard restores maintenance after an interrupted deployment. Before retrying a failed SHA, inspect the journal, quarantine its staged directory, and remove `failed-sha` only after correcting the cause. Do not clear `BLOCKED` or reopen traffic until database and release compatibility are verified. A previous binary must not run on an incompatible newer schema: restore the verified pre-cutover backup first, or deploy a compatible forward fix.

## Release

Build and test the current worktree, including intentional dirty changes. Record the archive SHA-256 before transfer. Do not deploy a silently changing checkout.

On VM210, `/opt/protrack` contains the release archive, `dist/`, `deploy/`, and a root-only `.env` (`0600`). Start with:

```sh
chmod 0755 /opt/protrack/deploy/*.sh
docker compose --env-file /opt/protrack/.env -f /opt/protrack/deploy/docker-compose.yml up -d --build
docker compose --env-file /opt/protrack/.env -f /opt/protrack/deploy/docker-compose.yml ps
install -m 0644 deploy/protrack-firewall.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now protrack-firewall.service
```

Restore executable permissions after extracting an archive created on Windows. Otherwise the backup and restore services cannot execute the deployment scripts.

### First administrative identity and verified root

Create a first administrative identity from the server only when it does not already exist. Never place the password in Git, chat, shell history, or logs. For the existing production identity, skip the password creation/reset commands below and preserve its current credentials.

Generate it on VM210 and keep the only copy root-readable:

```sh
umask 077
pw=$(openssl rand -hex 24)
docker compose --env-file /opt/protrack/.env -f /opt/protrack/deploy/docker-compose.yml exec -T app node server/scripts/create-admin.js dilankanjut@gmail.com "$pw"
printf '{"email":"dilankanjut@gmail.com","password":"%s"}\n' "$pw" > /root/protrack-admin.json
unset pw
chmod 600 /root/protrack-admin.json
```

`create-admin.js` creates or resets an identity; it does not grant technical root access or unit membership. After verifying the existing root identity is exactly `dilankanjut@gmail.com`, promote only that identity through the explicit migration command:

```sh
docker compose --env-file /opt/protrack/.env -f /opt/protrack/deploy/docker-compose.yml exec -T app node server/scripts/migrate-units.js --promote-verified-root
```

The migration checks that the verified email resolves uniquely, records the promotion, and invalidates the previous authorization version. It does not change the password or fabricate unit memberships. Log in again using the preserved credentials. With no unit membership, root can open organization, users, and the read-only Security Matrix; business pages remain behind the unit-selection gate.

Configure the official Unit Induk and six UPT names/codes through organization management, then assign each account its authorized unit roles. Technical root access alone does not grant operational project access. See [initial data](data-awal.md) and [Security Matrix](security-matrix.md). Normal startup must keep fixture seeding disabled and public registration closed.

## Health and auth checks

```sh
curl -fsS http://10.99.9.21:8080/api/auth/config
curl -i http://10.99.9.21:8080/api/projects
```

The first response must report `registrationOpen:false`; the second must be `401` without a token. Login is performed through the public HTTPS hostname.

## Backup and restore

Enable the daily timer after `/var/backups/protrack` and the separate PVE copy directory exist:

```sh
install -m 0644 deploy/protrack-backup.service deploy/protrack-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now protrack-backup.timer
```

Backups are custom-format PostgreSQL dumps. The job aborts with less than 10 GiB free, validates a non-empty dump, then retains seven newest dumps. It never prunes before a new valid dump exists. Restore is isolated:

```sh
deploy/restore-test.sh "$(ls -1t /var/backups/protrack/*.dump | head -1)"
```

The PVE copy target is `/var/lib/vz/protrack-backups` on the host. Install `deploy/pve-pull-backup.sh` as `/usr/local/sbin/protrack-pve-pull-backup.sh` on PVE, install `deploy/pve-pull-backup.service` and `deploy/pve-pull-backup.timer`, then provision its root-only SSH key/known-host entry for VM210. It validates the copied checksum and enforces a 20 GiB cap. When the cap prevents a new copy, a fresh dump must already exist on VM210 before the oldest PVE copy is retired; at least six PVE copies remain until the new copy is verified. If six copies plus the incoming dump still exceed the cap, the pull aborts and leaves the fresh VM dump intact. This is not off-site disaster recovery.

## Cloudflare route

Append only `protrack.warnoto.com -> http://10.99.9.21:8080` to tunnel `pve-gudang`. Preserve every existing ingress and catch-all rule. Validate the public URL and recheck `postiz.warnoto.com`; do not edit CT100 or VM200.

## Rollback

For a multi-unit cutover, keep the application in maintenance mode if the release fails. The previous global API must not run against migrated multi-unit data. Restore the verified pre-cutover database backup before redeploying the previous release, and validate the restored state before reopening traffic. Preserve the existing tunnel hostname and unrelated routes.
