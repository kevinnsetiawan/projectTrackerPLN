#!/bin/sh
set -eu
install -m 0755 /tmp/protrack-pve-ack.sh /usr/local/sbin/protrack-pve-ack.sh
install -m 0644 /tmp/protrack-pve-ack.service /etc/systemd/system/protrack-pve-ack.service
install -m 0644 /tmp/protrack-pve-ack.timer /etc/systemd/system/protrack-pve-ack.timer
systemctl daemon-reload
systemctl enable --now protrack-pve-ack.timer
systemctl start protrack-pve-ack.service
systemctl is-active protrack-pve-ack.timer
