<script setup lang="ts">
import { use, graphic } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import * as echarts from 'echarts/core'

// Register ECharts components
use([LineChart, CanvasRenderer, GridComponent, TooltipComponent, LegendComponent])

// --- Tabs Logic ---
const activeTab = ref('financial-freedom')
const tabs = [
  { id: 'financial-freedom', label: '财富自由', icon: 'lucide:palmtree' },
  { id: 'invest-backtest', label: '定投回测', icon: 'lucide:trending-up' },
  { id: 'position-size', label: '仓位控制', icon: 'lucide:pie-chart' },
  { id: 'tax-calc', label: '税务估算', icon: 'lucide:calculator' }
]

// --- Utils ---
const randn_bm = () => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- TOOL 1: Financial Freedom ---
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

// --- TOOL 2: Backtest Pro (No Dropdown Version) ---
const investAmount = ref(5000)
const investFrequency = ref('monthly') 
const backtestYears = ref(20)
const annualRate = ref(12) 
const marketVolatility = ref(20) 
const modelType = ref('stochastic')
const backtestChartRef = ref<HTMLElement | null>(null)
let backtestChartInstance: echarts.ECharts | null = null
const simSeed = ref(0)

const freqOptions = [
  { l: '日', v: 'daily' },
  { l: '月', v: 'monthly' },
  { l: '年', v: 'yearly' }
]
const modelOptions = [
  { l: '理想', v: 'ideal' },
  { l: '随机', v: 'stochastic' },
  { l: '极限', v: 'stress' }
]

const backtestResult = computed(() => {
  const _ = simSeed.value 
  const stepsMap: Record<string, number> = { daily: 252, monthly: 12, yearly: 1 }
  const stepsPerYear = stepsMap[investFrequency.value] || 12
  const totalSteps = backtestYears.value * stepsPerYear
  const dt = 1 / stepsPerYear
  const mu = annualRate.value / 100
  let sigma = marketVolatility.value / 100
  
  if (modelType.value === 'ideal') sigma = 0
  if (modelType.value === 'stress') sigma *= 2.2

  let totalCapital = 0
  let marketValue = 0
  const chartData = []
  chartData.push({ year: 0, capital: 0, value: 0 })

  for (let i = 1; i <= totalSteps; i++) {
    totalCapital += investAmount.value
    const drift = (mu - 0.5 * sigma * sigma) * dt
    const randomComponent = sigma * Math.sqrt(dt) * randn_bm()
    let shock = 0
    if (modelType.value === 'stress' && Math.random() < (0.05 * dt)) shock = -0.1 - Math.random() * 0.2
    marketValue = (marketValue + investAmount.value) * Math.exp(drift + randomComponent + shock)
    if (i % Math.ceil(totalSteps / 100) === 0 || i === totalSteps) {
      chartData.push({ year: (i / stepsPerYear).toFixed(1), capital: Math.round(totalCapital), value: Math.round(marketValue) })
    }
  }
  return { chartData, finalCapital: totalCapital, finalValue: marketValue, profit: marketValue - totalCapital, roi: totalCapital > 0 ? ((marketValue - totalCapital) / totalCapital) * 100 : 0 }
})

const updateBacktestChart = () => {
  if (!backtestChartRef.value || activeTab.value !== 'invest-backtest') return
  if (!backtestChartInstance) backtestChartInstance = echarts.init(backtestChartRef.value)
  const { chartData } = backtestResult.value
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  backtestChartInstance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: isDark ? '#1e293b' : '#ffffff', textStyle: { color: isDark ? '#f8fafc' : '#1e293b' } },
    legend: { bottom: '0', textStyle: { color: textColor } },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: chartData.map(d => d.year), axisLabel: { color: textColor, formatter: (v: string) => v + '年' } },
    yAxis: { type: 'value', axisLabel: { color: textColor, formatter: (v: number) => v >= 10000 ? (v/10000).toFixed(0) + '万' : v }, splitLine: { lineStyle: { color: gridColor } } },
    series: [
      { name: '累计本金', type: 'line', data: chartData.map(d => d.capital), lineStyle: { width: 1, type: 'dashed' }, itemStyle: { color: '#94a3b8' }, showSymbol: false },
      { name: '市值曲线', type: 'line', smooth: true, data: chartData.map(d => d.value), lineStyle: { width: 3, color: modelType.value === 'stress' ? '#f43f5e' : '#10b981' }, showSymbol: false, areaStyle: { color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: modelType.value === 'stress' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)' }, { offset: 1, color: 'rgba(0,0,0,0)' }]) } }
    ]
  })
}

