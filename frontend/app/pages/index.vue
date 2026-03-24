<script setup lang="ts">
useHead({
  title: 'InvestCool Pro - 高级金融投资看板',
  meta: [
    { name: 'description', content: '金融级实时数据中枢，结合 AI 决策模型，洞察科技股投资机会。' }
  ]
})
</script>

<template>
  <div class="finance-dashboard">
    <!-- Row 1: Global Marquee -->
    <GlobalMarketBar class="top-marquee" />

    <div class="dashboard-container">
      
      <!-- HERO ROW: Refined High-Level Indicators & MAG7 -->
      <section class="hero-data-row">
        <!-- Compact Nasdaq + Sentiment Metrics (Left) -->
        <div class="metrics-grid">
          <div class="stat-card compact-tracker">
            <NasdaqTracker />
          </div>
          <div class="stat-card">
            <MarketSentimentGauge class="sentiment-widget" />
          </div>
          <div class="stat-card premium-badge-card">
            <div class="badge-content">
              <Icon name="lucide:zap" class="badge-icon" />
              <div class="text-group">
                <span class="label">AI 状态</span>
                <span class="value online">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        <!-- MAG7 Focus Hub -->
        <div class="market-integrated-hub">
          <div class="hub-main">
            <div class="section-header-compact">
              <h2 class="hub-title">核心科技观察 (MAG7)</h2>
              <span class="hub-subtitle">成分股实时盘面表现</span>
            </div>
            <TickerWatchlist />
          </div>
        </div>
      </section>

      <!-- SECONDARY ROW: AI & Community Logic -->
      <section class="strategy-vibe-grid">
        <!-- AI Decision (High-end Wide Card) -->
        <div class="strategy-column">
          <div class="section-label-group">
            <span class="dot"></span>
            <h3 class="group-title">AI 策略指挥部</h3>
          </div>
          <AIRecommendationCard />
        </div>

        <!-- Community Vibe -->
        <div class="vibe-column">
          <div class="section-label-group">
            <span class="dot warning"></span>
            <h3 class="group-title">多空势能博弈</h3>
          </div>
          <SentimentDuel />
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.finance-dashboard {
  animation: pageEnter 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes pageEnter {
  from { opacity: 0; filter: blur(10px); transform: translateY(20px); }
  to { opacity: 1; filter: blur(0); transform: translateY(0); }
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
}

.top-marquee {
  margin-bottom: 2rem;
}

/* HERO ROW: Integrated Index + MAG7 */
.hero-data-row {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.metrics-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stat-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
}

.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }

/* Make NasdaqTracker fit in a small vertical column */
.compact-tracker :deep(.nasdaq-tracker) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.compact-tracker :deep(.current-price) { font-size: 2.25rem; }

.premium-badge-card {
  background: linear-gradient(135deg, var(--accent-color), #8b5cf6);
  color: white;
  border: none;
}

.badge-content { display: flex; align-items: center; gap: 1rem; }
.badge-icon { font-size: 2rem; opacity: 0.8; }
.text-group .label { font-size: 0.7rem; font-weight: 700; opacity: 0.8; text-transform: uppercase; }
.text-group .value { font-size: 1.1rem; font-weight: 900; letter-spacing: 0.05em; }
.value.online { color: #fff; text-shadow: 0 0 15px rgba(255,255,255,0.5); }

/* Integrated Market Hub */
.market-integrated-hub {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
}

.hub-main { width: 100%; }

.section-header-compact {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.hub-title { font-size: 1.25rem; font-weight: 900; margin-bottom: 0.25rem; }
.hub-subtitle { font-size: 0.75rem; color: var(--text-tertiary); font-weight: 600; }

/* Strategy & Community Grid */
.strategy-vibe-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 3rem;
}

.section-label-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-color); box-shadow: 0 0 10px var(--accent-color); }
.dot.warning { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
.group-title { font-size: 1.25rem; font-weight: 800; }

@media (max-width: 1200px) {
  .hero-data-row, .strategy-vibe-grid {
    grid-template-columns: 1fr;
  }
}
</style>
