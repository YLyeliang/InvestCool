import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    tutorials: defineCollection({
      type: 'page',
      source: 'tutorials/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        cover: z.string().optional(),
        category: z.string().optional(),
        date: z.string().optional(),
        is_deleted: z.boolean().default(false)
      })
    }),
    daily: defineCollection({
      type: 'page',
      source: 'daily/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        cover: z.string().optional(),
        category: z.string().optional(),
        date: z.string().optional(),
        is_deleted: z.boolean().default(false)
      })
    }),
    ai: defineCollection({
      type: 'page',
      source: 'ai/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        cover: z.string().optional(),
        category: z.string().optional(),
        date: z.string().optional(),
        is_deleted: z.boolean().default(false)
      })
    }),
    analysis: defineCollection({
      type: 'page',
      source: 'analysis/*.md',
      schema: z.object({
        title: z.string(),
        summary: z.string().optional(),
        category: z.string().default('深度分析'),
        created_at: z.string().optional(),
        cover: z.string().optional(),
        is_deleted: z.boolean().default(false)
      })
    }),
    community: defineCollection({
      type: 'page',
      source: 'community/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        cover: z.string().optional(),
        category: z.string().optional(),
        date: z.string().optional(),
        is_deleted: z.boolean().default(false)
      })
    })
  }
})
