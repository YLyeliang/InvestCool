<template>
  <div class="app-container">
    <!-- Left Sidebar: Navigation -->
    <aside class="left-sidebar">
      <div class="logo">
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--accent-color); margin-bottom: 2rem;">InvestCool</h1>
      </div>
      
      <nav>
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.05em;">菜单</div>
        <NuxtLink to="/" class="nav-item">
          <Icon name="lucide:home" style="margin-right: 0.75rem" /> 首页
        </NuxtLink>
        <NuxtLink to="/analysis" class="nav-item">
          <Icon name="lucide:trending-up" style="margin-right: 0.75rem" /> 投资分析
        </NuxtLink>
        <NuxtLink to="/tutorials" class="nav-item">
          <Icon name="lucide:book-open" style="margin-right: 0.75rem" /> 技术教程
        </NuxtLink>
        <NuxtLink to="/tools" class="nav-item">
          <Icon name="lucide:wrench" style="margin-right: 0.75rem" /> 实用工具
        </NuxtLink>
      </nav>

      <div style="margin-top: 3rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.05em;">精选系列</div>
        <NuxtLink to="/series/python" class="nav-item">Python 高级进阶</NuxtLink>
        <NuxtLink to="/series/macro" class="nav-item">全球宏观观察</NuxtLink>
        <NuxtLink to="/series/ai" class="nav-item">AI 赋能投资</NuxtLink>
      </div>
    </aside>

    <!-- Main Content: Feed -->
    <main class="main-feed">
      <slot />
    </main>

    <!-- Right Panel: Widgets -->
    <aside class="right-panel">
      <div class="card" style="padding: 1.25rem;">
        <h3 style="font-size: 1rem; margin-bottom: 1rem;">热门分析</h3>
        <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
          <li style="margin-bottom: 0.75rem; color: var(--text-secondary); display: flex; align-items: center;">
            <Icon name="lucide:zap" style="margin-right: 0.5rem; color: #eab308;" /> AI 基础设施爆发增长
          </li>
          <li style="margin-bottom: 0.75rem; color: var(--text-secondary); display: flex; align-items: center;">
            <Icon name="lucide:shield-check" style="margin-right: 0.5rem; color: #10b981;" /> 2026 加密货币监管趋势
          </li>
          <li style="margin-bottom: 0.75rem; color: var(--text-secondary); display: flex; align-items: center;">
            <Icon name="lucide:wind" style="margin-right: 0.5rem; color: #3b82f6;" /> 能源板块战略转型
          </li>
          <li style="color: var(--text-secondary); display: flex; align-items: center;">
            <Icon name="lucide:cpu" style="margin-right: 0.5rem; color: #ef4444;" /> 半导体周期深度解析
          </li>
        </ul>
      </div>

      <!-- Brainstormed Content: Trading Wisdom -->
      <div class="card" style="padding: 1.25rem; margin-top: 1.5rem; border-left: 4px solid var(--accent-color);">
        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">每日交易锦报</h3>
        <p style="font-size: 0.875rem; font-style: italic; color: var(--text-secondary); line-height: 1.5;">
          "在市场贪婪时保持谨慎，在市场恐惧时寻找机会。纪律比天赋更重要。"
        </p>
        <div style="margin-top: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--accent-color);">
          —— 投资笔记 2026.03.12
        </div>
      </div>

      <div class="card" style="padding: 1.25rem; margin-top: 1.5rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
        <h3 style="font-size: 1rem; margin-bottom: 0.5rem;">订阅更新</h3>
        <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 1rem;">第一时间获取最新的投资深度分析和技术实战指南。</p>
        <button style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: none; background: white; color: var(--accent-color); font-weight: 600; cursor: pointer;">立即订阅</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.logo h1 {
  cursor: pointer;
}
</style>
