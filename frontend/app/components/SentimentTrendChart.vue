<template>
  <div class="trend-chart-container card">
    <div class="chart-header">
      <h3 class="text-sm font-bold">情绪趋势 (近期)</h3>
      <span class="text-[10px] text-gray-400">近30次采样</span>
    </div>
    
    <div v-if="pending" class="loading-wrapper">
      <Skeleton width="100%" height="100px" />
    </div>
    
    <div ref="chartRef" v-show="!pending" class="trend-chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

const config = useRuntimeConfig();
const chartRef = ref(null);
let chartInstance = null;
const pending = ref(true);

const fetchHistory = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/market-index/history`);
    const data = await response.json();
    if (data.length > 0) {
      pending.value = false;
      setTimeout(() => initChart(data), 0);
    }
  } catch (e) {
    console.error('Failed to fetch sentiment history:', e);
  }
};

const initChart = (historyData) => {
  if (!chartInstance && chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
  }
  if (!chartInstance) return;

  const dates = historyData.map(item => {
    const d = new Date(item.timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
  });
  const values = historyData.map(item => item.value);

  const option = {
    grid: {
      top: 10,
      bottom: 20,
      left: 30,
      right: 10
    },
    xAxis: {
      type: 'category',
      data: dates,
      show: false // Hide X axis for cleaner dashboard look
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: {
        lineStyle: { type: 'dashed', color: '#f1f5f9' }
      },
      axisLabel: { fontSize: 10, color: '#94a3b8' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>情绪得分: <b>{c}</b>'
    },
    series: [
      {
        data: values,
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ])
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

onMounted(() => {
  fetchHistory();
  window.addEventListener('resize', () => chartInstance?.resize());
});

onUnmounted(() => {
  chartInstance?.dispose();
});
</script>

<style scoped>
.trend-chart-container {
  padding: 1rem !important;
  margin-top: 1.25rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

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
</style>
