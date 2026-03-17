<template>
  <div class="quote-sidebar-widget">
    <div v-if="data" class="quote-container">
      <div class="widget-header">
        <div class="date-badge">
          <span class="day">{{ data.date.split('.')[2] }}</span>
          <span class="month">{{ getMonthLabel(data.date) }}</span>
        </div>
        <div class="tag-row">
          <span class="pill-tag">市场观察员</span>
        </div>
      </div>
      
      <div class="quote-body">
        <Icon name="lucide:quote" class="quote-bg-icon" />
        <p class="quote-text">{{ data.quote }}</p>
      </div>
      
      <div class="quote-footer">
        <span class="author">AI Analysis</span>
      </div>
    </div>
    
    <div v-else class="loading-padding">
      <Skeleton width="100%" height="100px" radius="0.75rem" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const config = useRuntimeConfig();
const data = ref(null);

const getMonthLabel = (dateStr) => {
  const parts = dateStr.split('.');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[parseInt(parts[1]) - 1];
};

const fetchQuote = async () => {
  try {
    const res = await fetch(`${config.public.apiBase}/market-quote`);
    if (res.status === 200) {
      data.value = await res.json();
    }
  } catch (e) {
    console.error('Quote fetch error:', e);
  }
};

onMounted(() => {
  fetchQuote();
});
</script>

<style scoped>
.quote-sidebar-widget {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  position: relative;
  transition: border-color 0.2s;
}

.quote-sidebar-widget:hover {
  border-color: var(--accent-color);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--hover-bg);
  padding: 0.4rem 0.6rem;
  border-radius: 0.6rem;
  min-width: 3rem;
}

.day {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--accent-color);
  line-height: 1;
}

.month {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.pill-tag {
  font-size: 0.65rem;
  font-weight: 800;
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-color);
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  letter-spacing: 0.02em;
}

.quote-body {
  position: relative;
  margin-bottom: 1rem;
}

.quote-bg-icon {
  position: absolute;
  top: -0.5rem;
  left: -0.5rem;
  font-size: 2rem;
  opacity: 0.05;
  color: var(--text-primary);
}

.quote-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
  font-weight: 500;
  margin: 0;
  position: relative;
  z-index: 1;
}

.quote-footer {
  display: flex;
  justify-content: flex-end;
}

.author {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}

.loading-padding {
  padding: 0.5rem 0;
}
</style>
