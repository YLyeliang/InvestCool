#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

REMOTE_HOST="${INVESTCOOL_REMOTE_HOST:-investcool}"
REMOTE_DIR="${INVESTCOOL_REMOTE_DIR:-/root/projects/InvestCool}"
SITE_URL="${INVESTCOOL_SITE_URL:-https://invest-cool.top}"

TARGET="all"
DO_INSTALL=false
SKIP_BUILD=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    all|frontend|backend)
      TARGET="$arg"
      ;;
    --install)
      DO_INSTALL=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/deploy.sh [all|frontend|backend] [options]

Builds locally and deploys production artifacts to the remote server without
running heavy compilation on the 2-core server.

Targets:
  all          Deploy both frontend and backend [default]
  frontend     Build Next.js locally and sync .next/ + static assets to remote
  backend      Sync Python backend + worker code to remote (preserves DB & logs)

Options:
  --install    Also install/update dependencies on remote (npm / pip)
  --skip-build Skip local `npm run build` and reuse existing frontend/.next
  --dry-run    Preview rsync file changes without modifying remote or restarting PM2

Environment overrides:
  INVESTCOOL_REMOTE_HOST  SSH host/alias (default: investcool)
  INVESTCOOL_REMOTE_DIR   Remote project path (default: /root/projects/InvestCool)
  INVESTCOOL_SITE_URL     Public site URL for health check (default: https://invest-cool.top)
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

RSYNC_COMMON=(-rlptz --no-owner --no-group --stats)
if [[ "$DRY_RUN" == true ]]; then
  RSYNC_COMMON+=(--dry-run --itemize-changes)
  echo "[deploy] DRY RUN mode enabled (no remote changes or restarts will occur)"
fi

REMOTE_PATH_INIT='NVM_BIN=$(ls -d /root/.nvm/versions/node/*/bin 2>/dev/null | tail -n 1 || true); export PATH="${NVM_BIN}:/root/miniconda3/bin:/usr/local/bin:$PATH"'

run_remote() {
  ssh -o BatchMode=yes "$REMOTE_HOST" "$REMOTE_PATH_INIT; cd '$REMOTE_DIR' && $*"
}

echo "[deploy] Checking SSH connection to $REMOTE_HOST ..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=8 "$REMOTE_HOST" "true"; then
  echo "[deploy] ERROR: Cannot connect to $REMOTE_HOST via SSH key." >&2
  exit 1
fi

deploy_frontend() {
  echo ""
  echo "=== [1/2] Frontend: local build + remote sync ==="
  if [[ "$SKIP_BUILD" == false ]]; then
    if [[ ! -x "$FRONTEND_DIR/node_modules/.bin/next" ]]; then
      echo "[deploy] Local frontend/node_modules missing or incomplete, running npm ci..."
      (cd "$FRONTEND_DIR" && npm ci)
    fi
    echo "[deploy] Running local Next.js production build..."
    (cd "$FRONTEND_DIR" && npm run build)
  else
    echo "[deploy] Skipping local build (--skip-build)"
  fi

  if [[ ! -f "$FRONTEND_DIR/.next/BUILD_ID" ]]; then
    echo "[deploy] ERROR: $FRONTEND_DIR/.next/BUILD_ID not found. Run without --skip-build." >&2
    exit 1
  fi

  echo "[deploy] Syncing frontend/.next/ (excluding build cache)..."
  rsync "${RSYNC_COMMON[@]}" --delete \
    --exclude='cache/' \
    "$FRONTEND_DIR/.next/" \
    "$REMOTE_HOST:$REMOTE_DIR/frontend/.next/"

  echo "[deploy] Syncing frontend/public/ (preserving remote uploads/)..."
  rsync "${RSYNC_COMMON[@]}" \
    --exclude='uploads/' \
    "$FRONTEND_DIR/public/" \
    "$REMOTE_HOST:$REMOTE_DIR/frontend/public/"

  echo "[deploy] Syncing frontend/content/ (non-destructive, preserving remote CMS posts)..."
  rsync "${RSYNC_COMMON[@]}" \
    "$FRONTEND_DIR/content/" \
    "$REMOTE_HOST:$REMOTE_DIR/frontend/content/"

  echo "[deploy] Syncing frontend config & manifests..."
  rsync "${RSYNC_COMMON[@]}" \
    "$FRONTEND_DIR/package.json" \
    "$FRONTEND_DIR/package-lock.json" \
    "$FRONTEND_DIR/next.config.ts" \
    "$FRONTEND_DIR/postcss.config.mjs" \
    "$REMOTE_HOST:$REMOTE_DIR/frontend/"

  if [[ "$DRY_RUN" == true ]]; then
    echo "[deploy] (dry-run) Would restart PM2 app: investcool-frontend"
    return
  fi

  if [[ "$DO_INSTALL" == true ]]; then
    echo "[deploy] Installing frontend production dependencies on remote..."
    run_remote "cd frontend && npm ci --omit=dev"
  fi

  echo "[deploy] Patching build metadata paths for remote directory..."
  run_remote "python3 -c '
from pathlib import Path
old, new = \"$FRONTEND_DIR\", \"$REMOTE_DIR/frontend\"
for name in (\"frontend/.next/required-server-files.json\", \"frontend/.next/required-server-files.js\"):
    p = Path(name)
    if p.exists():
        p.write_text(p.read_text().replace(old, new))
'"

  echo "[deploy] Restarting investcool-frontend..."
  run_remote "pm2 restart investcool-frontend"
}

deploy_backend() {
  echo ""
  echo "=== [2/2] Backend: sync code (preserving DB, venv, logs) ==="
  if command -v python3 >/dev/null 2>&1; then
    echo "[deploy] Running local Python syntax check..."
    python3 -m py_compile "$BACKEND_DIR/app/main.py" "$BACKEND_DIR/worker.py"
  fi

  echo "[deploy] Syncing backend/app/ ..."
  rsync "${RSYNC_COMMON[@]}" --delete \
    --exclude='investcool.db' \
    --exclude='investcool.db-shm' \
    --exclude='investcool.db-wal' \
    --exclude='gunicorn.ctl' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    "$BACKEND_DIR/app/" \
    "$REMOTE_HOST:$REMOTE_DIR/backend/app/"

  echo "[deploy] Syncing backend/news_engine/ ..."
  rsync "${RSYNC_COMMON[@]}" --delete \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    "$BACKEND_DIR/news_engine/" \
    "$REMOTE_HOST:$REMOTE_DIR/backend/news_engine/"

  echo "[deploy] Syncing worker, requirements, ecosystem config..."
  rsync "${RSYNC_COMMON[@]}" \
    "$BACKEND_DIR/worker.py" \
    "$BACKEND_DIR/requirements.txt" \
    "$REMOTE_HOST:$REMOTE_DIR/backend/"

  rsync "${RSYNC_COMMON[@]}" \
    "$ROOT_DIR/ecosystem.config.js" \
    "$REMOTE_HOST:$REMOTE_DIR/"

  if [[ -f "$ROOT_DIR/scripts/verify-production.sh" ]]; then
    rsync "${RSYNC_COMMON[@]}" \
      "$ROOT_DIR/scripts/verify-production.sh" \
      "$REMOTE_HOST:$REMOTE_DIR/scripts/"
  fi

  if [[ -f "$ROOT_DIR/scripts/daily-nasdaq-brief.sh" ]]; then
    rsync "${RSYNC_COMMON[@]}" \
      "$ROOT_DIR/scripts/daily-nasdaq-brief.sh" \
      "$REMOTE_HOST:$REMOTE_DIR/scripts/"
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "[deploy] (dry-run) Would restart PM2 apps: backend-real, investcool-worker"
    return
  fi

  if [[ "$DO_INSTALL" == true ]]; then
    echo "[deploy] Installing backend Python dependencies on remote..."
    run_remote "/root/miniconda3/bin/pip install -r backend/requirements.txt && ./backend/venv/bin/pip install -r backend/requirements.txt"
  fi

  echo "[deploy] Restarting backend-real and investcool-worker..."
  run_remote "pm2 restart backend-real investcool-worker"
}

if [[ "$TARGET" == "all" || "$TARGET" == "frontend" ]]; then
  deploy_frontend
fi

if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then
  deploy_backend
fi

if [[ "$DRY_RUN" == false ]]; then
  echo ""
  echo "=== Post-deploy verification ==="
  sleep 2
  run_remote "pm2 status"
  run_remote "curl -fsS --max-time 15 http://127.0.0.1:5000/api/health && echo ''"
  run_remote "curl -fsS --max-time 15 http://127.0.0.1:3000/ >/dev/null && echo 'Frontend localhost:3000 OK'"
  if curl -fsS --max-time 15 "$SITE_URL" >/dev/null 2>&1; then
    echo "[deploy] Public site OK: $SITE_URL"
  else
    echo "[deploy] WARNING: Public check to $SITE_URL failed (local server checks above passed)."
  fi
fi

echo ""
echo "[deploy] Done!"
