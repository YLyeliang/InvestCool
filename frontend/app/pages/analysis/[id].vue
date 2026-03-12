<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

const { data: analysis, error } = await useFetch(`${config.public.apiBase}/analysis/${route.params.id}`)
</script>

<template>
  <div class="analysis-page">
    <NuxtLink to="/" style="display: flex; align-items: center; color: var(--text-secondary); text-decoration: none; margin-bottom: 2rem;">
      <Icon name="lucide:arrow-left" style="margin-right: 0.5rem;" /> Back to Feed
    </NuxtLink>

    <div v-if="error" class="card" style="border-color: #fca5a5; background: #fef2f2; color: #991b1b;">
      Failed to load analysis. Please try again later.
    </div>

    <article v-else-if="analysis" class="analysis-content">
      <header style="margin-bottom: 2rem;">
        <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; fontSize: 0.75rem; fontWeight: 600; background-color: #dbeafe; color: #1e40af; margin-bottom: 1rem; display: inline-block;">
          {{ (analysis as any).category }}
        </span>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem;">{{ (analysis as any).title }}</h1>
        <p style="color: var(--text-secondary); font-size: 1.125rem;">{{ (analysis as any).summary }}</p>
      </header>

      <div style="line-height: 1.8; font-size: 1.125rem;">
        {{ (analysis as any).content }}
      </div>
    </article>
  </div>
</template>
