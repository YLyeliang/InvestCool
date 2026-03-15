# InvestCool - 个人博客系统

InvestCool 是一个基于 **Nuxt 4** 和 **Flask** 构建的现代化个人博客系统，专注于投资分析与技术教程。

## 🚀 项目特性

- **稳定且新颖的架构**: 前端使用 Nuxt 4 (SSR 模式) 确保极致的 SEO 和性能，后端使用 Flask 提供灵活的 API 支持。
- **3 栏式仪表盘布局**:
  - **左侧**: 层级导航，方便管理投资分类与技术系列。
  - **中间**: 混合内容流，自动聚合数据库中的投资分析和本地的 Markdown 教程。
  - **右侧**: 趋势小组件与个人介绍。
- **混合内容管理**:
  - **投资分析**: 存储在 SQLite 数据库中，适合动态更新和搜索。
  - **技术教程**: 基于 `@nuxt/content` 的 Markdown 驱动，支持 Git 版本控制。

---

## 🚀 生产环境部署 (Production Deployment)

项目在服务器上通过 **PM2** 进行进程管理，以确保服务的持久稳定性。

### 1. 编译前端 (Build Frontend)
每次修改前端代码后，必须重新编译以生成最新的生产环境资源：
```bash
cd frontend
npm run build
```

### 2. 启动与管理服务 (PM2)
项目包含前端和后端两个核心服务：

- **前端服务** (`frontend-prod`): 运行在 Nuxt 4 的生产服务器上。
- **后端服务** (`backend-real`): 运行在 Flask 生产环境下。

#### 常用命令：
```bash
# 启动所有服务 (首次)
pm2 start frontend/.output/server/index.mjs --name "frontend-prod"
pm2 start backend/app/main.py --name "backend-real" --interpreter python3

# 重启服务 (代码更新后)
pm2 restart frontend-prod backend-real

# 查看服务状态
pm2 list

# 查看实时日志
pm2 logs frontend-prod
pm2 logs backend-real
```

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **Framework**: Nuxt 4 (Vue 3)
- **Styling**: Vanilla CSS (CSS Grid & Variables)
- **Content**: @nuxt/content (Markdown parsing)
- **Icons**: @nuxt/icon (Lucide icons)

### 后端 (Backend)
- **Framework**: Flask
- **Database**: SQLite
- **ORM**: SQLAlchemy
- **Communication**: REST API (JSON)

---

## 📦 安装与环境配置

### 1. 环境准备
- Python 3.8+
- Node.js 18.x+
- npm 或 pnpm

### 2. 后端配置 (Flask)
```bash
cd backend
# 创建虚拟环境
python3 -m venv venv
# 激活虚拟环境 (Linux/macOS)
source venv/bin/activate
# 安装依赖
pip install -r requirements.txt
# 启动后端 (默认端口 5000)
python app/main.py
```

### 3. 前端配置 (Nuxt)
```bash
cd frontend
# 安装依赖
npm install
# 启动开发服务器 (默认端口 3000)
npm run dev
```

---

## 📝 使用方式

### 如何添加技术教程 (Tutorials)
1. 进入 `frontend/content/tutorials/` 目录。
2. 创建一个新的 `.md` 文件（例如 `my-new-tutorial.md`）。
3. 使用 Frontmatter 定义元数据：
   ```markdown
   ---
   title: '我的教程标题'
   description: '这是一个简短的摘要。'
   category: 'Python'
   ---
   # 教程正文
   这里是你的技术分享内容...
   ```
4. 前端会自动检测并更新到 Feed 流中。

### 如何添加投资分析 (Investment Analysis)
目前支持通过 Flask 自动初始化种子数据。若需手动添加，可以通过以下方式：
- 直接操作 `backend/app/investcool.db` 数据库。
- (计划中) 使用管理后台界面进行发布。

---

## 📁 项目结构

```text
InvestCool/
├── backend/
│   ├── app/
│   │   ├── main.py          # Flask 入口与模型定义
│   │   └── investcool.db    # SQLite 数据库
│   └── requirements.txt     # Python 依赖
├── frontend/
│   ├── app/                 # Nuxt 4 源码目录
│   │   ├── assets/css/      # 全局样式
│   │   ├── layouts/         # 3 栏式布局
│   │   └── pages/           # 页面路由 (首页、详情页)
│   ├── content/             # Markdown 教程存放处
│   └── nuxt.config.ts       # Nuxt 配置文件
└── README.md                # 项目说明
```

## 🌐 访问地址
- **首页 (Frontend)**: `http://localhost:3000`
- **API 健康检查**: `http://localhost:5000/api/health`
