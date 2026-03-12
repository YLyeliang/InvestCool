<script setup lang="ts">
const config = useRuntimeConfig()

// Fetch Investment Analysis from Backend
const { data: analyses } = await useFetch(`${config.public.apiBase}/analysis`)

// NASDAQ 100 Index Data Fetching
const nasdaqIndex = ref(0)
const nasdaqChange = ref(0)
const nasdaqPercent = ref(0)
const lastUpdate = ref('正在加载...')
const isFetching = ref(false)

const fetchNasdaqData = async () => {
  isFetching.value = true
  try {
    // Using a timestamp to prevent caching
    const data = await $fetch(`${config.public.apiBase}/nasdaq?t=${Date.now()}`)
    if (data) {
      nasdaqIndex.value = (data as any).index
      nasdaqChange.value = (data as any).change
      nasdaqPercent.value = (data as any).percent
      lastUpdate.value = (data as any).last_update
    }
  } catch (e) {
    console.error('Failed to fetch NASDAQ data', e)
  } finally {
    // Smooth transition
    setTimeout(() => { isFetching.value = false }, 800)
  }
}

let timer: any = null
onMounted(() => {
  fetchNasdaqData()
  timer = setInterval(fetchNasdaqData, 60000) // Update every minute
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div>
    <header style="margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.875rem; font-weight: 700;">投资分析</h2>
      <p style="color: var(--text-secondary);">专业的市场研究与指数跟踪。</p>
    </header>

    <!-- NASDAQ Tracker Widget -->
    <div class="card" style="background: #0f172a; color: white; border: none; padding: 2rem; position: relative; overflow: hidden;">
      <div style="position: absolute; right: -20px; top: -20px; opacity: 0.1;">
        <Icon name="lucide:trending-up" style="width: 150px; height: 150px;" />
      </div>
      
      <div style="position: relative; z-index: 1;">
        <div style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; margin-bottom: 0.5rem;">NASDAQ 100 Index (NDX)</div>
        <div style="display: flex; align-items: baseline; gap: 1.5rem;">
          <span style="font-size: 2.5rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; transition: opacity 0.3s;" :style="{ opacity: isFetching ? 0.5 : 1 }">
            {{ nasdaqIndex.toFixed(2) }}
          </span>
          <span :style="{ color: nasdaqChange >= 0 ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '1.25rem', opacity: isFetching ? 0.5 : 1 }" style="transition: opacity 0.3s;">
            {{ nasdaqChange >= 0 ? '+' : '' }}{{ nasdaqChange.toFixed(2) }} 
            ({{ nasdaqPercent.toFixed(2) }}%)
          </span>
        </div>
        <div style="margin-top: 1.5rem; font-size: 0.75rem; opacity: 0.5; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center;">
            <Icon name="lucide:clock" style="margin-right: 0.4rem; width: 0.8rem;" />
            最后更新: {{ lastUpdate }}
          </div>
          <div style="display: flex; align-items: center; cursor: pointer; user-select: none;" @click="fetchNasdaqData">
            <Icon name="lucide:refresh-cw" style="margin-right: 0.4rem; width: 0.8rem;" :class="{ 'spin-anim': isFetching }" />
            {{ isFetching ? '正在同步行情...' : '点击强制刷新' }}
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top: 3rem;">
      <h3 style="font-size: 1.25rem; margin-bottom: 1.5rem; font-weight: 700;">深度报告</h3>
      <div v-for="item in analyses" :key="item.id" class="card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <span style="padding: 0.25rem 0.75rem; borderRadius: 1rem; fontSize: 0.75rem; fontWeight: '600'; backgroundColor: '#dbeafe'; color: '#1e40af';">
            {{ item.category === 'Market Trends' ? '市场趋势' : item.category }}
          </span>
        </div>
        <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem; font-weight: 700;">{{ item.title }}</h3>
        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">{{ item.summary }}</p>
        <NuxtLink :to="`/analysis/${item.id}`" style="color: var(--accent-color); font-weight: 600; text-decoration: none; display: flex; align-items: center;">
          阅读报告 <Icon name="lucide:arrow-right" style="margin-left: 0.5rem; width: 1rem;" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-anim {
  animation: spin 1s linear infinite;
}
</style>
