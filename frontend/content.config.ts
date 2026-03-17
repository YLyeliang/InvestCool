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
        cover: z.string().optional(),
        date: z.string().optional()
      })
    }),
    daily: defineCollection({
      type: 'page',
      source: 'daily/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        cover: z.string().optional(),
        category: z.string().optional()
      })
    }),
    ai: defineCollection({
      type: 'page',
      source: 'ai/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        cover: z.string().optional(),
        category: z.string().optional(),
        date: z.string().optional()
      })
    }),
    community: defineCollection({
      type: 'page',
      source: 'community/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        cover: z.string().optional(),
        category: z.string().optional(),
        date: z.string().optional()
      })
    })
  }
})
