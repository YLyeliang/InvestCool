<script setup lang="ts">
const config = useRuntimeConfig()

// Fetch Investment Analysis from Flask
const { data: analysis } = await useFetch(`${config.public.apiBase}/analysis`)

// Fetch Tutorials from Nuxt Content
const { data: tutorials } = await useAsyncData('tutorials', () => queryContent('/tutorials').find())

// Combine and Sort (Simple version)
const feedItems = computed(() => {
  const items = []
  
  if (analysis.value) {
    items.push(...(analysis.value as any[]).map(a => ({ ...a, type: 'analysis' })))
  }
  
  if (tutorials.value) {
    items.push(...tutorials.value.map(t => ({ 
      id: t._path, 
      title: t.title, 
      summary: t.description, 
      category: t.category, 
      type: 'tutorial' 
    })))
  }
  
  return items
})
</script>

<template>
  <div>
    <header style="margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.875rem; font-weight: 700;">Latest Feed</h2>
      <p style="color: var(--text-secondary);">Insights into tech and markets.</p>
    </header>

    <div v-for="item in feedItems" :key="item.id" class="card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <span :style="{ 
          padding: '0.25rem 0.75rem', 
          borderRadius: '1rem', 
          fontSize: '0.75rem', 
          fontWeight: '600',
          backgroundColor: item.type === 'tutorial' ? '#dcfce7' : '#dbeafe',
          color: item.type === 'tutorial' ? '#166534' : '#1e40af'
        }">
          {{ item.category }}
        </span>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">
          {{ item.type === 'tutorial' ? 'Tutorial' : 'Analysis' }}
        </span>
      </div>
      
      <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem; font-weight: 700;">{{ item.title }}</h3>
      <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">{{ item.summary }}</p>
      
      <NuxtLink :to="item.type === 'tutorial' ? item.id : `/analysis/${item.id}`" style="color: var(--accent-color); font-weight: 600; text-decoration: none; display: flex; align-items: center;">
        Read more <Icon name="lucide:arrow-right" style="margin-left: 0.5rem; width: 1rem;" />
      </NuxtLink>
    </div>
  </div>
</template>
