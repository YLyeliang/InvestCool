<template>
  <div 
    class="skeleton-pulse" 
    :style="{ 
      width: width, 
      height: height, 
      borderRadius: radius 
    }"
  ></div>
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '1rem' },
  radius: { type: String, default: '0.5rem' }
});
</script>

<style scoped>
.skeleton-pulse {
  background: linear-gradient(
    90deg,
    #f1f5f9 25%,
    #e2e8f0 50%,
    #f1f5f9 75%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s infinite linear;
}

@keyframes pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
