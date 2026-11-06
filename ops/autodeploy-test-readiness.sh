#!/usr/bin/env bash
set -Eeuo pipefail
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
function_text=$(sed -n '/^wait_for_release()/,/^}/p' deploy/protrack-autodeploy.sh)
eval "$function_text"
cat > "$tmp/curl" <<'EOF'
#!/usr/bin/env bash
state=${READINESS_STATE:?}
n=$(cat "$state")
n=$((n + 1)); printf '%s\n' "$n" > "$state"
case "${READINESS_MODE:?}:$n" in
  transient:1|transient:2) exit 7 ;;
  transient:*) printf '{"sha":"expected"}\n' ;;
  wrong:*) printf '{"sha":"other"}\n' ;;
  down:*) exit 7 ;;
esac
EOF
chmod +x "$tmp/curl"
cat > "$tmp/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$tmp/sleep"
PATH="$tmp:$PATH"; export PATH
run_case() {
  local mode=$1 expected=$2
  printf '0\n' > "$tmp/state"
  READINESS_MODE=$mode READINESS_STATE="$tmp/state" wait_for_release "$expected"
}
run_case transient expected
if run_case wrong expected || run_case down expected; then
  echo 'readiness accepted invalid response' >&2
  exit 1
fi
echo 'autodeploy readiness: transient recovery and fail-closed mismatch/unreachable checks passed'
