# InvestCool 调试与部署复盘日志 (2026-03-12)

## 问题现象描述
1. **修改不生效**: 尽管修改了源代码，但前端页面依然显示旧版英文内容。
2. **502 Bad Gateway**: 重启服务后，通过域名访问返回 502 错误。
3. **API 数据缺失**: 纳斯达克指数最初为模拟数据，接入真实 API 后出现 503 或连接拒绝。

## 根因分析
### 1. 进程与端口冲突 (Port & Process Conflicts)
*   **现象**: 系统中存在多个旧的 Node 和 Python 进程占用 3000 和 5000 端口。
*   **原因**: PM2 进程管理器在后台自动重启了名为 `invest-frontend` 的旧版服务，导致新启动的服务无法绑定端口。

### 2. 环境代理干扰 (Proxy Interference)
*   **现象**: 在终端使用 `curl` 访问 `localhost` 报错 503。
*   **原因**: 环境变量 `http_proxy` 指向了外部代理（127.0.0.1:20172），导致本地回环请求被错误转发。

### 3. 构建产物不完整 (Build Artifacts Issues)
*   **现象**: 构建后的 `.output` 目录缺失关键入口文件。
*   **原因**: 服务器内存受限（可用仅约 570MB），导致复杂的 Nuxt 4 构建过程被系统 OOM Killer 杀掉或中断。

### 4. 框架版本不兼容 (Nuxt 4 / Content v3 API)
*   **现象**: 页面运行时报错 `queryContent is not defined`。
*   **原因**: 升级到 Nuxt 4 后，`@nuxt/content` 的 API 从 `queryContent` 变更为 `queryCollection`。

## 解决方案
### 1. 彻底清理环境
使用 `fuser -k` 强制杀死占用端口的所有进程，并执行 `pm2 delete all` 清除陈旧的进程管理任务。

### 2. 绕过代理验证
在执行本地验证命令（如 `curl`）时，强制添加 `NO_PROXY=localhost,127.0.0.1`，确保请求直达本地服务。

### 3. 代码级修复
将 `index.vue` 和 `tutorials/index.vue` 中的数据获取逻辑更新为 Nuxt 4 兼容的 `queryCollection('tutorials').all()`。

### 4. 生产级部署 (PM2)
*   执行完整的 `npm run build` 生成 `.output` 生产包。
*   使用 PM2 直接启动二进制入口：`pm2 start .output/server/index.mjs --name "frontend-prod"`。
*   确保后端 `main.py` 监听 `0.0.0.0`，确保 Nginx 转发路径畅通。

## 经验总结
*   **生产环境改动必先构建**: Nuxt 应用在生产环境下运行的是 `.output` 目录，仅修改 `app/` 源码而不 `build` 是无效的。
*   **进程管理优先级**: 当系统安装有 PM2 时，必须先检查其状态，否则手动启动的进程会被 PM2 的自动重启策略覆盖或冲突。
*   **监控与日志是关键**: 通过 `tail -f /var/log/nginx/error.log` 能快速定位 502 的根源是 Upstream 连接失败。
*   **强制刷新**: 在单页应用（SPA）开发中，浏览器缓存极其顽固，必须提醒用户执行 **Ctrl + F5**。
