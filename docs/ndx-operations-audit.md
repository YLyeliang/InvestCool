# NDX Operations Audit

Last verified: 2026-06-19

This project is now operated as a Next.js + Flask NDX research and risk workbench. The old frontend path is not part of the production surface; production is managed by PM2.

## Runtime Ownership

- Frontend: `frontend/`, Next.js 16, React 19, TypeScript, Tailwind CSS 4.
- Backend API: `backend/app/main.py`, Flask + Gunicorn on `0.0.0.0:5000`.
- Risk worker: `backend/worker.py`, the single scheduled market/risk data process.
- Production process manager: `ecosystem.config.js`.
- Public entrypoint: Next.js on `127.0.0.1:3000`, expected to sit behind Nginx.

PM2 apps:

- `backend-real`: Gunicorn Web API.
- `investcool-frontend`: Next.js production server.
- `investcool-worker`: market data and risk analysis worker.

## NDX Workbench Surface

The risk page is centered on `/risk` and grouped by `NDXRiskSectionNavigator`.

Top decision layer:

- `/api/risk/dashboard`: compressed scorecard for the first screen.
- `/api/risk/key-takeaways`: morning-meeting priorities.
- `/api/risk/thesis-monitor`: Bull/Base/Bear thesis tracking.
- `/api/risk/catalyst-calendar`: dated and conditional catalyst queue.
- `/api/risk/change-attribution`: why the latest risk view changed.
- `/api/risk/trigger-monitor`: upside/downside levels and actions.
- `/api/risk/risk-reward`: scenario probabilities and weighted path.
- `/api/risk/pre-trade-checklist`: Pass/Watch/Fail execution gates.
- `/api/risk/position-sizing`: exposure and tranche limits.
- `/api/risk/execution-ticket`: desk-ready execution steps.
- `/api/risk/risk-register`: probability, impact, mitigation, owner, status.
- `/api/risk/portfolio-actions`: action matrix by account/profile.

Risk and research modules:

- Market state: regime compass, risk contribution, capacity gate, diagnostics, module trends.
- Macro/factors: rates, funding, cross-asset, factor pressure, factor attribution, factor shock, condition matrix.
- Market structure: intraday tape, volume profile, relative strength, theme rotation, breadth, technical levels.
- Derivatives: tail risk, options pricing, option skew, gamma map, volatility premium, volatility cone, volatility term.
- Hedge and execution: hedge overlay and hedge book.
- Fundamentals: liquidity, MAG7 concentration, valuation pressure, quality, earnings catalyst, dispersion, correlation stress.
- Scenarios: scenario map, recovery path, scenario stress, risk budget.

## Production Verification

Use these checks after risk-page or API changes:

```bash
python -m py_compile backend/app/main.py backend/worker.py

cd frontend
npm run lint
npm run typecheck
npm run build
cd ..

git diff --check
pm2 reload backend-real
pm2 reload investcool-frontend
pm2 status
```

Endpoint smoke checks:

```bash
python - <<'PY'
import json
import urllib.request

checks = [
    "dashboard",
    "key-takeaways",
    "thesis-monitor",
    "catalyst-calendar",
    "risk-register",
    "hedge-book",
]

for name in checks:
    with urllib.request.urlopen(f"http://127.0.0.1:5000/api/risk/{name}", timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(name, resp.status, data.get("headline") or data.get("summary") or "ok")

with urllib.request.urlopen("http://127.0.0.1:3000/risk", timeout=20) as resp:
    body = resp.read().decode("utf-8", "ignore")
    print("/risk", resp.status, "This page couldn't load" in body)
PY
```

Browser check for client-rendered panels:

```bash
cd frontend
npx playwright screenshot \
  --full-page \
  --viewport-size=1440,1500 \
  --wait-for-selector='text=NDX 风险研究' \
  --timeout=60000 \
  http://127.0.0.1:3000/risk \
  /tmp/investcool-risk.png
```

Legacy cleanup check:

```bash
rg -n "Gemini|gemini|Vue|vue" \
  --glob '!node_modules/**' \
  --glob '!.next/**' \
  --glob '!backend/venv/**' \
  --glob '!docs/ndx-operations-audit.md' \
  --glob '!frontend/package-lock.json' \
  --glob '!frontend/pnpm-lock.yaml' \
  .
```

When matching lower-case `vue`, inspect results carefully because ordinary English or CSS text can create false positives. A clean audit should show no active Gemini integration or Vue application files.

## Git Push

The normal GitHub SSH port can hang in this environment. Push `blog_dev` through SSH over 443:

```bash
git push ssh://git@ssh.github.com:443/YLyeliang/InvestCool.git blog_dev:blog_dev
GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new' \
  git ls-remote ssh://git@ssh.github.com:443/YLyeliang/InvestCool.git refs/heads/blog_dev
```

## Maintenance Rules

- Keep the risk page usable first; add modules only when they turn existing data into clearer decisions.
- Prefer aggregation endpoints over duplicating calculations inside the frontend.
- Preserve PM2 deployment behavior; do not introduce a second production frontend stack.
- Keep deep, expensive panels behind `NDXLazyRiskPanel`.
- Run the production build and PM2 smoke checks before pushing.
- Do not restore Gemini-managed or Vue-based flows.
