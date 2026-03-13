<template>
  <button 
    @click="toggleTheme" 
    class="theme-toggle-btn"
    :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
  >
    <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="icon" />
    <span class="text">{{ isDark ? '浅色模式' : '深色模式' }}</span>
  </button>
</template>

<script setup>
const isDark = ref(false);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  const theme = isDark.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('investcool-theme', theme);
};

onMounted(() => {
  const savedTheme = localStorage.getItem('investcool-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    isDark.value = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  }
});
</script>

<style scoped>
.theme-toggle-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.theme-toggle-btn:hover {
  filter: brightness(0.95);
}

.icon {
  font-size: 1.1rem;
  margin-right: 0.75rem;
}

.text {
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
