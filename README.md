# InvestCool 🚀

> **InvestCool** 是一个专注于纳斯达克 100 (NDX) 的全栈 AI 投研平台。它不仅实时追踪指数动态，更通过 Google Gemini 大模型为投资者提供每 2 小时更新的「AI 策略建议」。

---

## 🛠 技术架构 (Tech Stack)

### 🎨 Frontend (Nuxt 3 Ecosystem)
- **Nuxt 3**: 基于 Vue 3 的混合渲染框架，提供极致的 SSR 体验。
- **Nitro Server**: 智能 API 代理，解决生产环境下的跨域与路径映射问题。
- **ECharts (Lazy Loading)**: 按需加载的数据可视化库，记录市场情绪与指数走势。
- **Responsive Navigation**: 自研抽屉式移动端导航，适配全平台流畅操作。
- **Dark Mode**: 全局深色模式适配，为夜盘交易者提供护眼体验。

### ⚙️ Backend (Python Quant Stack)
- **Flask**: 轻量化后端，负责数据接口与逻辑编排。
- **yfinance + Pandas**: 核心量化模块，处理纳指 100、权重股及宏观资产数据。
- **SQLAlchemy + SQLite (WAL)**: 高并发写前日志模式，确保数据存取安全高效。
- **Caching Layer**: 基于内存的 AI 结果缓存，支持百万级并发访问。

### 🧠 AI Engine
- **Gemini Pro**: 深度集成 `gemini-cli`，自动分析 48 小时内科技巨头动态。
- **Automated Job**: 每 2 小时自动触发一次 AI 决策，并将结果推送到前端策略足迹。
- **Fallback Logic**: 完善的保底机制，AI 波动时自动回退至量化指标启发式建议。

### 🚀 DevOps
- **PM2**: 企业级进程管理，实现前端 Nitro 与后端 Gunicorn 的集群化守护。
- **Gunicorn**: 多进程 WSGI HTTP Server，保障后端服务的工业级稳定性。

---

## 🌟 核心功能
1. **AI 实时策略**: 结合大模型与实时点位的犀利投资点评。
2. **市场情绪仪表盘**: 基于 RSI、VIX 等指标综合计算的「贪婪与恐惧」指数。
3. **纳指实时追踪**: 秒级更新的纳斯达克 100 点位及权重股行情。
4. **多空阵营拔河**: 实时用户投票系统，感知散户情绪分布。
5. **深度投研报**: Markdown 驱动的专业投资分析文档系统。

---

## 📥 快速开始

### 后端启动
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/main.py
```

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 生产部署 (Recommended)
```bash
pm2 start ecosystem.config.js
```

---

## 📅 更新日志
- **v2.1**: 新增 AI 策略模块，集成 Gemini Pro 自动化分析。
- **v2.0**: 全站中文化，引入 PM2 生产环境部署方案。
- **v1.5**: 纳斯达克 100 实时跟踪器上线。

---
*Created with ❤️ by InvestCool Team. 2026*
