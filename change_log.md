# 项目变更日志 (Change Log)

## [2026-03-03] 集成盘前危机联动监控系统

### 主要功能改动
1.  **市场监控集成**：
    *   将 `utils/stock_predict.py` 脚本逻辑深度集成到网站构建流程中。
    *   新增“盘前危机联动监控”仪表盘，实时展示布伦特原油 (BZ=F) 涨跌及纳指期货 (NQ=F) 贴水情况。
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
1.  **静态站点生成**：
    *   `build.py` — 静态站点生成器，读取 `content/*.md`，通过 Jinja2 模板渲染。
    *   `templates/` — 将所有 `url_for()` 替换为静态路径。
    *   `static/` — 静态资源构建时自动复制到 `docs/static/`。
2.  **GitHub Pages 部署**：
    *   `.github/workflows/deploy.yml` — push 时自动构建并部署。
    *   `CNAME` — 域名配置文件。
3.  **依赖优化**：
    *   `requirements.txt` — 优化为仅包含构建所需的最简依赖。
