<template>
  <div class="market-bar card">
    <div class="market-grid">
      <!-- NASDAQ 100 -->
      <div class="market-item highlight">
        <div class="item-label">
          <span class="name">NASDAQ 100</span>
          <span class="symbol">NDX</span>
        </div>
        <div v-if="nasdaq" class="item-value">
          <span class="price">{{ formatNumber(nasdaq.index) }}</span>
          <span class="change" :class="nasdaq.change >= 0 ? 'up' : 'down'">
            {{ nasdaq.percent.toFixed(2) }}%
          </span>
        </div>
        <Skeleton v-else width="80px" height="1.2rem" />
      </div>

      <!-- Macro Assets -->
      <div v-for="asset in macroAssets" :key="asset.name" class="market-item">
        <div class="item-label">
          <span class="name">{{ asset.name }}</span>
        </div>
        <div class="item-value">
          <span class="price">${{ formatPrice(asset.price) }}</span>
          <span class="change" :class="asset.percent >= 0 ? 'up' : 'down'">
            {{ asset.percent >= 0 ? '+' : '' }}{{ asset.percent.toFixed(2) }}%
          </span>
        </div>
      </div>

      <!-- Skeleton for macro if loading -->
      <template v-if="macroAssets.length === 0">
        <div v-for="i in 3" :key="'sk'+i" class="market-item">
          <Skeleton width="40px" height="0.7rem" style="margin-bottom: 0.3rem" />
          <Skeleton width="60px" height="1rem" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const config = useRuntimeConfig();
const nasdaq = ref(null);
const macroAssets = ref([]);
let refreshInterval = null;

const fetchData = async () => {
  if (document.visibilityState !== 'visible') return;
  
  try {
    const [nasdaqRes, macroRes] = await Promise.all([
      fetch(`${config.public.apiBase}/nasdaq`),
      fetch(`${config.public.apiBase}/macro-assets`)
    ]);
    
    if (nasdaqRes.status === 200) nasdaq.value = await nasdaqRes.json();
    if (macroRes.status === 200) macroAssets.value = await macroRes.json();
  } catch (e) {
    console.error('Market bar fetch error:', e);
  }
};

const formatNumber = (val) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });
const formatPrice = (val) => val >= 1000 ? val.toLocaleString() : val;

onMounted(() => {
  fetchData();
  refreshInterval = setInterval(fetchData, 60 * 1000); // 1 min
  document.addEventListener('visibilitychange', fetchData);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  document.removeEventListener('visibilitychange', fetchData);
});
</script>

<style scoped>
.market-bar {
  padding: 1rem 1.5rem !important;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.market-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr 1fr;
  gap: 1.25rem;
  align-items: center;
}

.market-item {
  display: flex;
  flex-direction: column;
  padding-right: 1.25rem;
  border-right: 1px solid var(--border-color);
}

.market-item:last-child {
  border-right: none;
  padding-right: 0;
}

.market-item.highlight {
  background: rgba(59, 130, 246, 0.04);
  margin: -1rem 0;
  padding: 1rem 1.25rem 1rem 0;
}

.item-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
}

.item-label .name {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.item-label .symbol {
  font-size: 0.65rem;
  background: var(--hover-bg);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  color: var(--accent-color);
}

.item-value {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.item-value .price {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.item-value .change {
  font-size: 0.85rem;
  font-weight: 700;
}

.change.up { color: #10b981; }
.change.down { color: #ef4444; }

@media (max-width: 768px) {
  .market-bar {
    padding: 0.75rem 1rem !important;
  }
  .market-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  .market-item {
    border-right: none;
    padding-bottom: 0.4rem;
    padding-right: 0;
    border-bottom: 1px solid var(--border-color);
  }
  .market-item.highlight {
    margin: 0;
    padding: 0 0 0.4rem 0;
    background: transparent;
  }
  .item-value .price {
    font-size: 1.15rem;
  }
  .market-item:nth-child(n+3) {
    border-bottom: none;
    padding-top: 0.4rem;
  }
}
</style>
