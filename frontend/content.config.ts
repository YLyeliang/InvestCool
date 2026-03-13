import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    tutorials: defineCollection({
      type: 'page',
      source: 'tutorials/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        category: z.string(),
        date: z.string().optional()
      })
    })
  }
})
