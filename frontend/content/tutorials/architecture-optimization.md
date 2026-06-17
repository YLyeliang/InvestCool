---
title: 'InvestCool：从单机博客到可维护投资系统'
description: '复盘 InvestCool 当前的进程隔离、内容安全和质量门禁。'
category: '技术教程'
cover: 'https://images.unsplash.com/photo-1551288049-bbda38a5f452?q=80&w=1000'
date: '2026-06-07'
---

# InvestCool 架构优化复盘

InvestCool 已从混合框架实验项目收敛为单一的 Next.js + Flask 架构。

## 1. Web 与后台任务隔离

Gunicorn 只处理 HTTP 请求。行情抓取、指标计算、数据清理和 NDX 风险简报
由独立 Python worker 执行。这样可以避免多 Gunicorn worker 重复抓取、
重复计算或并发写入 SQLite。

## 2. 内容发布安全

- 后台管理令牌必须由环境变量提供，不再使用源码默认密钥。
- Markdown frontmatter 使用结构化解析器读取。
- Markdown 生成的 HTML 会经过白名单清洗，阻断脚本和危险协议。
- 内容文件按数据库记录 ID 同步，改名、换分类和删除时会清理旧文件。
- 上传接口会验证文件确实是可解析的图片。

## 3. 数据可靠性

- SQLite 使用 WAL 模式。
- 投票接口执行类型校验、24 小时 IP 哈希去重并真实写库。
- 日志采用轮转策略，避免单个日志文件无限增长。
- 数据库、WAL、日志和 Python 字节码均作为运行状态排除在 Git 之外。

## 4. 前端质量门禁

生产构建不再跳过 TypeScript 错误。提交前统一执行：

```bash
npm run lint
npm run typecheck
npm run build
```

依赖通过 `npm audit` 检查，并使用 `package-lock.json` 保证可复现安装。
