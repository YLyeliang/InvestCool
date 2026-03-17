<script setup lang="ts">
const config = useRuntimeConfig()

// Fetch dynamic tutorials from API
const { data: tutorials, pending } = await useFetch(`${config.public.apiBase}/analysis?type=tutorial`, {
  key: 'tutorials-list-dynamic'
})

useHead({
  title: '开源项目',
  meta: [
    { name: 'description', content: 'InvestCool 的成长足迹：从架构设计到高性能调优。' }
  ]
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="projects-page">
    <header class="page-header">
      <h2 class="title">开源项目</h2>
      <p class="subtitle">InvestCool 的成长足迹：从架构设计到高性能调优。</p>
    </header>

    <!-- Loading State -->
    <div v-if="pending" class="projects-grid">
      <div v-for="i in 3" :key="i" class="card project-card">
        <Skeleton width="100%" height="180px" radius="0" />
        <div class="card-content">
          <Skeleton width="60%" height="24px" class="mb-4" />
          <Skeleton width="100%" height="16px" class="mb-2" />
          <Skeleton width="100%" height="16px" />
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div v-else class="projects-grid">
      <div v-for="item in (tutorials as any[])" :key="item.id" class="card project-card">
        <div class="project-cover">
          <img :src="item.cover || 'https://images.unsplash.com/photo-1551288049-bbda38a5f452?q=80&w=1000'" :alt="item.title" class="cover-img" />
          <div class="category-badge-overlay">
            {{ item.category }}
          </div>
        </div>

        <div class="card-content">
          <h3 class="project-title">{{ item.title }}</h3>
          <p class="project-desc">{{ item.summary || '暂无描述' }}</p>
          
          <NuxtLink :to="`/tutorials/${item.id}`" class="view-link">
            查看详情 <Icon name="lucide:arrow-right" class="icon" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="!pending && (!tutorials || (tutorials as any[]).length === 0)" class="empty-state">
      <p>暂无教程内容，请在后台发布。</p>
    </div>

    <!-- Related Resources -->
    <div class="resources-section">
      <h3 class="section-title">核心资源</h3>
      <div class="resources-grid">
        <a href="https://github.com/YLyeliang/InvestCool" target="_blank" class="card resource-card">
          <Icon name="lucide:github" class="res-icon" />
          <div class="res-info">
            <h4>GitHub 仓库</h4>
            <p>获取完整源代码与部署脚本</p>
          </div>
        </a>
        <div class="card resource-card disabled">
          <Icon name="lucide:book" class="res-icon" />
          <div class="res-info">
            <h4>技术白皮书</h4>
            <p>即将上线，敬请期待</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-page {
  padding-bottom: 4rem;
}

.page-header {
  margin-bottom: 3rem;
}

.title {
  font-size: 2rem;
  font-weight: 900;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.project-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  min-height: auto;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
}

.project-cover {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.project-card:hover .cover-img {
  transform: scale(1.05);
}

.category-badge-overlay {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  padding: 0.2rem 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  color: #1e40af;
  border-radius: 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  backdrop-filter: blur(4px);
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-content {
  padding: 1.5rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.project-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.project-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.view-link {
  color: var(--accent-color);
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  transition: opacity 0.2s;
  margin-top: auto;
}

.resources-section {
  margin-top: 5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.resources-grid {
  display: flex;
  gap: 1.5rem;
}

.resource-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
}

.resource-card:hover:not(.disabled) {
  transform: translateX(5px);
  border-color: var(--accent-color);
}

.res-icon {
  font-size: 2rem;
  color: var(--accent-color);
}

.res-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.res-info p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.resource-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 4rem 0;
  color: var(--text-secondary);
}

.mb-4 { margin-bottom: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }

@media (max-width: 768px) {
  .resources-grid {
    flex-direction: column;
  }
}
</style>
