<template>
  <div class="sentiment-gauge-container" :class="{ 'is-loading': pending || isInitializing, 'is-error': isError }">
    <div class="gauge-header">
      <div class="title-group">
        <h3 class="text-base font-bold">市场情绪指数</h3>
        <div v-if="isError" class="status-indicator error">离线</div>
        <div v-else-if="isInitializing" class="status-indicator warning">同步中</div>
      </div>
      <span class="text-[10px] text-gray-400">10min 自动刷新</span>
    </div>
    
    <!-- Skeleton while loading (initial) -->
    <div v-if="pending && !data" class="loading-wrapper">
      <Skeleton width="140px" height="140px" radius="50%" />
    </div>

    <!-- Chart Container -->
    <div ref="chartRef" v-show="!pending || data" class="gauge-chart" :class="{ 'dimmed': isError }"></div>

    <!-- Bottom Details -->
    <div v-if="data" class="gauge-details">
      <div v-for="(val, key) in data.details" :key="key" class="detail-item">
        <span class="label">{{ formatKey(key) }}:</span>
        <span class="value">{{ val }}</span>
      </div>
    </div>

    <!-- Error Overlay -->
    <div v-if="isError" class="error-overlay">
      <Icon name="lucide:refresh-cw" class="retry-icon" @click="fetchMetric" />
    </div>
  </div>
</template>

<script setup>
import { use } from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';

// Register necessary components
use([GaugeChart, CanvasRenderer, GridComponent, TooltipComponent]);

const config = useRuntimeConfig();
const chartRef = ref(null);
let chartInstance = null;
const data = ref(null);
const pending = ref(true);
const isError = ref(false);
const isInitializing = ref(false);
let refreshInterval = null;
let themeObserver = null;

const fetchMetric = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/market-index`);
    
    if (response.status === 200) {
      const result = await response.json();
      data.value = result;
      isError.value = false;
      isInitializing.value = false;
      pending.value = false;
      setTimeout(() => updateChart(result.value), 0);
    } else if (response.status === 202) {
      isInitializing.value = true;
      isError.value = false;
      pending.value = false;
    } else {
      throw new Error('Server Error');
    }
  } catch (e) {
    console.error('Failed to fetch market index:', e);
    isError.value = true;
    isInitializing.value = false;
    pending.value = false;
  }
};

const formatKey = (key) => {
  const map = { rsi: 'RSI', vix: 'VIX', valuation: '估值', macro: '宏观' };
  return map[key] || key;
};

const updateChart = (value) => {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelColor = isDark ? '#94a3b8' : '#64748b';
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 190,
        endAngle: -10,
        center: ['50%', '70%'],
        radius: '100%',
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 6,
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
          length: '10%',
          width: 4,
          offsetCenter: [0, '-50%'],
          itemStyle: { color: isError.value ? '#64748b' : 'auto' }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: labelColor,
          fontSize: 9,
          distance: -40,
          formatter: function (v) {
            if (v === 15) return '极度恐惧';
            if (v === 85) return '极度贪婪';
            return '';
          }
        },
        detail: {
          fontSize: 18,
          offsetCenter: [0, '20%'],
          valueAnimation: true,
          formatter: '{value}',
          color: isError.value ? '#64748b' : 'auto',
          fontWeight: '800'
        },
        data: [{ value: value }]
      }
    ]
  };
  
  chartInstance.setOption(option);
};

const startPolling = () => {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') fetchMetric();
  }, 10 * 60 * 1000);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchMetric();
    startPolling();
  }
};

onMounted(() => {
  fetchMetric();
  startPolling();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  themeObserver = new MutationObserver(() => {
    if (data.value) updateChart(data.value.value);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  
  window.addEventListener('resize', () => chartInstance?.resize());
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (themeObserver) themeObserver.disconnect();
  chartInstance?.dispose();
});
</script>

<style scoped>
.sentiment-gauge-container {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color 0.3s;
}

.sentiment-gauge-container.is-error {
  border-color: rgba(239, 68, 68, 0.3);
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.15rem;
  color: var(--text-primary);
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.title-group h3 {
  font-size: 0.875rem;
}

.status-indicator {
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.05rem 0.3rem;
  border-radius: 0.2rem;
  text-transform: uppercase;
}

.status-indicator.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.status-indicator.warning { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }

.gauge-chart {
  height: 110px;
  width: 100%;
  transition: filter 0.3s;
}

.gauge-chart.dimmed {
  filter: grayscale(1) opacity(0.5);
}

.loading-wrapper {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge-details {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.2rem;
  margin-top: 0.25rem;
  padding-top: 0.5rem;
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

.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.retry-icon {
  width: 2rem;
  height: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: transform 0.3s;
}

.retry-icon:hover {
  transform: rotate(180deg);
  color: var(--accent-color);
}
</style>
