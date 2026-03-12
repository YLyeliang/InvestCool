<script setup lang="ts">
const config = useRuntimeConfig()

// Fetch Investment Analysis from Flask
const { data: analysis } = await useFetch(`${config.public.apiBase}/analysis`)

// Fetch Tutorials from Nuxt Content (Nuxt 4 / Content v3 style)
const { data: tutorials } = await useAsyncData('tutorials', () => queryCollection('tutorials').all())

// Combine and Sort
const feedItems = computed(() => {
  const items = []
  
  if (analysis.value) {
    const analysisItems = (analysis.value as any[]).map(item => ({
      ...item,
      type: 'analysis'
    }))
    items.push(...analysisItems)
  }
  
  if (tutorials.value) {
    const tutorialItems = (tutorials.value as any[]).map(item => ({
      id: item._path,
      title: item.title,
      summary: item.description,
      category: item.category || 'Tutorial',
      type: 'tutorial',
      created_at: item.date
    }))
    items.push(...tutorialItems)
  }
  
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})
</script>

<template>
  <div>
    <!-- Featured Deep Report: War Impact -->
    <section class="card featured-report" style="border-top: 4px solid #ef4444; padding: 2.5rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
        <span style="background: #fee2e2; color: #ef4444; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">深度专题</span>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0;">炮火下的纳斯达克：历史冲突如何重塑科技市场？</h2>
      </div>

      <div style="margin-bottom: 2rem; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <img src="/nasdaq_war_impact.png" alt="战争对纳斯达克的影响分析图" style="width: 100%; display: block;" />
      </div>

      <div class="report-content" style="line-height: 1.8; color: var(--text-primary);">
        <p>在地缘政治动荡的年代，纳斯达克指数作为全球科技与创新的风向标，其表现往往比传统市场更加敏感。通过对过去 30 年间重大冲突的研究，我们发现了一些规律性的市场密码。</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
          <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid #3b82f6;">
            <div style="font-weight: 700; color: #3b82f6; margin-bottom: 0.25rem;">阶段一：战前恐慌</div>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">市场最厌恶不确定性，纳指通常震荡下跌，资金撤向避险资产。</p>
          </div>
          <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid #ef4444;">
            <div style="font-weight: 700; color: #ef4444; margin-bottom: 0.25rem;">阶段二：开战寻底</div>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">冲突爆发瞬间往往伴随最后的恐慌抛售，形成阶段性底部。</p>
          </div>
          <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid #10b981;">
            <div style="font-weight: 700; color: #10b981; margin-bottom: 0.25rem;">阶段三：回归基本面</div>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">一旦局势明朗，科技龙头的盈利能力将驱动指数强劲反弹。</p>
          </div>
        </div>

        <h3 style="font-size: 1.125rem; font-weight: 700; margin-top: 1.5rem;">核心结论：</h3>
        <ul style="padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.95rem;">
          <li style="margin-bottom: 0.5rem;"><strong>利率是核心：</strong> 战争若引发长效通胀导致加息（如2022年），对纳指是实质性利空；若仅为情绪波动，则反弹极快。</li>
          <li style="margin-bottom: 0.5rem;"><strong>行业分化：</strong> 网络安全（CrowdStrike等）与国防科技在冲突期间往往具有超额收益。</li>
          <li><strong>长线思维：</strong> 历史证明，地缘政治很少能阻断科技创新的长期增长逻辑。</li>
        </ul>
      </div>
    </section>

    <!-- Market Sentiment Index Gauge -->
    <div style="margin: 3rem 0;">
      <MarketSentimentGauge />
    </div>

    <header style="margin: 4rem 0 2.5rem 0;">
      <h2 style="font-size: 1.875rem; font-weight: 700;">最新动态</h2>
      <p style="color: var(--text-secondary);">深度的技术洞察与市场趋势分析。</p>
    </header>

    <div v-for="item in feedItems" :key="item.id" class="card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <span :style="{ 
          padding: '0.25rem 0.75rem', 
          borderRadius: '1rem', 
          fontSize: '0.75rem', 
          fontWeight: '600',
          backgroundColor: item.type === 'tutorial' ? '#dcfce7' : '#dbeafe',
          color: item.type === 'tutorial' ? '#166534' : '#1e40af'
        }">
          {{ item.category === 'Market Trends' ? '市场趋势' : item.category }}
        </span>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">
          {{ item.type === 'tutorial' ? '技术教程' : '投资分析' }}
        </span>
      </div>
      
      <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem; font-weight: 700;">{{ item.title }}</h3>
      <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">{{ item.summary }}</p>
      
      <NuxtLink :to="item.type === 'tutorial' ? item.id : `/analysis/${item.id}`" style="color: var(--accent-color); font-weight: 600; text-decoration: none; display: flex; align-items: center;">
        阅读全文 <Icon name="lucide:arrow-right" style="margin-left: 0.5rem; width: 1rem;" />
      </NuxtLink>
    </div>
  </div>
</template>
