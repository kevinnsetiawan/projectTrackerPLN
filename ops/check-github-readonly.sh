#!/bin/sh
set -eu
export GIT_SSH_COMMAND='ssh -i /etc/protrack-deploy/github_readonly_ed25519 -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/protrack-deploy/github_known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15'
git ls-remote git@github.com:udawidi/projectTrackerPLN.git
