# InvestCool

InvestCool 是一个面向纳斯达克 100 的金融研究与风险分析平台。当前仓库采用单一前端方案：

- Next.js 16、React 19、TypeScript、Tailwind CSS 4
- Flask、SQLAlchemy、SQLite WAL、yfinance
- 独立 Python 数据 worker
- NDX 风险引擎，基于 RSI、VIX、价格分位与利率缓冲生成定时简报
- NDX 机构信号总览，将风险、宏观、因子归因、广度、主题轮动、流动性、期权、波动曲线、对冲覆盖、估值、财报催化、尾部和集中度压缩成顶部 scorecard
- NDX 投委会摘要，将宏观、内部扩散、流动性、波动定价、估值催化、集中度和预算聚合成执行清单
- NDX 四支柱风险诊断，覆盖趋势结构、波动压力、回撤压力和 MAG7 广度
- NDX 宏观因子压力监控，跟踪 VIX、10Y 利率和美元指数的相关性与敏感度
- NDX 因子归因，用 90 日 OLS 将 QQQ 近 20 日表现拆成市场 beta、半导体超额、利率、美元、VIX 和残差
- NDX 相对强弱与 Beta，跟踪相对 SPX、SOX、RUT 的超额收益、相关性和 beta
- NDX 主题轮动，用 SMH、IGV、XLC、XLY、IYW、CIBR 对比 QQQ 判断成长主题是否扩散
- NDX 市场广度与等权参与，用 QQQ 对比 QQEW/QQQE 判断上涨是否由更广泛成分股扩散
- NDX 技术位监控，输出均线结构、20/60 日通道、ATR 缓冲和交易台触发线
- NDX 回撤与尾部风险，覆盖历史 VaR、预期尾部损失、最大回撤和最差交易日
- QQQ 期权隐含定价，用最近到期期权跨式估算 NDX 代理的短期隐含波动区间
- VIX 波动率期限结构，跟踪 VIX/VIX3M/VIX6M 与 VVIX 判断曲线趋平、倒挂和保护成本变化
- NDX 对冲覆盖建议，将尾部风险、期权定价、VIX 曲线、技术支撑和风险预算压成保护比例与执行约束
- QQQ 流动性与成交确认，用成交量倍率、资金流平衡、派发天数和 OBV 方向验证 NDX 价格信号
- MAG7 权重股集中度与贡献分析，用市值权重代理解释指数驱动来源
- MAG7 估值压力，用 Forward PE、P/S、PEG、收入增速和盈利增速衡量 NDX 权重股估值溢价
- MAG7 财报催化风险，用下一次财报日期、EPS/Revenue 预期分歧和市值权重估算事件窗口暴露
- MAG7 相关性与离散度，识别权重股同步 beta 风险和个股分化
- NDX 情景压力测试，输出基准、宏观冲击、波动冲击、广度修复和趋势破位区间
- NDX 风险预算矩阵，按防守、均衡、进取三档给出暴露区间与再平衡规则

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
