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
            <h1 class="logo-text">InvestCool <small class="v-tag">v2.0</small></h1>
          </NuxtLink>
        </div>

        <!-- Navigation Links (Centered) -->
        <nav class="header-center">
          <div class="nav-links">
            <NuxtLink to="/" class="top-nav-item">Home</NuxtLink>
            <NuxtLink to="/community/wechat" class="top-nav-item">加入社区</NuxtLink>
            <NuxtLink to="/daily" class="top-nav-item">每日信息</NuxtLink>
          </div>
        </nav>

        <!-- Right Side -->
        <div class="header-right hide-mobile">
          <NuxtLink to="/admin" class="admin-icon-link">
            <Icon name="lucide:user-cog" />
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
        <div class="card social-card">
          <h3 class="widget-title">关注我</h3>
          <div class="qr-grid">
            <div class="qr-item">
              <img src="/images/qrcodes/qr1.jpg" alt="公众号" class="qr-img" />
              <span>公众号</span>
            </div>
            <div class="qr-item">
              <img src="/images/qrcodes/qr2.jpg" alt="小红书" class="qr-img" />
              <span>小红书</span>
            </div>
          </div>
        </div>

        <TickerWatchlist />

        <MarketQuoteCard />
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
.logo-link { text-decoration: none; display: block; }
.logo-text { font-size: 1.25rem; font-weight: 900; color: var(--accent-color); margin: 0; letter-spacing: -0.02em; }
.v-tag { font-size: 0.6rem; font-weight: 600; vertical-align: middle; opacity: 0.5; background: var(--hover-bg); padding: 0.1rem 0.3rem; border-radius: 0.2rem; margin-left: 0.2rem; }
.admin-icon-link { color: var(--text-secondary); font-size: 1.25rem; transition: color 0.2s; }
.admin-icon-link:hover { color: var(--accent-color); }

.nav-section { margin-bottom: 2rem; }
.nav-section:last-child { margin-bottom: 0; }

/* Transition Animations */
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
