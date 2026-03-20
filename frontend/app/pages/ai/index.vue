<script setup lang="ts">
// Fetch all items from ai collection
const { data: aiArticles } = await useAsyncData('ai-articles-list', () => queryCollection('ai').all())

const page = ref(1)
const { data: history } = await useFetch(() => `/api/ai/history?page=${page.value}&per_page=5`, {
  watch: [page]
})

const getStatusColor = (status: string) => {
  if (status.includes('看多')) return '#10b981'
  if (status.includes('看空')) return '#ef4444'
  if (status.includes('中性')) return '#f59e0b'
  return '#6b7280'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

useHead({
  title: 'AI 赋能投资',
  meta: [
    { name: 'description', content: '探索 AI 如何改变投资：从实时策略到深度研报。' }
  ]
})
</script>

<template>
  <div class="ai-page">
    <header class="page-header">
      <h2 class="title">AI 赋能投资</h2>
      <p class="subtitle">深度融合人工智能技术，探索下一代智慧投资范式。</p>
    </header>

    <!-- Phase 15: AI Real-time Strategy -->
    <section class="strategy-section">
      <h3 class="section-title">
        <Icon name="lucide:zap" class="icon" /> 实时 AI 策略
      </h3>
      <AIRecommendationCard />
    </section>

    <div class="main-content-layout">
      <!-- Left: Articles -->
      <div class="articles-column">
        <h3 class="section-title">深度阅读</h3>
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
              深度阅读 <Icon name="lucide:arrow-right" class="icon" />
            </NuxtLink>
          </div>
        </div>
        
        <div v-if="!aiArticles || aiArticles.length === 0" class="empty-state">
          <Icon name="lucide:sparkles" class="empty-icon" />
          <p>AI 正在实验室中生成内容，敬请期待...</p>
        </div>
      </div>

      <!-- Right: Strategy History -->
      <aside class="history-column">
        <h3 class="section-title">策略足迹</h3>
        <div class="timeline">
          <div v-for="item in history?.items" :key="item.id" class="timeline-item">
            <div class="timeline-dot" :style="{ backgroundColor: getStatusColor(item.status) }"></div>
            <div class="timeline-content card">
              <div class="item-header">
                <span class="item-status" :style="{ color: getStatusColor(item.status) }">{{ item.status }}</span>
                <span class="item-time">{{ formatDate(item.created_at) }}</span>
              </div>
              <p class="item-summary">{{ item.summary }}</p>
              <div class="item-footer">点位: {{ item.index_position }}</div>
            </div>
          </div>
        </div>
        
        <div v-if="history && history.pages > 1" class="pagination">
          <button @click="page--" :disabled="page <= 1">Prev</button>
          <span class="page-info">{{ page }} / {{ history.pages }}</span>
          <button @click="page++" :disabled="page >= history.pages">Next</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 2.5rem; }
.title { font-size: 1.875rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary); }
.subtitle { color: var(--text-secondary); }

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}
.section-title .icon { color: var(--accent-color); }

.main-content-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2.5rem;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.article-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200px;
  border-top: 4px solid var(--accent-color);
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 800;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
}

.article-title { font-size: 1.15rem; margin-bottom: 0.75rem; font-weight: 700; }
.article-desc { color: var(--text-secondary); font-size: 0.85rem; line-height: 1.6; margin-bottom: 1.5rem; }

.view-link {
  color: var(--accent-color);
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}

/* Timeline Style */
.timeline { position: relative; padding-left: 1.5rem; border-left: 2px solid var(--border-color); }
.timeline-item { position: relative; margin-bottom: 1.5rem; }
.timeline-dot {
  position: absolute;
  left: -1.95rem;
  top: 0.5rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
}
.timeline-content { padding: 1rem; font-size: 0.85rem; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.item-status { font-weight: 800; }
.item-time { color: var(--text-tertiary); font-size: 0.75rem; }
.item-summary { color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.5rem; }
.item-footer { font-size: 0.7rem; color: var(--text-tertiary); text-align: right; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
.pagination button {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 0.25rem 0.75rem;
  border-radius: 0.4rem;
  cursor: pointer;
  font-size: 0.8rem;
}
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 0.8rem; color: var(--text-secondary); }

@media (max-width: 1024px) {
  .main-content-layout { grid-template-columns: 1fr; }
  .history-column { margin-top: 2rem; }
}
</style>

