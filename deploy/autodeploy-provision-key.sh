#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
install -d -m 0700 /etc/protrack-deploy
key=/etc/protrack-deploy/github_readonly_ed25519
if [[ ! -e "$key" ]]; then
  ssh-keygen -q -t ed25519 -N '' -C 'protrack-vm210-readonly' -f "$key"
fi
test -f "$key.pub"
chmod 600 "$key"
chmod 644 "$key.pub"
tmp=$(mktemp /etc/protrack-deploy/known-hosts.XXXXXX)
trap 'rm -f "$tmp"' EXIT
ssh-keyscan -T 15 -t ed25519 github.com > "$tmp" 2>/dev/null
fingerprint=$(ssh-keygen -lf "$tmp" -E sha256 | awk '{print $2}')
[[ "$fingerprint" == 'SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU' ]] || { echo 'GitHub host key fingerprint mismatch' >&2; exit 1; }
install -m 0644 "$tmp" /etc/protrack-deploy/github_known_hosts
echo 'GitHub host key verified. Public deploy key:'
cat "$key.pub"
