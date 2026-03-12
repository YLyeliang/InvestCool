<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

// Inputs
const initialCapital = ref(100) // 万
const annualReturn = ref(8) // %
const annualInvestment = ref(10) // 万
const annualExpense = ref(20) // 万

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

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
  if (!chartCanvas.value) return
  
  const { data } = calculationResult.value
  const labels = data.map(d => `第 ${d.year} 年`)
  const balances = data.map(d => d.balance)

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '账户余额 (万)',
        data: balances,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { callback: (value) => value + '万' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  })
}

onMounted(() => {
  updateChart()
})

watch([initialCapital, annualReturn, annualInvestment, annualExpense], () => {
  updateChart()
})
</script>

<template>
  <div class="tools-page">
    <header style="margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.875rem; font-weight: 700;">财富自由计算器</h2>
      <p style="color: var(--text-secondary);">规划您的财务未来，计算资产的可持续性。</p>
    </header>

    <div class="calculator-grid">
      <!-- Inputs Section -->
      <section class="card inputs-card">
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

        <div class="result-summary" :style="{ backgroundColor: calculationResult.yearsToRunOut === -1 ? '#dcfce7' : '#fee2e2' }">
          <div v-if="calculationResult.yearsToRunOut === -1" style="color: #166534; font-weight: 600;">
            ✅ 恭喜！根据当前模型，您的资金在 100 年内不会用完。
          </div>
          <div v-else style="color: #991b1b; font-weight: 600;">
            ⚠️ 警示：您的资金预计将在第 {{ calculationResult.yearsToRunOut }} 年用完。
          </div>
        </div>
      </section>

      <!-- Chart Section -->
      <section class="card chart-card">
        <h3 style="font-size: 1rem; margin-bottom: 1.5rem; font-weight: 600;">资产走势预演 (100年)</h3>
        <div class="chart-container">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.calculator-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: var(--accent-color);
}

.result-summary {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.chart-card {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  position: relative;
}

@media (max-width: 1024px) {
  .calculator-grid {
    grid-template-columns: 1fr;
  }
  .chart-card {
    height: 400px;
  }
}
</style>
