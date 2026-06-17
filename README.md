# InvestCool

InvestCool 是一个面向纳斯达克 100 的金融研究与风险分析平台。当前仓库采用单一前端方案：

- Next.js 16、React 19、TypeScript、Tailwind CSS 4
- Flask、SQLAlchemy、SQLite WAL、yfinance
- 独立 Python 数据 worker
- NDX 风险引擎，基于 RSI、VIX、价格分位与利率缓冲生成定时简报
- NDX 四支柱风险诊断，覆盖趋势结构、波动压力、回撤压力和 MAG7 广度
- NDX 情景压力测试，输出基准、宏观冲击、波动冲击、广度修复和趋势破位区间

旧前端实现已移除。

## 目录

```text
backend/
  app/main.py       Flask API 与数据模型
  worker.py         行情和风险分析定时任务
  news_engine/      每日新闻报告流水线
frontend/
  src/app/          Next.js App Router
  src/components/   页面组件
  content/          Markdown 内容
ecosystem.config.js PM2 生产进程配置
```

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

如需运行行情和风险分析定时任务：

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

- `investcool-backend`：Gunicorn Web API
- `investcool-worker`：唯一的行情与风险分析定时任务进程
- `investcool-frontend`：Next.js 生产服务

生产环境应由 Nginx 反向代理 `127.0.0.1:3000`。后端只监听
`127.0.0.1:5000`。

## 运行数据

以下文件仅属于本机运行状态，不进入 Git：

- `backend/app/investcool.db*`
- `backend/backend.log*`
- Python `__pycache__`
- `frontend/.next`

修改管理内容时，后端会同步生成 `frontend/content` 下的 Markdown 文件；
前台以这些文件作为公开内容源。
