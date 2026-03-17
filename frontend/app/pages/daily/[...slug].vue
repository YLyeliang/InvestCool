<script setup lang="ts">
const route = useRoute()

// Fetch specific daily log with robust matching
const { data: page } = await useAsyncData('daily-data-' + route.path, async () => {
  const allDocs = await queryCollection('daily').all()
  const currentSlug = route.path.split('/').pop()
  
  return allDocs.find(doc => 
    doc.path === route.path || 
    doc.path === route.path.replace('/daily', '') ||
    doc.path.endsWith('/' + currentSlug)
  )
})

useHead({
  title: page.value ? page.value.title : '每日信息',
  meta: [
    { name: 'description', content: page.value ? page.value.description : 'InvestCool 每日科技观察。' }
  ]
})

if (!page.value) {
  console.error('Daily log not found:', route.path)
}
</script>

<template>
  <div class="daily-detail">
    <NuxtLink to="/daily" class="back-link">
      <Icon name="lucide:arrow-left" /> 返回列表
    </NuxtLink>

    <article v-if="page" class="log-content">
      <header class="log-header">
        <div class="log-meta">
          <Icon name="lucide:calendar" class="icon" />
          {{ page.date }}
        </div>
        <h1 class="log-title">{{ page.title }}</h1>
        <p class="log-description">{{ page.description }}</p>
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
.daily-detail {
  padding-bottom: 5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 2rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--accent-color);
}

.log-header {
  margin-bottom: 3rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 2rem;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-color);
  margin-bottom: 1rem;
}

.log-title {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.log-description {
  font-size: 1.1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.prose-wrapper {
  max-width: 100%;
}

/* Base Prose Styles */
.prose :deep(h2) { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1.25rem; font-weight: 700; color: var(--text-primary); }
.prose :deep(p) { margin-bottom: 1.25rem; line-height: 1.8; color: var(--text-primary); font-size: 1.05rem; }
.prose :deep(ul), .prose :deep(ol) { margin-bottom: 1.25rem; padding-left: 1.5rem; }
.prose :deep(li) { margin-bottom: 0.5rem; }
.prose :deep(blockquote) { border-left: 4px solid var(--accent-color); padding-left: 1.5rem; font-style: italic; color: var(--text-secondary); margin: 2rem 0; }
</style>
