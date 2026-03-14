<template>
  <div class="nasdaq-tracker card dark-mode" :class="{ 'is-offline': isError }">
    <div class="tracker-content">
      <div class="left">
        <div class="label-group">
          <span class="index-name">NASDAQ 100</span>
          <span class="index-symbol">NDX</span>
          <span v-if="isError" class="error-tag">连接延迟</span>
          <span v-else-if="isInitializing" class="sync-tag">同步中...</span>
        </div>
        
        <div v-if="data" class="price-group">
          <h2 class="current-price">{{ formatNumber(data.index) }}</h2>
          <div class="change-info" :class="data.change >= 0 ? 'up' : 'down'">
            <Icon :name="data.change >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="icon" />
            <span>{{ data.change >= 0 ? '+' : '' }}{{ data.change.toFixed(2) }}</span>
            <span class="percent">({{ data.change >= 0 ? '+' : '' }}{{ data.percent.toFixed(2) }}%)</span>
          </div>
        </div>
        
        <div v-else class="price-group">
          <Skeleton width="120px" height="2.5rem" style="margin-bottom: 0.5rem" />
          <Skeleton width="80px" height="1rem" />
        </div>
      </div>

      <div class="right">
        <div class="status-tag" :class="{ 'is-live': isLive && !isError && !isInitializing }">
          <span class="dot"></span>
          {{ isError ? '服务离线' : (isInitializing ? '初始化' : (isLive ? '实时行情' : '已收盘')) }}
        </div>
        <div v-if="data" class="update-time">
          {{ isError ? '上个快照:' : '最后更新:' }} {{ data.last_update }}
        </div>
      </div>
    </div>
    
    <!-- Background alert for errors -->
    <div v-if="isError" class="offline-overlay">
      <Icon name="lucide:cloud-off" class="offline-icon" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const config = useRuntimeConfig();
const data = ref(null);
const isError = ref(false);
const isInitializing = ref(false);
let refreshInterval = null;

const fetchNasdaq = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch(`${config.public.apiBase}/nasdaq`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.status === 200) {
      const result = await response.json();
      data.value = result;
      isError.value = false;
      isInitializing.value = false;
    } else if (response.status === 202) {
      isInitializing.value = true;
      isError.value = false;
    } else {
      throw new Error('API Error');
    }
  } catch (e) {
    console.error('Nasdaq fetch error:', e);
    isError.value = true;
    isInitializing.value = false;
  }
};

const formatNumber = (val) => {
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isLive = computed(() => {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  return day >= 1 && day <= 5 && hour >= 14 && hour < 21;
});

const startPolling = () => {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchNasdaq();
    }
  }, 60 * 1000);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchNasdaq();
    startPolling();
  }
};

onMounted(() => {
  fetchNasdaq();
  startPolling();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style scoped>
.nasdaq-tracker {
  background: #0f172a !important;
  color: white !important;
  border: 1px solid #1e293b;
  padding: 1.5rem !important;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.nasdaq-tracker.is-offline {
  border-color: #ef4444;
  opacity: 0.9;
}

.label-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.index-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.index-symbol {
  font-size: 0.65rem;
  background: #1e293b;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  color: #3b82f6;
}

.error-tag {
  font-size: 0.65rem;
  color: #f43f5e;
  font-weight: 700;
  background: rgba(244, 63, 94, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}

.sync-tag {
  font-size: 0.65rem;
  color: #fbbf24;
  font-weight: 700;
}

.price-group {
  margin-top: 0.75rem;
}

.current-price {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

.change-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.change-info.up { color: #10b981; }
.change-info.down { color: #f43f5e; }

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  background: #1e293b;
  border-radius: 2rem;
  color: #94a3b8;
}

.status-tag.is-live {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-tag.is-live .dot {
  box-shadow: 0 0 8px currentColor;
  animation: pulse 2s infinite;
}

.update-time {
  font-size: 0.65rem;
  color: #64748b;
}

.offline-overlay {
  position: absolute;
  top: -10px;
  right: -10px;
  opacity: 0.15;
}

.offline-icon {
  font-size: 4rem;
  color: #ef4444;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
</style>
