<template>
  <div class="macro-panel card">
    <div class="panel-header">
      <h3 class="text-sm font-bold">全球宏观资产</h3>
      <span class="text-[10px] text-gray-400">实时流向</span>
    </div>
    
    <div v-if="assets.length > 0" class="asset-grid">
      <div v-for="asset in assets" :key="asset.name" class="asset-item">
        <div class="asset-name">{{ asset.name }}</div>
        <div class="asset-price">${{ formatPrice(asset.price) }}</div>
        <div class="asset-change" :class="asset.percent >= 0 ? 'up' : 'down'">
          {{ asset.percent >= 0 ? '+' : '' }}{{ asset.percent }}%
        </div>
      </div>
    </div>
    
    <div v-else class="asset-grid">
      <div v-for="i in 3" :key="i" class="asset-item">
        <Skeleton width="30px" height="0.7rem" style="margin-bottom: 0.4rem" />
        <Skeleton width="50px" height="0.9rem" style="margin-bottom: 0.4rem" />
        <Skeleton width="40px" height="0.7rem" radius="0.25rem" />
      </div>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const assets = ref([]);
let refreshInterval = null;

const fetchMacro = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/macro-assets`);
    if (response.status === 200) {
      assets.value = await response.json();
    }
  } catch (e) {
    console.error('Macro fetch error:', e);
  }
};

const formatPrice = (val) => {
  if (val >= 1000) return val.toLocaleString();
  return val;
};

onMounted(() => {
  fetchMacro();
  refreshInterval = setInterval(fetchMacro, 5 * 60 * 1000); // 5 min
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<style scoped>
.macro-panel {
  padding: 1rem !important;
  margin-top: 1.25rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.asset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--hover-bg);
  border-radius: 0.5rem;
  text-align: center;
}

.asset-name {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.2rem;
}

.asset-price {
  font-size: 0.85rem;
  font-weight: 800;
  margin-bottom: 0.2rem;
}

.asset-change {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.asset-change.up { color: #10b981; }
.asset-change.down { color: #ef4444; }
</style>
