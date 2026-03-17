export default defineNuxtRouteMiddleware(async (to, from) => {
  const config = useRuntimeConfig()
  
  // Skip on server-side during initial load to prevent complex SSR auth issues
  if (import.meta.server) return

  const token = localStorage.getItem('investcool-admin-token')
  
  if (!token) {
    // If we're not already on the admin page, and it's protected, we don't redirect here
    // but the page itself will handle the password modal. 
    // This middleware primarily prevents sneaky UI access.
    return
  }

  // Verify token with backend
  try {
    const response = await fetch(`${config.public.apiBase}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!response.ok) {
      localStorage.removeItem('investcool-admin-token')
      if (to.path === '/admin') {
        // Refresh page or trigger local modal
      }
    }
  } catch (e) {
    console.error('Auth verification failed')
  }
})
