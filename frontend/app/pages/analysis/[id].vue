<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'

const route = useRoute()
const config = useRuntimeConfig()

const { data: analysis, error } = await useFetch(`${config.public.apiBase}/analysis/${route.params.id}`)

// SEO Optimization
useHead({
  title: analysis.value ? (analysis.value as any).title : '投资分析',
  meta: [
    { 
      name: 'description', 
      content: analysis.value ? (analysis.value as any).summary : 'InvestCool 深度投资分析报告。' 
    },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: analysis.value ? (analysis.value as any).title : '投资分析' }
  ]
})

const scrollProgress = ref(0)

const updateScrollProgress = () => {
  const winScroll = document.documentElement.scrollTop
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
  scrollProgress.value = (winScroll / height) * 100
}

const parsedContent = computed(() => {
  if (analysis.value && (analysis.value as any).content) {
    return marked((analysis.value as any).content)
  }
  return ''
})

const readingTime = computed(() => {
  if (analysis.value && (analysis.value as any).content) {
    const words = (analysis.value as any).content.length
    const time = Math.ceil(words / 400) // 假设中文每分钟阅读 400 字
    return time
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
  return map[cat] || cat
}

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})
</script>

<template>
  <div class="analysis-detail-wrapper">
    <!-- Progress Bar -->
    <div class="scroll-progress-container">
      <div class="scroll-progress-bar" :style="{ width: scrollProgress + '%' }"></div>
    </div>

    <NuxtLink to="/analysis" class="back-link">
      <Icon name="lucide:arrow-left" style="margin-right: 0.5rem;" /> 返回列表
    </NuxtLink>

    <div v-if="error" class="error-card">
      <Icon name="lucide:alert-circle" />
      <span>加载分析失败，请稍后重试。</span>
    </div>

    <article v-else-if="analysis" class="analysis-article">
      <header class="article-header">
        <div class="header-top">
          <span class="category-badge">{{ getCategoryLabel((analysis as any).category) }}</span>
          <span class="reading-meta">
            <Icon name="lucide:clock" style="margin-right: 0.25rem; width: 0.8rem;" />
            预计阅读 {{ readingTime }} 分钟
          </span>
        </div>
        <h1 class="article-title">{{ (analysis as any).title }}</h1>
        <div class="article-summary-box">
          <div class="summary-label">核心摘要</div>
          <p>{{ (analysis as any).summary }}</p>
        </div>
      </header>

      <!-- Markdown Content -->
      <div class="dynamic-markdown-pro" v-html="parsedContent"></div>

      <footer class="article-footer">
        <div class="share-section">
          <span>分享观点：</span>
          <div class="share-btns">
            <button class="share-btn"><Icon name="lucide:link" /></button>
            <button class="share-btn"><Icon name="lucide:twitter" /></button>
          </div>
        </div>
        <div class="disclaimer">
          免责声明：本文内容仅供参考，不构成任何投资建议。投资者据此操作，风险自担。
        </div>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.analysis-detail-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 6rem;
}

.scroll-progress-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: transparent;
  z-index: 2000;
}

.scroll-progress-bar {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.1s ease-out;
}

.back-link {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 3rem;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--accent-color);
}

.article-header {
  margin-bottom: 3rem;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.category-badge {
  background: var(--hover-bg);
  color: var(--accent-color);
  padding: 0.3rem 0.8rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.reading-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.article-title {
  font-size: 2.5rem;
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.article-summary-box {
  background: var(--hover-bg);
  padding: 1.5rem;
  border-radius: 1rem;
  border-left: 4px solid var(--accent-color);
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent-color);
  margin-bottom: 0.5rem;
}

.article-summary-box p {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  line-height: 1.6;
  font-weight: 500;
}

.article-footer {
  margin-top: 5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.share-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.share-section span {
  font-weight: 700;
  font-size: 0.9rem;
}

.share-btns {
  display: flex;
  gap: 0.5rem;
}

.share-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.share-btn:hover {
  background: var(--hover-bg);
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.disclaimer {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--bg-color);
  padding: 1rem;
  border-radius: 0.5rem;
  line-height: 1.5;
}

.error-card {
  padding: 2rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>

<style>
/* Global Markdown overrides for premium feel */
.dynamic-markdown-pro {
  line-height: 1.8;
  font-size: 1.125rem;
  color: var(--text-primary);
}

.dynamic-markdown-pro h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 3.5rem 0 1.5rem 0;
  color: var(--text-primary);
}

.dynamic-markdown-pro p {
  margin-bottom: 1.5rem;
}

.dynamic-markdown-pro blockquote {
  font-size: 1.25rem;
  border-left: none;
  padding: 2rem;
  margin: 2.5rem 0;
  background: var(--hover-bg);
  border-radius: 1rem;
  position: relative;
  font-style: normal;
  color: var(--text-primary);
  font-weight: 500;
}

.dynamic-markdown-pro blockquote::before {
  content: '"';
  position: absolute;
  top: 0.5rem;
  left: 1rem;
  font-size: 4rem;
  color: var(--accent-color);
  opacity: 0.2;
  font-family: serif;
}

.dynamic-markdown-pro ul {
  list-style: none;
  padding-left: 0;
}

.dynamic-markdown-pro li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.dynamic-markdown-pro li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.7rem;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--accent-color);
  border-radius: 50%;
  opacity: 0.5;
}
</style>