const runSim = () => { simSeed.value++ }

onMounted(() => {
  updateChart(); updateBacktestChart()
  window.addEventListener('resize', () => { chartInstance?.resize(); backtestChartInstance?.resize(); })
})
watch(activeTab, (newTab) => {
  if (newTab === 'financial-freedom') nextTick(() => updateChart())
  if (newTab === 'invest-backtest') nextTick(() => updateBacktestChart())
})
watch([initialCapital, annualReturn, annualInvestment, annualExpense], () => updateChart())
watch([investAmount, investFrequency, backtestYears, annualRate, marketVolatility, modelType, simSeed], () => updateBacktestChart())

useHead({ title: '策略工具', meta: [{ name: 'description', content: 'InvestCool 投资策略工具箱' }] })
</script>

<template>
  <div class="tools-container">
    <header class="tools-header">
      <h2 class="title text-slate-900 dark:text-white">策略中心</h2>
      <p class="subtitle text-slate-500 font-medium tracking-tight">数据驱动决策，模型预演未来。</p>
    </header>

    <nav class="tool-tabs custom-scrollbar">
      <button v-for="tab in tabs" :key="tab.id" class="tab-btn shadow-sm" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        <Icon :name="tab.icon" class="tab-icon" /> {{ tab.label }}
      </button>
    </nav>

    <div class="tool-content">
      <!-- Tool 1: Financial Freedom -->
      <div v-if="activeTab === 'financial-freedom'" class="tool-view fade-in">
        <div class="calculator-grid">
          <section class="card inputs-card">
            <h3 class="card-title">退休平衡模型</h3>
            <div class="input-group"><label>初始资金 (万)</label><input v-model.number="initialCapital" type="number" /></div>
            <div class="input-group"><label>年化收益 (%)</label><input v-model.number="annualReturn" type="number" /></div>
            <div class="input-group"><label>年度新增 (万)</label><input v-model.number="annualInvestment" type="number" /></div>
            <div class="input-group"><label>年度支出 (万)</label><input v-model.number="annualExpense" type="number" /></div>
            <div class="result-summary" :class="calculationResult.yearsToRunOut === -1 ? 'success' : 'danger'">
              {{ calculationResult.yearsToRunOut === -1 ? '✅ 资金在 100 年内运行稳健。' : `将在第 ${calculationResult.yearsToRunOut} 年耗尽资金。` }}
            </div>
          </section>
          <section class="card chart-card">
            <div class="chart-container"><div ref="chartRef" style="width: 100%; height: 100%;"></div></div>
          </section>
        </div>
      </div>

      <!-- Tool 2: Backtest (Fixed Dropdown Visibility Issue) -->
      <div v-else-if="activeTab === 'invest-backtest'" class="tool-view fade-in">
        <div class="calculator-grid">
          <section class="card inputs-card">
            <div class="flex items-center justify-between mb-8 border-b border-slate-50 dark:border-slate-900 pb-4">
              <h3 class="card-title mb-0">参数设定</h3>
              <UButton variant="soft" color="neutral" size="xs" icon="i-lucide-refresh-cw" @click="runSim">重新模拟</UButton>
            </div>
            
            <div class="space-y-6">
              <!-- 模型选择器: 弃用下拉，改用 Segmented Buttons -->
              <div class="input-group">
                <label>数学模型</label>
                <div class="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button v-for="m in modelOptions" :key="m.v" @click="modelType = m.v"
                    class="flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all"
                    :class="modelType === m.v ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm' : 'text-slate-400'"
                  >{{ m.l }}</button>
                </div>
              </div>

              <!-- 频率选择器: 弃用下拉 -->
              <div class="input-group">
                <label>投入频率</label>
                <div class="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button v-for="f in freqOptions" :key="f.v" @click="investFrequency = f.v"
                    class="flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all"
                    :class="investFrequency === f.v ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm' : 'text-slate-400'"
                  >{{ f.l }}</button>
                </div>
              </div>

              <div class="input-group"><label>单笔金额 (元)</label><input v-model.number="investAmount" type="number" /></div>
              <div class="input-group"><label>回测年限 (年)</label><input v-model.number="backtestYears" type="number" /></div>
              
              <div class="input-group">
                <div class="flex justify-between items-center mb-1">
                  <label class="mb-0">预期年化收益</label>
                  <div class="flex items-center gap-1">
                    <input v-model.number="annualRate" type="number" step="0.1" class="w-16 p-1 text-right text-xs font-black bg-slate-50 dark:bg-slate-900 border-none outline-none text-primary-500 rounded" />
                    <span class="text-xs font-black text-primary-500">%</span>
                  </div>
                </div>
                <URange v-model="annualRate" :min="0" :max="40" :step="0.5" />
              </div>
              <div v-if="modelType !== 'ideal'" class="input-group">
                <div class="flex justify-between items-center mb-1">
                  <label class="mb-0">市场波动率</label>
                  <div class="flex items-center gap-1">
                    <input v-model.number="marketVolatility" type="number" step="1" class="w-16 p-1 text-right text-xs font-black bg-slate-50 dark:bg-slate-900 border-none outline-none text-orange-500 rounded" />
                    <span class="text-xs font-black text-orange-500">%</span>
                  </div>
                </div>
                <URange v-model="marketVolatility" :min="0" :max="100" color="orange" />
              </div>

            </div>

            <div class="stats-summary border-t border-slate-100 dark:border-slate-900 pt-8 mt-10">
              <!-- 模型说明 -->
              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-6 animate-in fade-in slide-in-from-top-1">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">当前模型解析</div>
                <p class="text-xs font-bold leading-relaxed text-slate-500 italic">
                  {{ 
                    modelType === 'ideal' ? '理想复利模型：假设收益率恒定，展示资产增长的理论上限。' : 
                    modelType === 'stochastic' ? 'GBM 随机漫步：模拟真实市场噪音，资产路径遵循几何布朗运动。' : 
                    '压力测试模型：模拟极端波动环境，包含突发性的大幅回撤风险项。'
                  }}
                </p>
              </div>

              <div class="stat-row"><span class="label">累计本金</span><span class="value">¥{{ backtestResult.finalCapital.toLocaleString() }}</span></div>
              <div class="stat-row highlight"><span class="label">模拟市值</span><span class="value">¥{{ Math.round(backtestResult.finalValue).toLocaleString() }}</span></div>
              <div class="stat-row"><span class="label">总 ROI</span><span class="value success">{{ backtestResult.roi.toFixed(1) }}%</span></div>
            </div>
          </section>
          
          <section class="card chart-card">
            <div class="chart-container"><div ref="backtestChartRef" style="width: 100%; height: 100%;"></div></div>
          </section>
        </div>
      </div>

      <!-- Other Placeholders -->
      <div v-else class="tool-view placeholder fade-in">
        <div class="card empty-card">
          <Icon name="lucide:construction" class="empty-icon" />
          <h3>建设中</h3>
          <p class="text-slate-400">正在进行数学建模与视觉对齐。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tools-container { padding-bottom: 3rem; }
