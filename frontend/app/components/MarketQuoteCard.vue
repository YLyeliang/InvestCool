<template>
  <div class="quote-card card">
    <div class="quote-container" v-if="data">
      <div class="quote-header">
        <span class="day">{{ data.date.split('.')[2] }}</span>
        <div class="meta">
          <span class="month-year">{{ getMonthLabel(data.date) }}</span>
          <span class="tag">MARKET VIBE</span>
        </div>
      </div>
      
      <div class="quote-content">
        <Icon name="lucide:quote" class="quote-icon top" />
        <p class="text">{{ data.quote }}</p>
        <Icon name="lucide:quote" class="quote-icon bottom" />
      </div>
      
      <div class="quote-footer">
        <span class="author">—— {{ data.author }}</span>
      </div>
    </div>
    
    <div v-else class="loading-state">
      <Skeleton width="100%" height="120px" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const config = useRuntimeConfig();
const data = ref(null);

const getMonthLabel = (dateStr) => {
  const parts = dateStr.split('.');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
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
.quote-card {
  padding: 1.5rem !important;
  background: linear-gradient(135deg, var(--card-bg), var(--hover-bg));
  border-left: 4px solid var(--accent-color);
  position: relative;
  overflow: hidden;
}

.quote-card::after {
  content: "COOL";
  position: absolute;
  bottom: -10px;
  right: -5px;
  font-size: 3rem;
  font-weight: 900;
  color: var(--accent-color);
  opacity: 0.03;
  font-style: italic;
}

.quote-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.day {
  font-size: 2.5rem;
  font-weight: 900;
  line-height: 1;
  color: var(--accent-color);
  font-family: serif;
}

.meta {
  display: flex;
  flex-direction: column;
}

.month-year {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-primary);
}

.tag {
  font-size: 0.6rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.quote-content {
  position: relative;
  padding: 0.5rem 0;
}

.quote-icon {
  font-size: 0.8rem;
  color: var(--accent-color);
  opacity: 0.4;
  position: absolute;
}

.quote-icon.top { top: -0.5rem; left: -0.5rem; }
.quote-icon.bottom { bottom: -0.5rem; right: -0.5rem; transform: rotate(180deg); }

.text {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--text-primary);
  font-weight: 500;
  margin: 0;
  position: relative;
  z-index: 1;
}

.quote-footer {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.author {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  font-style: italic;
}

.loading-state {
  height: 150px;
  display: flex;
  align-items: center;
}
</style>
