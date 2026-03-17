<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'

const route = useRoute()
const config = useRuntimeConfig()

// Use a unique key for each article to prevent hydration issues
const { data: analysis, error, pending } = await useFetch(`${config.public.apiBase}/analysis/${route.params.id}`, {
  key: `analysis-detail-${route.params.id}`,
  lazy: true,
  server: true
})

// Safe data access wrapper
const article = computed(() => analysis.value as any)

// SEO Optimization with fallbacks
useHead({
  title: article.value?.title || '正在加载分析...',
  meta: [
    { 
      name: 'description', 
      content: article.value?.summary || 'InvestCool 深度投资分析报告。' 
    },
    { property: 'og:type', content: 'article' }
  ]
})

const scrollProgress = ref(0)

const updateScrollProgress = () => {
  const winScroll = window.scrollY
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
  scrollProgress.value = (winScroll / height) * 100
}

const parsedContent = computed(() => {
  if (article.value?.content) {
    return marked(article.value.content)
  }
  return ''
})

const readingTime = computed(() => {
  if (article.value?.content) {
    const words = article.value.content.length
    return Math.ceil(words / 400)
  }
  return 0
})

const getCategoryLabel = (cat: string) => {
  const map: any = {
    'Market Trends': '市场趋势',
    'AI Infrastructure': 'AI 基础设施',
    'Macro Strategy': '宏观策略',
    'Semiconductors': '半导体'
  }
  return map[cat] || cat || '技术洞察'
}

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})
</script>

<template>
  <div class="analysis-detail-page">
    <!-- Top Progress Bar (Nuxt UI style) -->
    <div class="progress-bar-wrapper">
      <div class="progress-bar" :style="{ width: scrollProgress + '%' }"></div>
    </div>

    <div class="container-narrow">
      <header class="nav-header">
        <NuxtLink to="/analysis" class="back-link">
          <Icon name="lucide:arrow-left" class="icon" />
          <span>返回投资分析</span>
        </NuxtLink>
      </header>

      <!-- Loading State (Skeleton) -->
      <div v-if="pending" class="loading-state">
        <Skeleton width="120px" height="24px" radius="12px" class="mb-4" />
        <Skeleton width="100%" height="48px" class="mb-8" />
        <div class="summary-skeleton">
          <Skeleton width="100%" height="100px" radius="1rem" />
        </div>
        <div class="content-skeleton mt-12">
          <Skeleton v-for="i in 6" :key="i" width="100%" height="20px" class="mb-4" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error || !article" class="error-wrapper">
        <div class="error-card-modern">
          <div class="error-icon-box">
            <Icon name="lucide:file-warning" class="icon" />
          </div>
          <h3>文章加载失败</h3>
          <p>很抱歉，我们无法获取该篇报告的内容。这可能是由于网络波动或文章已被移动。</p>
          <div class="error-actions">
            <NuxtLink to="/analysis" class="btn-primary">返回列表</NuxtLink>
            <button @click="() => refreshNuxtData(`analysis-detail-${route.params.id}`)" class="btn-secondary">
              重试加载
            </button>
          </div>
        </div>
      </div>

      <!-- Content State -->
      <article v-else class="article-modern">
        <header class="article-header">
          <div class="article-meta-row">
            <span class="category-tag-pill">{{ getCategoryLabel(article.category) }}</span>
            <div class="meta-info">
              <Icon name="lucide:calendar" class="icon" />
              <span>{{ new Date(article.created_at).toLocaleDateString('zh-CN') }}</span>
              <span class="divider">•</span>
              <Icon name="lucide:clock" class="icon" />
              <span>预计阅读 {{ readingTime }} 分钟</span>
            </div>
          </div>
          
          <h1 class="article-title">{{ article.title }}</h1>

          <div v-if="article.cover" class="article-cover-wrapper">
            <img :src="article.cover" :alt="article.title" class="article-cover-img" />
          </div>
          
          <div class="summary-callout">
            <div class="callout-label">
              <Icon name="lucide:sparkles" class="icon" />
              核心摘要
            </div>
            <p>{{ article.summary }}</p>
          </div>
        </header>

        <div class="article-body prose-modern" v-html="parsedContent"></div>

        <footer class="article-footer-modern">
          <div class="footer-top">
            <div class="share-group">
              <span class="share-label">分享观点</span>
              <div class="share-icons">
                <button class="icon-btn"><Icon name="lucide:twitter" /></button>
                <button class="icon-btn"><Icon name="lucide:linkedin" /></button>
                <button class="icon-btn"><Icon name="lucide:link" /></button>
              </div>
            </div>
          </div>
          
          <div class="disclaimer-modern">
            <Icon name="lucide:info" class="icon" />
            <p>免责声明：本文内容基于公开数据及 AI 辅助分析，仅供技术交流参考，不构成任何投资建议。市场有风险，投资需谨慎。</p>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.analysis-detail-page {
  padding-bottom: 8rem;
  background-color: var(--bg-color);
}

