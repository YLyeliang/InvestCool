<script setup lang="ts">
const config = useRuntimeConfig()

// Fetch Investment Analysis from Flask
const { data: analysis } = await useFetch(`${config.public.apiBase}/analysis?type=analysis`)

// Fetch Tutorials from Flask
const { data: tutorialsData } = await useFetch(`${config.public.apiBase}/analysis?type=tutorial`)

useHead({
  title: '首页',
  meta: [
    { name: 'description', content: 'InvestCool - 深度纳斯达克100指数分析、市场情绪实时追踪及 AI 投资技术分享。' }
  ]
})

// Combine and Sort
const feedItems = computed(() => {
  const items = []
  
  if (analysis.value && Array.isArray(analysis.value)) {
    const analysisItems = (analysis.value as any[]).map(item => ({
      title: item.title || '无标题',
      summary: item.summary || '暂无摘要',
      path: `/analysis/${item.id}`,
      type: 'analysis',
      category: item.category || '未分类',
      created_at: item.created_at || new Date().toISOString(),
      unique_key: `analysis-${item.id}`
    }))
    items.push(...analysisItems)
  }
  
  if (tutorialsData.value && Array.isArray(tutorialsData.value)) {
    const tutorialItems = (tutorialsData.value as any[]).map((item) => ({
      path: `/tutorials/${item.id}`,
      title: item.title || '无标题',
      summary: item.summary || '暂无描述',
      category: item.category || '开源项目',
      type: 'tutorial',
      created_at: item.created_at || new Date().toISOString(),
      unique_key: `tutorial-${item.id}`
    }))
    items.push(...tutorialItems)
  }
  
  return items.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return dateB - dateA
  })
})
</script>

<template>
  <div class="home-page">
    <!-- Featured Deep Report: War Impact -->
    <section class="card featured-report">
      <div class="featured-badge-group">
        <span class="badge-featured">深度专题</span>
        <h2 class="featured-title">炮火下的纳斯达克：历史冲突如何重塑科技市场？</h2>
      </div>

      <div class="featured-image-wrapper">
        <img src="/nasdaq_war_impact.png" alt="战争对纳斯达克的影响分析图" />
      </div>

      <div class="report-content">
        <p>在地缘政治动荡的年代，纳斯达克指数作为全球科技与创新的风向标，其表现往往比传统市场更加敏感。</p>
        
        <div class="analysis-phases">
          <div class="phase-item phase-panic">
            <div class="phase-label">阶段一：战前恐慌</div>
            <p>市场最厌恶不确定性，纳指通常震荡下跌。</p>
          </div>
          <div class="phase-item phase-bottom">
            <div class="phase-label">阶段二：开战寻底</div>
            <p>冲突爆发瞬间往往伴随最后的恐慌抛售。</p>
          </div>
          <div class="phase-item phase-recovery">
            <div class="phase-label">阶段三：回归基本面</div>
            <p>局局势明朗后，科技龙头将驱动强劲反弹。</p>
          </div>
        </div>

        <h3 class="conclusion-title">核心结论：</h3>
        <ul class="conclusion-list">
          <li><strong>利率是核心：</strong> 战争若引发长效通胀导致加息（如2022年），对纳指是实质性利空；若仅为情绪波动，则反弹极快。</li>
          <li><strong>行业分化：</strong> 网络安全（CrowdStrike等）与国防科技在冲突期间往往具有超额收益。</li>
          <li><strong>长线思维：</strong> 历史证明，地缘政治很少能阻断科技创新的长期增长逻辑。</li>
        </ul>
      </div>
    </section>

    <!-- Global Market Overview Bar -->
    <div class="section-spacer">
      <GlobalMarketBar />
    </div>

    <!-- User Sentiment Duel Poll -->
    <div class="section-spacer">
      <SentimentDuel />
    </div>

    <!-- Market Sentiment Index Gauge -->
    <div class="section-spacer-large">
      <LazyMarketSentimentGauge />
    </div>

    <header class="feed-header">
      <h2>最新动态</h2>
      <p>深度的技术洞察与市场趋势分析。</p>
    </header>

    <!-- Feed Items -->
    <div v-for="item in feedItems" :key="item.unique_key" class="card feed-item" :class="{ 'has-cover': item.cover }">
      <div v-if="item.cover" class="feed-item-cover">
        <img :src="item.cover" :alt="item.title" />
      </div>
      
      <div class="feed-item-content">
        <div class="item-meta">
          <span class="badge-category" :class="item.type">
            {{ item.category }}
          </span>
          <span class="item-type-label">
            {{ item.type === 'tutorial' ? '技术教程' : '投资分析' }}
          </span>
        </div>
        
        <h3 class="item-title">{{ item.title }}</h3>
        <p class="item-summary">{{ item.summary }}</p>
        
        <NuxtLink :to="item.path" class="read-more-link">
          阅读全文 <Icon name="lucide:arrow-right" class="arrow-icon" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding-bottom: 2rem;
}

/* Featured Report Styles */
.featured-report {
  border-top: 4px solid #ef4444;
  padding: 1.5rem;
}

.featured-badge-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.badge-featured {
  background: #fee2e2;
  color: #ef4444;
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.featured-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.featured-image-wrapper {
  margin-bottom: 1.5rem;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

.featured-image-wrapper img {
  width: 100%;
  display: block;
}

.report-content {
  line-height: 1.6;
  color: var(--text-primary);
}

.analysis-phases {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.phase-item {
  background: var(--hover-bg);
  padding: 0.75rem;
  border-radius: 0.5rem;
  border-left: 3px solid transparent;
}

.phase-item p {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.phase-label {
  font-weight: 700;
  margin-bottom: 0.2rem;
  font-size: 0.9rem;
}

.phase-panic { border-left-color: #3b82f6; }
.phase-panic .phase-label { color: #3b82f6; }

.phase-bottom { border-left-color: #ef4444; }
.phase-bottom .phase-label { color: #ef4444; }

.phase-recovery { border-left-color: #10b981; }
.phase-recovery .phase-label { color: #10b981; }

.conclusion-title {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 1rem;
}

.conclusion-list {
  padding-left: 1.25rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.conclusion-list li {
  margin-bottom: 0.5rem;
}

/* Spacers */
.section-spacer {
  margin-bottom: 2rem;
}

.section-spacer-large {
  margin-bottom: 3rem;
}

/* Feed Styles */
.feed-header {
  margin: 4rem 0 2.5rem 0;
}

.feed-header h2 {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
}

.feed-header p {
  color: var(--text-secondary);
}

.feed-item {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow: hidden;
}

@media (min-width: 768px) {
  .feed-item.has-cover {
    flex-direction: row;
    align-items: flex-start;
  }
}

.feed-item-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0.75rem;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}

@media (min-width: 768px) {
  .feed-item-cover {
    width: 240px;
    height: 135px;
  }
}

.feed-item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.feed-item:hover .feed-item-cover img {
  transform: scale(1.05);
}

.feed-item-content {
  flex-grow: 1;
  min-width: 0;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.badge-category {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-category.tutorial {
  background-color: #dcfce7;
  color: #166534;
}

.badge-category.analysis {
  background-color: #dbeafe;
  color: #1e40af;
}

.item-type-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.item-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.item-summary {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.read-more-link {
  color: var(--accent-color);
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}

.read-more-link:hover {
  opacity: 0.8;
}

.arrow-icon {
  margin-left: 0.5rem;
  width: 1rem;
}
</style>
