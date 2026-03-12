<template>
  <div class="app-container">
    <!-- Left Sidebar: Navigation -->
    <aside class="left-sidebar">
      <div class="logo">
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--accent-color); margin-bottom: 2rem;">InvestCool</h1>
      </div>
      
      <nav>
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.05em;">Menu</div>
        <NuxtLink to="/" class="nav-item">
          <Icon name="lucide:home" style="margin-right: 0.75rem" /> Home
        </NuxtLink>
        <NuxtLink to="/analysis" class="nav-item">
          <Icon name="lucide:trending-up" style="margin-right: 0.75rem" /> Investment
        </NuxtLink>
        <NuxtLink to="/tutorials" class="nav-item">
          <Icon name="lucide:book-open" style="margin-right: 0.75rem" /> Tutorials
        </NuxtLink>
      </nav>

      <div style="margin-top: 3rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.05em;">Series</div>
        <NuxtLink to="/series/python" class="nav-item">Python Mastery</NuxtLink>
        <NuxtLink to="/series/macro" class="nav-item">Global Macro</NuxtLink>
      </div>
    </aside>

    <!-- Main Content: Feed -->
    <main class="main-feed">
      <slot />
    </main>

    <!-- Right Panel: Widgets -->
    <aside class="right-panel">
      <div class="card" style="padding: 1.25rem;">
        <h3 style="font-size: 1rem; margin-bottom: 1rem;">Trending Analysis</h3>
        <ul style="list-style: none; padding: 0; font-size: 0.875rem;">
          <li style="margin-bottom: 0.75rem; color: var(--text-secondary);">• AI Infrastructure Boom</li>
          <li style="margin-bottom: 0.75rem; color: var(--text-secondary);">• Crypto Regulation 2026</li>
          <li style="color: var(--text-secondary);">• Energy Sector Shifts</li>
        </ul>
      </div>

      <div class="card" style="padding: 1.25rem; margin-top: 1.5rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
        <h3 style="font-size: 1rem; margin-bottom: 0.5rem;">Join the Series</h3>
        <p style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 1rem;">Get notified about new investment analysis and tech guides.</p>
        <button style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: none; background: white; color: var(--accent-color); font-weight: 600; cursor: pointer;">Subscribe</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.logo h1 {
  cursor: pointer;
}
</style>
