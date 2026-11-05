#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
output=${1:?usage: export-warnoto-gi.sh /private/directory/snapshot.json}
parent=$(realpath "$(dirname "$output")")
repo=$(git rev-parse --show-toplevel)
case "$parent/" in "$repo/"*) echo 'Snapshot must be outside the repository' >&2; exit 1;; esac
[[ "$(stat -c '%u:%a' "$parent")" == "$(id -u):700" ]] || { echo 'Snapshot directory must be owned by caller and mode 700' >&2; exit 1; }
output="$parent/$(basename "$output")"
[[ ! -e "$output" && ! -L "$output" && ! -e "$output.sha256" && ! -L "$output.sha256" ]] || { echo 'Snapshot already exists' >&2; exit 1; }
tmp=$(mktemp "$parent/.warnoto-snapshot.XXXXXX")
trap 'rm -f -- "$tmp"' EXIT
"${WARNOTO_SSH:-ssh}" -o BatchMode=yes minipc-gudang docker exec -i supabase-db psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres > "$tmp" <<'SQL'
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object(
  'version', 1,
  'uit', (SELECT COALESCE(json_agg(json_build_object('id',id,'nama',data->>'nama','kode',data->>'kode') ORDER BY id),'[]'::json) FROM public.uit),
  'upt', (SELECT COALESCE(json_agg(json_build_object('id',id,'uit_id',uit_id,'nama',data->>'nama','kode',data->>'kode') ORDER BY id),'[]'::json) FROM public.upt),
  'gi', (SELECT COALESCE(json_agg(json_build_object('id',id,'upt_id',upt_id,'ultg_id',ultg_id,'nama',data->>'nama','latitude',data->'lat','longitude',data->'lng','map_source_url',data->>'mapSourceUrl','active',active) ORDER BY id),'[]'::json) FROM public.mtu_khs_gardu_induk)
);
COMMIT;
SQL
test -s "$tmp"
chmod 0600 "$tmp"
mv -n "$tmp" "$output"
sha256sum "$output" > "$output.sha256"
chmod 0600 "$output.sha256"
echo "Snapshot exported: $output"
