#!/usr/bin/env bash
set -euo pipefail
python -m py_compile backend/app/main.py backend/worker.py
curl --fail --max-time 15 http://127.0.0.1:5000/api/health
curl --fail --max-time 15 http://127.0.0.1:3000/ >/dev/null
