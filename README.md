# InvestCool

InvestCool 是一个面向纳斯达克 100 的市场观察与投资研究平台。当前仓库采用单一前端方案：

- Next.js 16、React 19、TypeScript、Tailwind CSS 4
- Flask、SQLAlchemy、SQLite WAL、yfinance
- 独立 Python 数据 worker
- 纳斯达克、宏观资产与 MAG7 行情，使用数据库快照在 worker 和 Web 进程间共享
- Markdown 研究、日志、教程与内容管理
- 资金规划、定投情景模拟、仓位与交易费用计算
- 市场情绪观察与多空投票

风险预测工作台及其接口、面板和定时计算已移除。

## 目录

- `backend/app/main.py`：Flask API、数据模型和行情任务
- `backend/worker.py`：独立行情刷新进程
- `frontend/src`：Next.js 页面和组件
- `frontend/content`：公开 Markdown 内容

## 本地开发

需要 Python 3.11+、Node.js 20+ 和 npm。

```bash
python -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt

cp .env.example .env
export ADMIN_TOKEN='replace-with-a-long-random-secret'

python backend/app/main.py
```

另开终端：

```bash
cd frontend
npm ci
npm run dev
```

访问 `http://localhost:3000`。Next.js 会将 `/api/*` 转发至
`http://127.0.0.1:5000`。

如需运行行情定时任务：

```bash
source backend/venv/bin/activate
python backend/worker.py
```

## 质量检查

```bash
cd frontend
npm run lint
npm run typecheck
npm run build

cd ..
python -m compileall -q backend
```

生产实例的快速健康检查：

```bash
./scripts/verify-production.sh
```

## 生产部署

先构建前端并向 PM2 进程环境提供管理令牌：

```bash
cd frontend
npm ci
npm run build
cd ..

export ADMIN_TOKEN='replace-with-a-long-random-secret'
pm2 start ecosystem.config.js
pm2 save
```

PM2 分别运行：

- `backend-real`：Gunicorn Web API
- `investcool-worker`：唯一的行情定时任务进程
- `investcool-frontend`：Next.js 生产服务

生产环境应由 Nginx 反向代理 `127.0.0.1:3000`。后端由 PM2/Gunicorn
运行在 `0.0.0.0:5000`，仅供内网和前端代理访问。

## 运行数据

以下文件仅属于本机运行状态，不进入 Git：

- `backend/app/investcool.db*`
- `backend/backend.log*`
- Python `__pycache__`
- `frontend/.next`

修改管理内容时，后端会同步生成 `frontend/content` 下的 Markdown 文件；
前台以这些文件作为公开内容源。
