#!/usr/bin/env bash
set -Eeuo pipefail

# VM210 host firewall: only the PVE/cloudflared origin may reach Nginx.
command -v iptables >/dev/null || { echo 'iptables is required' >&2; exit 1; }
# Docker DNAT traverses FORWARD/DOCKER-USER, not INPUT. Keep established replies first.
iptables -C DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || iptables -I DOCKER-USER 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -C DOCKER-USER -p tcp -m conntrack --ctstate NEW --ctorigdstport 8080 -s 10.99.9.1 -j ACCEPT 2>/dev/null || iptables -I DOCKER-USER 2 -p tcp -m conntrack --ctstate NEW --ctorigdstport 8080 -s 10.99.9.1 -j ACCEPT
iptables -C DOCKER-USER -p tcp -m conntrack --ctstate NEW --ctorigdstport 8080 -j DROP 2>/dev/null || iptables -I DOCKER-USER 3 -p tcp -m conntrack --ctstate NEW --ctorigdstport 8080 -j DROP
