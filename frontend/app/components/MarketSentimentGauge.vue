<template>
  <div class="sentiment-gauge-container">
    <div class="gauge-header">
      <h3 class="text-base font-bold">市场情绪指数</h3>
      <span class="text-[10px] text-gray-400">10min 自动刷新</span>
    </div>
    
    <!-- Skeleton while loading -->
    <div v-if="pending" class="loading-wrapper">
      <Skeleton width="140px" height="140px" radius="50%" />
    </div>

    <!-- Chart Container -->
    <div ref="chartRef" v-show="!pending" class="gauge-chart"></div>

    <!-- Bottom Details -->
    <div v-if="metric && !pending" class="gauge-details">
      <div class="detail-item">
        <span class="label">RSI:</span>
        <span class="value">{{ metric.details.rsi }}</span>
      </div>
      <div class="detail-item">
        <span class="label">VIX:</span>
        <span class="value">{{ metric.details.vix }}</span>
      </div>
      <div class="detail-item">
        <span class="label">估值:</span>
        <span class="value">{{ metric.details.valuation }}</span>
      </div>
      <div class="detail-item">
        <span class="label">宏观:</span>
        <span class="value">{{ metric.details.macro }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

const config = useRuntimeConfig();
const chartRef = ref(null);
let chartInstance = null;
const metric = ref(null);
const pending = ref(true);
let refreshInterval = null;
let themeObserver = null;

const fetchMetric = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/market-index`);
    if (response.status === 200) {
      const data = await response.json();
      metric.value = data;
      pending.value = false;
      setTimeout(() => updateChart(data.value), 0);
    }
  } catch (e) {
    console.error('Failed to fetch market index:', e);
  }
};

const updateChart = (value) => {
  if (chartInstance) {
    chartInstance.dispose();
  }
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
  }
  if (!chartInstance) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 190,
        endAngle: -10,
        center: ['50%', '65%'],
        radius: '95%',
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 8,
            color: [
              [0.3, '#10b981'],
              [0.5, '#34d399'],
              [0.7, '#fbbf24'],
              [0.85, '#f97316'],
              [1, '#ef4444']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,10.1c0.4,0.3,0.4,0.9,0.1,1.2c-0.3,0.4-0.9,0.4-1.2,0.1L12,2.3L0.3,12.1c-0.4,0.3-0.9,0.3-1.2-0.1c-0.3-0.4-0.3-0.9,0.1-1.2L11.2,0.7C11.7,0.3,12.3,0.3,12.8,0.7z',
          length: '12%',
          width: 6,
          offsetCenter: [0, '-55%'],
          itemStyle: { color: 'auto' }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: labelColor,
          fontSize: 10,
          distance: -45,
          formatter: function (v) {
            if (v === 15) return '极度恐惧';
            if (v === 85) return '极度贪婪';
            return '';
          }
        },
        detail: {
          fontSize: 22,
          offsetCenter: [0, '15%'],
          valueAnimation: true,
          formatter: '{value}',
          color: 'auto',
          fontWeight: '800'
        },
        data: [{ value: value }]
      }
    ]
  };
  
  chartInstance.setOption(option);
};

onMounted(() => {
  fetchMetric();
  refreshInterval = setInterval(fetchMetric, 10 * 60 * 1000);
  
  // Watch for theme changes to refresh chart colors
  themeObserver = new MutationObserver(() => {
    if (metric.value) updateChart(metric.value.value);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  
  window.addEventListener('resize', () => chartInstance?.resize());
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (themeObserver) themeObserver.disconnect();
  chartInstance?.dispose();
});
</script>

<style scoped>
.sentiment-gauge-container {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.gauge-chart {
  height: 140px;
  width: 100%;
}

.loading-wrapper {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge-details {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color);
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-item .label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin-bottom: 0.1rem;
}

.detail-item .value {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
}
</style>
