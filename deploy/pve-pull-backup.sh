#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Run on the Proxmox host. The key is provisioned root-only for VM210 backup pulls.
vm_backup_dir=/var/lib/vz/protrack-backups
source_dir=/var/backups/protrack
vm=10.99.9.21
key=/root/.ssh/protrack-backup-vm210
mkdir -p "$vm_backup_dir"
free_kib=$(df -Pk "$vm_backup_dir" | awk 'NR==2 {print $4}')
[[ -n "$free_kib" && "$free_kib" -ge 10485760 ]] || { echo 'PVE backup aborted: less than 10 GiB free' >&2; exit 1; }
latest=$(ssh -i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes root@"$vm" "find '$source_dir' -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\\n' | sort -nr | head -1 | cut -d' ' -f2-")
[[ -n "$latest" ]] || { echo 'PVE backup aborted: no source dump' >&2; exit 1; }
base=$(basename "$latest")
source_size=$(ssh -i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes root@"$vm" "stat -c %s '$latest'")
[[ "$base" =~ ^protrack-[0-9]{8}T[0-9]{6}Z\.dump$ && "$source_size" =~ ^[0-9]+$ && "$source_size" -gt 0 ]] || { echo 'PVE backup source invalid' >&2; exit 1; }
expected=$(ssh -i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes root@"$vm" "cut -d' ' -f1 '$latest.sha256'")
[[ "$expected" =~ ^[a-f0-9]{64}$ ]] || { echo 'PVE backup checksum invalid' >&2; exit 1; }
used_kib=$(du -sk "$vm_backup_dir" | awk '{print $1}')
incoming_kib=$((source_size / 1024 + 1))
if [[ -e "$vm_backup_dir/$base" ]]; then
  [[ "$(sha256sum "$vm_backup_dir/$base" | awk '{print $1}')" == "$expected" ]] || { echo 'PVE backup differs from existing copy' >&2; exit 1; }
  incoming_kib=0
fi
# A fresh VM dump exists. Admit it by retiring the oldest PVE copy, while
# preserving at least six verified copies until the replacement is verified.
mapfile -t existing < <(find "$vm_backup_dir" -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\n' | sort -n | cut -d' ' -f2-)
while [[ $((used_kib + incoming_kib)) -gt 20971520 && "${#existing[@]}" -gt 6 ]]; do
  oldest=${existing[0]}
  [[ "$oldest" != "$vm_backup_dir/$base" ]] || break
  rm -f -- "$oldest" "$oldest.sha256"
  existing=("${existing[@]:1}")
  used_kib=$(du -sk "$vm_backup_dir" | awk '{print $1}')
done
[[ $((used_kib + incoming_kib)) -le 20971520 ]] || { echo 'PVE backup aborted: 20 GiB cap' >&2; exit 1; }
trap 'rm -f -- "$vm_backup_dir/.${base}.tmp" "$vm_backup_dir/.${base}.sha256.tmp"' EXIT
if [[ "$incoming_kib" -gt 0 ]]; then
scp -q -i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes root@"$vm:$latest" "$vm_backup_dir/.${base}.tmp"
test -s "$vm_backup_dir/.${base}.tmp"
scp -q -i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes root@"$vm:$latest.sha256" "$vm_backup_dir/.${base}.sha256.tmp"
expected=$(awk '{print $1}' "$vm_backup_dir/.${base}.sha256.tmp")
actual=$(sha256sum "$vm_backup_dir/.${base}.tmp" | awk '{print $1}')
[[ "$expected" == "$actual" ]] || { echo "PVE backup checksum mismatch" >&2; rm -f -- "$vm_backup_dir/.${base}.tmp" "$vm_backup_dir/.${base}.sha256.tmp"; exit 1; }
if [[ -e "$vm_backup_dir/$base" ]]; then
  [[ "$(sha256sum "$vm_backup_dir/$base" | awk '{print $1}')" == "$actual" ]] || { echo "PVE backup differs from existing copy" >&2; rm -f -- "$vm_backup_dir/.${base}.tmp" "$vm_backup_dir/.${base}.sha256.tmp"; exit 1; }
  rm -f -- "$vm_backup_dir/.${base}.tmp"
else
  mv -- "$vm_backup_dir/.${base}.tmp" "$vm_backup_dir/$base"
fi
printf '%s  %s\n' "$actual" "$vm_backup_dir/$base" > "$vm_backup_dir/$base.sha256"
fi
find "$vm_backup_dir" -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\n' | sort -nr | awk 'NR>7 {print $2}' | while read -r old; do rm -f -- "$old" "$old.sha256"; done
ssh -i "$key" -o BatchMode=yes -o StrictHostKeyChecking=yes root@"$vm" "find '$source_dir' -maxdepth 1 -type f -name 'protrack-*.dump' -printf '%T@ %p\\n' | sort -nr | awk 'NR>7 {print \$2}' | xargs -r rm -f --"
