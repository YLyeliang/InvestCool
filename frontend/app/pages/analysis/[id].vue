<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const route = useRoute()

// Query the article from Nuxt Content v3 collection
const { data: article, error, pending } = await useAsyncData(`analysis-${route.path}`, () => {
  return queryCollection('analysis').path(route.path).first()
})

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

const readingTime = computed(() => {
  if (article.value?.body?.value) {
    const textLength = JSON.stringify(article.value.body.value).length
    return Math.max(1, Math.ceil(textLength / 800))
  }
  return 5
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

        <div class="article-body prose-modern">
          <ContentRenderer v-if="article" :value="article" />
        </div>

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
}

.container-narrow {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

@media (max-width: 768px) {
  .container-narrow { padding: 0 0.5rem; }
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

.article-header {
  margin-bottom: 3.5rem;
}

.article-meta-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.category-tag-pill {
  background: var(--accent-soft);
  color: var(--accent-color);
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.article-title {
  font-size: 2.25rem;
  font-weight: 900;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 2rem;
  letter-spacing: -0.02em;
}

.article-cover-wrapper {
  margin-bottom: 3rem;
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: var(--shadow-md);
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
}

.callout-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--accent-color);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.summary-callout p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
  font-weight: 500;
}

.article-footer-modern {
  margin-top: 6rem;
  padding-top: 3rem;
  border-top: 1px solid var(--border-color);
}

.disclaimer-modern {
  background: var(--hover-bg);
  padding: 1.25rem;
  border-radius: 1rem;
  display: flex;
  gap: 1rem;
}

.disclaimer-modern p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  line-height: 1.6;
}

@media (max-width: 640px) {
  .article-title { font-size: 1.75rem; }
  .article-meta-row { flex-direction: column; align-items: flex-start; }
}
</style>

<style>
/* Cleaned up local prose overrides as they are now global */
</style>
