<script setup lang="ts">
defineProps<{
  article: any
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <NuxtLink :to="article.path" class="post-card-link">
    <div class="premium-card">
      <div class="card-image-wrapper">
        <img :src="article.cover || 'https://images.unsplash.com/photo-1611974714658-058e117b8117?auto=format&fit=crop&q=80&w=800'" 
             class="card-image" :alt="article.title" />
        <div class="category-tag">{{ article.category }}</div>
      </div>
      
      <div class="card-body">
        <div class="card-meta">
          <span class="meta-item">
            <Icon name="lucide:calendar" class="meta-icon" /> {{ formatDate(article.created_at) }}
          </span>
          <span class="meta-item">
            <Icon name="lucide:clock" class="meta-icon" /> 5 min read
          </span>
        </div>
        
        <h3 class="card-title">{{ article.title }}</h3>
        <p class="card-excerpt">{{ article.summary }}</p>
        
        <div class="card-footer">
          <div class="author-info">
            <div class="author-avatar">AI</div>
            <span class="author-name">InvestCool Analysis</span>
          </div>
          <div class="read-more">
            阅读全文 <Icon name="lucide:chevron-right" />
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.post-card-link { text-decoration: none; color: inherit; display: block; }

.premium-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.premium-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent-color);
}

.card-image-wrapper {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: crop;
  transition: transform 0.6s ease;
}

.premium-card:hover .card-image {
  transform: scale(1.1);
}

.category-tag {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--accent-color);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(4px);
}

.card-body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.meta-item { display: flex; align-items: center; gap: 0.3rem; }

.card-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-excerpt {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info { display: flex; align-items: center; gap: 0.6rem; }
.author-avatar {
  width: 24px;
  height: 24px;
  background: var(--accent-color);
  color: white;
  border-radius: 50%;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
.author-name { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }

.read-more {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent-color);
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
</style>
