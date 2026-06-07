---
title: 'InvestCool 架构图解与更新日志'
description: 'InvestCool 当前系统架构、数据流和部署方式。'
category: '技术教程'
cover: '/nasdaq_war_impact.png'
---

# InvestCool 系统架构

InvestCool 采用前后端分离架构，并已统一为 Next.js 与 Flask 技术栈。

## 前端

- **Next.js 16 / React 19**：使用 App Router 提供服务端渲染和动态路由。
- **TypeScript**：生产构建执行完整类型检查。
- **Tailwind CSS 4**：负责响应式布局和主题样式。
- **ECharts**：展示市场情绪、行情和策略模拟结果。
- **Markdown CMS**：通过 `gray-matter` 解析 frontmatter，使用 `marked`
  渲染正文，并对白名单 HTML 进行清洗。

## 后端

- **Flask / Gunicorn**：提供行情、投票、内容管理和统计 API。
- **SQLAlchemy / SQLite WAL**：持久化市场指标、策略、投票和访问数据。
- **yfinance**：抓取纳斯达克 100、MAG7 和宏观资产行情。
- **独立 worker**：行情采集和 Gemini 策略生成不在 Web worker 中运行，
  避免 Gunicorn 多进程重复执行任务。

## 内容流

管理后台将内容写入数据库，并同步生成 `frontend/content` 下的 Markdown
文件。公开页面只读取 Markdown 内容，因此发布结果可审计、可版本化。

## 部署

PM2 管理三个独立进程：

1. Next.js 前端服务。
2. Gunicorn API 服务。
3. Python 数据与 AI worker。

Nginx 仅需代理 Next.js 的 `3000` 端口；Next.js 将 `/api/*` 请求转发到
本机 Flask `5000` 端口。