.tools-header { margin-bottom: 3rem; }
.title { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.06em; margin-bottom: 0.5rem; }
.tool-tabs { display: flex; gap: 0.75rem; margin-bottom: 3.5rem; overflow-x: auto; padding-bottom: 0.5rem; }
.tab-btn { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.75rem; border-radius: 1.25rem; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); font-weight: 800; font-size: 0.85rem; white-space: nowrap; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.tab-btn.active { background: var(--accent-color); color: white; border-color: var(--accent-color); box-shadow: 0 15px 30px -10px rgba(59, 130, 246, 0.5); }
.calculator-grid { display: grid; grid-template-columns: 360px 1fr; gap: 2rem; align-items: start; }
.card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 2.5rem; padding: 2.5rem; }
.card-title { font-size: 0.7rem; font-weight: 950; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 2rem; color: var(--text-secondary); }
.input-group { margin-bottom: 1.75rem; }
.input-group label { display: block; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; margin-bottom: 0.75rem; opacity: 0.5; }
.input-group input { width: 100%; padding: 0.9rem 1.25rem; border-radius: 1.25rem; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: 1.1rem; font-weight: 800; outline: none; }
.result-summary { margin-top: 2rem; padding: 1.5rem; border-radius: 1.5rem; font-size: 0.95rem; font-weight: 900; }
.result-summary.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.result-summary.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.stats-summary { display: flex; flex-direction: column; gap: 1.5rem; }
.stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 1rem; }
.stat-row .value { font-weight: 950; font-family: 'JetBrains Mono', monospace; }
.stat-row.highlight { padding: 1.5rem; background: var(--hover-bg); border-radius: 2rem; margin: 0.5rem 0; border: 1px solid var(--border-color); }
.chart-card { height: 650px; display: flex; flex-direction: column; }
.chart-container { flex: 1; min-height: 0; }
.empty-card { text-align: center; padding: 10rem 2rem; border-style: dashed; }
.fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 1280px) { .calculator-grid { grid-template-columns: 1fr; } .chart-card { height: 500px; } }
</style>