.progress-bar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: transparent;
  z-index: 1000;
}

.progress-bar {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.1s ease-out;
  box-shadow: 0 0 10px var(--accent-color);
}

.container-narrow {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.nav-header {
  padding: 2rem 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--accent-color);
}

.back-link .icon {
  font-size: 1rem;
}

/* Loading/Skeleton Styles */
.mb-4 { margin-bottom: 1rem; }
.mb-8 { margin-bottom: 2rem; }
.mt-12 { margin-top: 3rem; }

/* Article Styles */
.article-header {
  margin-bottom: 4rem;
}

.article-meta-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.category-tag-pill {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-color);
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.meta-info .icon {
  width: 0.9rem;
}

.meta-info .divider {
  margin: 0 0.25rem;
  opacity: 0.3;
}

.article-title {
  font-size: 2.5rem;
  font-weight: 900;
  line-height: 1.15;
  color: var(--text-primary);
  margin-bottom: 2.5rem;
  letter-spacing: -0.02em;
}

.article-cover-wrapper {
  margin-bottom: 3rem;
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  border: 1px solid var(--border-color);
}

.article-cover-img {
  width: 100%;
  height: auto;
  display: block;
}

.summary-callout {
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 1rem;
  position: relative;
}

.callout-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-color);
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.summary-callout p {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--text-primary);
  font-weight: 500;
}

/* Error Modern UI */
.error-wrapper {
  padding: 4rem 0;
}

.error-card-modern {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 1.5rem;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
}

.error-icon-box {
  width: 4rem;
  height: 4rem;
  background: #fef2f2;
  color: #ef4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.error-icon-box .icon {
  font-size: 2rem;
}

