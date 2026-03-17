<script setup lang="ts">
// Fetch all items from daily collection
const { data: dailyLogs } = await useAsyncData('daily-logs-list', () => queryCollection('daily').all())

// Sort by date descending
const sortedLogs = computed(() => {
  if (!dailyLogs.value) return []
  return [...dailyLogs.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

useHead({
  title: '每日信息',
  meta: [
    { name: 'description', content: 'InvestCool 每日科技观察与市场日志，实时记录技术动态与投资心法。' }
  ]
})
</script>

<template>
  <div class="daily-page">
    <header class="page-header">
      <h2 class="title">每日信息</h2>
      <p class="subtitle">记录每一天的技术成长与市场波动。</p>
    </header>

    <div class="logs-grid">
      <div v-for="log in sortedLogs" :key="log.path" class="card log-card">
        <div class="log-cover">
          <img :src="log.cover || 'https://images.unsplash.com/photo-1611974714658-058e117b8161?q=80&w=1000'" :alt="log.title" class="cover-img" />
          <div class="date-badge-overlay">
            {{ log.date }}
          </div>
        </div>

        <div class="card-content">
          <h3 class="log-title">{{ log.title }}</h3>
          <p class="log-desc">{{ log.description || '暂无描述' }}</p>
          
          <NuxtLink :to="log.path" class="read-link">
            阅读日志 <Icon name="lucide:book-open" class="icon" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="sortedLogs.length === 0" class="empty-state">
      <Icon name="lucide:inbox" class="empty-icon" />
      <p>正在同步最新的日志数据...</p>
    </div>
  </div>
</template>

<script lang="ts">
// Note: Added explicit path mapping for Nuxt Content v3 items
</script>

<style scoped>
.page-header {
  margin-bottom: 2.5rem;
}
.title {
  font-size: 1.875rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}
.subtitle {
  color: var(--text-secondary);
}

.logs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.log-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  min-height: auto;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.log-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
}

.log-cover {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.log-card:hover .cover-img {
  transform: scale(1.05);
}

.date-badge-overlay {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.2rem 0.75rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  backdrop-filter: blur(4px);
  letter-spacing: 0.05em;
}

.card-content {
  padding: 1.5rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.log-title {
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.log-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.read-link {
  color: var(--accent-color);
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  transition: opacity 0.2s;
  margin-top: auto;
}

.read-link:hover {
  color: var(--accent-color);
}

.read-link .icon {
  margin-left: 0.5rem;
  width: 1rem;
}

.empty-state {
  text-align: center;
  padding: 5rem 0;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

@media (max-width: 640px) {
  .logs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
