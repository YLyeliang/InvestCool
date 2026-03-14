<template>
  <div class="trend-chart-container card" :class="{ 'is-loading': pending, 'is-error': isError }">
    <div class="chart-header">
      <div class="title-group">
        <h3 class="text-sm font-bold">情绪趋势</h3>
        <span v-if="isError" class="status-dot error"></span>
      </div>
      <span class="text-[10px] text-gray-400">近30次采样</span>
    </div>
    
    <div v-if="pending && !data" class="loading-wrapper">
      <Skeleton width="100%" height="100px" />
    </div>
    
    <div ref="chartRef" v-show="!pending || data" class="trend-chart"></div>

    <div v-if="isError" class="error-overlay">
      <button class="retry-btn" @click="fetchHistory">
        <Icon name="lucide:refresh-ccw" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { use, graphic } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';

// Register necessary components
use([LineChart, CanvasRenderer, GridComponent, TooltipComponent]);

const config = useRuntimeConfig();
const chartRef = ref(null);
let chartInstance = null;
const data = ref(null);
const pending = ref(true);
const isError = ref(false);
let refreshInterval = null;
let themeObserver = null;

const fetchHistory = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/market-index/history`);
    if (response.status === 200) {
      const result = await response.json();
      if (result.length > 0) {
        data.value = result;
        isError.value = false;
        pending.value = false;
        setTimeout(() => updateChart(result), 0);
      }
    } else {
      throw new Error('History Fetch Error');
    }
  } catch (e) {
    console.error('Failed to fetch sentiment history:', e);
    isError.value = true;
    pending.value = false;
  }
};

const updateChart = (historyData) => {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const labelColor = isDark ? '#64748b' : '#94a3b8';
  const lineColor = '#3b82f6';

  const dates = historyData.map(item => {
    const d = new Date(item.timestamp);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const values = historyData.map(item => item.value);

  const option = {
    grid: {
      top: 15,
      bottom: 5,
      left: 30,
      right: 5,
      containLabel: false
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      textStyle: { color: isDark ? '#f8fafc' : '#1e293b', fontSize: 11 },
      formatter: (params) => {
        const item = params[0];
        return `<div style="font-weight:700">${item.value}</div><div style="font-size:10px;opacity:0.7">${item.name}</div>`;
      }
    },
    xAxis: {
      type: 'category',
      data: dates,
      show: false,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      min: (value) => Math.max(0, Math.floor(value.min - 10)),
      max: (value) => Math.min(100, Math.ceil(value.max + 10)),
      splitNumber: 3,
      axisLabel: { color: labelColor, fontSize: 9 },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }
    },
    series: [
      {
        data: values,
        type: 'line',
        smooth: 0.4,
        showSymbol: false,
        lineStyle: { width: 3, color: lineColor },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ])
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

const startPolling = () => {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') fetchHistory();
  }, 10 * 60 * 1000); // 10 min
};

onMounted(() => {
  fetchHistory();
  startPolling();
  
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      fetchHistory();
      startPolling();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  themeObserver = new MutationObserver(() => {
    if (data.value) updateChart(data.value);
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
.trend-chart-container {
  padding: 1rem !important;
  margin-top: 1.25rem;
  position: relative;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot.error { background: #ef4444; }

.trend-chart {
  height: 100px;
  width: 100%;
}

.loading-wrapper {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--card-bg-rgb), 0.4);
  backdrop-filter: blur(2px);
  border-radius: 12px;
}

.retry-btn {
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}
</style>
