#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

TARGET="all"
WITH_WORKER=false

for arg in "$@"; do
  case "$arg" in
    all|frontend|backend)
      TARGET="$arg"
      ;;
    --with-worker)
      WITH_WORKER=true
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/dev.sh [all|frontend|backend] [--with-worker]

Starts the local InvestCool development environment:
  all          Start Flask backend (:5000) + Next.js dev server (:3000) [default]
  frontend     Start Next.js dev server (:3000) only
  backend      Start Flask backend (:5000) only
  --with-worker  Also start backend/worker.py in background
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# Load root .env if present
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

PIDS=()
cleanup() {
  echo ""
  echo "[dev] Stopping local services..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

ensure_backend_venv() {
  if [[ ! -x "$VENV_DIR/bin/python" ]]; then
    local py_bin=""
    for candidate in \
      "$HOME/miniconda3/envs/py312/bin/python" \
      "/opt/homebrew/bin/python3.12" \
      "/opt/homebrew/bin/python3.11" \
      "$(command -v python3 || true)"; do
      if [[ -n "$candidate" && -x "$candidate" ]]; then
        py_bin="$candidate"
        break
      fi
    done

    if [[ -z "$py_bin" ]]; then
      echo "[dev] ERROR: No python3 found." >&2
      exit 1
    fi

    echo "[dev] Creating backend/venv using $py_bin ..."
    "$py_bin" -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --upgrade pip
    "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
  fi
}

ensure_frontend_deps() {
  if [[ ! -x "$FRONTEND_DIR/node_modules/.bin/next" ]]; then
    echo "[dev] Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm ci)
  fi
}

if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then
  ensure_backend_venv
  echo "[dev] Starting Flask backend on http://127.0.0.1:5000 ..."
  (
    cd "$BACKEND_DIR/app"
    exec "$VENV_DIR/bin/python" -c "from main import app; app.run(host='127.0.0.1', port=5000, debug=True, use_reloader=True)"
  ) &
  PIDS+=($!)

  if [[ "$WITH_WORKER" == true ]]; then
    echo "[dev] Starting background worker..."
    (
      cd "$ROOT_DIR"
      exec "$VENV_DIR/bin/python" "$BACKEND_DIR/worker.py"
    ) &
    PIDS+=($!)
  fi
fi

if [[ "$TARGET" == "all" || "$TARGET" == "frontend" ]]; then
  ensure_frontend_deps
  echo "[dev] Starting Next.js dev server on http://localhost:3000 ..."
  (
    cd "$FRONTEND_DIR"
    exec npm run dev
  ) &
  PIDS+=($!)
fi

echo "[dev] Local environment running. Press Ctrl+C to stop."
wait
