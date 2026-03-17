<script setup lang="ts">
// Fetch all items from ai collection
const { data: aiArticles } = await useAsyncData('ai-articles-list', () => queryCollection('ai').all())

useHead({
  title: 'AI 赋能投资',
  meta: [
    { name: 'description', content: '探索 AI 如何改变投资：从量化策略到智能财报分析。' }
  ]
})
</script>

<template>
  <div class="ai-page">
    <header class="page-header">
      <h2 class="title">AI 赋能投资</h2>
      <p class="subtitle">深度融合人工智能技术，探索下一代智慧投资范式。</p>
    </header>

    <div class="articles-grid">
      <div v-for="article in aiArticles" :key="article.path" class="card article-card">
        <div class="card-content">
          <div class="badge-group">
            <span class="badge">AI Insights</span>
          </div>
          <h3 class="article-title">{{ article.title }}</h3>
          <p class="article-desc">{{ article.description || '暂无描述' }}</p>
        </div>
        
        <NuxtLink :to="article.path" class="view-link">
          深度阅读 <Icon name="lucide:zap" class="icon" />
        </NuxtLink>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!aiArticles || aiArticles.length === 0" class="empty-state">
      <Icon name="lucide:sparkles" class="empty-icon" />
      <p>AI 正在实验室中生成内容，敬请期待...</p>
    </div>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 2.5rem; }
.title { font-size: 1.875rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary); }
.subtitle { color: var(--text-secondary); }

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.article-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
  border-top: 4px solid var(--accent-color);
}

.badge-group { margin-bottom: 1rem; }
.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 800;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-color);
  text-transform: uppercase;
}

.article-title { font-size: 1.25rem; margin-bottom: 0.75rem; font-weight: 700; }
.article-desc { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }

.view-link {
  color: var(--accent-color);
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}
.view-link .icon { margin-left: 0.5rem; width: 1rem; }

.empty-state { text-align: center; padding: 5rem 0; color: var(--text-secondary); }
.empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.2; }

@media (max-width: 640px) { .articles-grid { grid-template-columns: 1fr; } }
</style>
