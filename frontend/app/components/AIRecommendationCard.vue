<script setup lang="ts">
const { data: latest, refresh, pending } = await useFetch('/api/ai/latest')

const getStatusColor = (status: string) => {
  if (status.includes('看多')) return '#10b981' // Green
  if (status.includes('看空')) return '#ef4444' // Red
  if (status.includes('中性')) return '#f59e0b' // Yellow
  return '#6b7280' // Gray
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="ai-recommendation-card" :class="{ 'is-pending': pending }">
    <div v-if="latest && !latest.error" class="card-body">
      <div class="header">
        <div class="status-badge" :style="{ backgroundColor: getStatusColor(latest.status) }">
          <Icon name="lucide:bot" class="icon" />
          {{ latest.status }}
        </div>
        <div class="meta">
          <span class="time">{{ formatDate(latest.created_at) }}</span>
          <span class="index-pos">执行点位: {{ latest.index_position }}</span>
        </div>
      </div>
      
      <div class="summary-box">
        <p class="summary-text">{{ latest.summary }}</p>
      </div>

      <div class="card-footer">
        <span class="hint">每 2 小时由 Gemini 自动更新</span>
        <button @click="refresh" class="refresh-btn" :disabled="pending">
          <Icon name="lucide:refresh-cw" :class="{ 'spin': pending }" />
        </button>
      </div>
    </div>
    
    <div v-else-if="!pending" class="empty-state">
      <Icon name="lucide:brain-circuit" class="icon" />
      <p>暂无实时策略，AI 正在分析市场数据...</p>
    </div>
  </div>
</template>

<style scoped>
.ai-recommendation-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.ai-recommendation-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--accent-color), #8b5cf6);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  color: white;
  font-weight: 800;
  font-size: 0.9rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.summary-box {
  background: rgba(var(--accent-rgb), 0.03);
  padding: 1.25rem;
  border-radius: 0.75rem;
  border-left: 4px solid var(--accent-color);
  margin-bottom: 1rem;
}

.summary-text {
  font-size: 1.1rem;
  line-height: 1.6;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px border var(--border-color);
}

.hint { font-size: 0.7rem; color: var(--text-tertiary); }

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  transition: all 0.3s;
}
.refresh-btn:hover { color: var(--accent-color); transform: scale(1.1); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}
.empty-state .icon { font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.3; }

.is-pending { opacity: 0.7; }
</style>
