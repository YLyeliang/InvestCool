<script setup lang="ts">
// Fetch all items from tutorials collection
const { data: allTutorials } = await useAsyncData('tutorials-list', () => 
  queryCollection('tutorials').all()
)

const tutorials = computed(() => {
  if (!allTutorials.value) return []
  return allTutorials.value.filter(a => a.is_deleted !== true && a.is_deleted !== 'True')
})

useHead({
  title: 'InvestCool 架构与教程',
  meta: [
    { name: 'description', content: '探索 InvestCool 的系统架构、优化之路及投资技术教程。' }
  ]
})
</script>

<template>
  <div class="tutorials-page">
    <header class="page-header">
      <div class="badge-accent">System Architecture</div>
      <h2 class="title">架构与技术教程</h2>
      <p class="subtitle">深度解析 InvestCool 如何从单机博客进化为高可用 AI 投研平台。</p>
    </header>

    <div class="tutorials-grid">
      <PremiumPostCard v-for="item in tutorials" :key="item.path" :article="item" />
    </div>

    <div v-if="!tutorials || tutorials.length === 0" class="empty-state">
      <Icon name="lucide:book-dashed" class="empty-icon" />
      <p>教程正在编写中，敬请期待...</p>
    </div>
  </div>
</template>

<style scoped>
.tutorials-page { padding-bottom: 5rem; animation: fadeIn 0.6s ease-out; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header { margin-bottom: 4rem; }

.badge-accent {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--accent-soft);
  color: var(--accent-color);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.title { font-size: 2.5rem; font-weight: 900; margin-bottom: 0.75rem; color: var(--text-primary); }
.subtitle { color: var(--text-secondary); font-size: 1.1rem; max-width: 600px; }

.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2.5rem;
}

.empty-state { text-align: center; padding: 5rem 0; color: var(--text-tertiary); }
.empty-icon { font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.2; }
</style>
