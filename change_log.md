# 项目变更日志 (Change Log)

## [2026-03-03] 集成盘前危机联动监控系统

### 主要功能改动
1.  **市场监控集成**：
    *   将 `utils/stock_predict.py` 脚本逻辑深度集成到网站构建流程中。
    *   首页新增“盘前危机联动监控”仪表盘，实时展示布伦特原油 (BZ=F) 涨跌及纳指期货 (NQ=F) 贴水情况。
    *   根据风险模型自动输出对冲建议（低、中、高三种风险等级）。

2.  **前端 UI 更新**：
    *   `templates/index.html`：在首页 Hero 区域下方新增了响应式的监控卡片。
    *   `static/css/style.css`：新增了 `.market-alert` 相关样式，支持根据风险状态自动切换颜色（绿/黄/红）。

3.  **自动化部署增强**：
    *   `.github/workflows/deploy.yml`：增加了 `cron` 定时任务，在美股交易日（周一至周五）的盘前及开盘初期（13:30-21:00 UTC）每 30 分钟自动运行一次构建并更新 GitHub Pages 数据。

4.  **技术栈调整**：
    *   `requirements.txt`：新增 `yfinance` 和 `pandas` 依赖，用于获取实时金融数据。
    *   `build.py`：升级为支持动态数据注入的静态站点生成器。
    *   `app/routes.py`：同步更新 Flask 路由，确保动态运行模式下也能展示监控板块。

---

## [历史记录] 初始化静态站点构建系统

### 改动概览
1. `build.py` (新建) — 静态站点生成器，读取 `content/*.md`，通过 Jinja2 模板渲染成纯静态 HTML，输出到 `docs/` 目录。
2. `templates/` (从 `app/templates/` 复制并改写) — 将所有 `url_for()` 替换为静态路径（如 `/post/slug/`、`/about/`、`/static/css/style.css`）。
3. `static/` (从 `app/static/` 复制) — CSS 等静态资源，构建时复制到 `docs/static/`。
4. `.github/workflows/deploy.yml` — GitHub Actions 工作流，push 到分支时自动运行 `build.py` 并部署到 GitHub Pages。
5. `CNAME` — 自定义域名文件，当前设置为 `investcool.com`。
6. `requirements.txt` (更新) — 优化为仅包含构建所需的最简依赖。
7. `.gitignore` (更新) — 添加了 `docs/` 目录。

项目结构保持不变：仍然在 `content/` 目录下写 Markdown 文章，格式和之前完全一样。

────────────────────────────────────────

### 部署步骤
1. 修改 `CNAME` 文件为你的实际域名
2. 将代码合并到发布分支并 push
3. 在 GitHub 仓库 Settings -> Pages 中选择 Source 为 GitHub Actions
4. 在你的域名 DNS 提供商中添加 CNAME 记录指向 ylyeliang.github.io

本地预览：运行 `python build.py`，然后在 `docs/` 目录中用任意 HTTP 服务器查看，例如 `python -m http.server -d docs 8080`。
