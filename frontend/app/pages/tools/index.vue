<script setup lang="ts">
import { use, graphic } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import * as echarts from 'echarts/core'

// Register ECharts components
use([LineChart, CanvasRenderer, GridComponent, TooltipComponent, LegendComponent])

// Tabs Logic
const activeTab = ref('financial-freedom')
const tabs = [
  { id: 'financial-freedom', label: '财富自由', icon: 'lucide:palmtree' },
  { id: 'compound-interest', label: '复利模拟', icon: 'lucide:trending-up' },
  { id: 'position-size', label: '仓位控制', icon: 'lucide:pie-chart' },
  { id: 'tax-calc', label: '税务估算', icon: 'lucide:calculator' }
]

// --- TOOL 1: Financial Freedom Logic ---
const initialCapital = ref(100)
const annualReturn = ref(8)
const annualInvestment = ref(10)
const annualExpense = ref(20)
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const calculationResult = computed(() => {
  const data = []
  let balance = initialCapital.value
  let yearsToRunOut = -1
  data.push({ year: 0, balance: balance })
  for (let i = 1; i <= 100; i++) {
    balance = balance * (1 + annualReturn.value / 100) + annualInvestment.value - annualExpense.value
    if (balance < 0) {
      data.push({ year: i, balance: 0 })
      if (yearsToRunOut === -1) yearsToRunOut = i
      break
    }
    data.push({ year: i, balance: Math.round(balance * 100) / 100 })
  }
  return { data, yearsToRunOut }
})

const updateChart = () => {
  if (!chartRef.value || activeTab.value !== 'financial-freedom') return
  if (!chartInstance) chartInstance = echarts.init(chartRef.value)
  
  const { data } = calculationResult.value
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  chartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: isDark ? '#1e293b' : '#ffffff', textStyle: { color: isDark ? '#f8fafc' : '#1e293b' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.map(d => `第${d.year}年`), axisLabel: { color: textColor, interval: 9 } },
    yAxis: { type: 'value', axisLabel: { color: textColor }, splitLine: { lineStyle: { color: gridColor, type: 'dashed' } } },
    series: [{ name: '账户余额', type: 'line', smooth: true, showSymbol: false, data: data.map(d => d.balance), lineStyle: { width: 3, color: '#3b82f6' }, areaStyle: { color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59, 130, 246, 0.3)' }, { offset: 1, color: 'rgba(59, 130, 246, 0)' }]) } }]
  })
}

// Watchers and lifecycle
onMounted(() => {
  updateChart()
  window.addEventListener('resize', () => chartInstance?.resize())
})
watch(activeTab, (newTab) => {
  if (newTab === 'financial-freedom') {
    nextTick(() => updateChart())
  }
})
watch([initialCapital, annualReturn, annualInvestment, annualExpense], () => updateChart())

useHead({ title: '策略工具', meta: [{ name: 'description', content: 'InvestCool 投资策略工具箱：包含财富自由计算、复利模拟等专业工具。' }] })
</script>

<template>
  <div class="tools-container">
    <header class="tools-header">
      <h2 class="title">策略工具</h2>
      <p class="subtitle">数据驱动决策，模型预演未来。</p>
    </header>

    <!-- Sub-category Navigation Tabs -->
    <nav class="tool-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <Icon :name="tab.icon" class="tab-icon" />
        {{ tab.label }}
      </button>
    </nav>

    <!-- Tool View Area -->
    <div class="tool-content">
      
      <!-- 1. Financial Freedom Tool -->
      <div v-if="activeTab === 'financial-freedom'" class="tool-view fade-in">
        <div class="calculator-grid">
          <section class="card inputs-card">
            <h3 class="card-title">模型参数</h3>
            <div class="input-group">
              <label>初始资金 (万)</label>
              <input v-model.number="initialCapital" type="number" step="10" />
            </div>
            <div class="input-group">
              <label>预期年化收益率 (%)</label>
              <input v-model.number="annualReturn" type="number" step="0.5" />
            </div>
            <div class="input-group">
              <label>每年新增投入 (万)</label>
              <input v-model.number="annualInvestment" type="number" step="1" />
            </div>
            <div class="input-group">
              <label>每年固定花费 (万)</label>
              <input v-model.number="annualExpense" type="number" step="1" />
            </div>

            <div class="result-summary" :class="calculationResult.yearsToRunOut === -1 ? 'success' : 'danger'">
              <div v-if="calculationResult.yearsToRunOut === -1">
                ✅ 资金在 100 年内不会用完。
              </div>
              <div v-else>
                ⚠️ 预计将在第 {{ calculationResult.yearsToRunOut }} 年用完。
              </div>
            </div>
          </section>

          <section class="card chart-card">
            <h3 class="card-title">资产走势预演 (100年)</h3>
            <div class="chart-container">
              <div ref="chartRef" style="width: 100%; height: 100%;"></div>
            </div>
          </section>
        </div>
      </div>

      <!-- 2. Placeholder Tools -->
      <div v-else class="tool-view placeholder fade-in">
        <div class="card empty-card">
          <Icon name="lucide:construction" class="empty-icon" />
          <h3>工具建设中</h3>
          <p>「{{ tabs.find(t => t.id === activeTab)?.label }}」工具正在进行最后的量化校准，敬请期待。</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.tools-container { padding-bottom: 3rem; }
.tools-header { margin-bottom: 2rem; }
.title { font-size: 1.875rem; font-weight: 800; color: var(--text-primary); }
.subtitle { color: var(--text-secondary); }

/* Navigation Tabs */
.tool-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-width: none;
}
.tool-tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1.25rem;
  border-radius: 2rem;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover { border-color: var(--accent-color); color: var(--text-primary); }
.tab-btn.active {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.tab-icon { font-size: 1.1rem; }

/* Grid Layouts */
.calculator-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.card-title { font-size: 1rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary); }

.input-group { margin-bottom: 1.25rem; }
.input-group label { display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.5rem; opacity: 0.8; }
.input-group input {
  width: 100%; padding: 0.7rem; border-radius: 0.5rem; border: 1px solid var(--border-color);
  background: var(--bg-color); color: var(--text-primary); font-size: 1rem; outline: none; transition: border-color 0.2s;
}
.input-group input:focus { border-color: var(--accent-color); }

.result-summary { margin-top: 1.5rem; padding: 1rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 700; }
.result-summary.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.result-summary.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.chart-card { height: 500px; display: flex; flex-direction: column; }
.chart-container { flex: 1; min-height: 0; }

.empty-card {
  text-align: center; padding: 5rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;
}
.empty-icon { font-size: 3rem; opacity: 0.2; }

/* Animations */
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1024px) {
  .calculator-grid { grid-template-columns: 1fr; }
  .chart-card { height: 400px; }
}
</style>
