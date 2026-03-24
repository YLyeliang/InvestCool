<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const route = useRoute()

// Query the tutorial from Nuxt Content v3 collection
const { data: page, error, pending } = await useAsyncData(`tutorial-${route.path}`, () => {
  return queryCollection('tutorials').path(route.path).first()
})

// SEO Optimization
useHead({
  title: page.value ? page.value.title : '正在加载教程...',
  meta: [
    { 
      name: 'description', 
      content: page.value ? page.value.summary : 'InvestCool 技术开发与投资工具教程。' 
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

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})
</script>

<template>
  <div class="tutorial-detail-page">
    <!-- Top Progress Bar -->
    <div class="progress-bar-wrapper">
      <div class="progress-bar" :style="{ width: scrollProgress + '%' }"></div>
    </div>

    <div class="container-narrow">
      <header class="nav-header">
        <NuxtLink to="/tutorials" class="back-link">
          <Icon name="lucide:arrow-left" class="icon" />
          <span>返回教程列表</span>
        </NuxtLink>
      </header>

      <!-- Loading State -->
      <div v-if="pending" class="loading-state">
        <Skeleton width="100%" height="48px" class="mb-8" />
        <Skeleton width="100%" height="200px" radius="1rem" class="mb-12" />
        <Skeleton v-for="i in 8" :key="i" width="100%" height="20px" class="mb-4" />
      </div>

      <!-- Error State -->
      <div v-else-if="error || !page" class="error-card">
        <Icon name="lucide:file-x" class="error-icon" />
        <h3>教程未找到</h3>
        <p>抱歉，该教程可能已被移动或删除。</p>
        <NuxtLink to="/tutorials" class="btn-primary mt-4">查看所有教程</NuxtLink>
      </div>

      <!-- Content State -->
      <article v-else class="tutorial-article">
        <header class="article-header">
          <div class="category-tag">{{ page.category }}</div>
          <h1 class="article-title">{{ page.title }}</h1>
          <div class="article-meta">
            <Icon name="lucide:calendar" class="meta-icon" />
            <span>发布于 {{ new Date(page.created_at).toLocaleDateString('zh-CN') }}</span>
          </div>
        </header>

        <div v-if="page.cover" class="article-cover">
          <img :src="page.cover" :alt="page.title" />
        </div>

        <div class="article-body prose-modern">
          <ContentRenderer v-if="page" :value="page" />
        </div>

        <footer class="article-footer">
          <div class="disclaimer">
            本文为 InvestCool 原创技术教程，转载请注明出处。
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.tutorial-detail-page {
  padding-bottom: 6rem;
}

.progress-bar-wrapper {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 3px;
  background: transparent; z-index: 1000;
}

.progress-bar {
  height: 100%; background: var(--accent-color);
  transition: width 0.1s ease-out;
}

.container-narrow {
  max-width: 800px; margin: 0 auto; padding: 0 1.5rem;
}

.nav-header { padding: 2rem 0; }

.back-link {
  display: inline-flex; align-items: center; gap: 0.5rem;
  color: var(--text-secondary); text-decoration: none;
  font-weight: 600; font-size: 0.9rem;
}

.article-header { margin-bottom: 3rem; }

.category-tag {
  color: var(--accent-color); font-weight: 800; font-size: 0.75rem;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;
}

.article-title {
  font-size: 2.5rem; font-weight: 900; line-height: 1.2;
  color: var(--text-primary); margin-bottom: 1.5rem;
}

.article-meta {
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--text-secondary); font-size: 0.85rem;
}

.article-cover {
  width: 100%; height: 350px; border-radius: 1.5rem;
  overflow: hidden; margin-bottom: 4rem;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1);
}

.article-cover img { width: 100%; height: 100%; object-fit: cover; }

.article-footer {
  margin-top: 5rem; padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.disclaimer {
  font-size: 0.85rem; color: var(--text-secondary);
  background: var(--hover-bg); padding: 1.5rem; border-radius: 1rem;
}

.error-card {
  text-align: center; padding: 5rem 2rem; background: var(--card-bg);
  border-radius: 1.5rem; border: 1px solid var(--border-color);
}

.error-icon { font-size: 3rem; color: #ef4444; margin-bottom: 1.5rem; }

.btn-primary {
  display: inline-block; background: var(--accent-color); color: white;
  padding: 0.75rem 2rem; border-radius: 0.75rem;
  text-decoration: none; font-weight: 700;
}

.mb-4 { margin-bottom: 1rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-12 { margin-bottom: 3rem; }
</style>

<style>
.prose-modern { line-height: 1.8; font-size: 1.125rem; color: var(--text-primary); }
.prose-modern h2 { font-size: 1.75rem; font-weight: 800; margin: 3.5rem 0 1.5rem; }
.prose-modern p { margin-bottom: 1.5rem; }
.prose-modern ul, .prose-modern ol { padding-left: 1.5rem; margin-bottom: 2rem; }
.prose-modern li { margin-bottom: 0.75rem; }
.prose-modern img { max-width: 100%; border-radius: 1rem; margin: 2rem 0; }
.prose-modern blockquote {
  border-left: 4px solid var(--accent-color); padding: 1rem 2rem;
  background: var(--hover-bg); margin: 2.5rem 0; font-style: italic;
}
</style>
