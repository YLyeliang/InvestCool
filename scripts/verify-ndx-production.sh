#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Python syntax =="
python -m py_compile backend/app/main.py backend/worker.py

echo "== PM2 status =="
pm2 jlist > /tmp/investcool-pm2-status.json
python - <<'PY'
import json
from pathlib import Path

required = {"backend-real", "investcool-frontend", "investcool-worker"}
items = json.loads(Path("/tmp/investcool-pm2-status.json").read_text())
seen = {item.get("name"): item.get("pm2_env", {}).get("status") for item in items}
missing = sorted(required - set(seen))
not_online = {name: status for name, status in seen.items() if name in required and status != "online"}
if missing or not_online:
    raise SystemExit(f"PM2 unhealthy: missing={missing}, not_online={not_online}")
for name in sorted(required):
    print(f"{name}: {seen[name]}")
PY

echo "== Risk API smoke =="
python - <<'PY'
import json
import urllib.request

checks = [
    "dashboard",
    "key-takeaways",
    "thesis-monitor",
    "catalyst-calendar",
    "trigger-monitor",
    "risk-reward",
    "pre-trade-checklist",
    "position-sizing",
    "execution-ticket",
    "risk-register",
    "hedge-book",
    "data-quality",
]

for name in checks:
    with urllib.request.urlopen(f"http://127.0.0.1:5000/api/risk/{name}", timeout=20) as resp:
        body = resp.read().decode("utf-8")
        data = json.loads(body)
        if resp.status != 200:
            raise SystemExit(f"{name}: expected 200, got {resp.status}")
        if isinstance(data, dict) and data.get("error"):
            raise SystemExit(f"{name}: returned error {data['error']}")
        label = data.get("headline") or data.get("summary") or data.get("health_score") or "ok"
        print(f"{name}: {label}")
PY

echo "== Risk page smoke =="
python - <<'PY'
import urllib.request

required_text = [
    "NDX 风险研究",
    "NDX 投资论点监控",
    "NDX 催化日历",
    "NDX 风险登记簿",
    "NDX 对冲方案簿",
]

with urllib.request.urlopen("http://127.0.0.1:3000/risk", timeout=20) as resp:
    body = resp.read().decode("utf-8", "ignore")
    if resp.status != 200:
        raise SystemExit(f"/risk: expected 200, got {resp.status}")
    if "This page couldn't load" in body:
        raise SystemExit("/risk: rendered error page")
    missing = [text for text in required_text if text not in body]
    if missing:
        raise SystemExit(f"/risk: missing text {missing}")
    print("/risk: ok")
PY

echo "== Legacy Gemini/Vue cleanup =="
if rg -n "Gemini|gemini|\\bVue\\b|from ['\\\"]vue['\\\"]|createApp\\(" \
  --glob '!node_modules/**' \
  --glob '!.next/**' \
  --glob '!backend/venv/**' \
  --glob '!docs/ndx-operations-audit.md' \
  --glob '!scripts/verify-ndx-production.sh' \
  --glob '!frontend/package-lock.json' \
  --glob '!frontend/pnpm-lock.yaml' \
  .; then
  echo "Legacy references found; inspect before deploying." >&2
  exit 1
else
  echo "No active Gemini/Vue references found."
fi

echo "== Git patch hygiene =="
git diff --check

echo "NDX production verification passed."
