<script setup lang="ts">
const config = useRuntimeConfig()
const { data: allArticles } = await useFetch(`${config.public.apiBase}/analysis?type=analysis`)

const selectedCategory = ref('All')
const categories = ['All', '深度分析', '市场趋势', 'AI 基础设施', '宏观策略', '半导体', '投资入门']

const filteredArticles = computed(() => {
  if (!allArticles.value) return []
  if (selectedCategory.value === 'All') return allArticles.value as any[]
  return (allArticles.value as any[]).filter(a => a.category === selectedCategory.value)
})

const getCategoryLabel = (cat: string) => {
  const map: any = {
    'Market Trends': '市场趋势',
    'AI Infrastructure': 'AI 基础设施',
    'Macro Strategy': '宏观策略',
    'Semiconductors': '半导体',
    '深度分析': '深度分析',
    '市场趋势': '市场趋势',
    'AI 基础设施': 'AI 基础设施',
    '宏观策略': '宏观策略',
    '半导体': '半导体',
    '投资入门': '投资入门'
  }
  return map[cat] || cat
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="analysis-container">
    <header class="page-header">
      <h2 class="text-3xl font-black">投资分析</h2>
      <p class="text-secondary">透过噪音，捕捉科技与资本的长期共振。</p>
      
      <!-- Category Filter -->
      <div class="filter-bar">
        <button 
          v-for="cat in categories" 
          :key="cat"
          class="filter-btn"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat === 'All' ? '全部' : getCategoryLabel(cat) }}
        </button>
      </div>
    </header>

    <div class="analysis-grid">
      <NuxtLink 
        v-for="article in filteredArticles" 
        :key="article.id" 
        :to="`/analysis/${article.id}`"
        class="analysis-card"
      >
        <div v-if="article.cover" class="card-cover-wrapper">
          <img :src="article.cover" :alt="article.title" class="card-cover-img" />
        </div>
        
        <div class="card-content">
          <div class="card-meta">
            <span class="card-category">{{ getCategoryLabel(article.category) }}</span>
            <span class="card-date">{{ formatDate(article.created_at) }}</span>
          </div>
          <h3 class="card-title">{{ article.title }}</h3>
          <p class="card-summary">{{ article.summary }}</p>
          <div class="card-footer">
            <span class="read-more">阅读全文</span>
            <Icon name="lucide:chevron-right" class="footer-icon" />
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="filteredArticles.length === 0" class="empty-state">
      <Icon name="lucide:search-x" style="font-size: 3rem; opacity: 0.2;" />
      <p>该分类下暂无文章</p>
    </div>
  </div>
</template>

<style scoped>
.analysis-container {
  padding-bottom: 4rem;
}

.page-header {
  margin-bottom: 3rem;
}

.text-secondary {
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.filter-bar {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 2rem;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.filter-btn.active {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.analysis-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 1.5rem;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.card-cover-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color);
}

.card-cover-img {
  width: 100%;
  height: 100%;
  object-cover: cover;
  transition: transform 0.5s ease;
}

.analysis-card:hover .card-cover-img {
  transform: scale(1.05);
}

.card-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.analysis-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-color);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-category {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent-color);
  background: var(--hover-bg);
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
}

.card-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.4;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.card-summary {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--accent-color);
}

.footer-icon {
  width: 1rem;
  transition: transform 0.2s;
}

.analysis-card:hover .footer-icon {
  transform: translateX(4px);
}

.empty-state {
  text-align: center;
  padding: 5rem 0;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .analysis-grid {
    grid-template-columns: 1fr;
  }
}
</style>
