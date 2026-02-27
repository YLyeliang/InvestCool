# InvestCool

基于 AI 的纳斯达克投资内容发布平台。

## 项目简介

InvestCool 是一个专注于 AI 投资领域的内容网站，采用博客形式，为投资者提供智能化的纳斯达克市场分析与投资洞察。使用 Markdown 编写文章，Flask 渲染页面，适合部署到 VPS 并绑定域名。

## 主要功能

- **Markdown 内容发布** — 在 `content/` 目录下用 Markdown 编写文章，支持 front matter 元数据（标题、日期、标签、摘要）
- **文章列表与分页** — 首页按日期倒序展示文章，支持分页浏览
- **文章详情页** — 完整渲染 Markdown 内容，支持代码高亮、表格、目录等
- **响应式设计** — 移动端与桌面端自适应布局

## 技术栈

- **后端**: Python / Flask
- **模板**: Jinja2
- **内容格式**: Markdown + YAML Front Matter
- **部署**: Gunicorn + Nginx + systemd

## 项目结构

```
InvestCool/
├── app/
│   ├── __init__.py          # Flask 应用工厂
│   ├── routes.py            # 路由定义
│   ├── posts.py             # Markdown 文章解析
│   ├── static/css/          # 样式文件
│   └── templates/           # Jinja2 模板
├── content/                 # Markdown 文章目录
├── deploy/                  # 部署配置
│   ├── gunicorn.conf.py
│   ├── nginx.conf
│   └── investcool.service
├── config.py                # 应用配置
├── run.py                   # 启动入口
└── requirements.txt         # Python 依赖
```

## 本地开发

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
python run.py
```

访问 http://localhost:5000 查看效果。

## 发布文章

在 `content/` 目录下创建 `.md` 文件，文件头使用 YAML Front Matter：

```markdown
---
title: "文章标题"
date: 2026-02-26
summary: "文章摘要"
tags: ["标签1", "标签2"]
---

正文内容...
```

## 部署到 VPS

```bash
# 1. 上传代码到服务器
scp -r . user@your-server:/opt/investcool

# 2. 在服务器上安装依赖
cd /opt/investcool
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. 创建日志目录
sudo mkdir -p /var/log/investcool
sudo chown www-data:www-data /var/log/investcool

# 4. 配置 systemd 服务
sudo cp deploy/investcool.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable investcool
sudo systemctl start investcool

# 5. 配置 Nginx（修改 deploy/nginx.conf 中的域名后）
sudo cp deploy/nginx.conf /etc/nginx/sites-available/investcool
sudo ln -s /etc/nginx/sites-available/investcool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. 配置 HTTPS（可选，推荐）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源协议。
