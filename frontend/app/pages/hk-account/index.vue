<script setup lang="ts">
useHead({
  title: '香港开户指南 - 一站式攻略 | InvestCool',
  meta: [
    { name: 'description', content: 'InvestCool 独家香港开户一站式指南，涵盖保姆级教程、快速版攻略以及各大券商与银行的深度对比选择。' }
  ]
})
</script>

<template>
  <div class="hk-account-page">
    <header class="page-header">
      <div class="badge-accent">Global Investing</div>
      <h2 class="title">香港开户指南</h2>
      <p class="subtitle">打通全球投资第一步。从零开始，一站式解决您的香港银行卡与券商开户难题。</p>
    </header>

    <!-- Essential Guides Section -->
    <section class="guide-section">
      <div class="section-heading">
        <Icon name="lucide:map" class="heading-icon" />
        <h3>核心攻略</h3>
      </div>
      <div class="cards-grid">
        <!-- Nanny-level Guide -->
        <NuxtLink to="/hk-account/nanny-guide" class="feature-card">
          <div class="card-icon-wrapper bg-blue">
            <Icon name="lucide:book-open-check" class="card-icon" />
          </div>
          <div class="card-content">
            <h4>保姆级开户指南</h4>
            <p>从准备材料、过港预约到现场话术，手把手教你顺利下卡，适合首次过港的小白。</p>
          </div>
          <Icon name="lucide:arrow-right" class="arrow-icon" />
        </NuxtLink>

        <!-- Quick Guide -->
        <NuxtLink to="/hk-account/quick-guide" class="feature-card">
          <div class="card-icon-wrapper bg-emerald">
            <Icon name="lucide:zap" class="card-icon" />
          </div>
          <div class="card-content">
            <h4>快速版开户指南</h4>
            <p>去粗取精，提炼核心步骤与关键避坑点。适合时间紧凑、有一定经验的投资者。</p>
          </div>
          <Icon name="lucide:arrow-right" class="arrow-icon" />
        </NuxtLink>
      </div>
    </section>

    <!-- Selection Section -->
    <section class="selection-section">
      <div class="section-heading">
        <Icon name="lucide:landmark" class="heading-icon" />
        <h3>机构选择指南</h3>
      </div>
      <div class="cards-grid">
        <!-- Bank Selection -->
        <div class="info-card">
          <div class="card-header">
            <div class="icon-box bank-box">
              <Icon name="lucide:building-2" />
            </div>
            <h4>银行选择</h4>
          </div>
          <p class="card-desc">对比中银香港、汇丰、渣打、招商永隆等主流银行的门槛、管理费与体验。</p>
          <ul class="feature-list">
            <li><Icon name="lucide:check-circle-2" class="check" /> 零门槛虚拟银行推荐</li>
            <li><Icon name="lucide:check-circle-2" class="check" /> 实体银行预约技巧</li>
            <li><Icon name="lucide:check-circle-2" class="check" /> 汇款回国耗时与手续费对比</li>
          </ul>
          <button class="action-btn">查看银行对比</button>
        </div>

        <!-- Broker Selection -->
        <div class="info-card">
          <div class="card-header">
            <div class="icon-box broker-box">
              <Icon name="lucide:line-chart" />
            </div>
            <h4>券商选择</h4>
          </div>
          <p class="card-desc">富途、长桥、老虎、盈透等头部券商优劣势全方位解析，助你找到最适合的交易平台。</p>
          <ul class="feature-list">
            <li><Icon name="lucide:check-circle-2" class="check" /> 交易佣金与平台费明细</li>
            <li><Icon name="lucide:check-circle-2" class="check" /> 新手开户羊毛福利汇总</li>
            <li><Icon name="lucide:check-circle-2" class="check" /> APP使用体验与期权支持</li>
          </ul>
          <button class="action-btn">查看券商对比</button>
        </div>
      </div>
    </section>

    <!-- Future Expansion Section -->
    <section class="future-section">
      <div class="glass-banner">
        <div class="banner-content">
          <Icon name="lucide:rocket" class="banner-icon" />
          <div class="banner-text">
            <h4>更多高阶玩法筹备中</h4>
            <p>美股期权策略、资金合规回国、离岸架构搭建等硬核内容即将上线...</p>
          </div>
        </div>
        <div class="banner-action">
          <span class="pulse-dot"></span> 敬请期待
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hk-account-page {
  padding-bottom: 5rem;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  margin-bottom: 3.5rem;
}

.badge-accent {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  background: var(--accent-soft);
  color: var(--accent-color);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  margin-bottom: 1.2rem;
  letter-spacing: 0.05em;
}

.title {
  font-size: 2.75rem;
  font-weight: 900;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.15rem;
  max-width: 650px;
  line-height: 1.6;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.heading-icon {
  font-size: 1.5rem;
  color: var(--accent-color);
}

.section-heading h3 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.guide-section, .selection-section {
  margin-bottom: 4.5rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.75rem;
}

/* Feature Cards (Guides) */
.feature-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 1.75rem;
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-color);
}

.card-icon-wrapper {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon { font-size: 1.75rem; }

.bg-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.bg-emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.card-content h4 {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 0.4rem;
  color: var(--text-primary);
}

.card-content p {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.arrow-icon {
  position: absolute;
  right: 1.5rem;
  color: var(--text-tertiary);
  transition: transform 0.3s ease, color 0.3s ease;
  font-size: 1.25rem;
}

.feature-card:hover .arrow-icon {
  transform: translateX(6px);
  color: var(--accent-color);
}

/* Info Cards (Selection) */
.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 2.25rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  transition: all 0.4s ease;
}

.info-card:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(93, 135, 255, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.icon-box {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.bank-box { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.broker-box { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

.card-header h4 {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.card-desc {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 1.75rem;
  line-height: 1.7;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 2.5rem 0;
  flex-grow: 1;
}

.feature-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.check { 
  color: #10b981; 
  font-size: 1.25rem; 
  flex-shrink: 0; 
  margin-top: 0.1rem;
}

.action-btn {
  width: 100%;
  padding: 0.85rem;
  background: var(--hover-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.info-card:hover .action-btn {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(93, 135, 255, 0.2);
}

/* Future Section */
.glass-banner {
  background: linear-gradient(135deg, rgba(var(--card-bg), 0.8), rgba(var(--card-bg), 0.4));
  border: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
  padding: 2.25rem;
  border-radius: var(--radius-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  box-shadow: var(--shadow-sm);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.banner-icon {
  font-size: 2.5rem;
  color: var(--text-tertiary);
  opacity: 0.6;
}

.banner-text h4 {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}

.banner-text p {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.banner-action {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 0.6rem 1.25rem;
  background: var(--hover-bg);
  border-radius: 2rem;
  white-space: nowrap;
  border: 1px solid var(--border-color);
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: var(--accent-color);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(93, 135, 255, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(93, 135, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(93, 135, 255, 0); }
}

@media (max-width: 768px) {
  .feature-card { flex-direction: column; align-items: flex-start; text-align: left; }
  .arrow-icon { display: none; }
  .glass-banner { flex-direction: column; align-items: flex-start; }
  .title { font-size: 2.25rem; }
}
</style>