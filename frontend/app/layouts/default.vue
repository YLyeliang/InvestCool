<script setup lang="ts">
const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// Window resize listener
const checkMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 768
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Close menu when route changes
const route = useRoute()
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <div class="app-layout" :class="{ 'menu-open': isMobileMenuOpen }">
    <!-- Global Top Header -->
    <header class="site-header">
      <div class="header-content">
        <!-- Logo (Left aligned) -->
        <div class="header-left">
          <button class="menu-toggle mobile-only" @click="toggleMobileMenu">
            <Icon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="icon" />
          </button>
          <NuxtLink to="/" class="logo-link">
            <div class="logo-container">
              <Icon name="lucide:trending-up" class="logo-icon" />
              <h1 class="logo-text">InvestCool</h1>
            </div>
          </NuxtLink>
        </div>

        <!-- Navigation Links (Hidden on small mobile, visible on tablet+) -->
        <nav class="header-center hide-mobile">
          <div class="nav-links">
            <NuxtLink to="/" class="top-nav-item">首页</NuxtLink>
            <NuxtLink to="/analysis" class="top-nav-item">深度分析</NuxtLink>
            <NuxtLink to="/ai" class="top-nav-item">AI 策略</NuxtLink>
            <NuxtLink to="/daily" class="top-nav-item">每日动态</NuxtLink>
          </div>
        </nav>

        <!-- Right Side -->
        <div class="header-right">
          <ThemeToggle class="hide-mobile" />
          <NuxtLink to="/admin" class="admin-btn">
            <Icon name="lucide:user" />
            <span class="hide-mobile">管理后台</span>
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Page Body -->
    <div class="page-body">
      <!-- Left Sidebar: Reorganized Sections -->
      <Transition name="slide">
        <aside v-if="!isMobile || isMobileMenuOpen" class="left-sidebar" :class="{ 'is-active': isMobileMenuOpen }">
          <nav class="sidebar-nav">
            <!-- Section 1: Investment -->
            <div class="nav-section">
              <div class="nav-section-label">投资</div>
              <NuxtLink to="/" class="nav-item">
                <Icon name="lucide:layout-dashboard" class="nav-icon" /> 市场概览
              </NuxtLink>
              <NuxtLink to="/analysis" class="nav-item">
                <Icon name="lucide:trending-up" class="nav-icon" /> 深度分析
              </NuxtLink>
              <NuxtLink to="/tools" class="nav-item">
                <Icon name="lucide:wrench" class="nav-icon" /> 策略工具
              </NuxtLink>
            </div>

            <!-- Section 2: Tutorials -->
            <div class="nav-section">
              <div class="nav-section-label">AI & 教程</div>
              <NuxtLink to="/ai" class="nav-item">
                <Icon name="lucide:brain-circuit" class="nav-icon" /> AI 投资建议
              </NuxtLink>
              <NuxtLink to="/tutorials" class="nav-item">
                <Icon name="lucide:book-open" class="nav-icon" /> 架构与教程
              </NuxtLink>
            </div>

            <!-- Section 3: Community -->
            <div class="nav-section">
              <div class="nav-section-label">社区</div>
              <NuxtLink to="/daily" class="nav-item">
                <Icon name="lucide:calendar-days" class="nav-icon" /> 每日信息
              </NuxtLink>
              <NuxtLink to="/community/wechat" class="nav-item">
                <Icon name="lucide:users" class="nav-icon" /> 微信群组
              </NuxtLink>
            </div>

            <!-- Section 4: Links -->
            <div class="nav-section">
              <div class="nav-section-label">外部链接</div>
              <a href="https://github.com" target="_blank" class="nav-item">
                <Icon name="lucide:github" class="nav-icon" /> GitHub
              </a>
            </div>
          </nav>

          <div class="sidebar-footer">
            <ThemeToggle />
          </div>
        </aside>
      </Transition>

      <!-- Overlay for mobile drawer -->
      <Transition name="fade">
        <div v-if="isMobileMenuOpen" class="menu-overlay" @click="toggleMobileMenu"></div>
      </Transition>

      <!-- Center Content Area -->
      <main class="main-feed">
        <slot />
      </main>

      <!-- Right Panel -->
      <aside class="right-panel">
        <!-- Section: Follow Me -->
        <div class="card premium-side-card">
          <h3 class="widget-title">关注我</h3>
          <div class="qr-grid">
            <div class="qr-item">
              <img src="/images/qrcodes/qr1.jpg" class="qr-img" alt="公众号" />
              <span>公众号</span>
            </div>
            <div class="qr-item">
              <img src="/images/qrcodes/qr2.jpg" class="qr-img" alt="小红书" />
              <span>小红书</span>
            </div>
          </div>
        </div>

        <!-- Section: Daily Insights -->
        <div class="card premium-side-card">
          <h3 class="widget-title">每日交易锦报</h3>
          <MarketQuoteCard />
        </div>
      </aside>
    </div>

    <!-- Mobile Navigation (Bottom) -->
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
.logo-link { text-decoration: none; }
.logo-container { display: flex; align-items: center; gap: 0.75rem; }
.logo-icon { font-size: 1.75rem; color: var(--accent-color); }
.logo-text { font-size: 1.5rem; font-weight: 900; color: var(--text-primary); letter-spacing: -0.03em; }

.admin-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent-color);
  color: white;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 10px rgba(93, 135, 255, 0.3);
}
.admin-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(93, 135, 255, 0.4); }

.nav-section { margin-bottom: 2rem; }
.nav-section:last-child { margin-bottom: 0; }

/* Transition Animations */
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
