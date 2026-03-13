<script setup lang="ts">
const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// Close menu when route changes
const route = useRoute()
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <div class="app-container" :class="{ 'menu-open': isMobileMenuOpen }">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <button class="menu-toggle" @click="toggleMobileMenu">
        <Icon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" />
      </button>
      <NuxtLink to="/" class="logo-link">
        <h1 style="font-size: 1.25rem; font-weight: 800; color: var(--accent-color); margin: 0;">InvestCool</h1>
      </NuxtLink>
      <div style="width: 2.5rem;"></div> <!-- Placeholder to balance the left button -->
    </header>

    <!-- Overlay for mobile -->
    <div v-if="isMobileMenuOpen" class="menu-overlay" @click="toggleMobileMenu"></div>

    <!-- Left Sidebar: Navigation -->
    <aside class="left-sidebar" :class="{ 'is-active': isMobileMenuOpen }">
      <div class="logo hide-mobile">
        <NuxtLink to="/" class="logo-link">
          <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--accent-color); margin-bottom: 2rem;">InvestCool <small style="font-size: 0.6rem; vertical-align: middle; opacity: 0.5;">v2.0-API</small></h1>
        </NuxtLink>
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

      <div style="margin-top: auto; padding-top: 2rem;">
        <ThemeToggle />
      </div>
    </aside>

    <!-- Main Content: Feed -->
    <main class="main-feed">
      <slot />
    </main>

    <!-- Right Panel: Widgets -->
    <aside class="right-panel">
      <!-- Social Media QRCodes (Primary) -->
      <div class="card" style="padding: 1.25rem;">
        <h3 style="font-size: 1rem; margin-bottom: 1rem;">关注我</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
          <div>
            <img src="/images/qrcodes/qr1.jpg" alt="公众号" style="width: 100%; border-radius: 0.5rem; border: 1px solid var(--border-color);" />
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.5rem;">公众号</div>
          </div>
          <div>
            <img src="/images/qrcodes/qr2.jpg" alt="小红书" style="width: 100%; border-radius: 0.5rem; border: 1px solid var(--border-color);" />
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.5rem;">小红书</div>
          </div>
        </div>
      </div>

      <!-- Magnificent Seven Watchlist -->
      <TickerWatchlist />

      <!-- Sentiment Trend Chart -->
      <SentimentTrendChart />

      <!-- Global Macro Assets -->
      <MacroAssetPanel />

      <div class="card" style="padding: 1.25rem; margin-top: 1.5rem; border-left: 4px solid var(--accent-color);">
        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">每日交易锦报</h3>
        <p style="font-size: 0.875rem; font-style: italic; color: var(--text-secondary); line-height: 1.5;">
          "在市场贪婪时保持谨慎，在市场恐惧时寻找机会。纪律比天赋更重要。"
        </p>
        <div style="margin-top: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--accent-color);">
          —— 投资笔记 2026.03.12
        </div>
      </div>
    </aside>

    <!-- Mobile Tab Bar Navigation -->
    <nav class="mobile-tab-bar">
      <NuxtLink to="/" class="tab-item">
        <Icon name="lucide:home" class="tab-icon" />
        <span class="tab-label">首页</span>
      </NuxtLink>
      <NuxtLink to="/analysis" class="tab-item">
        <Icon name="lucide:trending-up" class="tab-icon" />
        <span class="tab-label">分析</span>
      </NuxtLink>
      <NuxtLink to="/tools" class="tab-item">
        <Icon name="lucide:wrench" class="tab-icon" />
        <span class="tab-label">工具</span>
      </NuxtLink>
      <NuxtLink to="/admin" class="tab-item">
        <Icon name="lucide:user" class="tab-icon" />
        <span class="tab-label">管理</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.logo-link {
  text-decoration: none;
  display: block;
}
</style>
