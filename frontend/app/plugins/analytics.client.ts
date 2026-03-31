export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('page:finish', () => {
    const config = useRuntimeConfig()
    const route = useRoute()
    
    // Non-blocking background track request
    if (process.client) {
      try {
        fetch(`${config.public.apiBase}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: route.fullPath }),
          keepalive: true
        }).catch(() => {
          // Silent catch to prevent console errors on ad-blockers or network drops
        })
      } catch (e) {
        // Ignore
      }
    }
  })
})
