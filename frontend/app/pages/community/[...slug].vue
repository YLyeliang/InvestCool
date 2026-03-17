<script setup lang="ts">
const route = useRoute()

// Fetch specific community document with robust matching
const { data: page } = await useAsyncData('community-data-' + route.path, async () => {
  const allDocs = await queryCollection('community').all()
  const currentSlug = route.path.split('/').pop()
  
  return allDocs.find(doc => 
    doc.path === route.path || 
    doc.path === route.path.replace('/community', '') ||
    doc.path.endsWith('/' + currentSlug)
  )
})

useHead({
  title: page.value ? page.value.title : '社区',
  meta: [
    { name: 'description', content: page.value ? page.value.description : 'InvestCool 官方社群交流。' }
  ]
})
</script>

<template>
  <div class="community-detail-page">
    <div class="container-narrow">
      <header class="nav-header">
        <NuxtLink to="/" class="back-link">
          <Icon name="lucide:arrow-left" class="icon" />
          <span>返回首页</span>
        </NuxtLink>
      </header>

      <div v-if="!page" class="loading-box">
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">内容加载中或未找到</h2>
        <NuxtLink to="/" style="color: var(--accent-color); font-weight: 600;">返回首页</NuxtLink>
      </div>

      <article v-else class="prose-modern">
        <div class="page-cover-wrapper" v-if="page.cover">
          <img :src="page.cover" :alt="page.title" class="page-cover-img" />
        </div>
        
        <h1 class="page-title">{{ page.title }}</h1>
        <p class="page-desc">{{ page.description }}</p>
        
        <div class="content-body">
          <ContentRenderer :value="page" />
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.community-detail-page {
  padding-bottom: 6rem;
}

.container-narrow {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.nav-header {
  padding: 2rem 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  transition: color 0.2s;
}

.back-link:hover { color: var(--accent-color); }

.page-cover-wrapper {
  width: 100%;
  height: 240px;
  border-radius: 1.25rem;
  overflow: hidden;
  margin-bottom: 2.5rem;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
}

.page-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.page-desc {
  font-size: 1.15rem;
  color: var(--text-secondary);
  margin-bottom: 3rem;
  line-height: 1.6;
}

.loading-box {
  padding: 4rem 0;
  text-align: center;
}
</style>

<style>
/* Community Prose Overrides */
.prose-modern { line-height: 1.85; font-size: 1.15rem; }
.prose-modern h2 { font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.25rem; }
.prose-modern p { margin-bottom: 1.5rem; }
.prose-modern ul { padding-left: 1.25rem; margin-bottom: 2rem; }
.prose-modern li { margin-bottom: 0.75rem; }
.prose-modern blockquote { 
  border-left: 4px solid var(--accent-color); 
  padding: 1rem 1.5rem; 
  background: var(--hover-bg); 
  border-radius: 0 0.75rem 0.75rem 0;
  margin: 2rem 0;
  font-style: italic;
  color: var(--text-secondary);
}
</style>
