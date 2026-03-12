<template>
  <div class="sentiment-gauge-container">
    <div class="gauge-header">
      <h3 class="text-lg font-bold">市场情绪指数</h3>
      <span class="text-xs text-gray-500">每10分钟自动更新</span>
    </div>
    <div ref="chartRef" class="gauge-chart"></div>
    <div v-if="metric" class="gauge-details">
      <div class="detail-item">
        <span class="label">RSI(14):</span>
        <span class="value">{{ metric.details.rsi }}</span>
      </div>
      <div class="detail-item">
        <span class="label">恐慌分:</span>
        <span class="value">{{ metric.details.vix }}</span>
      </div>
      <div class="detail-item">
        <span class="label">估值分:</span>
        <span class="value">{{ metric.details.valuation }}</span>
      </div>
      <div class="detail-item">
        <span class="label">宏观分:</span>
        <span class="value">{{ metric.details.macro }}</span>
      </div>
    </div>
    <div v-else-if="pending" class="loading">加载指数中...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';

const chartRef = ref(null);
let chartInstance = null;
const metric = ref(null);
const pending = ref(true);
let refreshInterval = null;

const fetchMetric = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/market-index');
    const data = await response.json();
    metric.value = data;
    updateChart(data.value);
    pending.value = false;
  } catch (e) {
    console.error('Failed to fetch market index:', e);
  }
};

const updateChart = (value) => {
  if (!chartInstance) return;
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '100%',
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.3, '#10b981'], // 深绿 - 极度恐惧
              [0.5, '#34d399'], // 浅绿 - 恐惧
              [0.7, '#fbbf24'], // 黄色 - 中性
              [0.85, '#f97316'], // 橙色 - 贪婪
              [1, '#ef4444']    // 亮红 - 极度贪婪
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,10.1c0.4,0.3,0.4,0.9,0.1,1.2c-0.3,0.4-0.9,0.4-1.2,0.1L12,2.3L0.3,12.1c-0.4,0.3-0.9,0.3-1.2-0.1c-0.3-0.4-0.3-0.9,0.1-1.2L11.2,0.7C11.7,0.3,12.3,0.3,12.8,0.7z',
          length: '12%',
          width: 6,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: '#464646',
          fontSize: 12,
          distance: -60,
          formatter: function (value) {
            if (value === 15) return '极度恐惧';
            if (value === 40) return '恐惧';
            if (value === 60) return '中性';
            if (value === 77) return '贪婪';
            if (value === 92) return '极度贪婪';
            return '';
          }
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 14
        },
        detail: {
          fontSize: 24,
          offsetCenter: [0, '0%'],
          valueAnimation: true,
          formatter: function (value) {
            return Math.round(value);
          },
          color: 'auto'
        },
        data: [
          {
            value: value,
            name: '综合评分'
          }
        ]
      }
    ]
  };
  
  chartInstance.setOption(option);
};

onMounted(() => {
  chartInstance = echarts.init(chartRef.value);
  fetchMetric();
  
  // Set interval to refresh every 10 minutes
  refreshInterval = setInterval(fetchMetric, 10 * 60 * 1000);
  
  window.addEventListener('resize', () => chartInstance?.resize());
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  chartInstance?.dispose();
});
</script>

<style scoped>
.sentiment-gauge-container {
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color, #e5e7eb);
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.gauge-chart {
  height: 220px;
  width: 100%;
}

.gauge-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px dashed #e5e7eb;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-item .label {
  color: #6b7280;
}

.detail-item .value {
  font-weight: 600;
  color: #111827;
}

.loading {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
</style>
