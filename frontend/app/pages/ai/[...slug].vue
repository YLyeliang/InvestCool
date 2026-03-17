<script setup lang="ts">
const route = useRoute()

// Fetch specific AI article
const { data: page } = await useAsyncData('ai-' + route.path, () => {
  return queryCollection('ai').path(route.path).first()
})

useHead({
  title: page.value ? page.value.title : 'AI 赋能投资',
  meta: [
    { name: 'description', content: page.value ? page.value.description : 'AI 赋能投资深度解析。' }
  ]
})

if (!page.value) {
  console.error('AI article not found:', route.path)
}
</script>

<template>
  <div class="ai-detail">
    <NuxtLink to="/ai" class="back-link">
      <Icon name="lucide:arrow-left" /> 返回列表
    </NuxtLink>

    <article v-if="page" class="article-content">
      <header class="article-header">
        <h1 class="article-title">{{ page.title }}</h1>
        <p class="article-description">{{ page.description }}</p>
      </header>

      <div class="prose-wrapper">
        <ContentRenderer :value="page" class="prose" />
      </div>
    </article>

    <div v-else class="loading-state">
      <Skeleton width="100%" height="400px" />
    </div>
  </div>
</template>

<style scoped>
.ai-detail { padding-bottom: 5rem; }
.back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; font-weight: 600; margin-bottom: 2rem; }
.back-link:hover { color: var(--accent-color); }

.article-header { margin-bottom: 3rem; border-bottom: 1px solid var(--border-color); padding-bottom: 2rem; }
.article-title { font-size: 2.25rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem; color: var(--text-primary); }
.article-description { font-size: 1.1rem; color: var(--text-secondary); line-height: 1.6; }

/* Base Prose Styles */
.prose :deep(h2) { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1.25rem; font-weight: 700; color: var(--text-primary); }
.prose :deep(p) { margin-bottom: 1.25rem; line-height: 1.8; color: var(--text-primary); font-size: 1.05rem; }
.prose :deep(ul) { margin-bottom: 1.25rem; padding-left: 1.5rem; }
.prose :deep(li) { margin-bottom: 0.5rem; }
</style>
