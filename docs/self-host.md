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

The migration checks that the verified email resolves uniquely, records the promotion, and invalidates the previous authorization version. It does not change the password or fabricate unit memberships. Log in again using the preserved credentials. With no unit membership, root can open organization, users, and the read-only Security Matrix; root may select an active unit or all units for read-only monitoring, while business mutations still require membership and capability.

The root-only bootstrap credential file is not updated when an administrator changes the password in the application. Do not treat it as a current credential or use it for automated health checks. A stale file is not a reason to reset the password.

Configure the official Unit Induk and six UPT names/codes through organization management, then assign each account its authorized unit roles. Technical root access alone does not grant operational project access. See [initial data](data-awal.md) and [Security Matrix](security-matrix.md). Normal startup must keep fixture seeding disabled and public registration closed.

Provisioning role/jabatan UPT-SBYA uses the reviewed dry-run/apply workflow. Keep the ten account inputs outside Git and execute only during approved maintenance after backup and isolated restore.

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

## Manual WARNOTO master migration

The user authorized production completion on 5 November 2026. The CI-green application release `b5b982b` migrated and imported the approved snapshot: 1 UIT, 6 UPT, and 189 GI. Fresh pre-migration backup `protrack-20261105T150043Z.dump` and post-migration backup `protrack-20261105T150225Z.dump` passed PVE checksum validation and isolated restore. Existing users, password hashes, memberships, local organization records, audit records, and business data were preserved. Future imports and schema changes still require the reviewed maintenance procedure below; ordinary pushes do not bypass its approval gate.

Never run a migration against WARNOTO; export reads only the three reference tables in a read-only repeatable-read transaction. The snapshot contains no users, memberships, inventory, bay, or operational data. Keep it outside Git in an operator-owned `0700` directory, with the snapshot and checksum at `0600`; verify its SHA-256 after every transfer. For example, on the authorized source-access machine use `bash server/scripts/export-warnoto-gi.sh /private/path/warnoto-gi.json` and transfer the snapshot to `/root/protrack-gi-snapshots/warnoto-gi-004.json` on VM210.

The new `lokasis.unit_id` is mandatory. The old API does not write it and is incompatible with the migrated schema. **Stop writes and enter maintenance before any schema change; keep the old API stopped until the new runtime is ready.** First prepare and test the approved immutable release image and frontend from the same tested build. Stop `protrack-autodeploy.timer` and confirm its service is inactive. Set `/var/lib/protrack-deploy/BLOCKED`, stop `deploy-web-1` and `deploy-app-1`, and start `protrack-maintenance`; confirm HTTP 503. Keep Docker Compose project `deploy`, root-only `/opt/protrack/.env`, database volume `deploy_postgres_data`, and tunnel configuration intact.

With writes stopped, run `protrack-backup.service`, verify the new `/var/backups/protrack/*.dump.sha256`, request its matching PVE copy using `/var/lib/protrack-deploy/backup.request`, verify `/var/lib/protrack-deploy/backup.ack` matches and independently check the PVE file under `/var/lib/vz/protrack-backups/`. Restore that dump using `/opt/protrack/deploy/restore-test.sh` before proceeding. Record this pre-migration dump separately; a later backup is not a substitute.

Prepare `/root/protrack-gi-migration.env` mode `0600` containing `GI_MIGRATION_DATABASE_URL` and `GI_IMPORT_DATABASE_URL` for the intended PostgreSQL database using Docker network `deploy_protrack`; never print the file or place credentials in arguments or Git. With `GI_IMAGE` set to the staged, tested image and `GI_SNAPSHOT_SHA` independently verified against the exported checksum, run the following on VM210. Confirm the real database name rather than relying on a copied example:

```sh
docker run --rm --network deploy_protrack --env-file /root/protrack-gi-migration.env "$GI_IMAGE" node server/scripts/migrate-warnoto-gi.js --confirm-db=protrack
docker run --rm --network deploy_protrack --env-file /root/protrack-gi-migration.env "$GI_IMAGE" node server/scripts/migrate-warnoto-gi.js --confirm-db=protrack --apply
docker run --rm --network deploy_protrack --env-file /root/protrack-gi-migration.env -v /root/protrack-gi-snapshots/warnoto-gi-004.json:/snapshot/warnoto.json:ro "$GI_IMAGE" node server/scripts/import-warnoto-gi.js --snapshot=/snapshot/warnoto.json --sha256="$GI_SNAPSHOT_SHA" --confirm-db=protrack
docker run --rm --network deploy_protrack --env-file /root/protrack-gi-migration.env -v /root/protrack-gi-snapshots/warnoto-gi-004.json:/snapshot/warnoto.json:ro "$GI_IMAGE" node server/scripts/import-warnoto-gi.js --snapshot=/snapshot/warnoto.json --sha256="$GI_SNAPSHOT_SHA" --confirm-db=protrack --apply
```

The commands without `--apply` always roll back. Review the reported counts and all conflicts before applying. Snapshot omissions, invalid source values, identity/code conflicts, local edits, and ownership changes fail the whole transaction; do not bypass them by matching names. If import fails after migration, remain in maintenance while the operator resolves it. Verify ownership constraints, preserved data and credentials, scoped GI and project access, and the staged runtime before reopening. Switch the tested app and frontend together, confirm HTTPS and `/release.json`, update the operator's verified `current-sha`, clear `BLOCKED` only after checks pass, and re-enable the timer. Repeat imports use the same maintenance procedure. Never restart the old API on the new schema: restore the verified pre-migration dump first if a compatible forward repair is unavailable.

## Cloudflare route

Append only `protrack.warnoto.com -> http://10.99.9.21:8080` to tunnel `pve-gudang`. Preserve every existing ingress and catch-all rule. Validate the public URL and recheck `postiz.warnoto.com`; do not edit CT100 or VM200.

## Rollback

For a multi-unit cutover, keep the application in maintenance mode if the release fails. The previous global API must not run against migrated multi-unit data. Restore the verified pre-cutover database backup before redeploying the previous release, and validate the restored state before reopening traffic. Preserve the existing tunnel hostname and unrelated routes.
