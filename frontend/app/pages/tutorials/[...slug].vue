<script setup lang="ts">
const route = useRoute()

// Nuxt Content v3 with collections expects the path relative to the collection source
// If route is /tutorials/architecture, the file is at tutorials/architecture.md
// The path in the collection will be /architecture
const relativePath = route.path.replace('/tutorials', '') || '/'

const { data: page } = await useAsyncData('tutorial-' + route.path, () => {
  return queryCollection('tutorials').path(relativePath).first()
})

// SEO Optimization
useHead({
  title: page.value ? page.value.title : '教程',
  meta: [
    { 
      name: 'description', 
      content: page.value ? page.value.description : 'InvestCool 技术开发与投资工具教程。' 
    },
    { property: 'og:type', content: 'article' }
  ]
})

if (!page.value) {
  // If not found in tutorials collection, try general path or throw 404
  console.error('Page not found in tutorials collection:', relativePath)
}
</script>

<template>
  <div class="tutorial-page">
    <NuxtLink to="/tutorials" style="display: flex; align-items: center; color: var(--text-secondary); text-decoration: none; margin-bottom: 2rem; font-weight: 600;">
      <Icon name="lucide:arrow-left" style="margin-right: 0.5rem;" /> 返回教程列表
    </NuxtLink>
    
    <article class="prose" v-if="page">
      <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem;">{{ page.title }}</h1>
      <ContentRenderer :value="page" />
    </article>

    <div v-else style="padding: 4rem 0; text-align: center;">
      <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">内容加载中或未找到</h2>
      <p style="color: var(--text-secondary);">请检查路径是否正确，或者返回列表重新选择。</p>
      <NuxtLink to="/tutorials" style="display: inline-block; margin-top: 2rem; color: var(--accent-color); font-weight: 600;">返回教程首页</NuxtLink>
    </div>
  </div>
</template>

<style>
.prose { max-width: 100%; line-height: 1.7; }
.prose h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
.prose h3 { font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; }
.prose p { margin-bottom: 1.25rem; color: var(--text-primary); }
.prose ul, .prose ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
.prose li { margin-bottom: 0.5rem; }
.prose strong { color: var(--text-primary); font-weight: 700; }
.prose hr { border: none; border-top: 1px solid var(--border-color); margin: 3rem 0; }
</style>
