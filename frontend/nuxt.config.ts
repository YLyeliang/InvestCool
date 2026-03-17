// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/content', '@nuxt/ui', '@nuxtjs/sitemap'],
  css: ['~/assets/css/main.css'],
  
  // Nitro Proxy: Fixes the F5 refresh SSR issue
  nitro: {
    routeRules: {
      '/api/**': { proxy: 'http://127.0.0.1:5000/api/**' }
    }
  },

  site: {
    url: 'https://investcool.example.com', 
    name: 'InvestCool - 深度投资分析与技术洞察'
  },
  
  sitemap: {
    sources: [
      '/api/sitemap-urls'
    ],
    exclude: [
      '/admin/**'
    ]
  },
  
  app: {
    head: {
      titleTemplate: '%s - InvestCool | 投资分析与技术博客',
      title: '首页',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'InvestCool 是一个专注于纳斯达克100指数分析、市场情绪监测及 Python 投资技术的个人博客。' },
        { name: 'keywords', content: '纳斯达克, NDX, 投资分析, 市场情绪, Python, 博客, 技术教程' },
        { property: 'og:title', content: 'InvestCool - 深度投资分析与技术洞察' },
        { property: 'og:description', content: '实时追踪纳斯达克100指数，分析市场情绪，分享 AI 与投资技术。' },
        { name: 'author', content: 'InvestCool Team' }
      ]
    }
  },
  
  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  }
})
