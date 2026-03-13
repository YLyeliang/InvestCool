<template>
  <div class="watchlist-container card">
    <div class="watchlist-header">
      <h3 class="text-sm font-bold">核心科技观察 (MAG7)</h3>
      <span class="text-xs text-gray-400">实时更新</span>
    </div>
    <div v-if="tickers.length > 0" class="ticker-list">
      <div v-for="ticker in tickers" :key="ticker.symbol" class="ticker-item">
        <div class="symbol-info">
          <span class="symbol">{{ ticker.symbol }}</span>
          <span class="price">${{ ticker.price }}</span>
        </div>
        <div class="change-info" :class="ticker.percent >= 0 ? 'up' : 'down'">
          <Icon :name="ticker.percent >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="icon" />
          <span class="percent">{{ ticker.percent >= 0 ? '+' : '' }}{{ ticker.percent }}%</span>
        </div>
      </div>
    </div>
    <div v-else class="ticker-list">
      <div v-for="i in 7" :key="i" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <div>
          <Skeleton width="40px" height="0.8rem" style="margin-bottom: 0.25rem" />
          <Skeleton width="60px" height="0.6rem" />
        </div>
        <Skeleton width="50px" height="1.5rem" radius="0.4rem" />
      </div>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const tickers = ref([]);
let refreshInterval = null;

const fetchWatchlist = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/watch-list`);
    const data = await response.json();
    if (response.status === 200) {
      tickers.value = data;
    }
  } catch (e) {
    console.error('Failed to fetch watchlist:', e);
  }
};

onMounted(() => {
  fetchWatchlist();
  // Refresh every 2 minutes
  refreshInterval = setInterval(fetchWatchlist, 2 * 60 * 1000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<style scoped>
.watchlist-container {
  padding: 1rem !important;
  margin-top: 1.25rem;
}

.watchlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.ticker-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ticker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.symbol-info {
  display: flex;
  flex-direction: column;
}

.symbol {
  font-weight: 700;
  font-size: 0.85rem;
}

.price {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.change-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
}

.change-info.up {
  color: #10b981;
  background: #ecfdf5;
}

.change-info.down {
  color: #ef4444;
  background: #fef2f2;
}

.change-info .icon {
  width: 0.85rem;
  height: 0.85rem;
}
</style>
