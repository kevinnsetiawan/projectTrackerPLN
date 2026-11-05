# Pro-Track self-host runbook

Production runs on VM210 (`10.99.9.21`) behind the existing `pve-gudang` Cloudflare tunnel. Only Nginx is published on VM port `8080`; PostgreSQL and Node stay on the Compose network.

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
