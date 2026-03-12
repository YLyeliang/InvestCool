<script setup lang="ts">
const { data: tutorials } = await useAsyncData('tutorials-list', () => queryContent('/tutorials').find())
</script>

<template>
  <div>
    <header style="margin-bottom: 2.5rem;">
      <h2 style="font-size: 1.875rem; font-weight: 700;">技术教程</h2>
      <p style="color: var(--text-secondary);">从基础到进阶的全栈技术指南。</p>
    </header>

    <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
      <div v-for="tutorial in tutorials" :key="tutorial._path" class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="margin-bottom: 1rem;">
            <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; background-color: #dcfce7; color: #166534;">
              {{ tutorial.category || '未分类' }}
            </span>
          </div>
          <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem; font-weight: 700;">{{ tutorial.title }}</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; margin-bottom: 1.5rem;">
            {{ tutorial.description || '暂无描述' }}
          </p>
        </div>
        
        <NuxtLink :to="tutorial._path" style="color: var(--accent-color); font-weight: 600; text-decoration: none; display: flex; align-items: center; font-size: 0.875rem;">
          开始学习 <Icon name="lucide:book-open" style="margin-left: 0.5rem; width: 1rem;" />
        </NuxtLink>
      </div>
    </div>

    <!-- Brainstormed content: Resource links -->
    <div style="margin-top: 4rem;">
      <h3 style="font-size: 1.25rem; margin-bottom: 1.5rem; font-weight: 700;">常用资源</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <a href="#" class="card" style="flex: 1; min-width: 200px; padding: 1rem; text-align: center; text-decoration: none; color: inherit;">
          <Icon name="lucide:github" style="font-size: 1.5rem; margin-bottom: 0.5rem;" />
          <div style="font-weight: 600;">代码仓库</div>
        </a>
        <a href="#" class="card" style="flex: 1; min-width: 200px; padding: 1rem; text-align: center; text-decoration: none; color: inherit;">
          <Icon name="lucide:terminal" style="font-size: 1.5rem; margin-bottom: 0.5rem;" />
          <div style="font-weight: 600;">API 文档</div>
        </a>
        <a href="#" class="card" style="flex: 1; min-width: 200px; padding: 1rem; text-align: center; text-decoration: none; color: inherit;">
          <Icon name="lucide:layers" style="font-size: 1.5rem; margin-bottom: 0.5rem;" />
          <div style="font-weight: 600;">架构图解</div>
        </a>
      </div>
    </div>
  </div>
</template>
