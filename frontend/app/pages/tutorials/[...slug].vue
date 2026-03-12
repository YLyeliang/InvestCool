<template>
  <div class="tutorial-page">
    <NuxtLink to="/" style="display: flex; align-items: center; color: var(--text-secondary); text-decoration: none; margin-bottom: 2rem;">
      <Icon name="lucide:arrow-left" style="margin-right: 0.5rem;" /> Back to Feed
    </NuxtLink>
    
    <article class="prose">
      <ContentDoc />
    </article>
  </div>
</template>

<style>
.prose h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; }
.prose h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
.prose p { line-height: 1.7; color: var(--text-primary); margin-bottom: 1.25rem; }
</style>
