改动概览
  1. `build.py` (新建) — 静态站点生成器，读取 content/*.md，通过 Jinja2 模板渲染成纯静态 HTML，输出到 docs/ 目录。
  2. `templates/` (新建，从 app/templates/ 复制并改写) — 将所有 url_for() 替换为静态路径（如 /post/slug/、/about/、/static/css/style.css）。
  3. `static/` (新建，从 app/static/ 复制) — CSS 等静态资源，构建时复制到 docs/static/。
  4. `.github/workflows/deploy.yml` (新建) — GitHub Actions 工作流，push 到 main 分支时自动运行 build.py 并部署到 GitHub Pages。
  5. `CNAME` (新建) — 自定义域名文件，当前设置为 investcool.com，请改为你实际的域名。
  6. `requirements.txt` (更新) — 移除了 Flask/gunicorn，改为只依赖 Jinja2、Markdown、Pygments、python-frontmatter。
  7. `.gitignore` (更新) — 添加了 docs/ 目录。

  项目结构保持不变：你仍然在 content/ 目录下写 Markdown 文章，格式和之前完全一样。

  ────────────────────────────────────────

  部署步骤
  1. 修改 CNAME 文件为你的实际域名
  2. 将代码合并到 main 分支并 push
  3. 在 GitHub 仓库 Settings -> Pages 中选择 Source 为 GitHub Actions
  4. 在你的域名 DNS 提供商中添加 CNAME 记录指向 ylyeliang.github.io

  本地预览：运行 python build.py，然后在 docs/ 目录中用任意 HTTP 服务器查看，例如 python -m http.server -d docs 8080。
