#!/usr/bin/env python3
"""Plan or apply the Pro-Track route and DNS record in the existing tunnel."""

import argparse
import copy
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ACCOUNT = "500a658cf4b9d9dee432ace3abf55cb6"
TUNNEL = "5f8e099c-e530-4fb3-8341-833287e9bbd9"
ZONE = "add9ad44d0032d3bea53497eea01697c"
HOST = "protrack.warnoto.com"
SERVICE = "http://10.99.9.21:8080"
TARGET = "5f8e099c-e530-4fb3-8341-833287e9bbd9.cfargotunnel.com"
TOKEN_RE = re.compile(r"[A-Za-z0-9_-]{20,200}\Z")


class CloudflareError(RuntimeError):
    pass


def _token(path: Path) -> str:
    try:
        value = path.read_text(encoding="utf-8").strip()
    except OSError:
        raise CloudflareError("API token unavailable") from None
    if not TOKEN_RE.fullmatch(value):
        raise CloudflareError("API token format invalid")
    return value


def _api(token: str, method: str, path: str, body=None):
    data = None if body is None else json.dumps(body, separators=(",", ":")).encode()
    request = Request("https://api.cloudflare.com/client/v4" + path, data=data, method=method)
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Content-Type", "application/json")
    try:
        with urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode())
    except (HTTPError, URLError, OSError, UnicodeError, json.JSONDecodeError):
        raise CloudflareError("Cloudflare API request failed") from None
    if result.get("success") is not True:
        raise CloudflareError("Cloudflare API rejected request")
    return result


def _config(result):
    try:
        return result["result"]["config"], result["result"]["version"]
    except (KeyError, TypeError):
        raise CloudflareError("tunnel configuration response malformed") from None


def _new_config(config):
    ingress = config.get("ingress")
    if not isinstance(ingress, list) or not ingress or "hostname" in ingress[-1]:
        raise CloudflareError("tunnel ingress has no final catch-all rule")
    matches = [rule for rule in ingress if rule.get("hostname") == HOST]
    if matches:
        if len(matches) == 1 and matches[0].get("service") == SERVICE:
            return copy.deepcopy(config), False
        raise CloudflareError("existing Pro-Track hostname rule conflicts")
    updated = copy.deepcopy(config)
    updated["ingress"] = ingress[:-1] + [{"hostname": HOST, "service": SERVICE}] + ingress[-1:]
    return updated, True


def _dns_record(result):
    records = result.get("result")
    if not isinstance(records, list):
        raise CloudflareError("DNS response malformed")
    if not records:
        return "create"
    if len(records) != 1:
        raise CloudflareError("multiple DNS records exist for Pro-Track hostname")
    record = records[0]
    if record.get("type") == "CNAME" and record.get("content") == TARGET and record.get("proxied") is True:
        return "keep"
    raise CloudflareError("DNS record conflicts; refusing overwrite")


def run(token_path: Path, apply: bool):
    token = _token(token_path)
    route_result = _api(token, "GET", f"/accounts/{ACCOUNT}/cfd_tunnel/{TUNNEL}/configurations")
    old_config, version = _config(route_result)
    new_config, route_change = _new_config(old_config)
    dns_result = _api(token, "GET", f"/zones/{ZONE}/dns_records?name={quote(HOST)}")
    dns_action = _dns_record(dns_result)
    print(f"plan host={HOST} service={SERVICE} route_change={route_change} dns={dns_action} version={version}")
    if not apply:
        return

    current_config, current_version = _config(_api(token, "GET", f"/accounts/{ACCOUNT}/cfd_tunnel/{TUNNEL}/configurations"))
    if current_version != version or current_config != old_config:
        raise CloudflareError("tunnel configuration changed; refusing apply")
    if route_change:
        try:
            _api(token, "PUT", f"/accounts/{ACCOUNT}/cfd_tunnel/{TUNNEL}/configurations", {"config": new_config})
        except CloudflareError:
            observed, _ = _config(_api(token, "GET", f"/accounts/{ACCOUNT}/cfd_tunnel/{TUNNEL}/configurations"))
            if observed != new_config:
                raise CloudflareError("tunnel update outcome unresolved; no retry") from None
    verified, verified_version = _config(_api(token, "GET", f"/accounts/{ACCOUNT}/cfd_tunnel/{TUNNEL}/configurations"))
    if verified != new_config:
        raise CloudflareError("tunnel verification mismatch")
    if dns_action == "create":
        try:
            _api(token, "POST", f"/zones/{ZONE}/dns_records", {"type": "CNAME", "name": HOST, "content": TARGET, "ttl": 1, "proxied": True})
        except CloudflareError:
            observed = _dns_record(_api(token, "GET", f"/zones/{ZONE}/dns_records?name={quote(HOST)}"))
            if observed != "keep":
                raise CloudflareError("DNS update outcome unresolved; no retry") from None
    print(f"applied version={verified_version} target={HOST} route_count={len(verified['ingress'])}")


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--token-file", type=Path, default=Path("/root/.cfapi_token"))
    args = parser.parse_args(argv)
    try:
        run(args.token_file, args.apply)
    except CloudflareError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
