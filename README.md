# InvestCool

InvestCool 是一个面向纳斯达克 100 的金融研究与风险分析平台。当前仓库采用单一前端方案：

- Next.js 16、React 19、TypeScript、Tailwind CSS 4
- Flask、SQLAlchemy、SQLite WAL、yfinance
- 独立 Python 数据 worker
- NDX 风险引擎，基于 RSI、VIX、价格分位与利率缓冲生成定时简报
- NDX 机构信号总览，将风险、市场状态、风险预警、风险贡献、承受力闸门、执行 Playbook、历史类比、Desk Brief、宏观、估值利率敏感度、条件矩阵、融资条件、跨资产确认、因子归因、因子冲击、广度、主题轮动、相关性压力、流动性、期权、期权偏斜、Gamma 定位、波动溢价、波动锥、盘中脉冲、成交分布、波动曲线、对冲覆盖、修复路径、估值、盈利质量、财报催化、尾部和集中度压缩成顶部 scorecard
- NDX 顶部总览聚合 API，用 `/api/risk/dashboard` 一次返回 scorecard 所需的缓存快照，降低首屏并发请求和 PM2 后端压力
- NDX 风险工作台导航，把风险页 40+ 个模块按结论、交易风控、宏观因子、市场结构、衍生品、基本面、情景分组，帮助读者快速定位分析入口，并通过 URL hash 分享单个模块
- NDX 风险页深层模块延迟挂载，保留首屏结论即时加载，其余重分析面板进入阅读区域前再发起请求，减少首次打开时的 API 并发压力
- NDX 风险模块快照表，将 worker 计算出的模块结果持久化到 SQLite，Gunicorn Web 进程冷启动后也能直接恢复 dashboard 和单模块 API 数据
- NDX 风险模块历史表，将变化后的模块快照追加保存 14 天；`/api/risk/module-trends` 首次读取会建立当前基线，之后对比上一条不同快照，识别哪些模块风险升温、缓和或稳定
- NDX 关键看点面板，通过 `/api/risk/key-takeaways` 把风险预警、支撑项、衍生品压力、财报窗口和触发线压成晨会式阅读优先级
- NDX 变化归因面板，通过 `/api/risk/change-attribution` 对比最近两条风险简报的状态、点位和风险温度，并结合当前预警、贡献拆解、罗盘和 Playbook 解释判断为何变化
- NDX 风险温度轨迹，通过 `/api/risk/score-history` 把最近多条风险简报解析成温度时间序列、状态分布和重复样本比例，帮助读者判断风险判断是否真正连续变化
- NDX 触发线监控，通过 `/api/risk/trigger-monitor` 把 Playbook 与修复路径中的压力下沿、失效线、修复线、确认线转成上下触发距离和触发后动作
- NDX 风险回报框架，通过 `/api/risk/risk-reward` 把情景概率、概率加权路径、波动锥、修复线和风险预算压成 Bull/Base/Bear 风险回报分析
- NDX 投前检查清单，通过 `/api/risk/pre-trade-checklist` 把数据质量、预警、情景回报、触发线、广度流动性、保护覆盖和财报窗口转成 Pass/Watch/Fail 执行门槛
- NDX 仓位 Sizing，通过 `/api/risk/position-sizing` 用最大损失预算、失效线距离、压力回撤、波动区间和现金缓冲倒推出总暴露硬上限与单笔 tranche
- NDX 组合动作矩阵，通过 `/api/risk/portfolio-actions` 把 Playbook、预警、罗盘、尾部风险、对冲覆盖、估值质量和数据质量压成战术交易、核心配置、保护型组合、新增资金四类动作框架
- NDX 数据质量与覆盖面板，通过 `/api/risk/data-quality` 展示风险模块覆盖率、刷新年龄、陈旧模块和缺失模块，帮助读者判断当前分析可信度
- NDX 仓位动作摘要，通过 `/api/risk/positioning-summary` 把 Playbook、承受力闸门、预警、修复路径和对冲覆盖压成短线、核心仓位、防守预算三档执行框架
- NDX 市场状态罗盘，将趋势结构、宏观流动性、内部结构和基本面支撑聚合成投委会式市场状态与执行动作
- NDX 风险预警，将技术位、尾部风险、融资条件、广度、流动性、期权、波动曲线和基本面信号转成按优先级排序的执行清单
- NDX 风险贡献拆解，把宏观、融资、技术、尾部、预警、估值、事件、集中度与广度、流动性、质量、状态、修复路径拆成压力贡献和缓冲贡献
- NDX 风险承受力闸门，把预算矩阵、贡献拆解、预警、修复路径和对冲覆盖压成目标暴露、现金缓冲、保护覆盖与上调/降档触发
- NDX 执行 Playbook，把承受力、罗盘、贡献、预警、修复线、对冲覆盖和盘中 tape 转成账户分层暴露、现金、保护和执行票据
- NDX 历史相似情景，用 QQQ、SPY、SMH、VIX、10Y 和美元近 5 年日线匹配当前趋势/波动/宏观特征，并统计相似窗口 5/10/20 日后续收益分布
- NDX 机构 Desk Brief，把 Playbook、罗盘、预警、贡献、历史类比、盘中 tape、估值利率、广度/流动性、质量/财报、波动和对冲压缩成晨会结论、优先级、正反情景和改变判断的条件
- NDX 投委会摘要，将宏观、内部扩散、流动性、波动定价、估值催化、集中度和预算聚合成执行清单
- NDX 四支柱风险诊断，覆盖趋势结构、波动压力、回撤压力和 MAG7 广度
- NDX 宏观因子压力监控，跟踪 VIX、10Y 利率和美元指数的相关性与敏感度
- NDX 估值-利率敏感度，把 MAG7 加权估值、成长增速、盈利质量、10Y 利率、美元压力和久期融资条件合成为折现率冲击承受力
- NDX 条件风险矩阵，组合利率、美元、VIX、半导体、等权广度和价格趋势，展示当前条件与历史组合偏斜
- NDX 信用与融资条件，用 HYG/LQD、TLT/SHY、美元和 VIX 代理信用风险偏好、久期融资环境和流动性压力
- NDX 跨资产确认，用 QQQ/SPY/IWM/SMH、信用、久期、美元、VIX 和 10Y 判断 NDX 上涨质量是否得到外部资产共同确认
- NDX 因子归因，用 90 日 OLS 将 QQQ 近 20 日表现拆成市场 beta、半导体超额、利率、美元、VIX 和残差
- NDX 因子冲击实验室，用 252 日 OLS 估算 QQQ 对 SPY、半导体主动收益、10Y、美元和 VIX 的情景敏感度
- NDX 相对强弱与 Beta，跟踪相对 SPX、SOX、RUT 的超额收益、相关性和 beta
- NDX 主题轮动，用 SMH、IGV、XLC、XLY、IYW、CIBR 对比 QQQ 判断成长主题是否扩散
- NDX 市场广度与等权参与，用 QQQ 对比 QQEW/QQQE 判断上涨是否由更广泛成分股扩散
- NDX 技术位监控，输出均线结构、20/60 日通道、ATR 缓冲和交易台触发线
- NDX 回撤与尾部风险，覆盖历史 VaR、预期尾部损失、最大回撤和最差交易日
- QQQ 期权隐含定价，用最近到期期权跨式估算 NDX 代理的短期隐含波动区间
- QQQ 期权偏斜与尾部保护，用 7-45 天 QQQ 期权链比较 ATM、5%/10% OTM put/call IV、风险逆转和 OTM put/call OI，判断下行保护需求是否升温
- QQQ Gamma 定位图，用最近到期期权未平仓量、IV 和 Black-Scholes gamma 估算主要 gamma wall、put wall、净 gamma 与波动放大/钉住风险
- NDX 波动风险溢价，用 QQQ 最近到期期权隐含波动对比 10/20/60 日实现波动，并结合尾部风险和 VIX 曲线判断保护成本
- NDX 波动锥与风险区间，用 QQQ 近 2 年 10/20/60/120 日实现波动分位和期权隐含波动生成 1/5/10/20 日前瞻价格带
- NDX 盘中交易台脉冲，用 QQQ 5 分钟线跟踪开盘缺口、VWAP 偏离、首小时区间、成交节奏和日内波动扩张
- QQQ 成交量价格分布，用最近 5 个交易日 5 分钟成交量分箱计算 POC、70% 价值区、成交密集节点和低量区
- VIX 波动率期限结构，跟踪 VIX/VIX3M/VIX6M 与 VVIX 判断曲线趋平、倒挂和保护成本变化
- NDX 对冲覆盖建议，将尾部风险、期权定价、VIX 曲线、技术支撑和风险预算压成保护比例与执行约束
- QQQ 流动性与成交确认，用成交量倍率、资金流平衡、派发天数和 OBV 方向验证 NDX 价格信号
- MAG7 权重股集中度与贡献分析，用市值权重代理解释指数驱动来源
- MAG7 估值压力，用 Forward PE、P/S、PEG、收入增速和盈利增速衡量 NDX 权重股估值溢价
- MAG7 盈利质量，用利润率、自由现金流率、现金流转换、净现金率、ROE/ROA 和增长质量判断估值支撑
- MAG7 财报催化风险，用下一次财报日期、EPS/Revenue 预期分歧和市值权重估算事件窗口暴露
- MAG7 相关性与离散度，识别权重股同步 beta 风险和个股分化
- NDX 相关性压力与分散化，用 QQQ、SPY、SMH、IWM 和 MAG7 日收益衡量同涨同跌、配对高相关和单股分散化失效风险
- NDX 情景概率图，结合罗盘、预警和预算给 5 个压力情景重新分配概率权重并计算概率加权路径
- NDX 回撤修复路径，把技术位、情景概率、尾部风险、风险预算和对冲覆盖合成为压力下沿、失效线、修复线、确认线与再入场阶梯
- NDX 情景压力测试，输出基准、宏观冲击、波动冲击、广度修复和趋势破位区间
- NDX 风险预算矩阵，按防守、均衡、进取三档给出暴露区间与再平衡规则

旧前端实现已移除。

默认页面主题已调整为更适合长文和风险面板阅读的研究报告风格：浅底高对比、灰蓝边界、低饱和强调色和更清晰的标题层级，暗色主题保留为低噪阅读模式。

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

- `backend-real`：Gunicorn Web API
- `investcool-worker`：唯一的行情与风险分析定时任务进程
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
