<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()

// Slug handling for dynamic paths
const slug = computed(() => {
  return route.params.slug[0]
})

// Fetch from our new dynamic server API
const { data: page, error, pending } = await useFetch(`/cms/daily/${slug.value}`, {
  key: `daily-detail-${slug.value}`
})

useHead({
  title: page.value ? page.value.title : '每日信息',
  meta: [
    { name: 'description', content: page.value ? page.value.description : 'InvestCool 每日科技观察。' }
  ]
})
</script>

<template>
  <div class="daily-detail">
    <NuxtLink to="/daily" class="back-link">
      <Icon name="lucide:arrow-left" /> 返回列表
    </NuxtLink>

    <!-- Error State -->
    <div v-if="error || (!pending && !page)" class="error-state">
      <Icon name="lucide:file-question" class="error-icon" />
      <h3>简报未找到</h3>
      <p>抱歉，该内容可能尚未同步或已被移除。</p>
    </div>

    <article v-else-if="page" class="log-content">
      <header class="log-header">
        <div class="log-meta">
          <Icon name="lucide:calendar" class="icon" />
          {{ page.date }}
        </div>
        <h1 class="log-title">{{ page.title }}</h1>
        <p class="log-description">{{ page.description }}</p>
      </header>

      <div class="prose-wrapper prose-modern" v-html="page.html"></div>
    </article>

    <div v-else class="loading-state">
      <Skeleton width="100%" height="400px" />
    </div>
  </div>
</template>

<style scoped>
.daily-detail {
  padding-bottom: 5rem;
  max-width: 760px;
  margin: 0 auto;
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

.error-state {
  text-align: center;
  padding: 5rem 0;
}

.error-icon {
  font-size: 3rem;
  color: #ef4444;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .log-title { font-size: 1.75rem; }
  .daily-detail { padding: 0 0.5rem 5rem; }
}
</style>