.error-card-modern h3 {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.error-card-modern p {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
  padding: 0.6rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.2s;
}

.btn-secondary {
  background: var(--hover-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.6rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--border-color);
}

/* Footer Modern */
.article-footer-modern {
  margin-top: 6rem;
  padding-top: 3rem;
  border-top: 1px solid var(--border-color);
}

.footer-top {
  margin-bottom: 3rem;
}

.share-group {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.share-label {
  font-weight: 800;
  font-size: 0.875rem;
  color: var(--text-primary);
  text-transform: uppercase;
}

.share-icons {
  display: flex;
  gap: 0.75rem;
}

.icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: translateY(-2px);
}

.disclaimer-modern {
  background: var(--hover-bg);
  padding: 1.5rem;
  border-radius: 1rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.disclaimer-modern .icon {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
  flex-shrink: 0;
}

.disclaimer-modern p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 640px) {
  .article-title {
    font-size: 2rem;
  }
  .article-meta-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<style>
/* Modern Prose Overrides */
.prose-modern {
  color: var(--text-primary);
  line-height: 1.85;
  font-size: 1.15rem;
}

.prose-modern h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 4rem 0 1.5rem;
  letter-spacing: -0.01em;
}

.prose-modern p {
  margin-bottom: 1.75rem;
}

.prose-modern ul {
  padding-left: 1.25rem;
  margin-bottom: 2rem;
}

.prose-modern li {
  margin-bottom: 0.75rem;
}

.prose-modern strong {
  font-weight: 700;
  color: var(--text-primary);
}

.prose-modern {
  --text-main: var(--text-primary);
  --text-muted: var(--text-secondary);
  line-height: 1.85;
  font-size: 1.125rem;
  letter-spacing: -0.011em;
}

.prose-modern :deep(h1), 
.prose-modern :deep(h2), 
.prose-modern :deep(h3) {
  color: var(--text-main);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.prose-modern :deep(h2) {
  font-size: 2.25rem;
  margin: 4.5rem 0 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.prose-modern :deep(h3) {
  font-size: 1.65rem;
  margin: 3rem 0 1.25rem;
}

.prose-modern :deep(p) {
  margin-bottom: 2rem;
  color: var(--text-main);
  opacity: 0.92;
}

.prose-modern :deep(blockquote) {
  margin: 3.5rem 0;
  padding: 2rem 2.5rem;
  background: var(--hover-bg);
  border-left: 4px solid var(--accent-color);
  border-radius: 0 1.5rem 1.5rem 0;
  font-style: italic;
  font-size: 1.35rem;
  line-height: 1.6;
  color: var(--text-main);
  position: relative;
}

.prose-modern :deep(blockquote::before) {
  content: '“';
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  font-size: 4rem;
  opacity: 0.1;
  font-family: serif;
}

.prose-modern :deep(code) {
  background: var(--hover-bg);
  padding: 0.2rem 0.45rem;
  border-radius: 0.4rem;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-color);
  border: 1px solid var(--border-color);
}

.prose-modern :deep(pre) {
  margin: 3rem 0;
  background: #0f172a;
  padding: 2rem;
  border-radius: 1.5rem;
  overflow-x: auto;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
}

.dark .prose-modern :deep(pre) {
  background: #020617;
}

.prose-modern :deep(pre code) {
  background: transparent;
  padding: 0;
  border: none;
  color: #e2e8f0;
  font-size: 0.95rem;
  line-height: 1.7;
}

.prose-modern :deep(img) {
  width: 100%;
  height: auto;
  border-radius: 2rem;
  margin: 4.5rem auto;
  display: block;
  box-shadow: 0 30px 100px -20px rgba(0,0,0,0.25);
  border: 1px solid var(--border-color);
}

.prose-modern :deep(ul), .prose-modern :deep(ol) {
  margin-bottom: 2.5rem;
  padding-left: 1.5rem;
}

.prose-modern :deep(li) {
  margin-bottom: 0.75rem;
  position: relative;
}

.prose-modern :deep(a) {
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 700;
  box-shadow: inset 0 -2px 0 var(--accent-color);
  transition: all 0.2s ease;
}

.prose-modern :deep(a:hover) {
  background: var(--accent-color);
  color: white;
  border-radius: 0.2rem;
}

/* --- Table Enhancements --- */
.prose-modern :deep(table) {
  width: 100%;
  margin: 3rem 0;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--border-color);
  border-radius: 1.25rem;
  overflow: hidden;
  font-size: 0.95rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}

.prose-modern :deep(thead) {
  background: var(--hover-bg);
}

.prose-modern :deep(th) {
  padding: 1.25rem 1.5rem;
  text-align: left;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.prose-modern :deep(td) {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  transition: background 0.2s ease;
}

.prose-modern :deep(tr:last-child td) {
  border-bottom: none;
}

.prose-modern :deep(tbody tr:nth-child(even)) {
  background: rgba(var(--accent-color-rgb), 0.02);
}

.prose-modern :deep(tbody tr:hover td) {
  background: var(--hover-bg);
}
</style>
