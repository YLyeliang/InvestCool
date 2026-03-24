<template>
  <div class="sentiment-duel card">
    <div class="duel-header">
      <h3 class="text-sm font-bold">多空阵营拔河</h3>
      <span class="text-[10px] text-gray-400">过去 24 小时民意</span>
    </div>

    <!-- Voting State: Two big buttons -->
    <div v-if="!hasVoted && !pending" class="voting-container">
      <button class="vote-btn bull" @click="vote('bull')">
        <span class="emoji">🐂</span>
        <span class="label">我看涨</span>
      </button>
      <button class="vote-btn bear" @click="vote('bear')">
        <span class="emoji">🐻</span>
        <span class="label">我看跌</span>
      </button>
    </div>

    <!-- Result State: Tug-of-war bar -->
    <div v-if="hasVoted || pending" class="result-container" :class="{ 'is-loading': pending }">
      <div class="duel-bar-wrapper">
        <div class="duel-bar">
          <div class="segment bull" :style="{ width: bullPct + '%' }">
            <span class="pct-value">{{ bullPct }}%</span>
          </div>
          <div class="segment bear">
            <span class="pct-value">{{ bearPct }}%</span>
          </div>
        </div>
        <div class="divider" :style="{ left: bullPct + '%' }">
          <Icon name="lucide:swords" class="duel-icon" />
        </div>
      </div>
      
      <div class="duel-footer">
        <span class="footer-label bull">多头阵营</span>
        <span class="total-votes">{{ totalVotes }} 人参与</span>
        <span class="footer-label bear">空头阵营</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const config = useRuntimeConfig();
const pending = ref(true);
const hasVoted = ref(false);
const bullPct = ref(50);
const bearPct = ref(50);
const totalVotes = ref(0);

const fetchStatus = async () => {
  try {
    const res = await fetch(`${config.public.apiBase}/poll/status`);
    if (res.status === 200) {
      const data = await res.json();
      bullPct.value = data.bull_pct;
      bearPct.value = data.bear_pct;
      totalVotes.value = data.total;
      
      const localVoted = useCookie('voted_24h').value;
      hasVoted.value = data.has_voted || !!localVoted;
    }
  } catch (e) {
    console.error('Poll fetch error:', e);
  } finally {
    pending.value = false;
  }
};

const vote = async (type) => {
  try {
    const res = await fetch(`${config.public.apiBase}/poll/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    
    if (res.status === 200) {
      const cookie = useCookie('voted_24h', { maxAge: 86400 });
      cookie.value = 'true';
      await fetchStatus();
      hasVoted.value = true;
    } else if (res.status === 403) {
      hasVoted.value = true;
    }
  } catch (e) {
    console.error('Vote error:', e);
  }
};

onMounted(() => {
  fetchStatus();
});
</script>

<style scoped>
.sentiment-duel {
  padding: 1.25rem !important;
}

.duel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.voting-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.vote-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  background: var(--hover-bg);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.vote-btn .emoji { font-size: 1.5rem; }
.vote-btn .label { font-size: 0.85rem; font-weight: 700; }

.vote-btn.bull:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
}

.vote-btn.bear:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.duel-bar-wrapper {
  position: relative;
  margin: 1.5rem 0 1rem 0;
  height: 40px;
}

.duel-bar {
  display: flex;
  height: 100%;
  border-radius: 20px;
  overflow: hidden;
  background: #e2e8f0;
}

.segment {
  height: 100%;
  display: flex;
  align-items: center;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.segment.bull {
  background: linear-gradient(90deg, #10b981, #34d399);
  padding-left: 1rem;
}

.segment.bear {
  background: linear-gradient(90deg, #f87171, #ef4444);
  flex-grow: 1;
  justify-content: flex-end;
  padding-right: 1rem;
}

.pct-value {
  color: white;
  font-weight: 800;
  font-size: 0.9rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.divider {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  background: var(--card-bg);
  border: 3px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: left 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.duel-icon {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.duel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.footer-label.bull { color: #10b981; }
.footer-label.bear { color: #ef4444; }

.is-loading {
  opacity: 0.6;
}

@media (max-width: 768px) {
  .sentiment-duel { padding: 1rem !important; }
  .voting-container { gap: 0.75rem; }
  .vote-btn { padding: 0.75rem; }
  .vote-btn .emoji { font-size: 1.25rem; }
  .duel-bar-wrapper { height: 36px; margin: 1.25rem 0 0.75rem 0; }
  .divider { width: 28px; height: 28px; }
}
</style>
