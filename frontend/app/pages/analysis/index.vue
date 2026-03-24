<script setup lang="ts">
// Fetch all items from analysis collection, ensuring visibility
const { data: allArticles } = await useAsyncData('analysis-list', () => 
  queryCollection('analysis').all()
)

const activeCategory = ref('全部')

// Mandatory categories according to change.md
const standardCategories = ['全部', '投资入门', '深度分析', '公司基本面', 'AI']

const categories = computed(() => {
  if (!allArticles.value) return standardCategories
  const existingCats = [...new Set(allArticles.value.map(a => a.category))].filter(Boolean)
  return [...new Set([...standardCategories, ...existingCats])]
})

// Computed filter for robust UI
const filteredArticles = computed(() => {
  if (!allArticles.value) return []
  let items = allArticles.value.filter(a => a.is_deleted !== true && a.is_deleted !== 'True')
  
  if (activeCategory.value === '全部') return items
  return items.filter(a => a.category === activeCategory.value)
})

useHead({
  title: '深度投研分析 - InvestCool',
  meta: [
    { name: 'description', content: '专注于纳斯达克100指数及核心科技股的专业投研分析。' }
  ]
})
</script>

<template>
  <div class="analysis-page">
    <!-- Hero Section -->
    <header class="analysis-hero">
      <div class="hero-content">
        <div class="badge premium-badge">Premium Analysis</div>
        <h2 class="hero-title">洞察纳斯达克 100 <br/><span class="text-accent">把握科技股脉搏</span></h2>
        <p class="hero-subtitle">由 AI 辅助，结合宏观经济指标与实时盘面数据，为您呈现深度的投研见解。</p>
      </div>
    </header>

    <!-- Filter & Content Area -->
    <div class="content-container">
      <div class="filter-bar">
        <div class="categories-scroll">
          <div class="categories">
            <button v-for="cat in categories" :key="cat" 
                    @click="activeCategory = cat"
                    class="filter-btn" :class="{ 'active': activeCategory === cat }">
              {{ cat }}
            </button>
          </div>
        </div>
        <div class="search-box">
          <Icon name="lucide:search" class="search-icon" />
          <input type="text" placeholder="搜索报告标题..." class="search-input" />
        </div>
      </div>

      <!-- Animation wrapper for smooth transitions -->
      <TransitionGroup name="list" tag="div" class="articles-grid">
        <PremiumPostCard v-for="article in filteredArticles" :key="article.path" :article="article" />
      </TransitionGroup>

      <!-- Empty State -->
      <div v-if="filteredArticles.length === 0" class="empty-state">
        <Icon name="lucide:file-question" class="empty-icon" />
        <p>暂无相关类别的分析报告</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-page { min-height: 100vh; padding-bottom: 5rem; }

.analysis-hero {
  padding: 5rem 0;
  background: radial-gradient(circle at top right, rgba(93, 135, 255, 0.08), transparent),
              radial-gradient(circle at bottom left, rgba(93, 135, 255, 0.03), transparent);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 3.5rem;
}

.hero-content { max-width: 800px; }

.premium-badge {
  background: var(--accent-soft);
  color: var(--accent-color);
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  display: inline-block;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1.1;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}

.text-accent { color: var(--accent-color); }

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  max-width: 600px;
  line-height: 1.6;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  gap: 2rem;
}

.categories-scroll { flex: 1; overflow-x: auto; padding-bottom: 5px; }
.categories-scroll::-webkit-scrollbar { height: 4px; }
.categories-scroll::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

.categories { display: flex; gap: 0.75rem; }

.filter-btn {
  white-space: nowrap;
  padding: 0.7rem 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-btn:hover { border-color: var(--accent-color); color: var(--accent-color); transform: translateY(-2px); }
.filter-btn.active { 
  background: var(--accent-color); 
  color: white; 
  border-color: var(--accent-color); 
  box-shadow: 0 8px 20px rgba(93, 135, 255, 0.3); 
}

.search-box { position: relative; max-width: 320px; width: 100%; }
.search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); }
.search-input {
  width: 100%; padding: 0.8rem 1rem 0.8rem 2.75rem; border-radius: var(--radius-md);
  border: 1px solid var(--border-color); background: var(--card-bg); font-size: 0.95rem; outline: none; transition: all 0.3s;
}
.search-input:focus { border-color: var(--accent-color); box-shadow: 0 0 0 4px var(--accent-soft); }

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2.5rem;
}

/* Transition Group Animations */
.list-enter-active, .list-leave-active { transition: all 0.5s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(30px); }

.empty-state { text-align: center; padding: 6rem 0; color: var(--text-tertiary); }
.empty-icon { font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.2; }

@media (max-width: 1024px) {
  .hero-title { font-size: 2.75rem; }
  .filter-bar { flex-direction: column; align-items: flex-start; }
  .search-box { max-width: 100%; }
}
</style>
